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
import { AnimatedModal } from "@/components/ui/animated-modal";
import { SuccessModal } from "@/components/ui/success-modal";
import { Plus, Settings } from "lucide-react";

/* ===================== Types ===================== */

type ApiOffice = {
  id: number | string;
  name: string;
  phone_number?: string | null;
  email?: string | null;
  address?: string | null;
  office_representative?: number | string | null; // user id (FK)
  representative_name?: string | null; // backend may or may not provide this
  created_at?: string | null;
};

type OfficeRow = {
  id: number | string;
  name: string;
  phone_number: string;
  email: string;
  address: string;
  representative_id: string | number | null;
  representative_name: string; // resolved using repMap if backend doesn't provide
  created_at: string;
};

type ApiUser = {
  id: number | string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  groups?: Array<{ name: string } | string> | null;
  phone_number?: string | null;
};

const mapOfficeRow = (o: ApiOffice): OfficeRow => ({
  id: o.id,
  name: o.name,
  phone_number: o.phone_number || "",
  email: o.email || "",
  address: o.address || "",
  representative_id: o.office_representative ?? null,
  representative_name: o.representative_name || "", // will be backfilled from repMap if empty
  created_at: o.created_at ? String(o.created_at).slice(0, 10) : "—",
});

/* ===================== Page ===================== */

export default function OfficesPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // Table + filters
  const [offices, setOffices] = useState<OfficeRow[]>([]);
  const [search, setSearch] = useState("");

  // UX
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");

  // Create modal
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] = useState<{
    name: string;
    phone_number: string;
    email: string;
    address: string;
    representative_id: string | number | "";
  }>({
    name: "",
    phone_number: "",
    email: "",
    address: "",
    representative_id: "",
  });

  // Details/edit modal
  const [openDetails, setOpenDetails] = useState(false);
  const [selected, setSelected] = useState<OfficeRow | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    phone_number: string;
    email: string;
    address: string;
    representative_id: string | number | "";
  }>({
    name: "",
    phone_number: "",
    email: "",
    address: "",
    representative_id: "",
  });
  const [editing, setEditing] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Success modal
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Representatives (users who are NOT Citizen)
  const [repsLoading, setRepsLoading] = useState(false);
  const [repOptions, setRepOptions] = useState<Array<{ id: string | number; label: string }>>([]);
  const [repMap, setRepMap] = useState<Record<string, string>>({}); // id -> display name

  /* ------------- Pagination-aware fetcher ------------- */

  const fetchAllPaginated = async <T,>(startUrl: string): Promise<T[]> => {
    let all: T[] = [];
    let nextUrl: string | null = startUrl;

    while (nextUrl) {
      const res = await fetch(nextUrl, { headers: authHeaders, cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
      const data = await res.json();

      if (Array.isArray(data)) {
        all = all.concat(data as T[]);
        nextUrl = null;
      } else if (Array.isArray((data as any)?.results)) {
        all = all.concat((data as any).results as T[]);
        nextUrl = (data as any).next || null;
      } else {
        // unknown shape – treat as single object
        all = all.concat(data as T);
        nextUrl = null;
      }
    }

    return all;
  };

  const fetchAllOffices = async (): Promise<ApiOffice[]> => {
    if (!API_URL) return [];
    return fetchAllPaginated<ApiOffice>(`${API_URL}/offices/`);
  };

  const fetchAllUsers = async (): Promise<ApiUser[]> => {
    if (!API_URL) return [];
    return fetchAllPaginated<ApiUser>(`${API_URL}/users/`);
  };

  /* ------------- Load data ------------- */

  const loadOffices = async () => {
    if (!API_URL) {
      setPageError("ENV NEXT_PUBLIC_API_URL is not set");
      return;
    }
    try {
      setLoading(true);
      setPageError("");
      const data = await fetchAllOffices();
      // Map immediately; representative_name will be backfilled from repMap in an effect below if missing.
      setOffices((Array.isArray(data) ? data : []).map(mapOfficeRow));
    } catch (err: any) {
      setPageError(err?.message || "Failed to load offices");
    } finally {
      setLoading(false);
    }
  };

  const loadRepresentatives = async () => {
    if (!API_URL) return;
    try {
      setRepsLoading(true);
      const users = await fetchAllUsers();

      // Keep users NOT in "Citizen" group (for selecting representatives)
      const kept = (users || []).filter((u) => {
        const groups = (u.groups || [])
          .map((g) => (typeof g === "string" ? g : g?.name))
          .filter(Boolean) as string[];
        return !groups.includes("Citizen");
      });

      const options = kept
        .map((u) => {
          const name =
            `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
            u.email ||
            u.username ||
            String(u.id);
          return { id: u.id, label: name };
        })
        .sort((a, b) => a.label.localeCompare(b.label));

      // Build id -> name map for fast lookup
      const map: Record<string, string> = {};
      options.forEach((o) => (map[String(o.id)] = o.label));

      setRepOptions(options);
      setRepMap(map);
    } catch {
      setRepOptions([]);
      setRepMap({});
    } finally {
      setRepsLoading(false);
    }
  };

  useEffect(() => {
    loadOffices();
    loadRepresentatives();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Backfill representative names from repMap whenever reps are ready
  useEffect(() => {
    if (!Object.keys(repMap).length) return;
    setOffices((prev) =>
      prev.map((o) => ({
        ...o,
        representative_name:
          o.representative_name ||
          (o.representative_id != null ? repMap[String(o.representative_id)] || "" : ""),
      })),
    );
  }, [repMap]);

  /* ------------- Filters ------------- */

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return offices;
    return offices.filter((o) => o.name.toLowerCase().includes(term));
  }, [offices, search]);

  /* ------------- Create ------------- */

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!API_URL) return setCreateError("API URL not set");
    if (!token) return setCreateError("You are not authenticated");
    if (!createForm.name.trim()) return setCreateError("Office name is required");

    try {
      setCreating(true);
      const payload: Partial<ApiOffice> = {
        name: createForm.name.trim(),
        phone_number: createForm.phone_number || undefined,
        email: createForm.email || undefined,
        address: createForm.address || undefined,
        office_representative:
          createForm.representative_id === "" ? undefined : createForm.representative_id,
      };

      const res = await fetch(`${API_URL}/offices/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Create failed: ${res.status}`);
      }

      await loadOffices();
      setOpenCreate(false);
      setCreateForm({
        name: "",
        phone_number: "",
        email: "",
        address: "",
        representative_id: "",
      });

      setSuccessMsg("Office created successfully.");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create office");
    } finally {
      setCreating(false);
    }
  };

  /* ------------- Details / Edit / Delete ------------- */

  const openDetailsModal = (row: OfficeRow) => {
    setSelected(row);
    setEditForm({
      name: row.name,
      phone_number: row.phone_number,
      email: row.email,
      address: row.address,
      representative_id: row.representative_id ?? "",
    });
    setDetailsError("");
    setConfirmDelete(false);
    setOpenDetails(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setDetailsError("");
    if (!API_URL) return setDetailsError("API URL not set");
    if (!token) return setDetailsError("You are not authenticated");
    if (!editForm.name.trim()) return setDetailsError("Office name is required");

    try {
      setEditing(true);
      const payload: Partial<ApiOffice> = {
        name: editForm.name.trim(),
        phone_number: editForm.phone_number || "",
        email: editForm.email || "",
        address: editForm.address || "",
        office_representative:
          editForm.representative_id === "" ? null : editForm.representative_id,
      };

      const res = await fetch(`${API_URL}/offices/${selected.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Update failed: ${res.status}`);
      }

      await loadOffices();
      setOpenDetails(false);

      setSuccessMsg("Office updated successfully.");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
    } catch (err: any) {
      setDetailsError(err?.message || "Failed to update office");
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDetailsError("");
    if (!API_URL) return setDetailsError("API URL not set");
    if (!token) return setDetailsError("You are not authenticated");

    try {
      setDeleting(true);
      const res = await fetch(`${API_URL}/offices/${selected.id}/`, {
        method: "DELETE",
        headers: { ...authHeaders },
      });

      if (!res.ok && res.status !== 204) {
        const msg = await res.text();
        throw new Error(msg || `Delete failed: ${res.status}`);
      }

      await loadOffices();
      setOpenDetails(false);

      setSuccessMsg("Office deleted successfully.");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
    } catch (err: any) {
      setDetailsError(err?.message || "Failed to delete office");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Breadcrumb pageName="Offices" />

      <div
        className={cn(
          "rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card",
        )}
      >
        {/* Top bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <Input
            placeholder="Search office name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[300px]"
          />

          <Button
            className="px-4 py-2 rounded text-white bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              setCreateError("");
              setOpenCreate(true);
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
              <TableHead className="!text-left">Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="py-4 text-center text-gray-500 dark:text-gray-300">
                  Loading...
                </TableCell>
              </TableRow>
            )}

            {!loading && pageError && (
              <TableRow>
                <TableCell colSpan={6} className="py-4 text-center text-red-500">
                  {pageError}
                </TableCell>
              </TableRow>
            )}

            {!loading && !pageError && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-4 text-center text-gray-500 dark:text-gray-300">
                  No offices found
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              !pageError &&
              filtered.map((o) => (
                <TableRow
                  key={o.id}
                  className="text-center text-base font-medium text-dark dark:text-white"
                >
                  <TableCell className="!text-left">{o.name}</TableCell>
                  <TableCell>{o.phone_number || "—"}</TableCell>
                  <TableCell>{o.email || "—"}</TableCell>
                  <TableCell className="truncate max-w-[260px]">{o.address || "—"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mx-auto flex items-center gap-2"
                      onClick={() => openDetailsModal(o)}
                      title="View / Edit / Delete"
                    >
                      <Settings className="h-4 w-4 text-blue-600" />
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Office Modal */}
      <AnimatedModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Add New Office"
        maxWidthClassName="max-w-xl"
      >
        <form className="space-y-4" onSubmit={handleCreate}>
          <Input
            placeholder="Office Name *"
            value={createForm.name}
            onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))}
            required
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              placeholder="Phone number"
              value={createForm.phone_number}
              onChange={(e) => setCreateForm((s) => ({ ...s, phone_number: e.target.value }))}
            />
            <Input
              placeholder="Email"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))}
            />
          </div>

          <Input
            placeholder="Address"
            value={createForm.address}
            onChange={(e) => setCreateForm((s) => ({ ...s, address: e.target.value }))}
          />

          <div>
            <label className="mb-1 block text-sm font-medium">Office Representative</label>
            <select
              className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
              value={createForm.representative_id}
              onChange={(e) =>
                setCreateForm((s) => ({ ...s, representative_id: e.target.value }))
              }
            >
              <option value="">— Select —</option>
              {repsLoading ? (
                <option disabled>Loading…</option>
              ) : (
                repOptions.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.label}
                  </option>
                ))
              )}
            </select>
          </div>

          {createError && <div className="text-sm text-red-500">{createError}</div>}

          <Button
            type="submit"
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
            disabled={creating}
          >
            {creating ? "Creating..." : "Create Office"}
          </Button>
        </form>
      </AnimatedModal>

      {/* Details / Edit / Delete Modal */}
      <AnimatedModal
        open={openDetails}
        onClose={() => setOpenDetails(false)}
        title={selected ? `Manage Office — ${selected.name}` : "Manage Office"}
        maxWidthClassName="max-w-xl"
      >
        {!selected ? (
          <div className="text-sm text-gray-500 dark:text-dark-6">No office selected.</div>
        ) : (
          <form className="space-y-4" onSubmit={handleUpdate}>
            <Input
              placeholder="Office Name *"
              value={editForm.name}
              onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
              required
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                placeholder="Phone number"
                value={editForm.phone_number}
                onChange={(e) => setEditForm((s) => ({ ...s, phone_number: e.target.value }))}
              />
              <Input
                placeholder="Email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((s) => ({ ...s, email: e.target.value }))}
              />
            </div>

            <Input
              placeholder="Address"
              value={editForm.address}
              onChange={(e) => setEditForm((s) => ({ ...s, address: e.target.value }))}
            />

            <div>
              <label className="mb-1 block text-sm font-medium">Office Representative</label>
              <select
                className="w-full rounded border border-gray-300 p-2 dark:border-dark-2 dark:bg-dark-2"
                value={editForm.representative_id}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, representative_id: e.target.value }))
                }
              >
                <option value="">— Select —</option>
                {repsLoading ? (
                  <option disabled>Loading…</option>
                ) : (
                  repOptions.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.label}
                    </option>
                  ))
                )}
              </select>
            </div>

            {detailsError && <div className="text-sm text-red-500">{detailsError}</div>}

            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  disabled={editing}
                >
                  {editing ? "Saving..." : "Save Changes"}
                </Button>

                <Button
                  type="button"
                  className={`${confirmDelete ? "bg-red-700" : "bg-red-600"} text-white hover:bg-red-700`}
                  onClick={() => (confirmDelete ? handleDelete() : setConfirmDelete(true))}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : confirmDelete ? "Click to Confirm" : "Delete"}
                </Button>
              </div>

              <div className="text-xs text-gray-500 dark:text-dark-6">
                Created: {selected.created_at}
              </div>
            </div>
          </form>
        )}
      </AnimatedModal>

      {/* Success Modal */}
      <SuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="Success"
        message={successMsg}
        autoCloseMs={3000}
      />
    </>
  );
}
