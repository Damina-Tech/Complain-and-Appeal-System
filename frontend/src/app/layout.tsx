import "@/css/satoshi.css";
import "@/css/style.css";

import DashboardShell from "@/components/DashboardShell";
import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import type { PropsWithChildren } from "react";
import { Providers } from "./providers";
import ProtectedWrapper from "@/components/ProtectedWrapper";

export const metadata: Metadata = {
  title: {
    template: "%s | Compaint and Appeal System",
    default: "Compaint and Appeal System",
  },
  description:
    "Harari Regional State Complaint and Appeal Management System Dashboard",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/jsvectormap/dist/jsvectormap.min.css"
        />
      </head>
      <body>
        <Providers>
          <DashboardShell>{children}</DashboardShell>
        </Providers>
      </body>
    </html>
  );
}
