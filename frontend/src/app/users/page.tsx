"use client";

import { useEffect, useMemo, useState } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { AnimatedModal } from "@/components/ui/animated-modal";
import { SuccessModal } from "@/components/ui/success-modal";
import { useTranslation } from "@/hooks/useTranslation";


/* ========= Types ========= */
type ApiUser = {
  id: number | string;
  email?: string;
  username?: string; // server may still return it
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  national_id?: string;
  status?: string; // "active" | "inactive" | "suspended" | ...
  groups?: Array<{ name: string } | string>;
  created_at?: string;
  date_joined?: string;
};

type UserRow = {
  id: number | string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationalId: string;
  roles: string[];
  status: string;
};

type EditForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  national_id: string;
  status: string;
  group: string;
};

type NewUserForm = {
  first_name: string;
  last_name: string;
  email: string;         // used as username
  phone_number: string;
  national_id: string;
  group: string;         // single-select for create
};

const statusBadge: Record<string, string> = {
  active: "bg-green-200 text-green-800",
  inactive: "bg-gray-200 text-gray-800",
  suspended: "bg-red-200 text-red-800",
};

const PAGE_SIZE = 10;

/* ========= Page ========= */
export default function UsersPage() {
  const { t } = useTranslation();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // table + filters
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // roles (groups) for filter + create
  const [roles, setRoles] = useState<string[]>([]);

  // UX
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");

  // modal
  const [openDialog, setOpenDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successBanner, setSuccessBanner] = useState<string>("");
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // create form (status always 'active'; hidden)
  const [form, setForm] = useState<NewUserForm>({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    national_id: "",
    group: "", // set default later based on current user role
  });
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    national_id: "",
    status: "active",
    group: "",
  });
  const [editError, setEditError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);

  // auth + current user role
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [currentUserGroups, setCurrentUserGroups] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("user_groups");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((g) => (typeof g === "string" ? g : g?.name)).filter(Boolean);
      }
      return [];
    } catch {
      return [];
    }
  });

  // Check user permissions dynamically
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [currentUserOffice, setCurrentUserOffice] = useState<number | null>(null);

  useEffect(() => {
    const loadUserInfo = async () => {
      if (!API_URL || !token) return;
      try {
        const res = await fetch(`${API_URL}/auth/me/`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          console.log("User info from /auth/me:", data);
          
          // Update user groups if returned from API
          if (data.user_groups && Array.isArray(data.user_groups)) {
            const groups = data.user_groups.map((g: string) => g).filter(Boolean);
            localStorage.setItem("user_groups", JSON.stringify(groups));
            setCurrentUserGroups(groups);
            console.log("Updated user groups from API:", groups);
          }
          
          setCurrentUserOffice(data.office || null);
        } else {
          console.error("Failed to load user info:", res.status, await res.text());
        }
      } catch (e) {
        console.error("Failed to load user info:", e);
      }
    };
    loadUserInfo();
  }, [API_URL, token]);

  const isAdmin = currentUserGroups.includes("Admin");
  const isDirector = currentUserGroups.includes("Director");
  const isMayorOffice = currentUserGroups.includes("Mayor Office");
  const isFocalPerson = currentUserGroups.some((g) => g.includes("Focal Person"));
  
  // Debug: Log current user groups
  useEffect(() => {
    if (currentUserGroups.length > 0) {
      console.log("Current user groups:", currentUserGroups);
      console.log("isAdmin:", isAdmin, "isDirector:", isDirector, "isMayorOffice:", isMayorOffice, "isFocalPerson:", isFocalPerson);
    }
  }, [currentUserGroups, isAdmin, isDirector, isMayorOffice, isFocalPerson]);
  
  // Create permissions:
  // - Admin: Can create users with any role
  // - Director and Mayor Office: Can only create Focal Person and Citizen
  // - Focal Person: Cannot create users
  const canCreateUser = isAdmin || isDirector || isMayorOffice;
  
  // Available roles for creation based on current user's role
  const availableRolesForCreation = useMemo(() => {
    if (isAdmin) {
      return roles; // Admin can create any role
    } else if (isDirector || isMayorOffice) {
      // Director and Mayor Office can only create Focal Person and Citizen
      return roles.filter((r) => r === "Focal Person" || r === "Citizen");
    }
    return []; // Focal Person cannot create users
  }, [roles, isAdmin, isDirector, isMayorOffice]);
  
  // Permission checks: Admin, Director, and Mayor Office can edit/delete (with hierarchy restrictions)
  const canEditUser = isAdmin || isDirector || isMayorOffice;
  const canDeleteUser = isAdmin || isDirector || isMayorOffice;
  
  // Helper function to check if a user can edit/delete another user based on hierarchy
  const canModifyUser = (targetUser: UserRow): boolean => {
    if (!canEditUser) return false;
    
    // Admin can modify everyone (highest level)
    if (isAdmin) return true;
    
    // Get hierarchy levels
    // Hierarchy: Citizen (1) < Focal Person (2) < Director (3) < Mayor Office (4) < Admin (5)
    const hierarchyLevels: Record<string, number> = {
      "Citizen": 1,
      "Focal Person": 2,
      "Director": 3,
      "Mayor Office": 4,
      "Admin": 5,
    };
    
    const currentUserLevel = isDirector ? 3 : isMayorOffice ? 4 : 0;
    const targetUserLevel = Math.max(...targetUser.roles.map((r) => hierarchyLevels[r] || 0));
    
    // Can only modify users with lower hierarchy level
    return targetUserLevel < currentUserLevel;
  };

  // ---- Load roles and users ----
  const mapUser = (u: ApiUser): UserRow => {
    const roles = (u.groups || [])
      .map((g) => (typeof g === "string" ? g : g?.name))
      .filter(Boolean) as string[];

    const name =
      [u.first_name, u.last_name].filter(Boolean).join(" ").trim() ||
      u.email ||
      u.username ||
      `User #${u.id}`;

    return {
      id: u.id,
      name,
      firstName: u.first_name || "",
      lastName: u.last_name || "",
      email: u.email || u.username || "—",
      phone: u.phone_number || "—",
      nationalId: u.national_id || "—",
      roles: roles.length ? roles : ["—"],
      status: (u.status || "active").toLowerCase(),
    };
  };

  const loadAll = async () => {
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
        const names: string[] = (Array.isArray(gjson) ? gjson : [])
          .map((g: any) => g?.name)
          .filter(Boolean);
        setRoles(names);
      } else {
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
      
      if (data.length === 0) {
        console.warn("API returned empty array. Current user groups:", currentUserGroups);
        console.warn("Token exists:", !!token);
      }
      
      const rows = (Array.isArray(data) ? data : []).map(mapUser);
      console.log("Mapped user rows:", rows, "Count:", rows.length);
      setUsers(rows);

      // default creation role:
      setForm((s) => ({
        ...s,
        group: availableRolesForCreation[0] || "Citizen",
      }));
    } catch (err: any) {
      setPageError(err?.message || "Failed to load users/roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // dedupe helper for default role pick
  const namesFrom = (rows: UserRow[]) =>
    Array.from(
      new Set(
        rows.flatMap((r) => r.roles).filter(Boolean)
      )
    );

  // ---- Build dynamic status options from data ----
  const statusOptions = useMemo(() => {
    const set = new Set<string>(["active", "inactive", "suspended"]);
    users.forEach((u) => set.add((u.status || "").toLowerCase()));
    return ["all", ...Array.from(set)];
  }, [users]);

  // ---- Role options for filter ----
  const roleOptions = useMemo(() => {
    const set = new Set<string>(roles);
    // also include roles seen on users even if /groups missed some
    users.forEach((u) => u.roles.forEach((r) => r !== "—" && set.add(r)));
    return ["all", ...Array.from(set)];
  }, [roles, users]);

  // ---- Filter client-side ----
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !term ||
        [u.name, u.email, u.phone, u.nationalId]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term));

      const matchRole =
        roleFilter === "all" || u.roles.includes(roleFilter);

      const matchStatus =
        statusFilter === "all" || (u.status || "").toLowerCase() === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter, users]);

  const statusChoices = useMemo(
    () => statusOptions.filter((s) => s !== "all"),
    [statusOptions]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const startItem = filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const endItem = filtered.length
    ? Math.min(filtered.length, currentPage * PAGE_SIZE)
    : 0;
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [successTitle, setSuccessTitle] = useState("Success");
  // ---- Create user (email as username, status=active; role auto unless director) ----
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});

    // Client-side validation
    const errors: Record<string, string> = {};
    
    if (!form.first_name?.trim()) {
      errors.first_name = t("forms", "firstNameRequired");
    }
    
    if (!form.last_name?.trim()) {
      errors.last_name = t("forms", "lastNameRequired");
    }
    
    if (!form.phone_number?.trim()) {
      errors.phone_number = t("forms", "phoneRequired");
    }
    
    // Validate role selection if user can create users
    if (canCreateUser && !form.group?.trim()) {
      errors.group = t("forms", "roleRequired");
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(t("forms", "fillRequiredFields"));
      return;
    }

    if (!API_URL) {
      setFormError(t("common", "error"));
      return;
    }
    if (!token) {
      setFormError(t("common", "error"));
      return;
    }

    try {
      setCreating(true);

      // Admin, Director, and Mayor Office can assign any role
      const assignedRole = form.group || availableRolesForCreation[0] || "Citizen";
      
      const payload: Record<string, any> = {
        username: form.email || `${form.first_name.toLowerCase()}_${Date.now()}`, // email as username, or generate one
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone_number: form.phone_number.trim(),
        status: "active",
        groups: [assignedRole],
      };

      // Add optional fields only if they have values
      if (form.email?.trim()) {
        payload.email = form.email.trim();
      }
      if (form.national_id?.trim()) {
        payload.national_id = form.national_id.trim();
      }

      const res = await fetch(`${API_URL}/users/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errorData: any = {};
        const responseText = await res.text();
        
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { detail: responseText || res.statusText };
        }

        // Helper function to extract error message
        const getErrorMessage = (fieldError: any): string => {
          if (Array.isArray(fieldError)) {
            return fieldError[0] || "Invalid value";
          }
          if (typeof fieldError === 'object' && fieldError !== null) {
            if (fieldError.non_field_errors) {
              return Array.isArray(fieldError.non_field_errors) ? fieldError.non_field_errors[0] : String(fieldError.non_field_errors);
            }
            if (fieldError.message) {
              return String(fieldError.message);
            }
            const keys = Object.keys(fieldError);
            if (keys.length > 0) {
              return String(fieldError[keys[0]]);
            }
            return "Invalid value";
          }
          return String(fieldError);
        };

        // Map API field names to form field names
        const newFieldErrors: Record<string, string> = {};
        
        Object.keys(errorData).forEach((key) => {
          if (key === 'detail' || key === 'message' || key === 'error' || key === 'non_field_errors') {
            return;
          }
          
          let formFieldName = '';
          switch (key) {
            case 'email':
              formFieldName = 'email';
              break;
            case 'phone_number':
              formFieldName = 'phone_number';
              break;
            case 'national_id':
              formFieldName = 'national_id';
              break;
            case 'first_name':
              formFieldName = 'first_name';
              break;
            case 'last_name':
              formFieldName = 'last_name';
              break;
            case 'username':
              formFieldName = 'email'; // username errors affect email field
              break;
            default:
              formFieldName = key;
          }
          
          if (formFieldName && errorData[key]) {
            const errorMsg = getErrorMessage(errorData[key]);
            if (errorMsg && errorMsg !== 'Invalid value') {
              newFieldErrors[formFieldName] = errorMsg;
            }
          }
        });

        if (Object.keys(newFieldErrors).length > 0) {
          setFieldErrors(newFieldErrors);
        }

        // Get general error message
        let errorMessage = "";
        if (errorData.detail) {
          errorMessage = Array.isArray(errorData.detail) ? errorData.detail[0] : String(errorData.detail);
        } else if (errorData.message) {
          errorMessage = Array.isArray(errorData.message) ? errorData.message[0] : String(errorData.message);
        } else if (errorData.error) {
          errorMessage = Array.isArray(errorData.error) ? errorData.error[0] : String(errorData.error);
        } else if (Object.keys(newFieldErrors).length > 0) {
          errorMessage = t("forms", "validationError");
        } else {
          errorMessage = typeof errorData === 'string' ? errorData : JSON.stringify(errorData);
        }

        if (!errorMessage) {
          errorMessage = `${t("common", "error")} (${res.status})`;
        }

        // Only show general error if there are no field-specific errors
        if (Object.keys(newFieldErrors).length === 0) {
          setFormError(errorMessage);
        } else {
          setFormError(t("forms", "validationError"));
        }
        
        return;
      }

      // reload users
      const refreshed = await fetch(`${API_URL}/users/`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const rjson: ApiUser[] = await refreshed.json();
      setUsers((Array.isArray(rjson) ? rjson : []).map(mapUser));

      // success banner for 3s
      setSuccessTitle(t("users", "userCreated"));
      setSuccessMsg(t("users", "createUserSuccess"));
      setSuccessOpen(true);        // open success modal

      // reset + close
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        national_id: "",
        group: availableRolesForCreation[0] || "Citizen",
      });
      setFieldErrors({});
      setOpenDialog(false);
    } catch (err: any) {
      setFormError(err?.message || t("common", "error"));
    } finally {
      setCreating(false);
    }
  };

  // Helper function to extract human-readable error messages from API responses
  const extractErrorMessage = async (response: Response): Promise<string> => {
    try {
      const responseText = await response.text();
      let errorData: any = {};
      
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { detail: responseText || response.statusText };
      }
      
      // Extract error message from various possible formats
      if (errorData.detail) {
        const detail = Array.isArray(errorData.detail) ? errorData.detail[0] : errorData.detail;
        // Convert technical messages to user-friendly ones
        if (typeof detail === "string") {
          if (detail.includes("cannot edit users with the same or higher hierarchy level")) {
            return "You cannot edit users with the same or higher role level.";
          }
          if (detail.includes("cannot delete users with the same or higher hierarchy level")) {
            return "You cannot delete users with the same or higher role level.";
          }
          if (detail.includes("cannot create users")) {
            return "You do not have permission to create users.";
          }
          // Remove technical details like level numbers for better readability
          return detail.replace(/Your level: \d+, Target user level: \d+/g, "").trim();
        }
        return String(detail);
      }
      
      if (errorData.message) {
        return Array.isArray(errorData.message) ? errorData.message[0] : String(errorData.message);
      }
      
      if (errorData.error) {
        return Array.isArray(errorData.error) ? errorData.error[0] : String(errorData.error);
      }
      
      return responseText || response.statusText || t("common", "error");
    } catch {
      return t("common", "error");
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const trimmedEmail = editForm.email.trim();
    if (!trimmedEmail) {
      setEditError(t("forms", "emailRequired"));
      return;
    }

    if (!API_URL) {
      setEditError(t("common", "error"));
      return;
    }
    if (!token) {
      setEditError(t("common", "error"));
      return;
    }

    try {
      setUpdating(true);
      setEditError("");

      const payload: Record<string, any> = {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        email: trimmedEmail,
        phone_number: editForm.phone_number.trim() || null,
        national_id: editForm.national_id.trim() || null,
        status: editForm.status || "active",
      };

      // Only allow role changes if user has permission and target role is allowed
      if (canEditUser && selectedUser) {
        // Check if user can modify this user (hierarchy check)
        if (canModifyUser(selectedUser)) {
          // For edit, only Admin can change roles; Director/Mayor Office cannot change roles
          if (isAdmin && editForm.group) {
            payload.groups = [editForm.group];
          }
          // Director and Mayor Office cannot change roles, so don't include groups in payload
        }
      }

      const res = await fetch(`${API_URL}/users/${selectedUser.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorMessage = await extractErrorMessage(res);
        setEditError(errorMessage);
        return;
      }

      const updated: ApiUser = await res.json();
      const mapped = mapUser(updated);

      setUsers((prev) => prev.map((u) => (u.id === mapped.id ? mapped : u)));
      setSelectedUser(mapped);
      setSuccessTitle(t("users", "userUpdated"));
      setSuccessMsg(t("users", "updateUserSuccess"));
      setSuccessOpen(true);
      setEditModalOpen(false);
    } catch (err: any) {
      setEditError(err?.message || t("common", "error"));
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !API_URL || !token) return;

    try {
      setDeleting(true);
      setEditError("");
      
      const res = await fetch(`${API_URL}/users/${userToDelete.id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorMessage = await extractErrorMessage(res);
        setEditError(errorMessage);
        return;
      }

      // Remove user from list
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setSuccessTitle(t("users", "userDeleted"));
      setSuccessMsg(t("users", "deleteUserSuccess"));
      setSuccessOpen(true);
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      setEditError(err?.message || t("common", "error"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Breadcrumb pageName={t("users", "users")} />

      {/* Success banner (top, 3s) */}
      {successBanner && (
        <div className="mb-4 rounded-md border border-green-300 bg-green-50 p-3 text-green-800 dark:border-green-800/40 dark:bg-green-900/30 dark:text-green-100">
          {successBanner}
        </div>
      )}

      <div
        className={cn(
          "rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card"
        )}
      >
        {/* Top bar: Role & Status filters + Search + Add New */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {/* Role filter */}
            <div className="w-[200px]">
              <select
                className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r === "all" ? `${t("common", "all")} ${t("users", "roles")}` : r}
                  </option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div className="w-[180px]">
              <select
                className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? `${t("common", "all")} ${t("users", "status")}` : s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <Input
              placeholder={t("common", "search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[300px]"
            />
          </div>

          {canCreateUser && (
            <Button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={() => {
                setFormError("");
                setOpenDialog(true);
                // default role when opening the modal
                setForm((s) => ({
                  ...s,
                  group: availableRolesForCreation[0] || "Citizen",
                }));
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("users", "addNewUser")}
            </Button>
          )}
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="[&>th]:text-center">
              {/* Username & Created removed as requested */}
              <TableHead className="!text-left">{t("users", "name")}</TableHead>
              <TableHead>{t("users", "email")}</TableHead>
              <TableHead>{t("users", "phone")}</TableHead>
              <TableHead>{t("users", "nationalId")}</TableHead>
              <TableHead>{t("users", "roles")}</TableHead>
              <TableHead>{t("users", "status")}</TableHead>
              <TableHead>{t("common", "actions")}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="py-4 text-center text-gray-500 dark:text-gray-300">
                  {t("common", "loading")}
                </TableCell>
              </TableRow>
            )}

            {!loading && pageError && (
              <TableRow>
                <TableCell colSpan={7} className="py-4 text-center text-red-500">
                  {pageError}
                </TableCell>
              </TableRow>
            )}

            {!loading && !pageError && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-4 text-center text-gray-500 dark:text-gray-300">
                  {t("users", "noUsersFound")}
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              !pageError &&
              paginated.map((u) => (
                <TableRow
                  key={u.id}
                  className="text-center text-base font-medium text-dark dark:text-white"
                >
                  <TableCell className="!text-left">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.phone}</TableCell>
                  <TableCell>{u.nationalId}</TableCell>
                  <TableCell>{u.roles.join(", ")}</TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        statusBadge[(u.status || "").toLowerCase()] ||
                        "bg-gray-200 text-gray-800"
                      }`}
                    >
                      {u.status[0].toUpperCase() + u.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setSelectedUser(u);
                          setViewModalOpen(true);
                        }}
                        title={t("common", "view")}
                      >
                        <Eye className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setSelectedUser(u);
                          setEditForm({
                            first_name: u.firstName,
                            last_name: u.lastName,
                            email: u.email === "—" ? "" : u.email,
                            phone_number: u.phone === "—" ? "" : u.phone,
                            national_id: u.nationalId === "—" ? "" : u.nationalId,
                            status: u.status || "active",
                            group: u.roles.find((role) => role !== "—") || "",
                          });
                          setEditError("");
                          setEditModalOpen(true);
                        }}
                        disabled={!canModifyUser(u)}
                        title={
                          canModifyUser(u)
                            ? t("common", "edit")
                            : "You cannot edit users with the same or higher role level"
                        }
                      >
                        <Pencil
                          className={`h-4 w-4 ${
                            canModifyUser(u) ? "text-green-500" : "text-gray-400"
                          }`}
                        />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setUserToDelete(u);
                          setDeleteConfirmOpen(true);
                        }}
                        disabled={!canModifyUser(u)}
                        title={
                          canModifyUser(u)
                            ? t("common", "delete")
                            : "You cannot delete users with the same or higher role level"
                        }
                      >
                        <Trash2
                          className={`h-4 w-4 ${
                            canModifyUser(u) ? "text-red-500" : "text-gray-400"
                          }`}
                        />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {!loading && !pageError && filtered.length > PAGE_SIZE && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t("activity", "showing")} {startItem.toLocaleString()}-{endItem.toLocaleString()} {t("activity", "of")}{" "}
            {filtered.length.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="px-3"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              {t("common", "previous")}
            </Button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {t("common", "page")} {currentPage} {t("activity", "of")} {totalPages}
            </span>
            <Button
              variant="outline"
              className="px-3"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              {t("common", "next")}
            </Button>
          </div>
        </div>
      )}

      {/* Add New User Modal */}
      <AnimatedModal
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setFormError("");
          setFieldErrors({});
        }}
        title={t("users", "addNewUser")}
      >
        <form className="space-y-4" onSubmit={handleCreate}>
          {/* General error message at top */}
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-red-600 dark:text-red-400">⚠</span>
                <div>
                  <p className="font-medium">{t("common", "error")}</p>
                  <p className="mt-1">{formError}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Input
                placeholder={`${t("forms", "firstName")} *`}
                value={form.first_name}
                onChange={(e) => {
                  setForm((s) => ({ ...s, first_name: e.target.value }));
                  if (fieldErrors.first_name) {
                    setFieldErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.first_name;
                      return newErrors;
                    });
                  }
                }}
                className={fieldErrors.first_name ? "border-red-500" : ""}
                required
              />
              {fieldErrors.first_name && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.first_name}</p>
              )}
            </div>
            <div>
              <Input
                placeholder={`${t("forms", "lastName")} *`}
                value={form.last_name}
                onChange={(e) => {
                  setForm((s) => ({ ...s, last_name: e.target.value }));
                  if (fieldErrors.last_name) {
                    setFieldErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.last_name;
                      return newErrors;
                    });
                  }
                }}
                className={fieldErrors.last_name ? "border-red-500" : ""}
                required
              />
              {fieldErrors.last_name && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.last_name}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Input
                placeholder={`${t("forms", "email")} (${t("common", "optional")})`}
                type="email"
                value={form.email}
                onChange={(e) => {
                  setForm((s) => ({ ...s, email: e.target.value }));
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.email;
                      return newErrors;
                    });
                  }
                }}
                className={fieldErrors.email ? "border-red-500" : ""}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
              )}
            </div>
            <div>
              <Input
                placeholder={`${t("forms", "phone")} *`}
                value={form.phone_number}
                onChange={(e) => {
                  setForm((s) => ({ ...s, phone_number: e.target.value }));
                  if (fieldErrors.phone_number) {
                    setFieldErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.phone_number;
                      return newErrors;
                    });
                  }
                }}
                className={fieldErrors.phone_number ? "border-red-500" : ""}
                required
              />
              {fieldErrors.phone_number && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.phone_number}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Input
                placeholder={`${t("forms", "nationalId")} (${t("common", "optional")})`}
                value={form.national_id}
                onChange={(e) => {
                  setForm((s) => ({ ...s, national_id: e.target.value }));
                  if (fieldErrors.national_id) {
                    setFieldErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.national_id;
                      return newErrors;
                    });
                  }
                }}
                className={fieldErrors.national_id ? "border-red-500" : ""}
              />
              {fieldErrors.national_id && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.national_id}</p>
              )}
            </div>

            {/* Role selection based on permissions */}
            {canCreateUser ? (
              <div>
                <select
                  className={`w-full rounded border p-2 dark:border-dark-3 dark:bg-dark-2 ${
                    fieldErrors.group ? "border-red-500" : "border-gray-300"
                  }`}
                  value={form.group}
                  onChange={(e) => {
                    setForm((s) => ({ ...s, group: e.target.value }));
                    if (fieldErrors.group) {
                      setFieldErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.group;
                        return newErrors;
                      });
                    }
                  }}
                  required
                >
                  <option value="">{t("common", "select")} {t("users", "role")}</option>
                  {availableRolesForCreation.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {fieldErrors.group && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.group}</p>
                )}
              </div>
            ) : (
              <Input value="Citizen" readOnly className="opacity-80" />
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
            disabled={creating}
          >
            {creating ? t("common", "loading") : t("users", "addNewUser")}
          </Button>
        </form>
      </AnimatedModal>

      {/* View User Modal */}
      <AnimatedModal
        open={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedUser(null);
        }}
        title={t("users", "viewUser")}
      >
        {selectedUser && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t("users", "name")}
              </p>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {selectedUser.name}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t("users", "email")}
                </p>
                <p className="font-medium">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t("users", "phone")}
                </p>
                <p className="font-medium">{selectedUser.phone}</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t("users", "nationalId")}
                </p>
                <p className="font-medium">{selectedUser.nationalId}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t("users", "status")}
                </p>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    statusBadge[selectedUser.status] || "bg-gray-200 text-gray-800"
                  }`}
                >
                  {selectedUser.status[0].toUpperCase() + selectedUser.status.slice(1)}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t("users", "roles")}
              </p>
              <p className="font-medium">
                {selectedUser.roles.length ? selectedUser.roles.join(", ") : "—"}
              </p>
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* Edit User Modal */}
      <AnimatedModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditError("");
          setSelectedUser(null);
        }}
        title={t("users", "editUser")}
      >
        {selectedUser && (
          <form className="space-y-4" onSubmit={handleUpdateUser}>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder={t("forms", "firstName")}
                value={editForm.first_name}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, first_name: e.target.value }))
                }
                disabled={updating}
              />
              <Input
                placeholder={t("forms", "lastName")}
                value={editForm.last_name}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, last_name: e.target.value }))
                }
                disabled={updating}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder={t("forms", "email")}
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, email: e.target.value }))
                }
                disabled={updating}
                required
              />
              <Input
                placeholder={t("forms", "phone")}
                value={editForm.phone_number}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, phone_number: e.target.value }))
                }
                disabled={updating}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder={t("forms", "nationalId")}
                value={editForm.national_id}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, national_id: e.target.value }))
                }
                disabled={updating}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t("users", "status")}
                </label>
                <select
                  className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm((s) => ({ ...s, status: e.target.value }))
                  }
                  disabled={updating}
                >
                  {statusChoices.map((status) => (
                    <option key={status} value={status}>
                      {status[0].toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {t("users", "role")}
              </label>
              {isAdmin ? (
                <select
                  className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
                  value={editForm.group}
                  onChange={(e) =>
                    setEditForm((s) => ({ ...s, group: e.target.value }))
                  }
                  disabled={updating}
                >
                  <option value="">{t("common", "none")}</option>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              ) : (
                <Input value={selectedUser.roles.join(", ")} readOnly />
              )}
            </div>
            {editError && <div className="text-sm text-red-500">{editError}</div>}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditModalOpen(false);
                  setEditError("");
                  setSelectedUser(null);
                }}
                disabled={updating}
              >
                {t("common", "cancel")}
              </Button>
              <Button type="submit" className="bg-blue-600 text-white" disabled={updating}>
                {updating ? t("common", "loading") : t("common", "save")}
              </Button>
            </div>
          </form>
        )}
      </AnimatedModal>
      {/* Delete Confirmation Modal */}
      <AnimatedModal
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setUserToDelete(null);
          setEditError("");
        }}
        title={t("users", "deleteUser")}
      >
        {userToDelete && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t("users", "deleteUserConfirm").replace("{name}", userToDelete.name)}
            </p>
            {editError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {editError}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setUserToDelete(null);
                  setEditError("");
                }}
                disabled={deleting}
              >
                {t("common", "cancel")}
              </Button>
              <Button
                type="button"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={handleDeleteUser}
                disabled={deleting}
              >
                {deleting ? t("common", "loading") : t("common", "delete")}
              </Button>
            </div>
          </div>
        )}
      </AnimatedModal>

      <SuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title={successTitle}
        message={successMsg}
        autoCloseMs={6000}
      />
    </>
  );
}
