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
  representative_id: string | number | "";
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
  representative_id: o.office_representative != null ? String(o.office_representative) : "",
  representative_name: o.representative_name || "", // will be backfilled from repMap if empty
  created_at: o.created_at ? String(o.created_at).slice(0, 10) : "—",
});

/* ===================== Page ===================== */

export default function OfficesPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const authHeaders: HeadersInit | undefined = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;

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
      const requestInit: RequestInit = { cache: "no-store" };
      if (authHeaders) {
        requestInit.headers = authHeaders;
      }
      const res: Response = await fetch(nextUrl, requestInit);
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
      const data: any = await res.json();

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

  const loadOffices = async (): Promise<OfficeRow[]> => {
    if (!API_URL) {
      setPageError("ENV NEXT_PUBLIC_API_URL is not set");
      return [];
    }
    try {
      setLoading(true);
      setPageError("");
      const data = await fetchAllOffices();
      const rows = (Array.isArray(data) ? data : []).map((office) => {
        const row = mapOfficeRow(office);
        const repLabel =
          row.representative_id
            ? repMap[String(row.representative_id)] || row.representative_name
            : row.representative_name;
        return {
          ...row,
          representative_name: repLabel || "",
        };
      });
      setOffices(rows);
      return rows;
    } catch (err: any) {
      setPageError(err?.message || "Failed to load offices");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadRepresentatives = async (officeRows: OfficeRow[] = offices, currentOfficeId?: string | number) => {
    if (!API_URL) return;
    try {
      setRepsLoading(true);
      const users = await fetchAllUsers();

      const optionMap = new Map<string, { id: string | number; label: string }>();

      // Collect existing representative IDs - these are users already representing other offices
      const existingRepIds = new Set(
        officeRows
          .filter((o) => o.representative_id !== "" && String(o.id) !== String(currentOfficeId))
          .map((o) => String(o.representative_id))
      );

      // Collect the current office's representative ID to keep them available
      const currentOfficeRepId = currentOfficeId
        ? officeRows.find((o) => String(o.id) === String(currentOfficeId))?.representative_id
        : undefined;

      (users || []).forEach((u) => {
        const userId = String(u.id);
        const userGroups = u.groups || [];
        const groupNames = userGroups.map((g) => 
          typeof g === "string" ? g : g?.name || ""
        ).filter(Boolean);
        
        // Skip if user has Citizen role
        if (groupNames.includes("Citizen")) {
          // But allow if they're the current office's representative
          if (currentOfficeRepId && String(currentOfficeRepId) === userId) {
            // Allow current office's representative even if Citizen
          } else {
            return; // Skip Citizen users
          }
        }
        
        // Skip if user is already a representative for another office
        // (but allow if they're the current office's representative)
        if (existingRepIds.has(userId)) {
          if (currentOfficeRepId && String(currentOfficeRepId) === userId) {
            // Allow current office's representative
          } else {
            return; // Skip users who are already representatives elsewhere
          }
        }
        
        const label =
            `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
            u.email ||
            u.username ||
            String(u.id);
        optionMap.set(userId, { id: u.id, label });
      });

      // Add existing representatives that might not be in the users list (for current office only)
      if (currentOfficeId) {
        const currentOffice = officeRows.find((o) => String(o.id) === String(currentOfficeId));
        if (currentOffice && currentOffice.representative_id !== "") {
          const key = String(currentOffice.representative_id);
          if (!optionMap.has(key)) {
            optionMap.set(key, {
              id: currentOffice.representative_id,
              label: currentOffice.representative_name || `User #${key}`,
            });
          }
        }
      }

      const options = Array.from(optionMap.values()).sort((a, b) =>
        a.label.localeCompare(b.label),
      );

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
    const init = async () => {
      const rows = await loadOffices();
      await loadRepresentatives(rows);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Backfill representative names from repMap whenever reps are ready
  useEffect(() => {
    if (!Object.keys(repMap).length) return;
    setOffices((prev) =>
      prev.map((o) => ({
        ...o,
        representative_name:
          o.representative_id
            ? repMap[String(o.representative_id)] || o.representative_name || ""
            : o.representative_name,
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

    let errorHandled = false;

    try {
      setCreating(true);
      const payload: Partial<ApiOffice> = {
        name: createForm.name.trim(),
        phone_number: createForm.phone_number || undefined,
        email: createForm.email || undefined,
        address: createForm.address || undefined,
        office_representative:
          createForm.representative_id === ""
            ? undefined
            : isNaN(Number(createForm.representative_id))
            ? createForm.representative_id
            : Number(createForm.representative_id),
      };

      const res = await fetch(`${API_URL}/offices/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Read response as text first (can only read once)
        const responseText = await res.text();
        let errorMessage = `Create failed: ${res.status}`;
        
        try {
          // Try to parse as JSON
          const errorData = JSON.parse(responseText);
          if (errorData.detail) {
            errorMessage = typeof errorData.detail === 'string' 
              ? errorData.detail 
              : Array.isArray(errorData.detail) 
                ? errorData.detail[0] 
                : errorMessage;
          } else if (errorData.message) {
            errorMessage = typeof errorData.message === 'string'
              ? errorData.message
              : Array.isArray(errorData.message)
                ? errorData.message[0]
                : errorMessage;
          }
        } catch {
          // If JSON parsing fails, use the text as-is
          errorMessage = responseText || errorMessage;
        }
        
        setCreateError(errorMessage);
        errorHandled = true;
        return; // Exit early, don't proceed with success flow
      }

      const rows = await loadOffices();
      await loadRepresentatives(rows);
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
      // Only set error if we haven't already handled it above
      if (!errorHandled) {
        setCreateError(err?.message || "Failed to create office");
      }
    } finally {
      setCreating(false);
    }
  };

  /* ------------- Details / Edit / Delete ------------- */

  const openDetailsModal = async (row: OfficeRow) => {
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
    // Reload representatives for this specific office (to show current rep even if they're already rep elsewhere)
    await loadRepresentatives(offices, row.id);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setDetailsError("");
    if (!API_URL) return setDetailsError("API URL not set");
    if (!token) return setDetailsError("You are not authenticated");
    if (!editForm.name.trim()) return setDetailsError("Office name is required");

    let errorHandled = false;

    try {
      setEditing(true);
      const payload: Partial<ApiOffice> = {
        name: editForm.name.trim(),
        phone_number: editForm.phone_number || "",
        email: editForm.email || "",
        address: editForm.address || "",
        office_representative:
          editForm.representative_id === ""
            ? null
            : isNaN(Number(editForm.representative_id))
            ? editForm.representative_id
            : Number(editForm.representative_id),
      };

      const res = await fetch(`${API_URL}/offices/${selected.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Read response as text first (can only read once)
        const responseText = await res.text();
        let errorMessage = `Update failed: ${res.status}`;
        
        try {
          // Try to parse as JSON
          const errorData = JSON.parse(responseText);
          if (errorData.detail) {
            errorMessage = typeof errorData.detail === 'string' 
              ? errorData.detail 
              : Array.isArray(errorData.detail) 
                ? errorData.detail[0] 
                : errorMessage;
          } else if (errorData.message) {
            errorMessage = typeof errorData.message === 'string'
              ? errorData.message
              : Array.isArray(errorData.message)
                ? errorData.message[0]
                : errorMessage;
          }
        } catch {
          // If JSON parsing fails, use the text as-is
          errorMessage = responseText || errorMessage;
        }
        
        setDetailsError(errorMessage);
        errorHandled = true;
        return; // Exit early, don't proceed with success flow
      }

      const rows = await loadOffices();
      await loadRepresentatives(rows);
      setOpenDetails(false);

      setSuccessMsg("Office updated successfully.");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
    } catch (err: any) {
      // Only set error if we haven't already handled it above
      if (!errorHandled) {
        setDetailsError(err?.message || "Failed to update office");
      }
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDetailsError("");
    if (!API_URL) return setDetailsError("API URL not set");
    if (!token) return setDetailsError("You are not authenticated");

    let errorHandled = false;

    try {
      setDeleting(true);
      const res = await fetch(`${API_URL}/offices/${selected.id}/`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok && res.status !== 204) {
        // Read response as text first (can only read once)
        const responseText = await res.text();
        let errorMessage = `Delete failed: ${res.status}`;
        
        try {
          // Try to parse as JSON
          const errorData = JSON.parse(responseText);
          if (errorData.detail) {
            errorMessage = typeof errorData.detail === 'string' 
              ? errorData.detail 
              : Array.isArray(errorData.detail) 
                ? errorData.detail[0] 
                : errorMessage;
          } else if (errorData.message) {
            errorMessage = typeof errorData.message === 'string'
              ? errorData.message
              : Array.isArray(errorData.message)
                ? errorData.message[0]
                : errorMessage;
          }
        } catch {
          // If JSON parsing fails, use the text as-is (but clean it up)
          errorMessage = responseText || errorMessage;
        }
        
        setDetailsError(errorMessage);
        errorHandled = true;
        return; // Exit early, don't proceed with success flow
      }

      const rows = await loadOffices();
      await loadRepresentatives(rows);
      setOpenDetails(false);

      setSuccessMsg("Office deleted successfully.");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
    } catch (err: any) {
      // Only set error if we haven't already handled it above
      if (!errorHandled) {
        setDetailsError(err?.message || "Failed to delete office");
      }
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
              <TableHead>Representative</TableHead>
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
                    {o.representative_name ||
                      (o.representative_id
                        ? repMap[String(o.representative_id)] || "—"
                        : "—")}
                  </TableCell>
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
