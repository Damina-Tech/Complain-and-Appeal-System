"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { defaultRouteForRole } from "@/lib/role";

export default function RootPage() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    
    if (!token) {
      // Not authenticated - redirect to sign-in
      router.replace("/auth/sign-in");
      return;
    }

    // Authenticated - get user role and redirect accordingly
    const userGroups = typeof window !== "undefined" 
      ? localStorage.getItem("user_groups") 
      : null;
    
    let role: string | null = null;
    
    if (userGroups) {
      try {
        const groups = JSON.parse(userGroups);
        if (Array.isArray(groups) && groups.length > 0) {
          // Get the first non-Citizen role, or Citizen if that's all they have
          const nonCitizenRole = groups.find((g: string) => 
            typeof g === "string" && g.toLowerCase() !== "citizen"
          );
          role = nonCitizenRole || groups[0];
        }
      } catch (e) {
        console.error("Failed to parse user groups:", e);
      }
    }
    
    // Fallback to role from localStorage if user_groups not available
    if (!role) {
      role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    }

    // Redirect based on role
    const redirectPath = defaultRouteForRole(role);
    router.replace(redirectPath);
    setIsRedirecting(false);
  }, [router]);

  // Show loading state while redirecting
  if (isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-2 dark:bg-[#020d1a]">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="text-gray-600 dark:text-dark-6">Redirecting...</p>
        </div>
      </div>
    );
  }

  return null;
}
