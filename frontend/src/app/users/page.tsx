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
import Dialog from "@/components/ui/Dialog";
import { Eye, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
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
  email: string;
  phone: string;
  nationalId: string;
  roles: string[];
  status: string;
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

/* ========= Page ========= */
export default function UsersPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // table + filters
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  // create form (status always 'active'; hidden)
  const [form, setForm] = useState<NewUserForm>({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    national_id: "",
    group: "", // set default later based on current user role
  });

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

  const isDirector = currentUserGroups.includes("Director");

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
        group: isDirector
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
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
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

      const payload: Record<string, any> = {
        username: form.email,       // email as username
        email: form.email,
        first_name: form.first_name || undefined,
        last_name: form.last_name || undefined,
        phone_number: form.phone_number || undefined,
        national_id: form.national_id || undefined,
        status: "active",
        groups: [isDirector ? form.group || "Citizen" : "Citizen"],
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
    setSuccessMsg("User created successfully. A reset password email will be sent if configured.");
    setSuccessOpen(true);        // open success modal

      // reset + close
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        national_id: "",
        group: isDirector ? (roles[0] || "Citizen") : "Citizen",
      });
      setOpenDialog(false);
    } catch (err: any) {
      setFormError(err?.message || "Failed to create user");
    } finally {
      setCreating(false);
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
                group: isDirector ? (s.group || roles[0] || "Citizen") : "Citizen",
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
              filtered.map((u) => (
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
                        onClick={() => router.push(`/users/${u.id}/view`)}
                        title="View"
                      >
                        <Eye className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => router.push(`/users/${u.id}/edit`)}
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
            {isDirector ? (
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
      <SuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="User Created"
        message={successMsg}
        autoCloseMs={6000}
    />

    </>
  );
}
