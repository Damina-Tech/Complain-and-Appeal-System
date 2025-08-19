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

    const loginPath = "/auth/sign-in";
    if (!token && pathname !== loginPath) {
      router.replace(loginPath);
    }
  }, [router, pathname]);

  if (!isReady) return null;
  const loginPath = "/auth/sign-in";
  if (!hasToken && pathname !== loginPath) return null;

  return <>{children}</>;
}
