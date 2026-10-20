"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { configureAuth, initializeSso, getCachedAccessToken, signIn, signUp, signOut, type AuthSettings } from "@/services/auth-session";
import { authFetch, installAxiosAuth } from "@/services/auth-http";
import { defaultRouteForRole } from "@/lib/role";

type Session = { mode: "local" | "keycloak"; error: string | null; signIn: () => Promise<void>; signUp: () => Promise<void>; signOut: () => Promise<void> };
const Context = createContext<Session>({ mode: "keycloak", error: null, signIn, signUp, signOut });
export const useChiroAuth = () => useContext(Context);
let startup: Promise<AuthSettings> | undefined;
function start() {
  startup ??= (async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/config/`, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load sign-in settings. Please reload the page.");
    const config: AuthSettings = await response.json();
    configureAuth(config); installAxiosAuth();
    if (config.mode === "keycloak") await initializeSso();
    return config;
  })();
  return startup;
}
export function ChiroAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"local" | "keycloak">("keycloak");
  const [authorized, setAuthorized] = useState(false);
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      if (!getCachedAccessToken()) { if (active) setAuthorized(false); return; }
      const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me/`, { cache: "no-store" });
      const me = await response.json();
      if (!response.ok) throw new Error(me.detail || me.message || "Unable to sign in to CAS.");
      if (!active) return;
      localStorage.setItem("user_groups", JSON.stringify(me.user_groups || []));
      localStorage.setItem("user_id", String(me.id));
      localStorage.setItem("role", me.user_groups?.[0] || "");
      setRole(me.user_groups?.[0] || ""); setAuthorized(true); setError(null);
    };
    start().then(async config => { if (active) setMode(config.mode); if (config.mode === "keycloak") await hydrate(); })
      .catch(e => { if (active) { setError(e.message); setAuthorized(false); } })
      .finally(() => { if (active) setReady(true); });
    const ended = () => { if (active) { setAuthorized(false); setError("Your session ended. Please sign in again."); } };
    const refreshed = () => { void hydrate().catch(e => { if (active) { setAuthorized(false); setError(e.message); } }); };
    window.addEventListener("cas:session-ended", ended);
    window.addEventListener("cas:token-refreshed", refreshed);
    return () => { active = false; window.removeEventListener("cas:session-ended", ended); window.removeEventListener("cas:token-refreshed", refreshed); };
  }, []);
  useEffect(() => {
    if (!ready || mode !== "keycloak") return;
    if (!authorized && pathname !== "/auth/sign-in" && pathname !== "/login" && pathname !== "/auth/sign-up") router.replace("/auth/sign-in");
    if (authorized && (pathname === "/" || pathname === "/login" || pathname?.startsWith("/auth"))) router.replace(defaultRouteForRole(role));
  }, [ready, mode, authorized, pathname, role, router]);
  if (!ready) return <div className="flex min-h-screen items-center justify-center">Loading CAS sign-in...</div>;
  if (mode === "keycloak" && !authorized && pathname !== "/auth/sign-in" && pathname !== "/login" && pathname !== "/auth/sign-up") return <div className="p-8">Redirecting to sign-in...</div>;
  return <Context.Provider value={{ mode, error, signIn, signUp, signOut }}>{children}</Context.Provider>;
}
