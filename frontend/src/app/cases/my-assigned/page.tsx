"use client";

import { useEffect, useMemo, useState } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { RefreshCcw, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

/* ===================== Types ===================== */

type ApiUser = {
  id: number | string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  office_id?: number | string | null;
};

type ApiOffice = {
  id: number | string;
  name: string;
  office_representative?: number | string | null;
};

type ApiCase = {
  id: number | string;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
  channel?: string | null;
  office_id?: number | string | null;
  created_at?: string | null;
};

type AssignmentRecord = {
  id: number | string;
  case?: number | string | ApiCase;  // Optional - may not be included in serializer
  case_id: number | string;  // Primary field from AssignmentSerializer
  from_user?: number | string | ApiUser | null;
  from_user_id?: number | string | null;
  to_user?: number | string | ApiUser | null;
  to_user_id?: number | string | null;
  office_id?: number | string | null;  // Office ID from assignment
  office?: number | string | ApiOffice | null;  // Nested office object (if included)
  reason?: string | null;
  created_at?: string | null;
  timestamp?: string | null;

  // Deadline sources (DRF fields):
  due_date?: string | null;        // "YYYY-MM-DD"
  countdown_days?: string | null;  // "YYYY-MM-DD" (per your serializer)
};

/* ===================== Helpers ===================== */

const caseIdOf = (r: AssignmentRecord): string | number | null => {
  // AssignmentSerializer returns case_id as the primary field
  if (r.case_id !== undefined && r.case_id !== null) {
    return r.case_id;
  }
  // Fallback to case field if case_id is not available
  if (r.case !== undefined && r.case !== null) {
    if (typeof r.case === "object" && r.case !== null && "id" in r.case) {
      return r.case.id;
    }
    return r.case;
  }
  return null;
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

// Normalize an ISO date string ("YYYY-MM-DD") to a midnight Date (local)
const parseISODate = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

// Format a duration between "now" and a target date as "Xd HH:MM:SS"
const formatCountdown = (now: Date, target: Date) => {
  const diffMs = target.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);

  const totalSeconds = Math.floor(absMs / 1000);
  const days = Math.floor(totalSeconds / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  const dhms =
    (days > 0 ? `${days}d ` : "") + `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  if (diffMs > 0) {
    // future
    if (days === 0) return { text: `${dhms} left`, cls: "font-bold text-emerald-600" };
    return { text: `${dhms} left`, cls: "font-bold text-green-600" };
  } else if (diffMs === 0) {
    return { text: `Due now`, cls: "font-bold text-amber-600" };
  }
  // overdue
  return { text: `${dhms} overdue`, cls: "font-bold text-red-600" };
};

const dueIsoOf = (r: AssignmentRecord) => r.due_date || r.countdown_days || null;

/* ===================== Page ===================== */

export default function MyAssignedCasesPage() {
  const { t } = useTranslation();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const currentUserId =
    typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";
  const headers: HeadersInit = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}) as HeadersInit, [token]);

  // Data + UX
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Enrichment caches
  const [titleMap, setTitleMap] = useState<Record<string, string>>({});
  const [fromUserNameMap, setFromUserNameMap] = useState<Record<string, string>>({});
  
  // Map from_user_id -> office_id (to get the assigner's office)
  const [fromUserOfficeMap, setFromUserOfficeMap] = useState<Record<string, string>>({});

  // Office resolver: officeId -> officeName
  const [officeMap, setOfficeMap] = useState<Record<string, string>>({});

  // Search
  const [search, setSearch] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Global ticking "now" to power live countdown (1s)
  const [now, setNow] = useState<Date>(() => {
    const d = new Date();
    d.setSeconds(d.getSeconds()); // explicit
    return d;
  });
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadOfficesIndex = async () => {
    if (!API_URL || !token) return;
    try {
      const offices = await fetchAllPaginated<ApiOffice>(`${API_URL}/offices/`, headers);
      const map: Record<string, string> = {};
      offices.forEach((o) => {
        if (o.id && o.name) {
          map[String(o.id)] = o.name;
        }
      });
      setOfficeMap(map);
    } catch {
      // ignore; map stays empty
    }
  };

  const loadAssigned = async () => {
    if (!API_URL || !token || !currentUserId) {
      setError("Missing API URL, token, or user ID");
      return;
    }
    try {
      setLoading(true);
      setError("");

      // Fetch assignments assigned to the current user
      // The backend will handle filtering based on user role (Focal Person sees office + their assignments)
      // We explicitly filter by to_user_id to ensure we only get assignments TO this user
      const url = `${API_URL}/assignments/?to_user_id=${encodeURIComponent(currentUserId)}`;

      const data = await fetchAllPaginated<AssignmentRecord>(url, headers);

      // Additional client-side filtering to ensure we only show assignments TO the current user
      // This handles cases where the API might return assignments from the same office
      const filtered = data.filter((r) => {
        const toUserId = r.to_user_id ?? (typeof r.to_user === "object" ? r.to_user?.id : r.to_user);
        return String(toUserId) === String(currentUserId);
      });

      setAssignments(filtered);
      await enrichDetails(filtered);
    } catch (e: any) {
      setError(e?.message || "Failed to load data");
      console.error("Error loading assignments:", e);
    } finally {
      setLoading(false);
    }
  };

  // Enrich: case titles + from-user names + office names (for search display)
  const enrichDetails = async (rows: AssignmentRecord[]) => {
    if (!API_URL || !token) return;

    const missingCaseIds = new Set<string>();
    const missingFromUserIds = new Set<string>();
    const missingOfficeIds = new Set<string>();

    // Collect office IDs from nested from_user objects first
    const newFromUserOfficeMap: Record<string, string> = {};
    
    rows.forEach((r) => {
      const cid = caseIdOf(r);
      const cidStr = cid ? String(cid) : "";
      if (cidStr && !titleMap[cidStr]) {
        const hasTitle = typeof r.case === "object" && r.case?.title;
        if (!hasTitle) missingCaseIds.add(cidStr);
      }

      const rawFrom = r.from_user_id ?? (typeof r.from_user === "object" ? r.from_user?.id : r.from_user);
      const fromIdStr = rawFrom ? String(rawFrom) : "";
      
      if (!fromIdStr) {
        // Skip if no from_user_id
        return;
      }
      
      // Check if we already have from_user info from nested object
      const hasFromName =
        typeof r.from_user === "object" &&
        (r.from_user?.first_name || r.from_user?.last_name || r.from_user?.email || r.from_user?.username);
      
      // If we have nested from_user with office_id, collect it
      if (typeof r.from_user === "object" && r.from_user !== null && "office_id" in r.from_user) {
        const nestedOfficeId = (r.from_user as ApiUser).office_id;
        if (nestedOfficeId && !fromUserOfficeMap[fromIdStr] && !newFromUserOfficeMap[fromIdStr]) {
          newFromUserOfficeMap[fromIdStr] = String(nestedOfficeId);
          // Ensure office is in office map
          if (!officeMap[String(nestedOfficeId)]) {
            missingOfficeIds.add(String(nestedOfficeId));
          }
        }
      }
      
      // Always fetch user if we don't have their office_id yet (even if we have their name)
      const hasOfficeIdInMap = fromUserOfficeMap[fromIdStr] || newFromUserOfficeMap[fromIdStr];
      const hasOfficeIdInNested = typeof r.from_user === "object" && r.from_user !== null && "office_id" in r.from_user && (r.from_user as ApiUser).office_id;
      const hasOfficeId = hasOfficeIdInMap || hasOfficeIdInNested;
      
      // Always fetch if we don't have office_id OR if we don't have the user name
      if (!hasOfficeId || !hasFromName) {
        missingFromUserIds.add(fromIdStr);
      }
    });
    
    // Update fromUserOfficeMap with collected values
    if (Object.keys(newFromUserOfficeMap).length > 0) {
      setFromUserOfficeMap((m) => ({ ...m, ...newFromUserOfficeMap }));
    }

    const fetchCaseTitles = Array.from(missingCaseIds).map(async (cid) => {
      try {
        const res = await fetch(`${API_URL}/cases/${cid}/`, { headers, cache: "no-store" });
        if (!res.ok) {
          // If case not found (404) or forbidden (403), log but don't throw
          console.warn(`Case ${cid} not accessible: ${res.status}`);
          // Set a fallback title indicating the case is not accessible
          setTitleMap((m) => ({ ...m, [String(cid)]: `Case #${cid} (Not accessible)` }));
          return;
        }
        const c: ApiCase = await res.json();
        if (c?.id != null) {
          setTitleMap((m) => ({ ...m, [String(c.id)]: c.title || `Case #${c.id}` }));
        }
      } catch (err) {
        console.error(`Error fetching case ${cid}:`, err);
        // Set fallback title
        setTitleMap((m) => ({ ...m, [String(cid)]: `Case #${cid} (Error loading)` }));
      }
    });

    const fetchUsers = Array.from(missingFromUserIds).map(async (uid) => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[enrichDetails] Fetching user ${uid}...`);
        }
        const res = await fetch(`${API_URL}/users/${uid}/`, { headers, cache: "no-store" });
        if (!res.ok) {
          console.warn(`[enrichDetails] Failed to fetch user ${uid}: ${res.status}`);
          return;
        }
        const u: ApiUser = await res.json();
        if (u?.id != null) {
          const full = `${u.first_name || ""} ${u.last_name || ""}`.trim();
          const label = full || u.email || u.username || String(u.id);
          setFromUserNameMap((m) => ({ ...m, [String(u.id)]: label }));
          
          // Store the user's office_id for office lookup (always, even if null)
          setFromUserOfficeMap((m) => {
            const newMap = { ...m };
            if (u.office_id) {
              newMap[String(u.id)] = String(u.office_id);
              if (process.env.NODE_ENV === 'development') {
                console.log(`[enrichDetails] Stored office_id ${u.office_id} for user ${u.id}`);
              }
              // Also ensure the office is in our office map
              if (!officeMap[String(u.office_id)]) {
                missingOfficeIds.add(String(u.office_id));
              }
            } else {
              // Log if user has no office_id
              if (process.env.NODE_ENV === 'development') {
                console.warn(`[enrichDetails] User ${u.id} (${label}) has no office_id`);
              }
            }
            return newMap;
          });
        }
      } catch (err) {
        console.error(`[enrichDetails] Error fetching user ${uid}:`, err);
      }
    });

    const fetchOffices = Array.from(missingOfficeIds).map(async (oid) => {
      try {
        const res = await fetch(`${API_URL}/offices/${oid}/`, { headers, cache: "no-store" });
        if (!res.ok) return;
        const o: ApiOffice = await res.json();
        if (o?.id != null && o?.name) {
          setOfficeMap((m) => ({ ...m, [String(o.id)]: o.name }));
        }
      } catch (err) {
        console.error(`Error fetching office ${oid}:`, err);
      }
    });

    await Promise.all([...fetchCaseTitles, ...fetchUsers, ...fetchOffices]);
    
    // Debug: log what was fetched
    if (process.env.NODE_ENV === 'development') {
      console.log(`[enrichDetails] Fetched: ${missingCaseIds.size} cases, ${missingFromUserIds.size} users, ${missingOfficeIds.size} offices`);
      console.log(`[enrichDetails] fromUserOfficeMap now has ${Object.keys(fromUserOfficeMap).length} entries`);
    }
  };

  useEffect(() => {
    // build office index first (so "From Office" resolves reliably)
    loadOfficesIndex();
    loadAssigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const titleOfRow = (r: AssignmentRecord) => {
    if (typeof r.case === "object" && r.case?.title) return r.case.title as string;
    const cid = caseIdOf(r);
    return cid ? (titleMap[String(cid)] || `Case #${cid}`) : "—";
  };

  // From office via from_user_id's office_id (the assigner's office)
  const fromOfficeNameOfRow = (r: AssignmentRecord) => {
    // Get the from_user_id
    const fromUserId = r.from_user_id ?? (typeof r.from_user === "object" ? r.from_user?.id : r.from_user);
    if (!fromUserId) return "—";
    
    // First try to get office_id from nested from_user object
    let officeId: string | number | null = null;
    if (typeof r.from_user === "object" && r.from_user !== null && "office_id" in r.from_user) {
      officeId = (r.from_user as ApiUser).office_id ?? null;
    }
    
    // If not in nested object, try the fromUserOfficeMap
    if (!officeId) {
      const mappedOfficeId = fromUserOfficeMap[String(fromUserId)];
      if (mappedOfficeId) {
        officeId = mappedOfficeId;
      }
    }
    
    // Debug logging in development
    if (process.env.NODE_ENV === 'development' && !officeId) {
      console.log(`[fromOfficeNameOfRow] No office_id found for from_user_id ${fromUserId}`, {
        from_user: r.from_user,
        from_user_id: r.from_user_id,
        fromUserOfficeMap: fromUserOfficeMap[String(fromUserId)],
        officeMapKeys: Object.keys(officeMap).slice(0, 5),
      });
    }
    
    // Look up the office name
    if (officeId) {
      const officeName = officeMap[String(officeId)];
      if (officeName) return officeName;
      
      // Debug logging if office name not found
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[fromOfficeNameOfRow] Office ID ${officeId} not found in officeMap`, {
          officeMapSize: Object.keys(officeMap).length,
        });
      }
    }
    
    return "—";
  };

  const deadlineInfoOfRow = (r: AssignmentRecord) => {
    const iso = dueIsoOf(r);
    const dueDate = parseISODate(iso);
    if (!dueDate) return { text: "—", cls: "font-bold text-gray-600 dark:text-gray-300" };

    // use a "now" normalized to seconds (not midnight) for HH:MM:SS effect
    const nowCopy = new Date(now);
    return formatCountdown(nowCopy, dueDate);
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return assignments;
    return assignments.filter((r) => {
      const title = titleOfRow(r).toLowerCase();
      const reason = (r.reason || "").toLowerCase();
      const fromOffice = fromOfficeNameOfRow(r).toLowerCase();
      return title.includes(term) || reason.includes(term) || fromOffice.includes(term);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, search, titleMap, officeMap, fromUserOfficeMap, now]); // include "now" so countdown rerenders rows smoothly

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filtered.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filtered.length]);

  return (
    <>
      <Breadcrumb pageName="My Assigned Cases"/>

      <div className={cn("rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card")}>
        {/* Top bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <Input
            placeholder={t("common", "search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[320px]"
          />
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={loadAssigned} title={t("common", "refresh")}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Link href="/cases">
              <Button className="bg-blue-600 text-white hover:bg-blue-700">
                {t("common", "to")} {t("cases", "cases")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="[&>th]:text-center">
              <TableHead className="!text-left">{t("activity", "case")}</TableHead>
              <TableHead>{t("activity", "fromOffice")}</TableHead>
              <TableHead>{t("activity", "reason")}</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>{t("common", "actions")}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="py-4 text-center text-gray-500 dark:text-gray-300">
                  {t("common", "loading")}
                </TableCell>
              </TableRow>
            )}

            {!loading && error && (
              <TableRow>
                <TableCell colSpan={5} className="py-4 text-center text-red-500">
                  {error}
                </TableCell>
              </TableRow>
            )}

            {!loading && !error && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-4 text-center text-gray-500 dark:text-gray-300">
                  {t("activity", "noRecordsFound")}
                </TableCell>
              </TableRow>
            )}

            {!loading && !error && paginatedData.map((r) => {
              const cid = caseIdOf(r);
              const deadline = deadlineInfoOfRow(r);
              
              // Debug logging (only in development)
              if (process.env.NODE_ENV === 'development' && !cid) {
                console.warn('Assignment record missing case ID:', r);
              }
              
              return (
                <TableRow
                  key={String(r.id)}
                  className="text-center text-base font-medium text-dark dark:text-white"
                >
                  <TableCell className="!text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span>{titleOfRow(r)}</span>
                    </div>
                  </TableCell>

                  <TableCell>{fromOfficeNameOfRow(r)}</TableCell>

                  <TableCell className="truncate max-w-[320px]">
                    {r.reason || "—"}
                  </TableCell>

                  <TableCell className={deadline.cls}>{deadline.text}</TableCell>

                  <TableCell>
                    {cid ? (
                      <Link 
                        href={`/cases/${cid}/view`}
                        onClick={(e) => {
                          // Validate case ID before navigation
                          if (!cid || cid === "null" || cid === "undefined") {
                            e.preventDefault();
                            setError(`Invalid case ID: ${cid}`);
                            return false;
                          }
                        }}
                      >
                        <Button size="icon" variant="ghost" title={t("common", "view")}>
                          <Eye className="h-4 w-4 text-blue-500" />
                        </Button>
                      </Link>
                    ) : (
                      <Button size="icon" variant="ghost" disabled title="No case id">
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Pagination */}
        {!loading && !error && filtered.length > itemsPerPage && (
          <div className="mt-4 flex items-center justify-between border-t border-stroke pt-4 dark:border-dark-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t("activity", "showing")} {startIndex + 1} {t("activity", "to")} {Math.min(endIndex, filtered.length)} {t("activity", "of")} {filtered.length} {t("activity", "assignments")}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className={currentPage === pageNum ? "bg-blue-600 text-white" : ""}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
