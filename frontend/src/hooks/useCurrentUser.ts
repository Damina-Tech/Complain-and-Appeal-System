"use client";

import { useEffect, useState } from "react";

export type CurrentUser = {
  name: string;
  email: string;
  img?: string;
};

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

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

        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();

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
        // Optional: handle/log error
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { user, loading };
}
