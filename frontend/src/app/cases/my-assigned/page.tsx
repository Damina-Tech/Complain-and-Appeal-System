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

const nameOfUser = (u?: ApiUser | string | number | null) => {
  if (!u) return "—";
  if (typeof u === "string" || typeof u === "number") return String(u);
  const full = `${u.first_name || ""} ${u.last_name || ""}`.trim();
  return full || u.email || u.username || String(u.id);
};

const caseIdOf = (r: AssignmentRecord) =>
  r.case_id ?? (typeof r.case === "object" ? r.case?.id : r.case);

const caseTitleOf = (r: AssignmentRecord) => {
  const c = r.case;
  return typeof c === "object" && c?.title ? c.title : `Case #${caseIdOf(r)}`;
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

  // Search
  const [search, setSearch] = useState("");

  const loadAssigned = async () => {
    if (!API_URL || !token) return;
    try {
      setLoading(true);
      setError("");

      // Prefer server-side filter; adjust the param name to your API if needed
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
    } catch (e: any) {
      setError(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return assignments;
    return assignments.filter((r) => {
      const title = caseTitleOf(r).toLowerCase();
      const reason = (r.reason || "").toLowerCase();
      const fromUser = nameOfUser(r.from_user ?? r.from_user_id).toLowerCase();
      return (
        title.includes(term) ||
        reason.includes(term) ||
        fromUser.includes(term)
      );
    });
  }, [assignments, search]);

  return (
    <>
      <Breadcrumb pageName="My Assigned Cases" />

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
                        <span>{caseTitleOf(r)}</span>
                        <Link
                          href={`/cases/${cid}/view`}
                          className="text-primary text-sm underline"
                        >
                          View
                        </Link>
                      </div>
                    </TableCell>

                    <TableCell>{nameOfUser(r.from_user ?? r.from_user_id)}</TableCell>

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
                      <Link href={`/cases/${cid}/view`}>
                        <Button size="icon" variant="ghost" title="View case">
                          <Eye className="h-4 w-4 text-blue-500" />
                        </Button>
                      </Link>
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
