"use client";

import { useEffect, useState } from "react";
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
import { useRouter } from "next/navigation";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";

/* ---------------- Types ---------------- */

type ApiFeedback = {
  id: number | string;
  case: number | string;
  case_id_display: number | string;
  case_title: string;
  case_status: string;
  created_by: number | string;
  created_by_name: string;
  rating: number;
  comment: string;
  created_at: string;
  is_appeal: boolean;
  parent_case_id?: number | string | null;
};

type Row = {
  id: number | string;
  case_id: number | string;
  case_title: string;
  case_status: string;
  created_by_name: string;
  rating: number;
  comment: string;
  created_at: string;
  type: "Feedback" | "Appeal";
  parent_case_id?: number | string | null;
};

/* ---------------- Mapping helpers ---------------- */

const mapRow = (f: ApiFeedback): Row => ({
  id: f.id,
  case_id: f.case_id_display,
  case_title: f.case_title,
  case_status: f.case_status,
  created_by_name: f.created_by_name,
  rating: f.rating,
  comment: f.comment || "—",
  created_at: f.created_at ? new Date(f.created_at).toLocaleDateString() : "—",
  type: f.is_appeal ? "Appeal" : "Feedback",
  parent_case_id: f.parent_case_id,
});

/* ---------------- Page ---------------- */

export default function FeedbackAppealPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [filterType, setFilterType] = useState<"all" | "feedback" | "appeal">("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const fetchAllPaginated = async <T,>(url: string, headers: HeadersInit): Promise<T[]> => {
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

  const loadAll = async () => {
    if (!API_URL || !token) {
      setError("Missing API URL or authentication");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let url = `${API_URL}/feedbacks/`;
      if (filterType === "appeal") {
        url += "?type=appeal";
      } else if (filterType === "feedback") {
        url += "?type=feedback";
      }

      const data = await fetchAllPaginated<ApiFeedback>(url, headers);
      setRows(data.map(mapRow));
    } catch (e: any) {
      setError(e?.message || "Failed to load feedback/appeals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [filterType]);

  // Pagination calculations
  const totalPages = Math.ceil(rows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = rows.slice(startIndex, endIndex);

  // Reset to page 1 when filter or rows change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, rows.length]);

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900";
    if (rating >= 3) return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900";
    return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900";
  };

  const getTypeColor = (type: string) => {
    if (type === "Appeal") return "text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900";
    return "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900";
  };

  return (
    <>
      <Breadcrumb pageName="Feedback / Appeal" />

      <div
        className={cn(
          "rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card",
        )}
      >
        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 border-b border-stroke dark:border-dark-3">
          <button
            onClick={() => setFilterType("all")}
            className={cn(
              "px-4 py-2 font-medium transition",
              filterType === "all"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-600 hover:text-primary dark:text-gray-400",
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilterType("feedback")}
            className={cn(
              "px-4 py-2 font-medium transition",
              filterType === "feedback"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-600 hover:text-primary dark:text-gray-400",
            )}
          >
            Feedback
          </button>
          <button
            onClick={() => setFilterType("appeal")}
            className={cn(
              "px-4 py-2 font-medium transition",
              filterType === "appeal"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-600 hover:text-primary dark:text-gray-400",
            )}
          >
            Appeals
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No {filterType === "all" ? "feedback or appeals" : filterType === "appeal" ? "appeals" : "feedback"} found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case ID</TableHead>
                    <TableHead>Case Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.parent_case_id ? (
                        <span className="text-xs text-gray-500">Appeal of #{row.parent_case_id}</span>
                      ) : (
                        `#${row.case_id}`
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={row.case_title}>
                      {row.case_title}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-1 text-xs font-medium",
                          getTypeColor(row.type),
                        )}
                      >
                        {row.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{row.case_status}</span>
                    </TableCell>
                    <TableCell>{row.created_by_name}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center justify-center rounded-full px-2 py-1 text-xs font-semibold",
                          getRatingColor(row.rating),
                        )}
                      >
                        {row.rating}/5
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={row.comment}>
                      {row.comment}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                      {row.created_at}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/cases/${row.case_id}/view`)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {rows.length > itemsPerPage && (
              <div className="mt-4 flex items-center justify-between border-t border-stroke pt-4 dark:border-dark-3">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {startIndex + 1} to {Math.min(endIndex, rows.length)} of {rows.length} {filterType === "all" ? "items" : filterType === "appeal" ? "appeals" : "feedback"}
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
          </>
        )}
      </div>
    </>
  );
}

