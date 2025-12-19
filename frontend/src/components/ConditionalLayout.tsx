"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Layouts/sidebar";
import { Header } from "@/components/Layouts/header";
import NextTopLoader from "nextjs-toploader";

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const checkAuth = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    setIsAuthenticated(!!token);
    setIsReady(true);
  };

  useEffect(() => {
    // Check authentication status on mount and pathname change
    checkAuth();

    // Listen for storage changes (e.g., when user logs out)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token") {
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Also listen for custom events (for same-tab logout)
    const handleCustomStorageChange = () => {
      checkAuth();
    };

    window.addEventListener("localStorageChange", handleCustomStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageChange", handleCustomStorageChange);
    };
  }, [pathname]);

  // Don't show sidebar/header on auth routes or root (which redirects)
  const isAuthRoute = pathname?.startsWith("/auth");
  const isRootRoute = pathname === "/";

  // If not ready, show nothing (prevents flash)
  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        </div>
      </div>
    );
  }

  // Show layout without sidebar/header for auth routes and root
  if (isAuthRoute || isRootRoute || !isAuthenticated) {
    return (
      <>
        <NextTopLoader color="#5750F1" showSpinner={false} />
        <main className="min-h-screen">{children}</main>
      </>
    );
  }

  // Show full layout with sidebar and header for authenticated users
  return (
    <>
      <NextTopLoader color="#5750F1" showSpinner={false} />
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="w-full bg-gray-2 dark:bg-[#020d1a]">
          <Header />
          <main className="isolate mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}

