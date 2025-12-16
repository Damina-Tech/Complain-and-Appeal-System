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
import { Eye, Pencil, Plus } from "lucide-react";
import { AnimatedModal } from "@/components/ui/animated-modal";
import { SuccessModal } from "@/components/ui/success-modal";


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

  // auth + current user role
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const currentUserGroups: string[] = useMemo(() => {
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
  }, []);

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
          // Permissions are typically not returned in /auth/me, but we can check groups
          // For now, we'll use group-based logic
          setCurrentUserOffice(data.office || null);
        }
      } catch (e) {
        console.error("Failed to load user info:", e);
      }
    };
    loadUserInfo();
  }, [API_URL, token]);

  const isDirector = currentUserGroups.includes("Director");
  const isMayorOffice = currentUserGroups.includes("Mayor Office");
  const isFocalPerson = currentUserGroups.some((g) => g.includes("Focal Person"));
  
  // Dynamic permission check: Director and Mayor Office can assign any role
  // Focal Person can only assign Citizen role
  const canAssignAnyRole = isDirector || isMayorOffice;
  const canCreateUser = canAssignAnyRole || isFocalPerson;

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
      if (!res.ok) throw new Error(`Failed to load users: ${res.status}`);
      const data: ApiUser[] = await res.json();
      const rows = (Array.isArray(data) ? data : []).map(mapUser);
      setUsers(rows);

      // default creation role:
      setForm((s) => ({
        ...s,
        group: canAssignAnyRole
          ? (namesFrom(rows).includes("Citizen") ? "Citizen" : (roles[0] || "Citizen"))
          : "Citizen",
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

    if (!API_URL) {
      setFormError("NEXT_PUBLIC_API_URL is not set");
      return;
    }
    if (!token) {
      setFormError("You are not authenticated. Please sign in.");
      return;
    }
    if (!form.email) {
      setFormError("Email is required.");
      return;
    }

    try {
      setCreating(true);

      // Focal Person can only create Citizen users
      const assignedRole = canAssignAnyRole ? (form.group || "Citizen") : "Citizen";
      
      const payload: Record<string, any> = {
        username: form.email,       // email as username
        email: form.email,
        first_name: form.first_name || undefined,
        last_name: form.last_name || undefined,
        phone_number: form.phone_number || undefined,
        national_id: form.national_id || undefined,
        status: "active",
        groups: [assignedRole],
      };

      const res = await fetch(`${API_URL}/users/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Create failed: ${res.status}`);
      }

      // reload users
      const refreshed = await fetch(`${API_URL}/users/`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const rjson: ApiUser[] = await refreshed.json();
      setUsers((Array.isArray(rjson) ? rjson : []).map(mapUser));

      // success banner for 3s
      setSuccessTitle("User Created");
    setSuccessMsg("User created successfully. A reset password email will be sent if configured.");
    setSuccessOpen(true);        // open success modal

      // reset + close
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        national_id: "",
        group: canAssignAnyRole ? (roles[0] || "Citizen") : "Citizen",
      });
      setOpenDialog(false);
    } catch (err: any) {
      setFormError(err?.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const trimmedEmail = editForm.email.trim();
    if (!trimmedEmail) {
      setEditError("Email is required.");
      return;
    }

    if (!API_URL) {
      setEditError("NEXT_PUBLIC_API_URL is not set");
      return;
    }
    if (!token) {
      setEditError("You are not authenticated. Please sign in.");
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

      if (canAssignAnyRole) {
        payload.groups = editForm.group ? [editForm.group] : [];
      } else if (isFocalPerson) {
        // Focal Person can only assign Citizen role
        const citizenGroup = roles.find((r) => r === "Citizen");
        payload.groups = citizenGroup ? [citizenGroup] : [];
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
        const msg = await res.text();
        throw new Error(msg || `Update failed: ${res.status}`);
      }

      const updated: ApiUser = await res.json();
      const mapped = mapUser(updated);

      setUsers((prev) => prev.map((u) => (u.id === mapped.id ? mapped : u)));
      setSelectedUser(mapped);
      setSuccessTitle("User Updated");
      setSuccessMsg("User updated successfully.");
      setSuccessOpen(true);
      setEditModalOpen(false);
    } catch (err: any) {
      setEditError(err?.message || "Failed to update user");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <Breadcrumb pageName="Users" />

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
                    {r === "all" ? "All Roles" : r}
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
                    {s === "all" ? "All Statuses" : s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <Input
              placeholder="Search name, email, phone, national ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[300px]"
            />
          </div>

          <Button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => {
              setFormError("");
              setOpenDialog(true);
              // default role when opening the modal
              setForm((s) => ({
                ...s,
                group: canAssignAnyRole ? (s.group || roles[0] || "Citizen") : "Citizen",
              }));
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New
          </Button>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="[&>th]:text-center">
              {/* Username & Created removed as requested */}
              <TableHead className="!text-left">Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>National ID</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="py-4 text-center text-gray-500 dark:text-gray-300">
                  Loading...
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
                  No users found
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
                        title="View"
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
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4 text-green-500" />
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
            Showing {startItem.toLocaleString()}-{endItem.toLocaleString()} of{" "}
            {filtered.length.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="px-3"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              className="px-3"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
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
        }}
        title="Add New User"
      >
        <form className="space-y-4" onSubmit={handleCreate}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              placeholder="First name"
              value={form.first_name}
              onChange={(e) => setForm((s) => ({ ...s, first_name: e.target.value }))}
            />
            <Input
              placeholder="Last name"
              value={form.last_name}
              onChange={(e) => setForm((s) => ({ ...s, last_name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              placeholder="Email *"
              type="email"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              required
            />
            <Input
              placeholder="Phone number"
              value={form.phone_number}
              onChange={(e) => setForm((s) => ({ ...s, phone_number: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              placeholder="National ID"
              value={form.national_id}
              onChange={(e) => setForm((s) => ({ ...s, national_id: e.target.value }))}
            />

            {/* Role: Citizen for non-directors; dropdown for Director */}
            {canAssignAnyRole ? (
              <select
                className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
                value={form.group}
                onChange={(e) => setForm((s) => ({ ...s, group: e.target.value }))}
              >
                {roles.length === 0 ? (
                  <option value="">No roles</option>
                ) : (
                  roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))
                )}
              </select>
            ) : (
              <Input value="Citizen" readOnly className="opacity-80" />
            )}
          </div>

          {formError && <div className="text-sm text-red-500">{formError}</div>}

          <Button
            type="submit"
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
            disabled={creating}
          >
            {creating ? "Creating..." : "Create User"}
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
        title="User Details"
      >
        {selectedUser && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Name
              </p>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {selectedUser.name}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Email
                </p>
                <p className="font-medium">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Phone
                </p>
                <p className="font-medium">{selectedUser.phone}</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  National ID
                </p>
                <p className="font-medium">{selectedUser.nationalId}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Status
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
                Roles
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
        title="Edit User"
      >
        {selectedUser && (
          <form className="space-y-4" onSubmit={handleUpdateUser}>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="First name"
                value={editForm.first_name}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, first_name: e.target.value }))
                }
                disabled={updating}
              />
              <Input
                placeholder="Last name"
                value={editForm.last_name}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, last_name: e.target.value }))
                }
                disabled={updating}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, email: e.target.value }))
                }
                disabled={updating}
                required
              />
              <Input
                placeholder="Phone number"
                value={editForm.phone_number}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, phone_number: e.target.value }))
                }
                disabled={updating}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="National ID"
                value={editForm.national_id}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, national_id: e.target.value }))
                }
                disabled={updating}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Status
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
            {canAssignAnyRole ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Role
                </label>
                <select
                  className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
                  value={editForm.group}
                  onChange={(e) =>
                    setEditForm((s) => ({ ...s, group: e.target.value }))
                  }
                  disabled={updating}
                >
                  <option value="">No role</option>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Role
                </label>
                <Input value={selectedUser.roles.join(", ")} readOnly />
              </div>
            )}
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
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 text-white" disabled={updating}>
                {updating ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
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
