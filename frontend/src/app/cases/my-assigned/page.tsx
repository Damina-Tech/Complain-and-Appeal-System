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
import { RefreshCcw, Eye } from "lucide-react";

/* ===================== Types ===================== */

type ApiUser = {
  id: number | string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
};

type ApiCase = {
  id: number | string;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
  channel?: string | null;
  created_at?: string | null;
};

type AssignmentRecord = {
  id: number | string;
  case: number | string | ApiCase;
  case_id?: number | string;
  from_user?: number | string | ApiUser | null;
  from_user_id?: number | string | null;
  to_user?: number | string | ApiUser | null;
  to_user_id?: number | string | null;
  reason?: string | null;
  created_at?: string | null;
  timestamp?: string | null;
};

/* ===================== Helpers ===================== */

const caseIdOf = (r: AssignmentRecord) =>
  r.case_id ?? (typeof r.case === "object" ? r.case?.id : r.case);

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

/* ===================== Page ===================== */

export default function MyAssignedCasesPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const currentUserId =
    typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // Data + UX
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Enrichment caches
  const [titleMap, setTitleMap] = useState<Record<string, string>>({});
  const [fromNameMap, setFromNameMap] = useState<Record<string, string>>({});

  // Search
  const [search, setSearch] = useState("");

  const loadAssigned = async () => {
    if (!API_URL || !token) return;
    try {
      setLoading(true);
      setError("");

      // Prefer server-side filter; adjust param to match your API if needed
      const url = currentUserId
        ? `${API_URL}/assignments/?to_user_id=${encodeURIComponent(currentUserId)}`
        : `${API_URL}/assignments/`;

      const data = await fetchAllPaginated<AssignmentRecord>(url, headers);

      // Client-side fallback if server didn't filter
      const filtered = currentUserId
        ? data.filter((r) =>
            String(r.to_user_id ?? (typeof r.to_user === "object" ? r.to_user?.id : r.to_user)) ===
            String(currentUserId),
          )
        : data;

      setAssignments(filtered);

      // Kick off enrichment (titles + from-user names)
      await enrichDetails(filtered);
    } catch (e: any) {
      setError(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Enrich titles (from /cases/:id) and "from" names (from /users/:id)
  const enrichDetails = async (rows: AssignmentRecord[]) => {
    if (!API_URL || !token) return;

    const missingCaseIds = new Set<string>();
    const missingFromUserIds = new Set<string>();

    rows.forEach((r) => {
      const cid = caseIdOf(r);
      const cidStr = cid ? String(cid) : "";
      if (cidStr && !titleMap[cidStr]) {
        // only if case object didn't already include a title
        const hasTitle = typeof r.case === "object" && r.case?.title;
        if (!hasTitle) missingCaseIds.add(cidStr);
      }

      const rawFrom = r.from_user_id ?? (typeof r.from_user === "object" ? r.from_user?.id : r.from_user);
      const fromIdStr = rawFrom ? String(rawFrom) : "";
      const hasFromName =
        typeof r.from_user === "object" &&
        (r.from_user?.first_name || r.from_user?.last_name || r.from_user?.email || r.from_user?.username);
      if (fromIdStr && !hasFromName && !fromNameMap[fromIdStr]) {
        missingFromUserIds.add(fromIdStr);
      }
    });

    // Fetch missing case titles
    const fetchCaseTitles = Array.from(missingCaseIds).map(async (cid) => {
      const res = await fetch(`${API_URL}/cases/${cid}/`, { headers, cache: "no-store" });
      if (!res.ok) return;
      const c: ApiCase = await res.json();
      if (c?.id != null) {
        setTitleMap((m) => ({ ...m, [String(c.id)]: c.title || `Case #${c.id}` }));
      }
    });

    // Fetch missing from-user names
    const fetchUsers = Array.from(missingFromUserIds).map(async (uid) => {
      const res = await fetch(`${API_URL}/users/${uid}/`, { headers, cache: "no-store" });
      if (!res.ok) return;
      const u: ApiUser = await res.json();
      if (u?.id != null) {
        const full = `${u.first_name || ""} ${u.last_name || ""}`.trim();
        const label = full || u.email || u.username || String(u.id);
        setFromNameMap((m) => ({ ...m, [String(u.id)]: label }));
      }
    });

    await Promise.all([...fetchCaseTitles, ...fetchUsers]);
  };

  useEffect(() => {
    loadAssigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const titleOfRow = (r: AssignmentRecord) => {
    if (typeof r.case === "object" && r.case?.title) return r.case.title as string;
    const cid = caseIdOf(r);
    return cid ? (titleMap[String(cid)] || `Case #${cid}`) : "—";
    // Once the titleMap fills, UI will update.
  };

  const fromNameOfRow = (r: AssignmentRecord) => {
    if (typeof r.from_user === "object") {
      const full = `${r.from_user.first_name || ""} ${r.from_user.last_name || ""}`.trim();
      return full || r.from_user.email || r.from_user.username || String(r.from_user.id);
    }
    const id = r.from_user_id ?? r.from_user;
    return id ? (fromNameMap[String(id)] || String(id)) : "—";
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return assignments;
    return assignments.filter((r) => {
      const title = titleOfRow(r).toLowerCase();
      const reason = (r.reason || "").toLowerCase();
      const fromUser = fromNameOfRow(r).toLowerCase();
      return title.includes(term) || reason.includes(term) || fromUser.includes(term);
    });
    // include deps that change derived values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, search, titleMap, fromNameMap]);

  return (
    <>
      {/* Brand-colored breadcrumb tail (see section 2 for Breadcrumb tweak) */}
      <Breadcrumb pageName="My Assigned Cases"/>

      <div
        className={cn(
          "rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card",
        )}
      >
        {/* Top bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <Input
            placeholder="Search case title, reason, or from user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[320px]"
          />
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={loadAssigned} title="Refresh">
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Link href="/cases">
              <Button className="bg-blue-600 text-white hover:bg-blue-700">
                Go to Cases
              </Button>
            </Link>
          </div>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="[&>th]:text-center">
              <TableHead className="!text-left">Case</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="py-4 text-center text-gray-500 dark:text-gray-300">
                  Loading…
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
                  No assigned cases found
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              !error &&
              filtered.map((r) => {
                const cid = caseIdOf(r);
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

                    <TableCell>{fromNameOfRow(r)}</TableCell>

                    <TableCell className="truncate max-w-[320px]">
                      {r.reason || "—"}
                    </TableCell>

                    <TableCell>
                      {r.created_at
                        ? String(r.created_at).slice(0, 10)
                        : r.timestamp
                        ? String(r.timestamp).slice(0, 10)
                        : "—"}
                    </TableCell>

                    <TableCell>
                      {cid ? (
                        <Link href={`/cases/${cid}/view`}>
                          <Button size="icon" variant="ghost" title="View case">
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
      </div>
    </>
  );
}
