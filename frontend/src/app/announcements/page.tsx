"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AnimatedModal } from "@/components/ui/animated-modal";
import { SuccessModal } from "@/components/ui/success-modal";
import { Plus, Settings, RefreshCcw } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

/* ===================== Types (aligned with your model) ===================== */

type ApiOffice = { id: number | string; name: string };
type ApiGroup  = { id: number | string; name: string };

type Announcement = {
  id: number | string;
  title: string;
  content: string;
  is_active?: boolean;
  created_at?: string | null;
  created_by?: any;

  // M2M can be ids or objects depending on serializer
  recipients_groups?: (number | string | ApiGroup)[] | null;
  recipients_offices?: (number | string | ApiOffice)[] | null;
};

type CreateForm = {
  title: string;
  content: string;                  // <- matches backend
  audienceType: "roles" | "offices";
  groupIds: (string | number)[];    // <- send group IDs
  officeIds: (string | number)[];   // <- send office IDs
  deliveryModes: string[];          // <- delivery channels
};

type EditForm = {
  title: string;
  content: string;
  audienceType: "roles" | "offices";
  groupIds: (string | number)[];
  officeIds: (string | number)[];
  deliveryModes: string[];
};

/* ===================== Helpers ===================== */

const allowedToManage = new Set(["Admin", "Director", "Mayor Office"]);

const fetchAllPaginated = async <T,>(url: string, headers: HeadersInit): Promise<T[]> => {
  let next: string | null = url;
  const all: T[] = [];
  while (next) {
    const res: Response = await fetch(next, { headers, cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} while loading ${next}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      all.push(...(data as T[]));
      next = null;
    } else if (Array.isArray((data as any)?.results)) {
      all.push(...((data as any).results as T[]));
      next = (data as any).next || null;
    } else {
      all.push(data as T);
      next = null;
    }
  }
  return all;
};

// Turn ids/strings/objects into display names using a map (id → name)
function toNames(
  items: Array<string | number | { id?: string|number; name?: string }> | undefined | null,
  map: Map<string, string>
): string[] {
  if (!Array.isArray(items)) return [];
  return items.map((it) => {
    if (typeof it === "object" && it !== null) {
      const name = (it as any).name ?? map.get(String((it as any).id));
      return name ?? String((it as any).id ?? "");
    }
    // string or number – try map; fallback to the raw value
    return map.get(String(it)) ?? String(it);
  });
}

/* ===================== Page ===================== */

export default function AnnouncementsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const role  = typeof window !== "undefined" ? localStorage.getItem("role")  : null;

  const canManage = !!role && allowedToManage.has(role);
  const headers: HeadersInit = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}) as HeadersInit, [token]);

  // Data
  const [rows, setRows] = useState<Announcement[]>([]);
  const [offices, setOffices] = useState<ApiOffice[]>([]);
  const [groups, setGroups] = useState<ApiGroup[]>([]); // roles/groups with id+name

  // Fast lookup maps (id → name)
  const groupMap  = useMemo(() => {
    const m = new Map<string, string>();
    groups.forEach(g => m.set(String(g.id), g.name));
    return m;
  }, [groups]);

  const officeMap = useMemo(() => {
    const m = new Map<string, string>();
    offices.forEach(o => m.set(String(o.id), o.name));
    return m;
  }, [offices]);

  // UX
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");

  // Create
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] = useState<CreateForm>({
    title: "",
    content: "",
    audienceType: "roles",
    groupIds: [],
    officeIds: [],
    deliveryModes: ["in_app"], // Default to in-app only
  });

  // Manage (edit/delete)
  const [openManage, setOpenManage] = useState(false);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState<EditForm>({
    title: "",
    content: "",
    audienceType: "roles",
    groupIds: [],
    officeIds: [],
    deliveryModes: ["in_app"],
  });

  // Success
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  /* ---------- Load ---------- */

  const loadAnnouncements = async () => {
    if (!API_URL || !token) return;
    try {
      setLoading(true);
      setError("");
      const list = await fetchAllPaginated<Announcement>(`${API_URL}/announcements/`, headers);
      list.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
      setRows(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    if (!API_URL || !token) return;
    try {
      const [off, gr] = await Promise.all([
        fetchAllPaginated<ApiOffice>(`${API_URL}/offices/`, headers),
        fetchAllPaginated<ApiGroup>(`${API_URL}/groups/`, headers),
      ]);
      setOffices(off);
      setGroups(gr);
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    loadAnnouncements();
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Filter ---------- */

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.title, r.content].filter(Boolean).some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [rows, search]);

  /* ---------- Create ---------- */

  const resetCreate = () =>
    setCreateForm({ title: "", content: "", audienceType: "roles", groupIds: [], officeIds: [], deliveryModes: ["in_app"] });

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!API_URL) return setCreateError(t("announcements", "apiUrlNotSet"));
    if (!token)   return setCreateError(t("announcements", "notAuthenticated"));
    if (!canManage) return setCreateError(t("announcements", "noPermission"));
    if (!createForm.title.trim())   return setCreateError(t("announcements", "titleRequired"));
    if (!createForm.content.trim()) return setCreateError(t("announcements", "contentRequired"));

    const usingRoles = createForm.audienceType === "roles";
    const recipients_groups  = usingRoles ? createForm.groupIds  : [];
    const recipients_offices = usingRoles ? []                   : createForm.officeIds;

    if (usingRoles && recipients_groups.length === 0)
      return setCreateError(t("announcements", "selectAtLeastOneRole"));
    if (!usingRoles && recipients_offices.length === 0)
      return setCreateError(t("announcements", "selectAtLeastOneOffice"));

    const payload = {
      title: createForm.title.trim(),
      content: createForm.content.trim(), // REQUIRED by backend
      is_active: true,
      recipients_groups,
      recipients_offices,
      delivery_modes: createForm.deliveryModes.length > 0 ? createForm.deliveryModes : ["in_app"],
    };

    try {
      setCreating(true);
      const res = await fetch(`${API_URL}/announcements/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Create failed: ${res.status}`);
      }
      setOpenCreate(false);
      resetCreate();
      await loadAnnouncements();
      setSuccessMsg(t("announcements", "announcementCreated"));
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
    } catch (e: any) {
      setCreateError(e?.message || t("common", "error"));
    } finally {
      setCreating(false);
    }
  };

  /* ---------- Manage (Edit/Delete) ---------- */

  const openManageModal = (row: Announcement) => {
    setSelected(row);
    // Pre-fill edit form with IDs
    const groupsFromRow = (row.recipients_groups || []).map((g) =>
      typeof g === "object" ? (g as ApiGroup).id : g,
    );
    const officesFromRow = (row.recipients_offices || []).map((o) =>
      typeof o === "object" ? (o as ApiOffice).id : o,
    );
    const audienceType: "roles" | "offices" =
      groupsFromRow.length > 0 ? "roles" : "offices";

    setEditForm({
      title: row.title || "",
      content: row.content || "",
      audienceType,
      groupIds: groupsFromRow as (string | number)[],
      officeIds: officesFromRow as (string | number)[],
      deliveryModes: (row as any).delivery_modes || ["in_app"],
    });

    setEditError("");
    setSaving(false);
    setDeleting(false);
    setOpenManage(true);
  };

  const submitSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!API_URL || !selected) return;
    if (!token) return setEditError(t("announcements", "notAuthenticated"));
    if (!canManage) return setEditError(t("announcements", "noPermission"));
    if (!editForm.title.trim())   return setEditError(t("announcements", "titleRequired"));
    if (!editForm.content.trim()) return setEditError(t("announcements", "contentRequired"));

    const usingRoles = editForm.audienceType === "roles";
    const payload = {
      title: editForm.title.trim(),
      content: editForm.content.trim(),
      recipients_groups:  usingRoles ? editForm.groupIds  : [],
      recipients_offices: usingRoles ? []                  : editForm.officeIds,
      delivery_modes: editForm.deliveryModes.length > 0 ? editForm.deliveryModes : ["in_app"],
    };

    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/announcements/${selected.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Update failed: ${res.status}`);
      }
      setOpenManage(false);
      await loadAnnouncements();
      setSuccessMsg(t("announcements", "announcementUpdated"));
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
    } catch (e: any) {
      setEditError(e?.message || t("common", "error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!API_URL || !selected) return;
    if (!token) return setEditError(t("announcements", "notAuthenticated"));
    if (!canManage) return setEditError(t("announcements", "noPermission"));
    try {
      setDeleting(true);
      const res = await fetch(`${API_URL}/announcements/${selected.id}/`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok && res.status !== 204) {
        const msg = await res.text();
        throw new Error(msg || `Delete failed: ${res.status}`);
      }
      setOpenManage(false);
      await loadAnnouncements();
      setSuccessMsg(t("announcements", "announcementDeleted"));
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
    } catch (e: any) {
      setEditError(e?.message || t("common", "error"));
    } finally {
      setDeleting(false);
    }
  };

  /* ---------- Render ---------- */

  return (
    <>
      <Breadcrumb pageName={t("announcements", "title")} />

      <div className={cn("rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card")}>
        {/* Top bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder={t("announcements", "searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[300px]"
            />
            <Button variant="ghost" onClick={loadAnnouncements} title={t("announcements", "refresh")}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>

          {canManage && (
            <Button
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => {
                setCreateError("");
                resetCreate();
                setOpenCreate(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("announcements", "addNew")}
            </Button>
          )}
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="[&>th]:text-center">
              <TableHead className="!text-left">{t("announcements", "titleLabel")}</TableHead>
              <TableHead>{t("announcements", "audience")}</TableHead>
              <TableHead>{t("announcements", "date")}</TableHead>
              {canManage && <TableHead>{t("announcements", "action")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={canManage ? 4 : 3} className="py-4 text-center text-gray-500 dark:text-gray-300">
                  {t("announcements", "loading")}
                </TableCell>
              </TableRow>
            )}

            {!loading && !!error && (
              <TableRow>
                <TableCell colSpan={canManage ? 4 : 3} className="py-4 text-center text-red-500">
                  {error}
                </TableCell>
              </TableRow>
            )}

            {!loading && !error && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={canManage ? 4 : 3} className="py-4 text-center text-gray-500 dark:text-gray-300">
                  {t("announcements", "noAnnouncementsFound")}
                </TableCell>
              </TableRow>
            )}

            {!loading && !error && filtered.map((a) => {
              // Convert whatever the API returned (ids/objects/strings) to *names*
              const roleNames   = toNames(a.recipients_groups   as any, groupMap);
              const officeNames = toNames(a.recipients_offices  as any, officeMap);

              const audienceStr =
                roleNames.length   > 0 ? `${t("announcements", "roles")}: ${roleNames.join(", ")}`
              : officeNames.length > 0 ? `${t("announcements", "offices")}: ${officeNames.join(", ")}`
              : "—";

              return (
                <TableRow key={String(a.id)} className="text-center text-base font-medium text-dark dark:text-white">
                  <TableCell className="!text-left">
                    <div className="font-semibold text-[#5750f1]">{a.title}</div>
                    {a.content && (
                      <div className="text-sm text-gray-600 dark:text-dark-6 line-clamp-2">
                        {a.content}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{audienceStr}</TableCell>
                  <TableCell className="text-sm">{a.created_at ? String(a.created_at).slice(0, 10) : "—"}</TableCell>
                  {canManage && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mx-auto flex items-center gap-2"
                        onClick={() => openManageModal(a)}
                        title={t("announcements", "manage")}
                      >
                        <Settings className="h-4 w-4 text-blue-600" />
                        {t("announcements", "manage")}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Create Modal */}
      <AnimatedModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title={t("announcements", "createAnnouncement")}
        maxWidthClassName="max-w-xl"
      >
        {!canManage ? (
          <div className="text-sm text-gray-500">{t("announcements", "noPermission")}</div>
        ) : (
          <form className="space-y-4" onSubmit={submitCreate}>
            <Input
              placeholder={`${t("announcements", "titleLabel")} *`}
              value={createForm.title}
              onChange={(e) => setCreateForm((s) => ({ ...s, title: e.target.value }))}
              required
            />
            <textarea
              className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
              rows={5}
              placeholder={`${t("announcements", "contentLabel")} *`}
              value={createForm.content}
              onChange={(e) => setCreateForm((s) => ({ ...s, content: e.target.value }))}
              required
            />

            {/* Audience selector */}
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="audienceType"
                  checked={createForm.audienceType === "roles"}
                  onChange={() => setCreateForm((s) => ({ ...s, audienceType: "roles", officeIds: [] }))}
                />
                {t("announcements", "roles")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="audienceType"
                  checked={createForm.audienceType === "offices"}
                  onChange={() => setCreateForm((s) => ({ ...s, audienceType: "offices", groupIds: [] }))}
                />
                {t("announcements", "offices")}
              </label>
            </div>

            {createForm.audienceType === "roles" ? (
              <div>
                <div className="mb-1 text-sm font-medium">{t("announcements", "selectRoles")}</div>
                <div className="max-h-40 overflow-auto rounded border p-2 dark:border-dark-3">
                  {groups.length === 0 ? (
                    <div className="text-sm text-gray-500">{t("users", "noUsersFound")}</div>
                  ) : (
                    groups.map((g) => (
                      <label key={String(g.id)} className="flex items-center gap-2 py-1 text-sm">
                        <input
                          type="checkbox"
                          checked={createForm.groupIds.map(String).includes(String(g.id))}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setCreateForm((s) => ({
                              ...s,
                              groupIds: checked
                                ? [...s.groupIds, g.id]
                                : s.groupIds.filter((x) => String(x) !== String(g.id)),
                            }));
                          }}
                        />
                        {g.name}
                      </label>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-1 text-sm font-medium">Select Offices</div>
                <div className="max-h-40 overflow-auto rounded border p-2 dark:border-dark-3">
                  {offices.length === 0 ? (
                    <div className="text-sm text-gray-500">No offices found.</div>
                  ) : (
                    offices.map((o) => (
                      <label key={String(o.id)} className="flex items-center gap-2 py-1 text-sm">
                        <input
                          type="checkbox"
                          checked={createForm.officeIds.map(String).includes(String(o.id))}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setCreateForm((s) => ({
                              ...s,
                              officeIds: checked
                                ? [...s.officeIds, o.id]
                                : s.officeIds.filter((x) => String(x) !== String(o.id)),
                            }));
                          }}
                        />
                        {o.name}
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Delivery Mode Selection */}
            <div>
              <div className="mb-1 text-sm font-medium">Delivery Channels *</div>
              <div className="space-y-2 rounded border p-3 dark:border-dark-3">
                {[
                  { value: "in_app", label: "In-App Notification" },
                  { value: "email", label: "Email" },
                  { value: "sms", label: "SMS" },
                  { value: "whatsapp", label: "WhatsApp" },
                  { value: "telegram", label: "Telegram" },
                  { value: "all", label: "All Channels" },
                ].map((mode) => (
                  <label key={mode.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={createForm.deliveryModes.includes(mode.value)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setCreateForm((s) => {
                          if (mode.value === "all") {
                            // If "all" is selected, replace all modes
                            return {
                              ...s,
                              deliveryModes: checked
                                ? ["all"]
                                : s.deliveryModes.filter((m) => m !== "all"),
                            };
                          }
                          // If "all" is currently selected and user selects another mode, remove "all"
                          let newModes = checked
                            ? [...s.deliveryModes.filter((m) => m !== "all"), mode.value]
                            : s.deliveryModes.filter((m) => m !== mode.value);
                          // Ensure at least one mode is selected
                          if (newModes.length === 0) {
                            newModes = ["in_app"];
                          }
                          return { ...s, deliveryModes: newModes };
                        });
                      }}
                    />
                    {mode.label}
                  </label>
                ))}
              </div>
            </div>

            {createError && <div className="text-sm text-red-500">{createError}</div>}

            <Button
              type="submit"
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
              disabled={creating}
            >
              {creating ? t("announcements", "creating") : t("announcements", "create")}
            </Button>
          </form>
        )}
      </AnimatedModal>

      {/* Manage Modal */}
      <AnimatedModal
        open={openManage}
        onClose={() => setOpenManage(false)}
        title={selected ? `${t("announcements", "manageAnnouncement")}: ${selected.title}` : t("announcements", "manageAnnouncement")}
        maxWidthClassName="max-w-xl"
      >
        {!canManage ? (
          <div className="text-sm text-gray-500">{t("announcements", "noPermission")}</div>
        ) : !selected ? (
          <div className="text-sm text-gray-500">{t("common", "none")}</div>
        ) : (
          <form className="space-y-4" onSubmit={submitSave}>
            <Input
              placeholder={`${t("announcements", "titleLabel")} *`}
              value={editForm.title}
              onChange={(e) => setEditForm((s) => ({ ...s, title: e.target.value }))}
              required
            />
            <textarea
              className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
              rows={5}
              placeholder={`${t("announcements", "contentLabel")} *`}
              value={editForm.content}
              onChange={(e) => setEditForm((s) => ({ ...s, content: e.target.value }))}
              required
            />

            {/* Audience toggle */}
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="editAudienceType"
                  checked={editForm.audienceType === "roles"}
                  onChange={() => setEditForm((s) => ({ ...s, audienceType: "roles", officeIds: [] }))}
                />
                {t("announcements", "roles")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="editAudienceType"
                  checked={editForm.audienceType === "offices"}
                  onChange={() => setEditForm((s) => ({ ...s, audienceType: "offices", groupIds: [] }))}
                />
                {t("announcements", "offices")}
              </label>
            </div>

            {/* Show the current audience as names (readable) */}
            <div className="rounded border p-3 text-xs dark:border-dark-3">
              <div className="font-medium mb-1">{t("announcements", "currentAudience")}</div>
              <div className="space-y-1">
                {editForm.audienceType === "roles" ? (
                  <div>
                    {t("announcements", "roles")}:&nbsp;
                    {toNames(
                      (selected.recipients_groups || []).map((g) =>
                        typeof g === "object" ? (g as ApiGroup).id : g
                      ),
                      groupMap
                    ).join(", ") || "—"}
                  </div>
                ) : (
                  <div>
                    {t("announcements", "offices")}:&nbsp;
                    {toNames(
                      (selected.recipients_offices || []).map((o) =>
                        typeof o === "object" ? (o as ApiOffice).id : o
                      ),
                      officeMap
                    ).join(", ") || "—"}
                  </div>
                )}
              </div>
            </div>

            {/* Editable audience pickers */}
            {editForm.audienceType === "roles" ? (
              <div>
                <div className="mb-1 text-sm font-medium">{t("announcements", "selectRoles")}</div>
                <div className="max-h-40 overflow-auto rounded border p-2 dark:border-dark-3">
                  {groups.length === 0 ? (
                    <div className="text-sm text-gray-500">{t("common", "none")}</div>
                  ) : (
                    groups.map((g) => (
                      <label key={String(g.id)} className="flex items-center gap-2 py-1 text-sm">
                        <input
                          type="checkbox"
                          checked={editForm.groupIds.map(String).includes(String(g.id))}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setEditForm((s) => ({
                              ...s,
                              groupIds: checked
                                ? [...s.groupIds, g.id]
                                : s.groupIds.filter((x) => String(x) !== String(g.id)),
                            }));
                          }}
                        />
                        {g.name}
                      </label>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-1 text-sm font-medium">Select Offices</div>
                <div className="max-h-40 overflow-auto rounded border p-2 dark:border-dark-3">
                  {offices.length === 0 ? (
                    <div className="text-sm text-gray-500">No offices found.</div>
                  ) : (
                    offices.map((o) => (
                      <label key={String(o.id)} className="flex items-center gap-2 py-1 text-sm">
                        <input
                          type="checkbox"
                          checked={editForm.officeIds.map(String).includes(String(o.id))}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setEditForm((s) => ({
                              ...s,
                              officeIds: checked
                                ? [...s.officeIds, o.id]
                                : s.officeIds.filter((x) => String(x) !== String(o.id)),
                            }));
                          }}
                        />
                        {o.name}
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Delivery Mode Selection */}
            <div>
              <div className="mb-1 text-sm font-medium">Delivery Channels *</div>
              <div className="space-y-2 rounded border p-3 dark:border-dark-3">
                {[
                  { value: "in_app", label: "In-App Notification" },
                  { value: "email", label: "Email" },
                  { value: "sms", label: "SMS" },
                  { value: "whatsapp", label: "WhatsApp" },
                  { value: "telegram", label: "Telegram" },
                  { value: "all", label: "All Channels" },
                ].map((mode) => (
                  <label key={mode.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editForm.deliveryModes.includes(mode.value)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEditForm((s) => {
                          if (mode.value === "all") {
                            return {
                              ...s,
                              deliveryModes: checked
                                ? ["all"]
                                : s.deliveryModes.filter((m) => m !== "all"),
                            };
                          }
                          let newModes = checked
                            ? [...s.deliveryModes.filter((m) => m !== "all"), mode.value]
                            : s.deliveryModes.filter((m) => m !== mode.value);
                          if (newModes.length === 0) {
                            newModes = ["in_app"];
                          }
                          return { ...s, deliveryModes: newModes };
                        });
                      }}
                    />
                    {mode.label}
                  </label>
                ))}
              </div>
            </div>

            {editError && <div className="text-sm text-red-500">{editError}</div>}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  disabled={saving}
                >
                  {saving ? t("announcements", "saving") : t("announcements", "saveChanges")}
                </Button>

                <Button
                  type="button"
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? t("announcements", "deleting") : t("announcements", "delete")}
                </Button>
              </div>

              <div className="text-xs text-gray-500 dark:text-dark-6">
                {t("announcements", "created")}: {selected?.created_at ? String(selected.created_at).slice(0, 10) : "—"}
              </div>
            </div>
          </form>
        )}
      </AnimatedModal>

      {/* Success modal */}
      <SuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title={t("common", "success")}
        message={successMsg}
        autoCloseMs={3000}
      />
    </>
  );
}
