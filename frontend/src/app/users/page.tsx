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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Dialog from "@/components/ui/Dialog";
import { Eye, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

// Types
type UserRow = {
  id: number | string;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  national_id?: string;
  status?: string; // active, suspended, etc
  groups?: string[]; // role names
  created_at?: string;
};

type NewUserForm = {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  national_id: string;
  status: string;
  groups: string[]; // role names
  password: string;
  confirm_password: string;
};

const STATUS_OPTIONS = ["active", "inactive", "suspended"];

// Table styles for status badges
const statusBadge: Record<string, string> = {
  active: "bg-green-200 text-green-800",
  inactive: "bg-gray-200 text-gray-800",
  suspended: "bg-red-200 text-red-800",
};

export default function UsersPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL; // e.g. http://localhost:8000/api

  // Filters & UI
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Data
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<string[]>([]);

  // UX
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form
  const [form, setForm] = useState<NewUserForm>({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    national_id: "",
    status: "active",
    groups: [],
    password: "",
    confirm_password: "",
  });

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Load roles (groups) & users
  useEffect(() => {
    const run = async () => {
      if (!API_URL || !token) return;
      try {
        setLoading(true);
        setError("");

        // Load roles/groups (optional endpoint; adjust if different)
        const gr = await fetch(`${API_URL}/groups/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (gr.ok) {
          const gjson = await gr.json();
          const names =
            Array.isArray(gjson) ? gjson.map((g: any) => g?.name).filter(Boolean) : [];
          setRoles(names);
        } else {
          // Non-fatal: keep roles empty if endpoint not present
          setRoles([]);
        }

        // Load users
        const res = await fetch(`${API_URL}/users/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to load users: ${res.status}`);
        const data = await res.json();
        const rows: UserRow[] = (Array.isArray(data) ? data : []).map((u: any) => ({
          id: u.id,
          username: u.username,
          first_name: u.first_name,
          last_name: u.last_name,
          email: u.email,
          phone_number: u.phone_number,
          national_id: u.national_id,
          status: u.status ?? "active",
          groups: (u.groups || []).map((g: any) => g?.name ?? g).filter(Boolean),
          created_at: u.created_at,
        }));
        setUsers(rows);
      } catch (e: any) {
        setError(e?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_URL, token]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const term = search.trim().toLowerCase();
      const matchSearch =
        term.length === 0 ||
        [u.username, u.first_name, u.last_name, u.email, u.phone_number, u.national_id]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term));

      const matchRole =
        roleFilter === "all" ||
        (Array.isArray(u.groups) && u.groups.some((r) => r === roleFilter));

      const matchStatus =
        statusFilter === "all" || (u.status || "").toLowerCase() === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const resetForm = () =>
    setForm({
      username: "",
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      national_id: "",
      status: "active",
      groups: [],
      password: "",
      confirm_password: "",
    });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!API_URL) {
      setError("NEXT_PUBLIC_API_URL is not set");
      return;
    }
    if (!token) {
      setError("You are not authenticated. Please sign in.");
      return;
    }
    if (form.password !== form.confirm_password) {
      setError("Password and Confirm Password do not match.");
      return;
    }
    try {
      setCreating(true);
      setError("");

      // Build payload matching your DRF serializer (groups by name)
      const payload: any = {
        username: form.username,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone_number: form.phone_number,
        national_id: form.national_id,
        status: form.status,
        password: form.password,
        groups: form.groups, // e.g. ["Citizen"] or ["Director"]
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

      // Refresh list
      resetForm();
      setOpenDialog(false);

      const refreshed = await fetch(`${API_URL}/users/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rjson = await refreshed.json();
      const rows: UserRow[] = (Array.isArray(rjson) ? rjson : []).map((u: any) => ({
        id: u.id,
        username: u.username,
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        phone_number: u.phone_number,
        national_id: u.national_id,
        status: u.status ?? "active",
        groups: (u.groups || []).map((g: any) => g?.name ?? g).filter(Boolean),
        created_at: u.created_at,
      }));
      setUsers(rows);
    } catch (err: any) {
      setError(err?.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Breadcrumb pageName="Users" />

      <div
        className={cn(
          "rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card"
        )}
      >
        {/* Filters & Add Button */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {/* Role filter */}
            <Select onValueChange={(val) => setRoleFilter(val)} defaultValue="all">
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select onValueChange={(val) => setStatusFilter(val)} defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <Input
              placeholder="Search username, name, phone, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[280px]"
            />
          </div>

          <Button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => setOpenDialog(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New
          </Button>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="[&>th]:text-center">
              <TableHead className="!text-left">Username</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={8} className="py-4 text-center text-gray-500 dark:text-gray-300">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!!error && !loading && (
              <TableRow>
                <TableCell colSpan={8} className="py-4 text-center text-red-500">
                  {error}
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.length === 0 && !error && (
              <TableRow>
                <TableCell colSpan={8} className="py-4 text-center text-gray-500 dark:text-gray-300">
                  No users found
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              filtered.map((u) => (
                <TableRow
                  key={u.id}
                  className="text-center text-base font-medium text-dark dark:text-white"
                >
                  <TableCell className="!text-left">{u.username}</TableCell>
                  <TableCell>
                    {(u.first_name || u.last_name) ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() : "—"}
                  </TableCell>
                  <TableCell>{u.email || "—"}</TableCell>
                  <TableCell>{u.phone_number || "—"}</TableCell>
                  <TableCell>
                    {Array.isArray(u.groups) && u.groups.length > 0 ? u.groups.join(", ") : "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        statusBadge[(u.status || "").toLowerCase()] || "bg-gray-200 text-gray-800"
                      }`}
                    >
                      {u.status || "active"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {u.created_at ? String(u.created_at).slice(0, 10) : "—"}
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

      {/* Add New User Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} title="Add New User">
        <form className="space-y-4" onSubmit={handleCreate}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              placeholder="Username *"
              value={form.username}
              onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
              required
            />
            <Input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            />
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
            <Input
              placeholder="Phone number"
              value={form.phone_number}
              onChange={(e) => setForm((s) => ({ ...s, phone_number: e.target.value }))}
            />
            <Input
              placeholder="National ID"
              value={form.national_id}
              onChange={(e) => setForm((s) => ({ ...s, national_id: e.target.value }))}
            />
          </div>

          {/* Status */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              value={form.status}
              onValueChange={(val) => setForm((s) => ({ ...s, status: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Roles (single-select here; make it multi-select if needed) */}
            <Select
              value={form.groups[0] ?? ""}
              onValueChange={(val) => setForm((s) => ({ ...s, groups: val ? [val] : [] }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role (group)" />
              </SelectTrigger>
              <SelectContent>
                {roles.length === 0 && <SelectItem value="" disabled>No roles</SelectItem>}
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              placeholder="Password *"
              type="password"
              value={form.password}
              onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
              required
            />
            <Input
              placeholder="Confirm Password *"
              type="password"
              value={form.confirm_password}
              onChange={(e) => setForm((s) => ({ ...s, confirm_password: e.target.value }))}
              required
            />
          </div>

          <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700">
            {creating ? "Creating..." : "Create User"}
          </Button>
          {error && (
            <div className="text-sm text-red-500">
              {error}
            </div>
          )}
        </form>
      </Dialog>
    </>
  );
}
