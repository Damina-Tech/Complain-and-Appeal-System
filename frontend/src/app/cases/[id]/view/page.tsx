"use client";

import { useParams, useRouter } from "next/navigation";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { AnimatedModal } from "@/components/ui/animated-modal";
import { SuccessModal } from "@/components/ui/success-modal";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { cn } from "@/lib/utils";
import { submitCaseFeedback, submitCaseAppeal } from "@/utils/api";

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
  citizen_id?: number | string | null;
  added_by?: number | string | null;
  added_by_name?: string | null;
  added_by_role?: string | null;
  reported_by?: number | string | null;
  reported_by_name?: string | null;
  reported_by_role?: string | null;
  status_changed_by?: number | string | null;
  status_changed_by_name?: string | null;
  status_changed_by_role?: string | null;
  status_history?: Array<{
    id: number | string;
    status: string;
    changed_at: string;
    changed_by: number | string;
    changed_by_name?: string;
    changed_by_role?: string;
  }>;
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
  Draft: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Pending: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", // Legacy support
  "In Investigation": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  Resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  Closed: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "On Appeal": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const apiToUiStatus = (s?: string) => {
  if (!s) return "Draft";
  const norm = s.toLowerCase();
  if (norm === "in_investigation" || norm === "in-investigation") return "In Investigation";
  return (
    {
      draft: "Draft",
      submitted: "Submitted",
      pending: "Submitted", // Legacy support
      resolved: "Resolved",
      rejected: "Rejected",
      closed: "Closed",
      on_appeal: "On Appeal",
    }[norm] || "Draft"
  );
};
const uiToApiStatus: Record<string, string> = {
  Draft: "draft",
  Submitted: "submitted",
  "In Investigation": "in_investigation",
  Resolved: "resolved",
  Rejected: "rejected",
  Closed: "closed",
  "On Appeal": "on_appeal",
};

const fetchAllPaginated = async <T,>(
  url: string,
  headers: HeadersInit,
): Promise<T[]> => {
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

/* ---------------- Page ---------------- */
export default function CaseViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: HeadersInit = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}) as HeadersInit, [token]);

  // Data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [caseData, setCaseData] = useState<ApiCase | null>(null);

  // Options
  const [offices, setOffices] = useState<ApiOffice[]>([]);
  const [members, setMembers] = useState<ApiUser[]>([]);
  const [loadingOffices, setLoadingOffices] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Assignment and Transfer info
  const [latestAssignment, setLatestAssignment] = useState<{
    to_user_id?: number | string;
    to_user_name?: string;
    due_date?: string;
    timestamp?: string;
  } | null>(null);
  const [latestTransfer, setLatestTransfer] = useState<{
    to_office_id?: number | string;
    to_office_name?: string;
    timestamp?: string;
  } | null>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(false);
  const [loadingTransfer, setLoadingTransfer] = useState(false);

  // Modals
  const [modalOpen, setModalOpen] = useState<"transfer" | "assign" | "status" | "appeal" | "feedback" | null>(null);

  // Transfer form
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>("");
  const [transferReason, setTransferReason] = useState<string>("");

  // Assign form
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [assignReason, setAssignReason] = useState<string>("");
  const [assignDueDays, setAssignDueDays] = useState<string>(""); // NEW

  // Status form
  const [selectedStatusUI, setSelectedStatusUI] = useState<string>("Pending");

  // Appeal form
  const [appealReason, setAppealReason] = useState<string>("");
  const [appealOfficeId, setAppealOfficeId] = useState<string>("");
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  // Feedback form
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState<string>("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Success
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Role gate - check user groups from localStorage or fetch from API
  const [currentUserGroups, setCurrentUserGroups] = useState<string[]>([]);
  
  useEffect(() => {
    const loadUserGroups = async () => {
      if (!API_URL || !token) return;
      
      // First try localStorage
      try {
        const raw = localStorage.getItem("user_groups");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const groups = parsed.map((g) => (typeof g === "string" ? g : g?.name)).filter(Boolean);
            setCurrentUserGroups(groups);
            return;
          }
        }
      } catch {
        // Continue to fetch from API
      }
      
      // Fetch from API if not in localStorage
      try {
        const res = await fetch(`${API_URL}/auth/me/`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          const groups = (data.user_groups || []).map((g: string) => g).filter(Boolean);
          setCurrentUserGroups(groups);
          // Store in localStorage for future use
          localStorage.setItem("user_groups", JSON.stringify(groups));
        }
      } catch (e) {
        console.error("Failed to load user groups:", e);
      }
    };
    
    loadUserGroups();
  }, [API_URL, token]);
  
  // Fallback: also check role from localStorage if user_groups not loaded
  const roleFromStorage = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  
  // Dynamic role checking - check if user has any non-citizen role
  const isCitizen = currentUserGroups.includes("Citizen") || roleFromStorage === "Citizen";
  const hasStaffRole = currentUserGroups.some(
    (role) => role !== "Citizen"
  ) || (roleFromStorage && roleFromStorage !== "Citizen");
  
  // Check if user is Director, Mayor Office, or Admin (for viewing tracking info)
  const canViewTrackingInfo = currentUserGroups.some(
    (role) => ["Director", "Mayor Office", "Admin"].includes(role)
  ) || roleFromStorage === "Director" || roleFromStorage === "Mayor Office" || roleFromStorage === "Admin";
  
  // Check if current user is Admin
  const isAdmin = currentUserGroups.includes("Admin") || roleFromStorage === "Admin";
  
  // Check permissions dynamically via API
  const [userHierarchy, setUserHierarchy] = useState<{
    can_assign?: boolean;
    can_change_status?: boolean;
    hierarchy_level?: number;
  } | null>(null);
  
  useEffect(() => {
    const loadUserHierarchy = async () => {
      if (!API_URL || !token) return;
      try {
        const res = await fetch(`${API_URL}/role-hierarchy/current-user/`, { headers });
        if (res.ok) {
          const data = await res.json();
          setUserHierarchy(data);
        }
      } catch (e) {
        console.error("Failed to load user hierarchy:", e);
      }
    };
    if (hasStaffRole) {
      loadUserHierarchy();
    }
  }, [API_URL, token, hasStaffRole, headers]);
  
  // Dynamic permission checking
  const canManageCase = hasStaffRole; // Any non-citizen role can manage
  const canAssign = userHierarchy?.can_assign !== false; // Default to true if not configured
  
  /* -------- helpers to fetch ids of current user/office -------- */
  const currentUserId =
    (typeof window !== "undefined" && localStorage.getItem("user_id")) || "";
  
  // Check if current user can change status
  // If case is assigned, only assigned user or Admin can change status
  const isAssignedToCurrentUser = latestAssignment && currentUserId && String(latestAssignment.to_user_id) === String(currentUserId);
  const canChangeStatus = userHierarchy?.can_change_status !== false && 
    (isAdmin || !latestAssignment || isAssignedToCurrentUser);
  
  // Get valid next statuses based on current status
  const getValidNextStatuses = (currentStatus: string): string[] => {
    const statusFlow: Record<string, string[]> = {
      draft: ["Submitted"],
      submitted: ["In Investigation"],
      "in_investigation": ["Resolved", "Rejected"],
      resolved: ["Closed"],
      rejected: ["Closed", "On Appeal"],
      on_appeal: ["In Investigation", "Resolved", "Rejected"],
      closed: [], // No transitions from closed
    };
    const normalizedStatus = currentStatus.toLowerCase().replace(/\s+/g, "_");
    return statusFlow[normalizedStatus] || [];
  };
  
  // Check if current user is the case creator
  const isCaseCreator = caseData && currentUserId && String(caseData.added_by) === String(currentUserId);
  
  // Check if current user is citizen owner or reporter
  const isCaseOwner = caseData && currentUserId && String(caseData.citizen_id) === String(currentUserId);
  const isReporter = caseData && currentUserId && caseData.reported_by && String(caseData.reported_by) === String(currentUserId);

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

  // Transfer targets based on hierarchy
  const [transferTargetOffices, setTransferTargetOffices] = useState<ApiOffice[]>([]);
  const [loadingTransferTargets, setLoadingTransferTargets] = useState(false);

  const loadTransferTargets = async () => {
    if (!API_URL || !token) return;
    try {
      setLoadingTransferTargets(true);
      const res = await fetch(`${API_URL}/role-hierarchy/transfer-targets/`, { headers });
      if (res.ok) {
        const data = await res.json();
        const targets = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
        const filteredTargets = targets.filter(Boolean);
        
        // If no specific targets found but user has transfer permissions, load all offices as fallback
        // The backend will validate the transfer anyway
        if (filteredTargets.length === 0 && userHierarchy !== null) {
          // Check if user has any transfer permissions configured
          const hasTransferPermission = userHierarchy.can_assign !== false; // Default to true
          if (hasTransferPermission) {
            // Load all offices - backend will validate if transfer is allowed
            const list = await fetchAllPaginated<ApiOffice>(`${API_URL}/offices/`, headers);
            setTransferTargetOffices(list.filter(Boolean));
          } else {
            setTransferTargetOffices([]);
          }
        } else {
          setTransferTargetOffices(filteredTargets);
        }
      } else {
        // Fallback: load all offices if hierarchy endpoint fails (but user has staff role)
        if (hasStaffRole) {
          const list = await fetchAllPaginated<ApiOffice>(`${API_URL}/offices/`, headers);
          setTransferTargetOffices(list.filter(Boolean));
        } else {
          setTransferTargetOffices([]);
        }
      }
    } catch {
      // Fallback: load all offices on error (but user has staff role)
      if (hasStaffRole) {
        const list = await fetchAllPaginated<ApiOffice>(`${API_URL}/offices/`, headers);
        setTransferTargetOffices(list.filter(Boolean));
      } else {
        setTransferTargetOffices([]);
      }
    } finally {
      setLoadingTransferTargets(false);
    }
  };

  // Can transfer if user has hierarchy configured
  // Director can transfer to Mayor Office, so show button if hierarchy exists
  // Even if no target offices found, show button and let backend validate
  // For Director role, if hierarchy exists, they should be able to transfer
  const canTransfer = hasStaffRole && userHierarchy !== null;

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
      // Use the new assignable-users endpoint which filters based on role
      const res = await fetch(`${API_URL}/assignments/assignable-users/`, { headers });
      if (res.ok) {
        const data = await res.json();
        const assignableUsers = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
        setMembers(assignableUsers);
      } else {
        // Fallback to old method if endpoint doesn't exist yet
      const list = await fetchAllPaginated<ApiUser>(`${API_URL}/users/`, headers);
      const filtered = (list || []).filter((u) => {
        const groups = (u?.groups || [])
          .map((g) => (typeof g === "string" ? g : g?.name))
          .filter(Boolean) as string[];
        return !groups.includes("Citizen");
      });
      setMembers(filtered);
      }
    } catch {
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };


  const loadLatestAssignment = useCallback(async () => {
    if (!API_URL || !token || !id) return;
    try {
      setLoadingAssignment(true);
      const res = await fetch(`${API_URL}/assignments/by-case/${id}/`, { headers });
      if (res.ok) {
        const data = await res.json();
        // Handle paginated response
        const assignments = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
        
        // Get the latest assignment (first one since API orders by -timestamp)
        if (assignments && assignments.length > 0) {
          const latest = assignments[0];
          const toUserId = latest.to_user_id;
          
          // Find the user name from members list or fetch if not available
          let userName = "Unknown User";
          const assignedUser = members.find((u) => String(u.id) === String(toUserId));
          if (assignedUser) {
            userName = `${assignedUser.first_name || ""} ${assignedUser.last_name || ""}`.trim() || assignedUser.email || assignedUser.username || "Unknown User";
          } else if (toUserId) {
            // Try to fetch user details if not in members list
            try {
              const userRes = await fetch(`${API_URL}/users/${toUserId}/`, { headers });
              if (userRes.ok) {
                const userData = await userRes.json();
                userName = `${userData.first_name || ""} ${userData.last_name || ""}`.trim() || userData.email || userData.username || "Unknown User";
              }
            } catch (e) {
              console.error("Failed to fetch user details:", e);
            }
          }
          
          setLatestAssignment({
            to_user_id: toUserId,
            to_user_name: userName,
            due_date: latest.due_date || latest.countdown_days,
            timestamp: latest.timestamp || latest.created_at,
          });
        } else {
          setLatestAssignment(null);
        }
      }
    } catch (e) {
      console.error("Failed to load assignment:", e);
      setLatestAssignment(null);
    } finally {
      setLoadingAssignment(false);
    }
  }, [API_URL, token, id, headers, members]);

  const loadLatestTransfer = useCallback(async () => {
    if (!API_URL || !token || !id) return;
    try {
      setLoadingTransfer(true);
      const res = await fetch(`${API_URL}/transfers/by-case/${id}/`, { headers });
      if (res.ok) {
        const data = await res.json();
        // Handle paginated response
        const transfers = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
        
        // Get the latest transfer (first one since API orders by -timestamp)
        if (transfers && transfers.length > 0) {
          const latest = transfers[0];
          const toOfficeId = latest.to_office_id;
          
          // Find the office name from offices list or fetch if not available
          let officeName = "Unknown Office";
          const transferredOffice = offices.find((o) => String(o.id) === String(toOfficeId));
          if (transferredOffice) {
            officeName = transferredOffice.name;
          } else if (toOfficeId) {
            // Try to fetch office details if not in offices list
            try {
              const officeRes = await fetch(`${API_URL}/offices/${toOfficeId}/`, { headers });
              if (officeRes.ok) {
                const officeData = await officeRes.json();
                officeName = officeData.name || "Unknown Office";
              }
            } catch (e) {
              console.error("Failed to fetch office details:", e);
            }
          }
          
          setLatestTransfer({
            to_office_id: toOfficeId,
            to_office_name: officeName,
            timestamp: latest.timestamp || latest.created_at,
          });
        } else {
          setLatestTransfer(null);
        }
      }
    } catch (e) {
      console.error("Failed to load transfer:", e);
      setLatestTransfer(null);
    } finally {
      setLoadingTransfer(false);
    }
  }, [API_URL, token, id, headers, offices]);

  useEffect(() => {
    loadCase();
    loadOffices();
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Load transfer targets when user hierarchy is available
  useEffect(() => {
    if (hasStaffRole && userHierarchy !== null) {
      loadTransferTargets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStaffRole, userHierarchy]);

  // Load assignment and transfer when case, members, and offices are loaded
  useEffect(() => {
    if (caseData && id && members.length > 0) {
      loadLatestAssignment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData, id, members]);

  useEffect(() => {
    if (caseData && id && offices.length > 0) {
      loadLatestTransfer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData, id, offices]);

  // Reload assignment and transfer data when page becomes visible or window regains focus
  // (e.g., returning from activity page where records might have been deleted)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && caseData && id) {
        if (members.length > 0) loadLatestAssignment();
        if (offices.length > 0) loadLatestTransfer();
      }
    };

    const handleFocus = () => {
      if (caseData && id) {
        if (members.length > 0) loadLatestAssignment();
        if (offices.length > 0) loadLatestTransfer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [caseData, id, members.length, offices.length, loadLatestAssignment, loadLatestTransfer]);

  /* -------- options -------- */
  // Use transfer targets if available (hierarchy-based), otherwise fallback to all offices
  const officeOptions = useMemo(
    () => {
      const source = transferTargetOffices.length > 0 ? transferTargetOffices : offices;
      return source
        .map((o) => ({ id: String(o.id), label: o.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
    },
    [transferTargetOffices, offices],
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
    const currentStatusUI = apiToUiStatus(caseData?.status);
    // Convert validNextStatuses to UI format and auto-select the first one
    const validNextStatusesUI = validNextStatuses.map(s => {
      const normalized = s.toLowerCase().replace(/\s+/g, "_");
      if (normalized === "in_investigation" || normalized === "in-investigation") return "In Investigation";
      return (
        {
          draft: "Draft",
          submitted: "Submitted",
          resolved: "Resolved",
          rejected: "Rejected",
          closed: "Closed",
          on_appeal: "On Appeal",
        }[normalized] || s
      );
    });
    // Auto-select first valid next status, or keep current if no valid transitions
    setSelectedStatusUI(validNextStatusesUI.length > 0 ? validNextStatusesUI[0] : currentStatusUI);
    setModalOpen("status");
  };

  const openAppeal = () => {
    setAppealReason("");
    setAppealOfficeId(caseData?.office_id ? String(caseData.office_id) : "");
    setModalOpen("appeal");
  };

  const openFeedback = () => {
    setFeedbackRating(5);
    setFeedbackComment("");
    setModalOpen("feedback");
  };

  /* -------- endpoints -------- */
  const TRANSFER_URL = API_URL ? `${API_URL}/transfers/` : "";
  const ASSIGN_URL = API_URL ? `${API_URL}/assignments/` : "";

  const currentOfficeId =
    (typeof window !== "undefined" && localStorage.getItem("office_id")) ||
    (caseData?.office_id ? String(caseData.office_id) : "");

  /* -------- action handlers -------- */
  const handleTransfer = async () => {
    if (!TRANSFER_URL || !token) return setError("Missing API URL or auth");
    if (!selectedOfficeId) {
      setError("Please select an office to transfer to.");
      return;
    }
    if (!transferReason.trim()) {
      setError("Please provide a reason for the transfer.");
      return;
    }
    
    // Use case's current office as from_office, or fallback to selected office if none
    const fromOfficeId = caseData?.office_id ? String(caseData.office_id) : selectedOfficeId;
    if (fromOfficeId === selectedOfficeId) {
      setError("Cannot transfer to the same office.");
      return;
    }

    try {
      setError("");
      const payload = {
        case_id: String(id),
        from_office_id: fromOfficeId,
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
      await loadOffices(); // Reload offices to update transfer display
      await loadLatestTransfer(); // Reload latest transfer
      await loadMembers(); // Reload members to update assignment display
      await loadLatestAssignment(); // Reload latest assignment (transfer creates assignment)
    } catch (e: any) {
      setError(e?.message || "Transfer failed");
    }
  };

  const handleAssign = async () => {
    if (!ASSIGN_URL || !token) return setError("Missing API URL or auth");
    if (!selectedMemberId) {
      setError("Please select a user to assign to.");
      return;
    }
    if (!assignReason.trim()) {
      setError("Please provide a reason for the assignment.");
      return;
    }

    const days = Number(assignDueDays);
    if (!Number.isFinite(days) || days <= 0) {
      setError("Please provide a valid number of days (minimum 1).");
      return;
    }

    // compute due date (today + days) -> YYYY-MM-DD
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);
    const dueDateISO = dueDate.toISOString().slice(0, 10);

    try {
      setError("");
      const payload: any = {
        case_id: String(id),
        to_user_id: String(selectedMemberId),
        reason: assignReason.trim(),
        due_date: dueDateISO,
      };
      
      // Only include from_user_id if we have a current user ID
      if (currentUserId) {
        payload.from_user_id = String(currentUserId);
      }

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
      await loadMembers(); // Reload members to update assignment display
      await loadLatestAssignment(); // Reload latest assignment
    } catch (e: any) {
      setError(e?.message || "Assignment failed");
    }
  };

  const handleChangeStatus = async () => {
    if (!API_URL || !token) return setError("Missing API URL or auth");
    try {
      setError("");
      const apiStatus = uiToApiStatus[selectedStatusUI] || "draft";
      // Use the change_status endpoint which validates transitions
      const res = await fetch(`${API_URL}/cases/${id}/change_status/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ status: apiStatus }),
      });
      if (!res.ok) {
        const msg = await res.text();
        let errorMsg = msg || `Status update failed: ${res.status}`;
        try {
          const errorData = JSON.parse(msg);
          errorMsg = errorData.detail || errorMsg;
        } catch {
          // Use text error message
        }
        throw new Error(errorMsg);
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

  const handleSubmitAppeal = async () => {
    if (!token) return setError("Missing authentication");
    if (!appealReason.trim()) {
      setError("Please provide a reason for the appeal.");
      return;
    }

    try {
      setError("");
      setSubmittingAppeal(true);
      await submitCaseAppeal(
        String(id),
        appealReason.trim(),
        appealOfficeId || undefined,
        token,
      );
      setModalOpen(null);
      setSuccessMsg("Appeal submitted successfully. The case status has been updated to 'On Appeal' and a new appeal case has been created.");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
      await loadCase();
      setAppealReason("");
      setAppealOfficeId("");
    } catch (e: any) {
      const errorMsg = e?.response?.data?.detail || e?.message || "Failed to submit appeal";
      setError(errorMsg);
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!token) return setError("Missing authentication");
    if (!feedbackRating || feedbackRating < 1 || feedbackRating > 5) {
      setError("Please select a rating between 1 and 5.");
      return;
    }

    try {
      setError("");
      setSubmittingFeedback(true);
      await submitCaseFeedback(
        String(id),
        feedbackRating,
        feedbackComment.trim(),
        token,
      );
      setModalOpen(null);
      setSuccessMsg("Feedback submitted successfully. The case has been automatically closed.");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
      await loadCase();
      setFeedbackRating(5);
      setFeedbackComment("");
    } catch (e: any) {
      const errorMsg = e?.response?.data?.detail || e?.message || "Failed to submit feedback";
      setError(errorMsg);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  /* -------- derived -------- */
  const computedDueDate = useMemo(() => {
    const days = Number(assignDueDays);
    if (!Number.isFinite(days) || days <= 0) return "";
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }, [assignDueDays]);

  /* -------- render -------- */
  if (loading) {
    return (
      <>
        <Breadcrumb pageName={`Case #${id}`} />
        <div className="p-6 text-center text-gray-500 dark:text-gray-300">Loading...</div>
      </>
    );
  }

  if (error && !caseData) {
    return (
      <>
        <Breadcrumb pageName={`Case #${id}`} />
        <div className="p-6 text-center">
          <p className="mb-4 text-red-500">{error}</p>
          <Button onClick={() => router.push("/cases")}>Back to Cases</Button>
      </div>
      </>
    );
  }
  
  if (!caseData) {
    return (
      <>
        <Breadcrumb pageName={`Case #${id}`} />
        <div className="p-6 text-center">
          <p className="mb-4 text-red-500">Case not found.</p>
          <Button onClick={() => router.push("/cases")}>Back to Cases</Button>
      </div>
      </>
    );
  }

  const titleCaseStatus = apiToUiStatus(caseData.status);
  const isDraft = titleCaseStatus === "Draft";
  const isSubmitted = titleCaseStatus === "Submitted";
  const isResolved = titleCaseStatus === "Resolved";
  const isRejected = titleCaseStatus === "Rejected";
  const isClosed = titleCaseStatus === "Closed";
  const isOnAppeal = titleCaseStatus === "On Appeal";
  
  // Get valid next statuses for the status change modal
  const validNextStatuses = getValidNextStatuses(caseData.status || "");

  return (
    <>
      <Breadcrumb pageName={`Case #${id}`} />
      
    <div className="p-6">
      <Button
        variant="ghost"
        className="mb-4 flex items-center gap-2"
        onClick={() => router.push("/cases")}
      >
        <ArrowLeft className="h-4 w-4" /> Back to Cases
      </Button>

        <Card className={cn("rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card max-w-4xl mx-auto")}>
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-dark dark:text-white">{caseData.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-100">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4 text-gray-700 dark:text-gray-300">
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

          {/* Attachments Section */}
          {caseData.attachments && Array.isArray(caseData.attachments) && caseData.attachments.length > 0 && (
            <div>
              <p className="mb-3 font-semibold text-dark dark:text-white">Attachments</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {caseData.attachments.map((att: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-md border border-stroke bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2 hover:bg-gray-100 dark:hover:bg-dark-3 transition-colors"
                    >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-dark dark:text-white">
                          {att.name || `Attachment ${idx + 1}`}
                        </p>
                        {att.size && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(att.size / 1024).toFixed(1)} KB
                            {att.type && ` • ${att.type.split('/')[1]?.toUpperCase() || 'File'}`}
                          </p>
                        )}
                      </div>
                    </div>
                    {att.data && (
                      <Button
                        onClick={() => {
                          if (!att.data) return;
                          
                          // Handle base64 data URLs
                          if (att.data.startsWith('data:')) {
                            // Create a blob from the data URL
                            const byteString = atob(att.data.split(',')[1]);
                            const mimeString = att.data.split(',')[0].split(':')[1].split(';')[0];
                            const ab = new ArrayBuffer(byteString.length);
                            const ia = new Uint8Array(ab);
                            for (let i = 0; i < byteString.length; i++) {
                              ia[i] = byteString.charCodeAt(i);
                            }
                            const blob = new Blob([ab], { type: mimeString });
                            const blobUrl = URL.createObjectURL(blob);
                            
                            // Open in new window for images and PDFs, download for others
                            if (att.type?.startsWith('image/') || att.type === 'application/pdf') {
                              const newWindow = window.open(blobUrl, '_blank');
                              if (!newWindow) {
                                // Fallback to download if popup blocked
                                const link = document.createElement('a');
                                link.href = blobUrl;
                                link.download = att.name || 'attachment';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }
                              // Clean up blob URL after a delay
                              setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                            } else {
                              // Download other file types
                              const link = document.createElement('a');
                              link.href = blobUrl;
                              link.download = att.name || 'attachment';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                            }
                          } else {
                            // Regular URL - open in new tab
                            window.open(att.data, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        className="ml-2 flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary/90 transition-colors"
                      >
                        <Download className="h-3 w-3" />
                        View
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tracking Information Section - Visible only to Director, Mayor Office, and Admin */}
          {canViewTrackingInfo && (
            <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 dark:border-blue-800 dark:from-blue-900/20 dark:to-indigo-900/20">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Case Tracking Information</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Created By */}
                {caseData.added_by_name && (
                  <div className="rounded-lg border border-blue-100 bg-white p-4 dark:border-blue-800 dark:bg-gray-800">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Created By
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {caseData.added_by_name}
                      </p>
                      {caseData.added_by_role && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {caseData.added_by_role}
                        </span>
                      )}
                    </div>
                    {caseData.created_at && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(caseData.created_at).toLocaleString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                )}

                {/* Reported By */}
                {caseData.reported_by_name && (
                  <div className="rounded-lg border border-blue-100 bg-white p-4 dark:border-blue-800 dark:bg-gray-800">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Reported By
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {caseData.reported_by_name}
                      </p>
                      {caseData.reported_by_role && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {caseData.reported_by_role}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Last Status Changed By */}
                {caseData.status_changed_by_name && (
                  <div className="rounded-lg border border-blue-100 bg-white p-4 dark:border-blue-800 dark:bg-gray-800">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Last Status Changed By
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {caseData.status_changed_by_name}
                      </p>
                      {caseData.status_changed_by_role && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {caseData.status_changed_by_role}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Status History Timeline */}
              {caseData.status_history && Array.isArray(caseData.status_history) && caseData.status_history.length > 0 && (
                <div className="mt-5">
                  <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Status Change History</p>
                  <div className="space-y-3">
                    {caseData.status_history
                      .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())
                      .map((history, idx) => (
                        <div
                          key={history.id || idx}
                          className="relative flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                        >
                          {/* Timeline indicator */}
                          {idx < caseData.status_history!.length - 1 && (
                            <div className="absolute left-4 top-8 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
                          )}
                          <div className="relative z-10 flex-shrink-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                {apiToUiStatus(history.status).charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-medium ${
                                  statusColors[apiToUiStatus(history.status)] || ""
                                }`}
                              >
                                {apiToUiStatus(history.status)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                              Changed by: <span className="font-medium">{history.changed_by_name || "System"}</span>
                              {history.changed_by_role && (
                                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                  {history.changed_by_role}
                                </span>
                              )}
                            </p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                              {new Date(history.changed_at).toLocaleString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {isCitizen ? (
            <div className="flex gap-3 pt-4">
              {isDraft && isCaseCreator ? (
                <>
                  <Button
                    className="rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => router.push(`/cases/${caseData.id}/edit`)}
                  >
                    Edit Draft
                  </Button>
                  <Button
                    className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={async () => {
                      if (!API_URL || !token) return setError("Missing API URL or auth");
                      try {
                        setError("");
                        const res = await fetch(`${API_URL}/cases/${id}/submit/`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", ...headers },
                        });
                        if (!res.ok) {
                          const msg = await res.text();
                          throw new Error(msg || `Submit failed: ${res.status}`);
                        }
                        setSuccessMsg("Case submitted successfully.");
                        setSuccessOpen(true);
                        setTimeout(() => setSuccessOpen(false), 3000);
                        await loadCase();
                      } catch (e: any) {
                        setError(e?.message || "Submit failed");
                      }
                    }}
                  >
                    Submit Case
                  </Button>
                </>
              ) : isResolved && (isCaseOwner || isReporter) ? (
                <>
                  <Button
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={openAppeal}
                  >
                    Submit Appeal
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-lg"
                    onClick={openFeedback}
                  >
                    Give Feedback
                  </Button>
                </>
              ) : isRejected && (isCaseOwner || isReporter) ? (
                <Button
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={openAppeal}
                >
                  Submit Appeal
                </Button>
              ) : isClosed ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  This case is closed. No further actions are available.
                </p>
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
            canManageCase && (
              <>
                <div className="flex flex-wrap gap-3 pt-4">
                  {canTransfer && !isClosed && (
                <Button
                  variant="outline"
                      className="rounded-lg border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:border-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={openTransfer}
                      disabled={!!latestTransfer || isClosed}
                      title={isClosed ? "Cannot transfer closed cases" : latestTransfer ? "Case has already been transferred. Delete the transfer record to enable this action." : "Transfer case to another office"}
                >
                  Transfer
                </Button>
                  )}
                  {canAssign && !isClosed && (
                <Button
                      className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={openAssign}
                      disabled={!!latestAssignment || isClosed}
                      title={isClosed ? "Cannot assign closed cases" : latestAssignment ? "Case has already been assigned. Delete the assignment record to enable this action." : "Assign case to a user"}
                >
                  Assign
                </Button>
                  )}
                  {canChangeStatus && !isClosed && (
                <Button
                  className="rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={openChangeStatus}
                  disabled={!!(latestAssignment && !isAdmin && !isAssignedToCurrentUser) || isClosed}
                  title={
                    isClosed
                      ? "Cannot change status of closed cases"
                      : latestAssignment && !isAdmin && !isAssignedToCurrentUser
                      ? "Only the assigned user or Admin can change status of an assigned case"
                      : "Change case status"
                  }
                >
                  Change Status
                </Button>
                  )}
                  {/* Show feedback/appeal buttons for resolved/rejected cases */}
                  {isResolved && (isCaseOwner || isReporter || isAssignedToCurrentUser || isAdmin) && (
                    <>
                      <Button
                        className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={openAppeal}
                      >
                        Submit Appeal
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-lg"
                        onClick={openFeedback}
                      >
                        Record Feedback
                      </Button>
                    </>
                  )}
                  {isRejected && (isCaseOwner || isReporter) && (
                    <Button
                      className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={openAppeal}
                    >
                      Submit Appeal
                    </Button>
                  )}
                  {isClosed && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      This case is closed. No further actions are available.
                    </p>
                  )}
              </div>

                {/* Assignment and Transfer Info */}
                <div className="mt-4 space-y-3 rounded-md border border-stroke bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
                  {/* Status Display */}
                  <div className="flex items-center gap-2 border-b border-stroke pb-2 dark:border-dark-3">
                    <span className="font-semibold text-dark dark:text-white">Current Status:</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        statusColors[titleCaseStatus] || ""
                      }`}
                    >
                      {titleCaseStatus}
                    </span>
                  </div>

                  {/* Assignment Info */}
                  {latestAssignment && latestAssignment.to_user_name ? (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-dark dark:text-white min-w-[120px]">Assigned to:</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 dark:text-gray-100">{latestAssignment.to_user_name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">(Assignment active)</span>
                        </div>
                        {latestAssignment.due_date && (
                          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Due: {new Date(latestAssignment.due_date).toLocaleDateString()}
                          </div>
                        )}
                        {latestAssignment.timestamp && (
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Assigned on: {new Date(latestAssignment.timestamp).toLocaleDateString()}
                          </div>
                        )}
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
                          Note: Delete the assignment record from Activity page to enable reassignment.
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Transfer Info */}
                  {latestTransfer && latestTransfer.to_office_name ? (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-dark dark:text-white min-w-[120px]">Transferred to:</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 dark:text-gray-100">{latestTransfer.to_office_name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">(Transfer active)</span>
                        </div>
                        {latestTransfer.timestamp && (
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Transferred on: {new Date(latestTransfer.timestamp).toLocaleDateString()}
                          </div>
                        )}
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
                          Note: Delete the transfer record from Activity page to enable retransfer.
                        </div>
                      </div>
                    </div>
                  ) : caseData?.office_id ? (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-dark dark:text-white min-w-[120px]">Current Office:</span>
                      <div className="flex-1">
                        <span className="text-gray-900 dark:text-gray-100">
                          {offices.find((o) => String(o.id) === String(caseData.office_id))?.name || "Unknown Office"}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {/* No assignment/transfer info message */}
                  {!latestAssignment && !latestTransfer && !caseData?.office_id && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      No assignment or transfer information available.
                    </div>
                  )}
                </div>
              </>
            )
          )}
        </CardContent>
      </Card>

      {/* Transfer Modal */}
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

      {/* Assign Modal (Assign To + Reason + Due in Days) */}
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Due in (days)</label>
              <input
                type="number"
                min={1}
                className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
                placeholder="e.g., 7"
                value={assignDueDays}
                onChange={(e) => setAssignDueDays(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Due Date (auto)</label>
              <input
                className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
                value={computedDueDate || "—"}
                readOnly
              />
            </div>
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
              disabled={
                !selectedMemberId || !assignReason.trim() || !assignDueDays || Number(assignDueDays) <= 0
              }
            >
              Confirm Assign
            </Button>
          </div>
        </div>
      </AnimatedModal>

      {/* Change Status Modal */}
      <AnimatedModal
        open={modalOpen === "status"}
        onClose={() => setModalOpen(null)}
        title="Change Status"
        maxWidthClassName="max-w-md"
      >
        <div className="space-y-2 max-h-64 overflow-y-auto">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Current status: <span className="font-semibold">{titleCaseStatus}</span>
          </p>
          {(() => {
            // Define all possible statuses in order
            const allStatuses = ["Draft", "Submitted", "In Investigation", "Resolved", "Rejected", "Closed", "On Appeal"];
            
            // Convert validNextStatuses (API format) to UI format
            const validNextStatusesUI = validNextStatuses.map(s => {
              // Convert API status to UI status format
              const normalized = s.toLowerCase().replace(/\s+/g, "_");
              if (normalized === "in_investigation" || normalized === "in-investigation") return "In Investigation";
              return (
                {
                  draft: "Draft",
                  submitted: "Submitted",
                  resolved: "Resolved",
                  rejected: "Rejected",
                  closed: "Closed",
                  on_appeal: "On Appeal",
                }[normalized] || s
              );
            });
            
            return allStatuses.map((status) => {
              const isValid = validNextStatusesUI.includes(status);
              const isSelected = selectedStatusUI === status;
              const isCurrent = titleCaseStatus === status;
              
              return (
                <label
                  key={status}
                  className={`flex items-center gap-2 p-2 rounded transition-colors ${
                    isValid
                      ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      : "cursor-not-allowed opacity-50"
                  } ${isCurrent ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={status}
                    checked={isSelected}
                    onChange={() => {
                      if (isValid) {
                        setSelectedStatusUI(status);
                      }
                    }}
                    disabled={!isValid}
                    className={!isValid ? "cursor-not-allowed" : ""}
                  />
                  <span className={`flex-1 ${isCurrent ? "font-semibold" : ""}`}>
                    {status}
                    {isCurrent && <span className="ml-2 text-xs text-gray-500">(Current)</span>}
                  </span>
                  {!isValid && !isCurrent && (
                    <span className="text-xs text-gray-400 italic">Not available</span>
                  )}
                </label>
              );
            });
          })()}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModalOpen(null)}>
            Cancel
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleChangeStatus}
            disabled={
              validNextStatuses.length === 0 || 
              selectedStatusUI === titleCaseStatus ||
              !(() => {
                // Convert validNextStatuses to UI format for comparison
                const validNextStatusesUI = validNextStatuses.map(s => {
                  const normalized = s.toLowerCase().replace(/\s+/g, "_");
                  if (normalized === "in_investigation" || normalized === "in-investigation") return "In Investigation";
                  return (
                    {
                      draft: "Draft",
                      submitted: "Submitted",
                      resolved: "Resolved",
                      rejected: "Rejected",
                      closed: "Closed",
                      on_appeal: "On Appeal",
                    }[normalized] || s
                  );
                });
                return validNextStatusesUI.includes(selectedStatusUI);
              })()
            }
          >
            Confirm
          </Button>
        </div>
      </AnimatedModal>

      {/* Appeal Modal */}
      <AnimatedModal
        open={modalOpen === "appeal"}
        onClose={() => setModalOpen(null)}
        title="Submit Appeal"
        maxWidthClassName="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Appeal Reason *</label>
            <textarea
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              placeholder="Please explain why you are appealing this case resolution..."
              rows={5}
              className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
            />
            <p className="mt-1 text-xs text-gray-500">
              {isRejected 
                ? "A new appeal case will be created and the current case status will be set to 'On Appeal'."
                : "A new appeal case will be created and the current case status will be set to 'On Appeal'."}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Transfer to Office (Optional)</label>
            <select
              className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
              value={appealOfficeId}
              onChange={(e) => setAppealOfficeId(e.target.value)}
            >
              <option value="">— Use Current Office —</option>
              {loadingOffices ? (
                <option disabled>Loading…</option>
              ) : (
                offices.map((o) => (
                  <option key={o.id} value={String(o.id)}>
                    {o.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {error && <div className="text-sm text-red-500">{error}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(null)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleSubmitAppeal}
              disabled={!appealReason.trim() || submittingAppeal}
            >
              {submittingAppeal ? "Submitting..." : "Submit Appeal"}
            </Button>
          </div>
        </div>
      </AnimatedModal>

      {/* Feedback Modal */}
      <AnimatedModal
        open={modalOpen === "feedback"}
        onClose={() => setModalOpen(null)}
        title={isCitizen ? "Give Feedback" : "Record Feedback"}
        maxWidthClassName="max-w-md"
      >
        <div className="space-y-4">
          {isResolved && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
              <p className="font-medium">Note:</p>
              <p className="mt-1">Submitting feedback will automatically close this case.</p>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Rating *</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setFeedbackRating(rating)}
                  className={cn(
                    "flex-1 rounded-lg border-2 p-3 text-center font-semibold transition",
                    feedbackRating === rating
                      ? "border-primary bg-primary text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-gray-300",
                  )}
                >
                  {rating}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {feedbackRating === 1 && "Very Dissatisfied"}
              {feedbackRating === 2 && "Dissatisfied"}
              {feedbackRating === 3 && "Neutral"}
              {feedbackRating === 4 && "Satisfied"}
              {feedbackRating === 5 && "Very Satisfied"}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Comments (Optional)</label>
            <textarea
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder={isCitizen ? "Share your thoughts about how this case was handled..." : "Record feedback received from the citizen..."}
              rows={4}
              className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
            />
          </div>

          {error && <div className="text-sm text-red-500">{error}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(null)}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSubmitFeedback}
              disabled={!feedbackRating || submittingFeedback}
            >
              {submittingFeedback ? "Submitting..." : "Submit Feedback"}
            </Button>
          </div>
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
    </>
  );
}
