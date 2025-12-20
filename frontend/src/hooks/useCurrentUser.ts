"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export type CurrentUser = {
  name: string;
  email: string;
  img?: string;
};

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const clearSessionAndRedirect = useCallback(() => {
    // Clear all auth data
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_groups");
    // Clear token cookie
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    // Dispatch custom event to notify ConditionalLayout
    window.dispatchEvent(new Event("localStorageChange"));
    // Redirect to sign-in
    router.replace("/auth/sign-in");
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      setUser(null);
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        // Adjust this endpoint to your backend's "who am I" route
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/me/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            cache: "no-store",
          }
        );

        // Handle expired/invalid session
        if (res.status === 401 || res.status === 403) {
          if (isMounted) {
            clearSessionAndRedirect();
            setUser(null);
            setLoading(false);
          }
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to load profile");
        }

        const data = await res.json();

        if (!isMounted) return;

        const name =
          data.full_name ||
          [data.first_name, data.last_name].filter(Boolean).join(" ") ||
          data.username ||
          "User";

        setUser({
          name,
          email: data.email ?? "",
          img: data.profile_image_url || data.avatar_url || data.image || undefined, // keep provided image if available
        });
      } catch (e) {
        // If fetch fails, check if it's a network error or auth error
        // Clear session and redirect on any error
        if (isMounted) {
          clearSessionAndRedirect();
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [clearSessionAndRedirect]); // Include clearSessionAndRedirect in dependencies

  return { user, loading };
}
