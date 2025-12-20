"use client";

import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { ThemeProvider } from "next-themes";
import { initI18n } from "@/lib/i18n";
import { I18nextProvider } from "react-i18next";

// Initialize i18n once
const i18nInstance = initI18n();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18nInstance}>
      <ThemeProvider defaultTheme="light" attribute="class">
        <SidebarProvider>{children}</SidebarProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}
