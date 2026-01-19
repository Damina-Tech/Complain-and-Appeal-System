import { useState, useEffect, useCallback } from "react";
import { ApiUser, UserRow } from "../types";
import { mapUser } from "../utils";

export function useUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const loadAll = useCallback(async () => {
    if (!API_URL) {
      setPageError("ENV NEXT_PUBLIC_API_URL is not set");
      return;
    }
    try {
      setLoading(true);
      setPageError("");

      // roles/groups
      const gr = await fetch(`${API_URL}/groups/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      if (gr.ok) {
        const gjson = await gr.json();
        // Handle paginated response
        const groupsData = Array.isArray(gjson) ? gjson : (gjson.results || []);
        const names: string[] = groupsData
          .map((g: any) => g?.name || g)
          .filter(Boolean);
        console.log("Loaded roles/groups:", names);
        setRoles(names);
      } else {
        const errorText = await gr.text();
        console.error("Failed to load groups:", gr.status, errorText);
        // If it's a permission error, log it but don't show it as fatal
        if (gr.status === 403) {
          console.warn("No permission to view groups. User may not have access to role list.");
        }
        setRoles([]); // non-fatal
      }

      // users
      const res = await fetch(`${API_URL}/users/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = `Failed to load users: ${res.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        console.error("Users API error:", res.status, errorMessage);
        
        // If it's a 403 Forbidden, show a more helpful message
        if (res.status === 403) {
          errorMessage = "You don't have permission to view users. Only Admin, Director, and Mayor Office roles can access the user list.";
        }
        
        setPageError(errorMessage);
        setUsers([]); // Clear users on error
        return;
      }
      
      const responseData = await res.json();
      console.log("Users API response:", responseData);
      
      // Handle paginated response (if API returns { results: [...] })
      const data: ApiUser[] = Array.isArray(responseData) 
        ? responseData 
        : (responseData.results || []);
      
      console.log("Parsed users data:", data, "Count:", data.length);
      
      const rows = (Array.isArray(data) ? data : []).map(mapUser);
      console.log("Mapped user rows:", rows, "Count:", rows.length);
      setUsers(rows);
    } catch (err: any) {
      setPageError(err?.message || "Failed to load users/roles");
    } finally {
      setLoading(false);
    }
  }, [API_URL, token]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return {
    users,
    roles,
    loading,
    pageError,
    setUsers,
    reloadUsers: loadAll,
  };
}

