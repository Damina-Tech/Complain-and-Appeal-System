"use client";

import { AnimatedModal } from "@/components/ui/animated-modal";
import { useTranslation } from "@/hooks/useTranslation";
import { UserRow } from "../types";
import { statusBadge } from "../constants";

interface ViewUserModalProps {
  open: boolean;
  onClose: () => void;
  user: UserRow | null;
}

export function ViewUserModal({ open, onClose, user }: ViewUserModalProps) {
  const { t } = useTranslation();

  if (!user) return null;

  return (
    <AnimatedModal open={open} onClose={onClose} title={t("users", "viewUser")}>
      <div className="space-y-4 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t("users", "name")}
          </p>
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {user.name}
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t("users", "email")}
            </p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t("users", "phone")}
            </p>
            <p className="font-medium">{user.phone}</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t("users", "nationalId")}
            </p>
            <p className="font-medium">{user.nationalId}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t("users", "status")}
            </p>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                statusBadge[user.status] || "bg-gray-200 text-gray-800"
              }`}
            >
              {user.status[0].toUpperCase() + user.status.slice(1)}
            </span>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t("users", "roles")}
          </p>
          <p className="font-medium">
            {user.roles.length ? user.roles.join(", ") : "—"}
          </p>
        </div>
      </div>
    </AnimatedModal>
  );
}

