"use client";

import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatedModal } from "@/components/ui/animated-modal";
import { SuccessModal } from "@/components/ui/success-modal";

/* ---------------- Types ---------------- */
type ApiCase = {
  id: number | string;
  title?: string;
  description?: string;
  category_id?: string;
  channel?: string;
  priority?: string;
  status?: string;
  created_at?: string;
  attachments?: Array<{ name?: string; data?: string; type?: string; size?: number }>;
  office?: number | string | null;
  office_id?: number | string | null;
  assigned_to?: number | string | null;
  assignee_id?: number | string | null;
  responsible_id?: number | string | null;
};

type ApiOffice = { id: number | string; name: string };
type ApiUser = {
  id: number | string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  groups?: Array<{ name: string } | string> | null;
};

/* ---------------- UI helpers ---------------- */
const statusColors: Record<string, string> = {
  Pending: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  "In Investigation":
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  Resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  Closed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const apiToUiStatus = (s?: string) => {
  if (!s) return "Pending";
  const norm = s.toLowerCase();
  if (norm === "in_investigation" || norm === "in-investigation") return "In Investigation";
  return (
    {
      pending: "Pending",
      resolved: "Resolved",
      rejected: "Rejected",
      closed: "Closed",
    }[norm] || "Pending"
  );
};
const uiToApiStatus: Record<string, string> = {
  Pending: "pending",
  "In Investigation": "in_investigation",
  Resolved: "resolved",
  Rejected: "rejected",
  Closed: "closed",
};

const fetchAllPaginated = async <T,>(
  url: string,
  headers: Record<string, string>,
): Promise<T[]> => {
  let next: string | null = url;
  const all: T[] = [];
  while (next) {
    const res = await fetch(next, { headers, cache: "no-store" });
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

/* ---------------- Page ---------------- */
export default function CaseViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // Data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [caseData, setCaseData] = useState<ApiCase | null>(null);

  // Options
  const [offices, setOffices] = useState<ApiOffice[]>([]);
  const [members, setMembers] = useState<ApiUser[]>([]);
  const [loadingOffices, setLoadingOffices] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Modals
  const [modalOpen, setModalOpen] = useState<"transfer" | "assign" | "status" | null>(null);

  // Form values
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>("");
  const [transferReason, setTransferReason] = useState<string>("");

  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [assignReason, setAssignReason] = useState<string>("");

  const [selectedStatusUI, setSelectedStatusUI] = useState<string>("Pending");

  // Success
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Role gate
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const actionRoles = [
    "Focal Person - Kebele",
    "Focal Person - Wereda",
    "Focal Person - Sector",
    "Director",
    "President Office",
    "President",
  ];

  /* -------- load data -------- */
  const loadCase = async () => {
    if (!API_URL || !id || !token) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_URL}/cases/${id}/`, { headers });
      if (!res.ok) throw new Error(`Failed to load case: ${res.status}`);
      const c: ApiCase = await res.json();
      setCaseData(c);
      setSelectedStatusUI(apiToUiStatus(c.status));
    } catch (e: any) {
      setError(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadOffices = async () => {
    if (!API_URL || !token) return;
    try {
      setLoadingOffices(true);
      const list = await fetchAllPaginated<ApiOffice>(`${API_URL}/offices/`, headers);
      setOffices(list.filter(Boolean));
    } catch {
      setOffices([]);
    } finally {
      setLoadingOffices(false);
    }
  };

  const loadMembers = async () => {
    if (!API_URL || !token) return;
    try {
      setLoadingMembers(true);
      const list = await fetchAllPaginated<ApiUser>(`${API_URL}/users/`, headers);
      const filtered = (list || []).filter((u) => {
        const groups = (u?.groups || [])
          .map((g) => (typeof g === "string" ? g : g?.name))
          .filter(Boolean) as string[];
        return !groups.includes("Citizen");
      });
      setMembers(filtered);
    } catch {
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    loadCase();
    loadOffices();
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* -------- options -------- */
  const officeOptions = useMemo(
    () =>
      offices
        .map((o) => ({ id: String(o.id), label: o.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [offices],
  );

  const memberOptions = useMemo(
    () =>
      members
        .map((u) => {
          const full = `${u.first_name || ""} ${u.last_name || ""}`.trim();
          return { id: String(u.id), label: full || u.email || u.username || String(u.id) };
        })
        .sort((a, b) => a.label.localeCompare(b.label)),
    [members],
  );

  /* -------- modal openers (pre-fill) -------- */
  const openTransfer = () => {
    setSelectedOfficeId(
      caseData?.office_id ? String(caseData.office_id) :
      typeof caseData?.office === "number" || typeof caseData?.office === "string"
        ? String(caseData.office)
        : "",
    );
    setTransferReason("");
    setModalOpen("transfer");
  };

  const openAssign = () => {
    const currentAssignee =
      (caseData?.assigned_to ?? caseData?.assignee_id ?? caseData?.responsible_id) ?? "";
    setSelectedMemberId(currentAssignee ? String(currentAssignee) : "");
    setAssignReason("");
    setModalOpen("assign");
  };

  const openChangeStatus = () => {
    setSelectedStatusUI(apiToUiStatus(caseData?.status));
    setModalOpen("status");
  };

  /* -------- endpoints -------- */
  const TRANSFER_URL = API_URL ? `${API_URL}/transfers/` : "";
  const ASSIGN_URL = API_URL ? `${API_URL}/assignments/` : "";

  /* -------- helpers to fetch ids of current user/office -------- */
  const currentUserId =
    (typeof window !== "undefined" && localStorage.getItem("user_id")) || "";
  const currentOfficeId =
    (typeof window !== "undefined" && localStorage.getItem("office_id")) ||
    // fallback to case's office if you want:
    (caseData?.office_id ? String(caseData.office_id) : "");

  /* -------- action handlers -------- */
  const handleTransfer = async () => {
    if (!TRANSFER_URL || !token) return setError("Missing API URL or auth");
    if (!selectedOfficeId) return;
    if (!currentOfficeId) return setError("Your office is unknown (office_id missing).");
    if (!transferReason.trim()) return;

    try {
      const payload = {
        case_id: String(id),
        from_office_id: String(currentOfficeId),
        to_office_id: String(selectedOfficeId),
        reason: transferReason.trim(),
      };
      const res = await fetch(TRANSFER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Transfer failed: ${res.status}`);
      }
      setModalOpen(null);
      setSuccessMsg("Case transferred successfully.");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
      await loadCase();
    } catch (e: any) {
      setError(e?.message || "Transfer failed");
    }
  };

  const handleAssign = async () => {
    if (!ASSIGN_URL || !token) return setError("Missing API URL or auth");
    if (!selectedMemberId) return;
    if (!currentUserId) return setError("Your user id is unknown (user_id missing).");
    if (!assignReason.trim()) return;

    try {
      const payload = {
        case_id: String(id),
        from_user_id: String(currentUserId),
        to_user_id: String(selectedMemberId),
        reason: assignReason.trim(),
      };
      const res = await fetch(ASSIGN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Assign failed: ${res.status}`);
      }
      setModalOpen(null);
      setSuccessMsg("Case assigned successfully.");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
      await loadCase();
    } catch (e: any) {
      setError(e?.message || "Assignment failed");
    }
  };

  const handleChangeStatus = async () => {
    if (!API_URL || !token) return setError("Missing API URL or auth");
    try {
      const apiStatus = uiToApiStatus[selectedStatusUI] || "pending";
      const res = await fetch(`${API_URL}/cases/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ status: apiStatus }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Status update failed: ${res.status}`);
      }
      setModalOpen(null);
      setSuccessMsg("Status updated successfully.");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
      await loadCase();
    } catch (e: any) {
      setError(e?.message || "Status update failed");
    }
  };

  /* -------- render -------- */
  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        {error}
        <Button onClick={() => router.push("/cases")} className="ml-4">
          Back
        </Button>
      </div>
    );
  }
  if (!caseData) {
    return (
      <div className="p-6 text-center text-red-500">
        Case not found.
        <Button onClick={() => router.push("/cases")} className="ml-4">
          Back
        </Button>
      </div>
    );
  }

  const titleCaseStatus = apiToUiStatus(caseData.status);
  const isClosed = titleCaseStatus === "Closed";

  return (
    <div className="p-6">
      <Button
        variant="ghost"
        className="mb-4 flex items-center gap-2"
        onClick={() => router.push("/cases")}
      >
        <ArrowLeft className="h-4 w-4" /> Back to Cases
      </Button>

      <Card className="shadow-lg border rounded-2xl max-w-3xl mx-auto bg-white dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-xl font-bold">{caseData.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-gray-700 dark:text-gray-300">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold">Category</p>
              <p className="capitalize">{caseData.category_id || "—"}</p>
            </div>
            <div>
              <p className="font-semibold">Created</p>
              <p>{caseData.created_at ? String(caseData.created_at).slice(0, 10) : "—"}</p>
            </div>
            <div>
              <p className="font-semibold">Channel</p>
              <p className="capitalize">{caseData.channel || "—"}</p>
            </div>
            <div>
              <p className="font-semibold">Priority</p>
              <p className="capitalize">{caseData.priority || "—"}</p>
            </div>
            <div>
              <p className="font-semibold">Status</p>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  statusColors[titleCaseStatus] || ""
                }`}
              >
                {titleCaseStatus}
              </span>
            </div>
          </div>

          <div>
            <p className="font-semibold">Title</p>
            <p className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-700">
              {caseData.title || "—"}
            </p>
          </div>
          <div>
            <p className="font-semibold">Description</p>
            <p className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-700">
              {caseData.description || "—"}
            </p>
          </div>

          <div>
            <p className="font-semibold">Attachments</p>
            {Array.isArray(caseData.attachments) && caseData.attachments.length > 0 ? (
              <ul className="space-y-2">
                {caseData.attachments.map((a, idx) => (
                  <li key={`${a.name || idx}`} className="flex items-center gap-3">
                    <a
                      href={a.data || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      {a.name || `Attachment ${idx + 1}`}
                    </a>
                    <span className="text-xs text-gray-500">
                      {a.type} {a.size ? `(${Math.round(a.size / 1024)} KB)` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 border rounded-md bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                No files uploaded
              </div>
            )}
          </div>

          {/* Actions */}
          {role === "Citizen" ? (
            <div className="flex gap-3 pt-4">
              {isClosed ? (
                <>
                  <Button
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => router.push(`/cases/${caseData.id}/appeal`)}
                  >
                    Submit Appeal
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => router.push(`/cases/${caseData.id}/feedback`)}
                  >
                    Give Feedback
                  </Button>
                </>
              ) : (
                <Button
                  className="rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => router.push(`/cases/${caseData.id}/edit`)}
                >
                  Edit
                </Button>
              )}
            </div>
          ) : (
            role &&
            actionRoles.includes(role) && (
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="rounded-lg border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:border-yellow-400"
                  onClick={openTransfer}
                >
                  Transfer
                </Button>
                <Button
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={openAssign}
                >
                  Assign
                </Button>
                <Button
                  className="rounded-lg bg-green-600 hover:bg-green-700 text-white"
                  onClick={openChangeStatus}
                >
                  Change Status
                </Button>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Transfer Modal (with Reason) */}
      <AnimatedModal
        open={modalOpen === "transfer"}
        onClose={() => setModalOpen(null)}
        title="Transfer Case"
        maxWidthClassName="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Select Office</label>
            <select
              className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
              value={selectedOfficeId}
              onChange={(e) => setSelectedOfficeId(e.target.value)}
            >
              <option value="">— Select —</option>
              {loadingOffices ? (
                <option disabled>Loading…</option>
              ) : (
                officeOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Reason</label>
            <textarea
              className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
              rows={3}
              placeholder="Explain why this case is being transferred…"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(null)}>
              Cancel
            </Button>
            <Button
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
              onClick={handleTransfer}
              disabled={!selectedOfficeId || !transferReason.trim()}
            >
              Confirm Transfer
            </Button>
          </div>
        </div>
      </AnimatedModal>

      {/* Assign Modal (with Reason) */}
      <AnimatedModal
        open={modalOpen === "assign"}
        onClose={() => setModalOpen(null)}
        title="Assign Case"
        maxWidthClassName="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Assign To</label>
            <select
              className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
            >
              <option value="">— Select —</option>
              {loadingMembers ? (
                <option disabled>Loading…</option>
              ) : (
                memberOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Reason</label>
            <textarea
              className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
              rows={3}
              placeholder="Explain why this case is being assigned…"
              value={assignReason}
              onChange={(e) => setAssignReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(null)}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleAssign}
              disabled={!selectedMemberId || !assignReason.trim()}
            >
              Confirm Assign
            </Button>
          </div>
        </div>
      </AnimatedModal>

      {/* Change Status Modal (unchanged) */}
      <AnimatedModal
        open={modalOpen === "status"}
        onClose={() => setModalOpen(null)}
        title="Change Status"
        maxWidthClassName="max-w-md"
      >
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {["Pending", "In Investigation", "Resolved", "Rejected", "Closed"].map((s) => (
            <label key={s} className="flex items-center gap-2">
              <input
                type="radio"
                name="status"
                value={s}
                checked={selectedStatusUI === s}
                onChange={() => setSelectedStatusUI(s)}
              />
              <span>{s}</span>
            </label>
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModalOpen(null)}>
            Cancel
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={handleChangeStatus}
          >
            Confirm
          </Button>
        </div>
      </AnimatedModal>

      {/* Success Modal */}
      <SuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="Success"
        message={successMsg}
        autoCloseMs={3000}
      />
    </div>
  );
}
