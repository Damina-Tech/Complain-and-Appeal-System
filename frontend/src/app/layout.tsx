import "@/css/satoshi.css";
import "@/css/style.css";

import type { Metadata } from "next";
import type { PropsWithChildren } from "react";
import { Providers } from "./providers";
import { ConditionalLayout } from "@/components/ConditionalLayout";

export const metadata: Metadata = {
  title: {
    template: "%s | Chiro City Complaint & Appeal System",
    default: "Chiro City Complaint & Appeal System",
  },
  description:
    "Chiro City Complaint & Appeal System",
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
          <ConditionalLayout>{children}</ConditionalLayout>
        </Providers>
      </body>
    </html>
  );
}
