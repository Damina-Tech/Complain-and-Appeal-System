"use client";

import { SearchIcon } from "@/assets/icons";
import Image from "next/image";
import Link from "next/link";
import { useSidebarContext } from "../sidebar/sidebar-context";
import { MenuIcon } from "./icons";
import { Notification } from "./notification";
import { ThemeToggleSwitch } from "./theme-toggle";
import { UserInfo } from "./user-info";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "@/hooks/useTranslation";

export function Header() {
  const { toggleSidebar, isMobile } = useSidebarContext();
  const { user, loading } = useCurrentUser();
  const { t } = useTranslation();

  // Get user's first name for welcome message
  const getUserFirstName = () => {
    if (!user?.name) return "User";
    const firstName = user.name.split(" ")[0];
    return firstName || "User";
  };

  const welcomeName = loading ? "..." : getUserFirstName();
  
  // If session expired, don't render header content (redirect will happen via useCurrentUser)
  if (!loading && !user) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stroke bg-white px-4 py-5 shadow-1 dark:border-stroke-dark dark:bg-gray-dark md:px-5 2xl:px-10">
      {/* Left side - Hamburger menu (mobile only) */}
      <div className="flex items-center gap-2 lg:hidden">
        <button
          onClick={toggleSidebar}
          className="rounded-lg border px-1.5 py-1 dark:border-stroke-dark dark:bg-[#020D1A] hover:dark:bg-[#FFFFFF1A]"
          aria-label="Toggle navigation menu"
        >
          <MenuIcon />
        </button>
      </div>

      {/* Center - Welcome message (desktop only) */}
      <div className="max-xl:hidden">
        <h1 className="mb-0.5 text-heading-5 font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent dark:from-primary dark:via-primary/90 dark:to-primary/80">
          {t("dashboard", "welcome")}, {welcomeName}! 👋
        </h1>
        <p className="font-medium text-primary/70 dark:text-primary/60">
          Chiro City Complaint & Appeal System
        </p>
      </div>

      {/* Right side - Actions */}
      <div className="flex flex-1 items-center justify-end gap-2 min-[375px]:gap-4">
        {/* Search bar (desktop only) */}
        <div className="relative hidden w-full max-w-[300px] lg:block">
          <input
            type="search"
            placeholder={t("common", "search")}
            className="flex w-full items-center gap-3.5 rounded-full border bg-gray-2 py-3 pl-[53px] pr-5 outline-none transition-colors focus-visible:border-primary dark:border-dark-3 dark:bg-dark-2 dark:hover:border-dark-4 dark:hover:bg-dark-3 dark:hover:text-dark-6 dark:focus-visible:border-primary"
          />

          <SearchIcon className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 max-[1015px]:size-5" />
        </div>

        {/* Language selector - visible on all screens */}
        <LanguageSelector />

        {/* Theme toggle (desktop only) */}
        <div className="hidden lg:block">
          <ThemeToggleSwitch />
        </div>

        {/* Notification - visible on all screens */}
        <Notification />

        {/* User info - visible on all screens */}
        <div className="shrink-0">
          <UserInfo />
        </div>
      </div>
    </header>
  );
}
