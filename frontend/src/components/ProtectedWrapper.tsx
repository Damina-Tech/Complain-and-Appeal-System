"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function ProtectedWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    setHasToken(!!token);
    setIsReady(true);

    // Don't redirect if on auth routes or root (root handles its own redirect)
    const isAuthRoute = pathname?.startsWith("/auth");
    const isRootRoute = pathname === "/";
    
    if (isAuthRoute || isRootRoute) {
      return;
    }

    const loginPath = "/auth/sign-in";
    if (!token) {
      router.replace(loginPath);
    }
  }, [router, pathname]);

  if (!isReady) return null;
  
  // Don't protect auth routes or root
  const isAuthRoute = pathname?.startsWith("/auth");
  const isRootRoute = pathname === "/";
  if (isAuthRoute || isRootRoute) {
    return <>{children}</>;
  }

  const loginPath = "/auth/sign-in";
  if (!hasToken) return null;

  return <>{children}</>;
}
