"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { 
  FilePlus, 
  FolderOpen, 
  BarChart3, 
  Users, 
  ArrowRightLeft, 
  ClipboardList,
  MessageSquare,
  HelpCircle,
  Settings,
  ChevronRight
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "@/hooks/useTranslation";

type QuickAction = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
};

export function ChatsCard() {
  const { t } = useTranslation();
  
  // Get user groups to determine available actions
  const userGroups = useMemo(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("user_groups");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((g) => (typeof g === "string" ? g : g?.name)).filter(Boolean);
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  const isCitizen = userGroups.includes("Citizen");
  const isFocalPerson = userGroups.some((g: string) => g.includes("Focal Person"));
  const isDirector = userGroups.includes("Director");
  const isMayorOffice = userGroups.includes("Mayor Office");
  const isAdmin = userGroups.includes("Admin");

  // Define quick actions based on user role
  const quickActions: QuickAction[] = useMemo(() => {
    const actions: QuickAction[] = [];

    // Common actions for all users
    actions.push({
      id: "create-case",
      title: t("dashboard", "createNewCase"),
      description: t("dashboard", "submitNewComplaint"),
      href: "/cases",
      icon: FilePlus,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    });

    // Actions for staff/admin roles
    if (isFocalPerson || isDirector || isMayorOffice || isAdmin) {

      actions.push({
        id: "transfers",
        title: t("activity", "transfers"),
        description: t("dashboard", "manageTransfers"),
        href: "/cases/activity",
        icon: ArrowRightLeft,
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-50 dark:bg-orange-900/20",
      });
    }

    // Actions for admin roles
    if (isDirector || isMayorOffice || isAdmin) {
      actions.push({
        id: "users",
        title: t("dashboard", "manageUsers"),
        description: t("users", "users"),
        href: "/users",
        icon: Users,
        color: "text-indigo-600 dark:text-indigo-400",
        bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
      });
    }

    // Help action for all users
    actions.push({
      id: "help",
      title: t("nav", "help"),
      description: t("dashboard", "getHelp"),
      href: "/help-guidelines",
      icon: HelpCircle,
      color: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-50 dark:bg-gray-900/20",
    });

    return actions;
  }, [isCitizen, isFocalPerson, isDirector, isMayorOffice, isAdmin, t]);

  return (
    <div className="col-span-12 rounded-[10px] bg-white py-6 shadow-1 dark:bg-gray-dark dark:shadow-card xl:col-span-4">
      <h2 className="mb-5.5 px-7.5 text-body-2xlg font-bold text-dark dark:text-white">
        {t("dashboard", "quickActions")}
      </h2>

      <ul className="space-y-1">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <li key={action.id}>
              <Link
                href={action.href}
                className={cn(
                  "group flex items-center gap-4 px-7.5 py-3.5 outline-none transition-all duration-200",
                  "hover:bg-primary/5 focus-visible:bg-primary/5",
                  "dark:hover:bg-primary/10 dark:focus-visible:bg-primary/10"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                    action.bgColor,
                    "group-hover:scale-110"
                  )}
                >
                  <Icon className={cn("h-5 w-5", action.color)} />
                </div>

                <div className="flex-grow min-w-0">
                  <h3 className="font-semibold text-dark dark:text-white">
                    {action.title}
                  </h3>
                  <p className="truncate text-xs text-gray-600 dark:text-gray-400">
                    {action.description}
                  </p>
                </div>

                <ChevronRight className="h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary dark:text-gray-500" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
