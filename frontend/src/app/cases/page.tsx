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
import { Eye, Pencil, Trash2, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { TextAreaGroup } from "@/components/FormElements/InputGroup/text-area";
import { AnimatedModal } from "@/components/ui/animated-modal";
import { SuccessModal } from "@/components/ui/success-modal";
import { useTranslation } from "@/hooks/useTranslation";

type Attachment = { name: string; type: string; size: number; data: string; file?: File };

// Title Case -> Tailwind badge classes
const statusColors: Record<string, string> = {
  Pending: "bg-gray-200 text-gray-800",
  "In Investigation": "bg-blue-200 text-blue-800",
  Resolved: "bg-green-200 text-green-800",
  Rejected: "bg-red-200 text-red-800",
  Closed: "bg-yellow-200 text-yellow-800",
};

type ApiCase = {
  id: number | string;
  title?: string;
  description?: string;
  category_id?: string;
  channel?: string;
  priority?: string;
  created_at?: string;
  status?: string;
  citizen_id?: string | number;
};

type Row = {
  id: number | string;
  title: string;
  category: string;
  channel: string;
  priority: string;
  date: string; // YYYY-MM-DD
  status: string; // Title Case for badge mapping
};

export default function ComplaintAppealPage() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>();
  const [openDialog, setOpenDialog] = useState(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [creating, setCreating] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<{
    title?: string;
    description?: string;
    category?: string;
    general?: string;
  }>({});
  const [form, setForm] = useState<{
    title: string;
    description: string;
    category: string;
    attachments: Attachment[];
    status: string;
    office: string;
    citizenId: string | null;
    reported_by: string | null;
  }>({
    title: "",
    description: "",
    category: "",
    attachments: [],
    status: "pending",
    office: "",
    citizenId:
      typeof window !== "undefined" ? localStorage.getItem("user_id") : null,
    reported_by: null,
  });

  // User creation modal state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [userFormError, setUserFormError] = useState("");
  const [userFieldErrors, setUserFieldErrors] = useState<Record<string, string>>({});
  const [userForm, setUserForm] = useState<{
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    national_id: string;
  }>({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    national_id: "",
  });

  // Users list for "Reported By" dropdown
  const [users, setUsers] = useState<Array<{ id: string | number; name: string; email: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [rows, setRows] = useState<Row[]>([]);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL; // e.g. http://localhost:8000/api
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const userId =
    typeof window !== "undefined" ? localStorage.getItem("user_id") : null;

  const currentUserGroups: string[] = useMemo(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("user_groups");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((g) => (typeof g === "string" ? g : g?.name))
          .filter(Boolean);
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  const isCitizen = currentUserGroups.includes("Citizen");

  /** Fetch ALL pages of /cases/ (works for array OR DRF pagination {results,next}) */
  const fetchAllCases = async (
    baseUrl: string,
    headers: Record<string, string>,
  ): Promise<ApiCase[]> => {
    let all: ApiCase[] = [];
    let nextUrl: string | null = `${baseUrl}/cases/`;

    while (nextUrl) {
      const res: Response = await fetch(nextUrl, { headers, cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
      const data: any = await res.json();

      if (Array.isArray(data)) {
        all = all.concat(data as ApiCase[]);
        // if the API returns an array, there's no pagination; stop.
        nextUrl = null;
      } else if (Array.isArray(data?.results)) {
        all = all.concat(data.results as ApiCase[]);
        nextUrl = data.next || null;
      } else {
        // unexpected shape; try to coerce
        const maybeOne = (data && typeof data === "object" ? [data] : []) as ApiCase[];
        all = all.concat(maybeOne);
        nextUrl = null;
      }
    }

    return all;
  };

  const mapRow = (c: ApiCase): Row => ({
    id: c.id,
    title: c.title || `Case #${c.id}`,
    category: c.category_id || "complaint",
    channel: c.channel || "web",
    priority: c.priority || "medium",
    date: (c.created_at ? String(c.created_at).slice(0, 10) : "").replace(/T.*/, ""),
    status: (c.status || "pending").replace(/\b\w/g, (m: string) => m.toUpperCase()),
  });

  const loadCases = async () => {
    if (!API_URL || !token) return;
    try {
      setLoading(true);
      setError("");

      const headers = { Authorization: `Bearer ${token}` };
      const allCases = await fetchAllCases(API_URL, headers);

      // Role-based filtering: citizens only see own cases; staff see all
      const visibleCases = isCitizen
        ? allCases.filter((c) => String(c.citizen_id) === String(userId))
        : allCases;

      setRows(visibleCases.map(mapRow));
    } catch (e: any) {
      setError(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Load users for "Reported By" dropdown
  const loadUsers = async () => {
    if (!API_URL || !token) return;
    try {
      setLoadingUsers(true);
      const res = await fetch(`${API_URL}/users/`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Failed to load users: ${res.status}`);
      const data: any[] = await res.json();
      const userList = (Array.isArray(data) ? data : []).map((u: any) => ({
        id: u.id,
        name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || u.username || `User ${u.id}`,
        email: u.email || u.username || "",
      }));
      setUsers(userList);
    } catch (e: any) {
      console.error("Failed to load users:", e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadCases();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredData = useMemo(() => {
    return rows.filter((item) => {
      const matchCategory = category === "all" || item.category === category;
      const matchSearch = item.title.toLowerCase().includes(search.toLowerCase());
      const matchDate = !date || item.date === date.toISOString().split("T")[0];
      return matchCategory && matchSearch && matchDate;
    });
  }, [rows, category, search, date]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [category, search, date, filteredData.length]);

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList) {
      setForm((s) => ({ ...s, attachments: [] }));
      return;
    }
    const files = Array.from(fileList);
    const allowed = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];
    const selected = files.filter((f) => allowed.includes(f.type));
    
    // Store File objects directly instead of converting to base64
    // We'll send them as actual files in FormData
    const attachments: Attachment[] = selected.map((f) => ({
        name: f.name,
        type: f.type,
        size: f.size,
      data: "", // Will be empty, we'll use the File object directly
      file: f, // Store the File object
    }));

    setForm((s) => ({ ...s, attachments }));
  };

  return (
    <>
      <Breadcrumb pageName={t("nav", "complaintAppeal")} />

      <div
        className={cn(
          "rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card",
        )}
      >
        {/* Filters & Add Button */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <Select onValueChange={(val) => setCategory(val)} defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("cases", "category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="complaint">Complaints</SelectItem>
                <SelectItem value="appeal">Appeals</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder={t("common", "search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[250px]"
            />
          </div>

          <Button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => setOpenDialog(true)}
          >
            + {t("cases", "addNew")}
          </Button>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="[&>th]:text-center">
              <TableHead className="!text-left">{t("cases", "title")}</TableHead>
              <TableHead>{t("cases", "category")}</TableHead>
              <TableHead>{t("cases", "channel")}</TableHead>
              <TableHead>{t("cases", "priority")}</TableHead>
              <TableHead>{t("cases", "date")}</TableHead>
              <TableHead>{t("cases", "status")}</TableHead>
              <TableHead>{t("common", "actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-4 text-center text-gray-500 dark:text-gray-300"
                >
                  {t("common", "loading")}
                </TableCell>
              </TableRow>
            )}
            {!!error && !loading && (
              <TableRow>
                <TableCell colSpan={7} className="py-4 text-center text-red-500">
                  {error}
                </TableCell>
              </TableRow>
            )}
            {!loading && !error && filteredData.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-4 text-center text-gray-500 dark:text-gray-300"
                >
                  {t("activity", "noRecordsFound")}
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              !error &&
              paginatedData.map((item) => (
                <TableRow
                  key={item.id}
                  className="text-center text-base font-medium text-dark dark:text-white"
                >
                  <TableCell className="!text-left">{item.title}</TableCell>
                  <TableCell className="capitalize">{item.category}</TableCell>
                  <TableCell className="capitalize">{item.channel}</TableCell>
                  <TableCell className="capitalize">{item.priority}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[item.status] || "bg-gray-200 text-gray-800"}`}
                    >
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => router.push(`/cases/${item.id}/view`)}
                        title={t("common", "view")}
                      >
                        <Eye className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => router.push(`/cases/${item.id}/edit`)}
                        title={t("common", "edit")}
                      >
                        <Pencil className="h-4 w-4 text-green-500" />
                      </Button>
                      {!isCitizen && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setCaseToDelete(item);
                            setDeleteConfirmOpen(true);
                          }}
                          title={t("common", "delete")}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        {!loading && !error && filteredData.length > itemsPerPage && (
          <div className="mt-4 flex items-center justify-between border-t border-stroke pt-4 dark:border-dark-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} cases
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

      {/* ✅ Add New Case Modal (Animated) */}
      <AnimatedModal
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setFormErrors({});
          setForm({
            title: "",
            description: "",
            category: "",
            attachments: [],
            status: "pending",
            office: "",
            citizenId:
              typeof window !== "undefined"
                ? localStorage.getItem("user_id")
                : null,
            reported_by: null,
          });
        }}
        title={t("cases", "createCase")}
        maxWidthClassName="max-w-2xl"
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            
            // Clear previous errors
            setFormErrors({});
            
            // Validation
            const errors: { title?: string; description?: string; category?: string } = {};
            if (!form.title || form.title.trim() === "") {
              errors.title = "Title is required";
            }
            if (!form.description || form.description.trim() === "") {
              errors.description = "Description is required";
            }
            if (!form.category || form.category.trim() === "") {
              errors.category = "Category is required";
            }
            
            if (Object.keys(errors).length > 0) {
              setFormErrors(errors);
              return;
            }
            
            if (!API_URL) {
              setFormErrors({ general: "NEXT_PUBLIC_API_URL is not set" });
              return;
            }
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            if (!token) {
              setFormErrors({ general: "You are not authenticated. Please sign in." });
              return;
            }
            
            try {
              setCreating(true);
              setFormErrors({});
              
              // Handle file uploads with FormData
              const formData = new FormData();
              formData.append("title", form.title.trim());
              formData.append("description", form.description.trim());
              formData.append("category_id", form.category);
              formData.append("status", form.status || "pending");
              if (form.office) formData.append("office_id", form.office);
              if (form.citizenId) formData.append("citizen_id", form.citizenId);
              if (form.reported_by) formData.append("reported_by", form.reported_by);
              
              // Append attachments as actual File objects (backend handles request.FILES)
              if (form.attachments && form.attachments.length > 0) {
                form.attachments.forEach((att) => {
                  if (att.file) {
                    formData.append("attachments", att.file);
                  }
                });
              }
              
              const res = await fetch(`${API_URL}/cases/`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                body: formData,
              });
              
              if (!res.ok) {
                let errorMessage = `Failed to create case (${res.status})`;
                const fieldErrs: { [key: string]: string } = {};
                
                try {
                  const errorData = await res.json();
                  // Handle Django REST Framework error format
                  if (errorData.detail) {
                    errorMessage = errorData.detail;
                  } else if (typeof errorData === "object") {
                    // Handle field-specific errors
                    Object.entries(errorData).forEach(([field, messages]) => {
                      if (Array.isArray(messages)) {
                        const msg = messages.join(", ");
                        // Map backend field names to form field names
                        if (field === "title") {
                          fieldErrs.title = msg;
                        } else if (field === "description") {
                          fieldErrs.description = msg;
                        } else if (field === "category_id" || field === "category") {
                          fieldErrs.category = msg;
                        } else {
                          // For other fields, add to general error
                          if (!fieldErrs.general) fieldErrs.general = "";
                          fieldErrs.general += `${field}: ${msg}; `;
                        }
                      } else if (typeof messages === "string") {
                        if (field === "title") {
                          fieldErrs.title = messages;
                        } else if (field === "description") {
                          fieldErrs.description = messages;
                        } else if (field === "category_id" || field === "category") {
                          fieldErrs.category = messages;
                        } else {
                          if (!fieldErrs.general) fieldErrs.general = "";
                          fieldErrs.general += `${field}: ${messages}; `;
                        }
                      }
                    });
                    
                    // Clean up general error trailing semicolon
                    if (fieldErrs.general) {
                      fieldErrs.general = fieldErrs.general.trim().replace(/; $/, "");
                    }
                    
                    // If we have field-specific errors, set them and show general if exists
                    if (fieldErrs.title || fieldErrs.description || fieldErrs.category) {
                      setFormErrors(fieldErrs);
                      return; // Don't throw, errors are displayed
                    } else if (fieldErrs.general) {
                      setFormErrors({ general: fieldErrs.general });
                      return; // Don't throw, error is displayed
                    } else {
                      errorMessage = JSON.stringify(errorData);
                    }
                  } else if (typeof errorData === "string") {
                    errorMessage = errorData;
                  }
                } catch {
                  // If JSON parsing fails, try text
                  try {
                    const text = await res.text();
                    if (text) errorMessage = text;
                  } catch {
                    // Keep default error message
                  }
                }
                setFormErrors({ general: errorMessage });
                return; // Don't throw, error is displayed
              }
              
              // Success
              await res.json().catch(() => null);
              setOpenDialog(false);
              setForm({
                title: "",
                description: "",
                category: "",
                attachments: [],
                status: "pending",
                office: "",
                citizenId:
                  typeof window !== "undefined"
                    ? localStorage.getItem("user_id")
                    : null,
                reported_by: null,
              });
              setFormErrors({});
              await loadCases();

              // success modal
              setSuccessMsg(t("common", "success"));
              setSuccessOpen(true);
              setTimeout(() => setSuccessOpen(false), 3000);
            } catch (err: any) {
              const errorMsg = err?.message || t("common", "error");
              setFormErrors({ general: errorMsg });
            } finally {
              setCreating(false);
            }
          }}
        >
          {/* General Error Message */}
          {formErrors.general && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-100">
              {formErrors.general}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">
              {t("cases", "title")} <span className="text-red-500">*</span>
            </label>
          <Input
              placeholder={t("forms", "enterTitle")}
            value={form.title}
              onChange={(e) => {
                setForm((s) => ({ ...s, title: e.target.value }));
                if (formErrors.title) setFormErrors((e) => ({ ...e, title: undefined }));
              }}
              className={formErrors.title ? "border-red-500" : ""}
              required
            />
            {formErrors.title && (
              <p className="mt-1 text-sm text-red-500">{formErrors.title}</p>
            )}
          </div>

          <div>
          <TextAreaGroup
            name="description"
            label="Description"
            rows={4}
            placeholder="Describe the case"
            value={form.description}
              onChange={(e) => {
                setForm((s) => ({ ...s, description: e.target.value }));
                if (formErrors.description) setFormErrors((e) => ({ ...e, description: undefined }));
              }}
              required
            />
            {formErrors.description && (
              <p className="mt-1 text-sm text-red-500">{formErrors.description}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              {t("cases", "category")} <span className="text-red-500">*</span>
            </label>
          <Select
            value={form.category}
              onValueChange={(val) => {
                setForm((s) => ({ ...s, category: val }));
                if (formErrors.category) setFormErrors((e) => ({ ...e, category: undefined }));
              }}
          >
              <SelectTrigger className={formErrors.category ? "border-red-500" : ""}>
              <SelectValue placeholder={t("forms", "selectCategory")} />
            </SelectTrigger>
            <SelectContent className="z-[10002]" position="popper" sideOffset={6}>
              <SelectItem value="land">Land</SelectItem>
              <SelectItem value="education">Education</SelectItem>
              <SelectItem value="infrastructure">Infrastructure</SelectItem>
              <SelectItem value="healthcare">Healthcare</SelectItem>
              <SelectItem value="water & sanitation">Water & Sanitation</SelectItem>
              <SelectItem value="human right">Human Right</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
            {formErrors.category && (
              <p className="mt-1 text-sm text-red-500">{formErrors.category}</p>
            )}
          </div>

          {/* Reported By Field */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Reported By (Optional)
            </label>
            <div className="flex gap-2">
              <Select
                value={form.reported_by || "none"}
                onValueChange={(val) => setForm((s) => ({ ...s, reported_by: val === "none" ? null : val }))}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent className="z-[10002]" position="popper" sideOffset={6}>
                  <SelectItem value="none">None</SelectItem>
                  {loadingUsers ? (
                    <SelectItem value="loading" disabled>{t("common", "loading")}</SelectItem>
                  ) : (
                    users.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.name} {user.email ? `(${user.email})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={() => setUserModalOpen(true)}
                className="bg-green-600 text-white hover:bg-green-700 whitespace-nowrap"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add User
              </Button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Attachments (PDF, PNG, JPG)
            </label>
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/jpg"
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
            />
            {Array.isArray(form.attachments) && form.attachments.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-600 dark:text-dark-6">
                {form.attachments.map((a) => (
                  <li key={a.name}>
                    {a.name}{" "}
                    {a.size ? `(${Math.round(a.size / 1024)} KB)` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
            disabled={creating}
          >
            {creating ? "Saving..." : "Save"}
          </Button>
        </form>
      </AnimatedModal>

      {/* Add User Modal */}
      <AnimatedModal
        open={userModalOpen}
        onClose={() => {
          setUserModalOpen(false);
          setUserFormError("");
          setUserFieldErrors({});
          setUserForm({
            first_name: "",
            last_name: "",
            email: "",
            phone_number: "",
            national_id: "",
          });
        }}
        title="Add New User"
        maxWidthClassName="max-w-md"
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setUserFormError("");
            setUserFieldErrors({});

            // Client-side validation
            const errors: Record<string, string> = {};
            
            if (!userForm.first_name?.trim()) {
              errors.first_name = "First name is required";
            }
            
            if (!userForm.last_name?.trim()) {
              errors.last_name = "Last name is required";
            }
            
            if (!userForm.phone_number?.trim()) {
              errors.phone_number = "Phone number is required";
            }

            if (Object.keys(errors).length > 0) {
              setUserFieldErrors(errors);
              setUserFormError("Please fill in all required fields");
              return;
            }

            if (!API_URL) {
              setUserFormError("NEXT_PUBLIC_API_URL is not set");
              return;
            }
            if (!token) {
              setUserFormError("You are not authenticated. Please sign in.");
              return;
            }

            try {
              setCreatingUser(true);

              const payload: Record<string, any> = {
                username: userForm.email || `${userForm.first_name.toLowerCase()}_${Date.now()}`,
                first_name: userForm.first_name.trim(),
                last_name: userForm.last_name.trim(),
                phone_number: userForm.phone_number.trim(),
                status: "active",
                groups: ["Citizen"], // Default to Citizen role
              };

              // Add optional fields only if they have values
              if (userForm.email?.trim()) {
                payload.email = userForm.email.trim();
              }
              if (userForm.national_id?.trim()) {
                payload.national_id = userForm.national_id.trim();
              }

              const res = await fetch(`${API_URL}/users/`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
              });

              if (!res.ok) {
                let errorData: any = {};
                const responseText = await res.text();
                
                try {
                  errorData = JSON.parse(responseText);
                } catch {
                  errorData = { detail: responseText || res.statusText };
                }

                // Helper function to extract error message
                const getErrorMessage = (fieldError: any): string => {
                  if (Array.isArray(fieldError)) {
                    return fieldError[0] || "Invalid value";
                  }
                  if (typeof fieldError === 'object' && fieldError !== null) {
                    if (fieldError.non_field_errors) {
                      return Array.isArray(fieldError.non_field_errors) ? fieldError.non_field_errors[0] : String(fieldError.non_field_errors);
                    }
                    if (fieldError.message) {
                      return String(fieldError.message);
                    }
                    const keys = Object.keys(fieldError);
                    if (keys.length > 0) {
                      return String(fieldError[keys[0]]);
                    }
                    return "Invalid value";
                  }
                  return String(fieldError);
                };

                // Map API field names to form field names
                const newFieldErrors: Record<string, string> = {};
                
                Object.keys(errorData).forEach((key) => {
                  if (key === 'detail' || key === 'message' || key === 'error' || key === 'non_field_errors') {
                    return;
                  }
                  
                  let formFieldName = '';
                  switch (key) {
                    case 'email':
                      formFieldName = 'email';
                      break;
                    case 'phone_number':
                      formFieldName = 'phone_number';
                      break;
                    case 'national_id':
                      formFieldName = 'national_id';
                      break;
                    case 'first_name':
                      formFieldName = 'first_name';
                      break;
                    case 'last_name':
                      formFieldName = 'last_name';
                      break;
                    case 'username':
                      formFieldName = 'email'; // username errors affect email field
                      break;
                    default:
                      formFieldName = key;
                  }
                  
                  if (formFieldName && errorData[key]) {
                    const errorMsg = getErrorMessage(errorData[key]);
                    if (errorMsg && errorMsg !== 'Invalid value') {
                      newFieldErrors[formFieldName] = errorMsg;
                    }
                  }
                });

                if (Object.keys(newFieldErrors).length > 0) {
                  setUserFieldErrors(newFieldErrors);
                }

                // Get general error message
                let errorMessage = "";
                if (errorData.detail) {
                  errorMessage = Array.isArray(errorData.detail) ? errorData.detail[0] : String(errorData.detail);
                } else if (errorData.message) {
                  errorMessage = Array.isArray(errorData.message) ? errorData.message[0] : String(errorData.message);
                } else if (errorData.error) {
                  errorMessage = Array.isArray(errorData.error) ? errorData.error[0] : String(errorData.error);
                } else if (Object.keys(newFieldErrors).length > 0) {
                  errorMessage = "Please fix the errors in the form fields";
                } else {
                  errorMessage = typeof errorData === 'string' ? errorData : JSON.stringify(errorData);
                }

                if (!errorMessage) {
                  errorMessage = `Create failed (${res.status})`;
                }

                // Only show general error if there are no field-specific errors
                if (Object.keys(newFieldErrors).length === 0) {
                  setUserFormError(errorMessage);
                } else {
                  setUserFormError("Please fix the errors below");
                }
                
                return;
              }

              const newUser = await res.json();

              // Reload users list
              await loadUsers();

              // Set the newly created user as reported_by
              setForm((s) => ({ ...s, reported_by: String(newUser.id) }));

              // Close modal and reset form
              setUserModalOpen(false);
              setUserForm({
                first_name: "",
                last_name: "",
                email: "",
                phone_number: "",
                national_id: "",
              });
              setUserFieldErrors({});

              // Show success message
              setSuccessMsg("User created successfully and selected as 'Reported By'.");
              setSuccessOpen(true);
              setTimeout(() => setSuccessOpen(false), 3000);
            } catch (err: any) {
              setUserFormError(err?.message || "Failed to create user");
            } finally {
              setCreatingUser(false);
            }
          }}
        >
          {/* General error message at top */}
          {userFormError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-red-600 dark:text-red-400">⚠</span>
                <div>
                  <p className="font-medium">Validation Error</p>
                  <p className="mt-1">{userFormError}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Input
                placeholder="First name *"
                value={userForm.first_name}
                onChange={(e) => {
                  setUserForm((s) => ({ ...s, first_name: e.target.value }));
                  if (userFieldErrors.first_name) {
                    setUserFieldErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.first_name;
                      return newErrors;
                    });
                  }
                }}
                className={userFieldErrors.first_name ? "border-red-500" : ""}
                required
              />
              {userFieldErrors.first_name && (
                <p className="mt-1 text-xs text-red-500">{userFieldErrors.first_name}</p>
              )}
            </div>
            <div>
              <Input
                placeholder="Last name *"
                value={userForm.last_name}
                onChange={(e) => {
                  setUserForm((s) => ({ ...s, last_name: e.target.value }));
                  if (userFieldErrors.last_name) {
                    setUserFieldErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.last_name;
                      return newErrors;
                    });
                  }
                }}
                className={userFieldErrors.last_name ? "border-red-500" : ""}
                required
              />
              {userFieldErrors.last_name && (
                <p className="mt-1 text-xs text-red-500">{userFieldErrors.last_name}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Input
                placeholder="Email (optional)"
                type="email"
                value={userForm.email}
                onChange={(e) => {
                  setUserForm((s) => ({ ...s, email: e.target.value }));
                  if (userFieldErrors.email) {
                    setUserFieldErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.email;
                      return newErrors;
                    });
                  }
                }}
                className={userFieldErrors.email ? "border-red-500" : ""}
              />
              {userFieldErrors.email && (
                <p className="mt-1 text-xs text-red-500">{userFieldErrors.email}</p>
              )}
            </div>
            <div>
              <Input
                placeholder="Phone number *"
                value={userForm.phone_number}
                onChange={(e) => {
                  setUserForm((s) => ({ ...s, phone_number: e.target.value }));
                  if (userFieldErrors.phone_number) {
                    setUserFieldErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.phone_number;
                      return newErrors;
                    });
                  }
                }}
                className={userFieldErrors.phone_number ? "border-red-500" : ""}
                required
              />
              {userFieldErrors.phone_number && (
                <p className="mt-1 text-xs text-red-500">{userFieldErrors.phone_number}</p>
              )}
            </div>
          </div>

          <div>
            <Input
              placeholder="National ID (optional)"
              value={userForm.national_id}
              onChange={(e) => {
                setUserForm((s) => ({ ...s, national_id: e.target.value }));
                if (userFieldErrors.national_id) {
                  setUserFieldErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.national_id;
                    return newErrors;
                  });
                }
              }}
              className={userFieldErrors.national_id ? "border-red-500" : ""}
            />
            {userFieldErrors.national_id && (
              <p className="mt-1 text-xs text-red-500">{userFieldErrors.national_id}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUserModalOpen(false);
                setUserFormError("");
                setUserFieldErrors({});
                setUserForm({
                  first_name: "",
                  last_name: "",
                  email: "",
                  phone_number: "",
                  national_id: "",
                });
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 text-white hover:bg-green-700"
              disabled={creatingUser}
            >
              {creatingUser ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </AnimatedModal>

      {/* Delete Confirmation Modal */}
      <AnimatedModal
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setCaseToDelete(null);
        }}
        title={t("cases", "deleteCase")}
        maxWidthClassName="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            {t("common", "confirm")} {t("cases", "deleteCase")} &quot;{caseToDelete?.title}&quot;? {t("common", "confirm")}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setCaseToDelete(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                if (!caseToDelete || !API_URL || !token) return;
                try {
                  setDeleting(true);
                  const res = await fetch(`${API_URL}/cases/${caseToDelete.id}/`, {
                    method: "DELETE",
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  });
                  if (!res.ok && res.status !== 204) {
                    const msg = await res.text();
                    throw new Error(msg || `Delete failed: ${res.status}`);
                  }
                  setDeleteConfirmOpen(false);
                  setCaseToDelete(null);
                  setSuccessMsg("Case deleted successfully.");
                  setSuccessOpen(true);
                  setTimeout(() => setSuccessOpen(false), 3000);
                  await loadCases();
                } catch (err: any) {
                  setError(err?.message || "Failed to delete case");
                } finally {
                  setDeleting(false);
                }
              }}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </AnimatedModal>

      {/* Success Modal (auto-closes after 3s) */}
      <SuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title={t("common", "success")}
        message={successMsg}
        autoCloseMs={6000}
      />
    </>
  );
}
