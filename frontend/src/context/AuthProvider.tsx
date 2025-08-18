"use client";

import { ReactNode, useEffect, useState } from "react";
import keycloak from "@/lib/keycloak";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    keycloak
      .init({
        onLoad: "login-required", // forces login on startup
        checkLoginIframe: false, 
        pkceMethod: "S256", // better security
      })
      .then(authenticated => {
        setIsAuthenticated(authenticated);
        setLoading(false);
      })
      .catch(err => {
        console.error("Keycloak init failed:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  if (!isAuthenticated) return <div>Authentication failed</div>;

  return <>{children}</>;
}
