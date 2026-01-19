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
import { Eye, Pencil, Trash2, Plus, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { TextAreaGroup } from "@/components/FormElements/InputGroup/text-area";
import { AnimatedModal } from "@/components/ui/animated-modal";
import { SuccessModal } from "@/components/ui/success-modal";
import { useTranslation } from "@/hooks/useTranslation";

type Attachment = { name: string; type: string; size: number; data: string; file?: File };

// Title Case -> Tailwind badge classes
const statusColors: Record<string, string> = {
  Draft: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Submitted: "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Pending: "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200", // Legacy support
  "In Investigation": "bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  Resolved: "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200",
  Rejected: "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200",
  Closed: "bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "On Appeal": "bg-orange-200 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
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
    status: "draft",
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
  const [createLoginAccount, setCreateLoginAccount] = useState(false);
  const [userForm, setUserForm] = useState<{
    first_name: string;
    last_name: string;
    email: string;
    password?: string;
    phone_number: string;
    national_id: string;
    group: string;
  }>({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone_number: "",
    national_id: "",
    group: "Citizen",
  });

  // Roles and permissions for user creation
  const [roles, setRoles] = useState<string[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  
  // Current user groups for permissions
  const currentUserGroups: string[] = useMemo(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("user_groups");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((g) => (typeof g === "string" ? g : g?.name)).filter(Boolean);
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  const isAdmin = currentUserGroups.includes("Admin");
  const isDirector = currentUserGroups.includes("Director");
  const isMayorOffice = currentUserGroups.includes("Mayor Office");
  
  // Check if user can manage categories (Admin, Director, Mayor Office only)
  const canManageCategories = isAdmin || isDirector || isMayorOffice;

  // Hierarchy levels for role filtering
  const hierarchyLevels: Record<string, number> = {
    "Citizen": 1,
    "Focal Person": 2,
    "Director": 3,
    "Mayor Office": 4,
    "Admin": 5,
  };

  // Get available roles for creation based on current user's role
  const availableRolesForCreation = useMemo(() => {
    // Determine current user's hierarchy level
    let currentUserLevel = 0;
    if (isAdmin) {
      currentUserLevel = hierarchyLevels["Admin"];
    } else if (isMayorOffice) {
      currentUserLevel = hierarchyLevels["Mayor Office"];
    } else if (isDirector) {
      currentUserLevel = hierarchyLevels["Director"];
    } else {
      // Focal Person or others cannot create users
      return ["Citizen"]; // Default to Citizen only
    }

    // Filter roles: only allow roles with lower hierarchy level (strictly less than)
    return roles.filter((role) => {
      const roleLevel = hierarchyLevels[role];
      // Only include roles that have a valid level AND are lower than current user's level
      return roleLevel !== undefined && roleLevel < currentUserLevel;
    });
  }, [roles, isAdmin, isDirector, isMayorOffice]);

  // Users list for "Reported By" dropdown
  const [users, setUsers] = useState<Array<{ id: string | number; name: string; email: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Categories list
  const [categories, setCategories] = useState<Array<{ id: string | number; name: string; description?: string }>>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  // Category management modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryFormError, setCategoryFormError] = useState("");
  const [categoryForm, setCategoryForm] = useState<{
    name: string;
    description: string;
  }>({
    name: "",
    description: "",
  });

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

  // Helper function to convert API status to UI status
  const apiToUiStatus = (s?: string): string => {
    if (!s) return "Draft";
    const norm = s.toLowerCase();
    if (norm === "in_investigation" || norm === "in-investigation") return "In Investigation";
    return (
      {
        draft: "Draft",
        submitted: "Submitted",
        pending: "Submitted", // Legacy support - map old pending to Submitted
        resolved: "Resolved",
        rejected: "Rejected",
        closed: "Closed",
        on_appeal: "On Appeal",
      }[norm] || "Draft"
    );
  };

  const mapRow = (c: ApiCase): Row => {
    // Find category name from categories list or use category_id if it's an object
    let categoryName = "No Category";
    if (c.category_id) {
      if (typeof c.category_id === "object" && c.category_id !== null && "name" in c.category_id) {
        categoryName = (c.category_id as any).name;
      } else {
        const cat = categories.find((cat) => String(cat.id) === String(c.category_id));
        categoryName = cat?.name || String(c.category_id);
      }
    }
    
    return {
      id: c.id,
      title: c.title || `Case #${c.id}`,
      category: categoryName,
      channel: c.channel || "web",
      priority: c.priority || "medium",
      date: (c.created_at ? String(c.created_at).slice(0, 10) : "").replace(/T.*/, ""),
      status: apiToUiStatus(c.status),
    };
  };

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
      // Fetch all users with pagination support
      let allUsers: any[] = [];
      let nextUrl: string | null = `${API_URL}/users/`;

      while (nextUrl) {
        const res = await fetch(nextUrl, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Failed to load users: ${res.status}`);
        const data: any = await res.json();

        if (Array.isArray(data)) {
          allUsers = allUsers.concat(data);
          nextUrl = null;
        } else if (Array.isArray(data?.results)) {
          allUsers = allUsers.concat(data.results);
          nextUrl = data.next || null;
        } else {
          nextUrl = null;
        }
      }

      const userList = allUsers.map((u: any) => ({
        id: u.id,
        name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || u.username || `User ${u.id}`,
        email: u.email || u.username || "",
      }));
      setUsers(userList);
    } catch (e: any) {
      console.error("Failed to load users:", e);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load categories
  const loadCategories = async () => {
    if (!API_URL || !token) return;
    try {
      setLoadingCategories(true);
      const res = await fetch(`${API_URL}/categories/`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Failed to load categories: ${res.status}`);
      const data: any = await res.json();
      const categoryList = (Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []).map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description || "",
      }));
      setCategories(categoryList);
    } catch (e: any) {
      console.error("Failed to load categories:", e);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Load roles for user creation
  const loadRoles = async () => {
    if (!API_URL || !token) return;
    try {
      setLoadingRoles(true);
      const res = await fetch(`${API_URL}/groups/`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data: any = await res.json();
        // Handle paginated response
        const groupsData = Array.isArray(data) ? data : (data.results || []);
        const roleNames: string[] = groupsData
          .map((g: any) => g?.name || g)
          .filter(Boolean);
        setRoles(roleNames);
      } else {
        console.error("Failed to load roles:", res.status);
        setRoles([]);
      }
    } catch (e: any) {
      console.error("Failed to load roles:", e);
      setRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    loadCases();
    loadUsers();
    loadCategories();
    loadRoles();
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
                <SelectItem value="all">All Categories</SelectItem>
                {loadingCategories ? (
                  <SelectItem value="loading" disabled>{t("common", "loading")}</SelectItem>
                ) : (
                  categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Input
              placeholder={t("common", "search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[250px]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {canManageCategories && (
              <>
                <Button
                  type="button"
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 whitespace-nowrap"
                  onClick={() => setCategoryModalOpen(true)}
                  title="Add New Category"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Category
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="px-4 py-2 rounded whitespace-nowrap border-gray-300 hover:bg-gray-100 dark:border-dark-3 dark:hover:bg-dark-2"
                  onClick={() => router.push("/categories")}
                  title="Manage Categories"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Manage Categories
                </Button>
              </>
            )}
            <Button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={() => setOpenDialog(true)}
            >
              + {t("cases", "addNew")}
            </Button>
          </div>
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
            status: "draft",
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
              // category is now the category ID (number/string)
              if (form.category) {
                formData.append("category_id", String(form.category));
              }
              formData.append("status", form.status || "draft");
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
                status: "draft",
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
            <div className="flex gap-2">
              <div className="flex-1">
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
                  {loadingCategories ? (
                    <SelectItem value="loading" disabled>{t("common", "loading")}</SelectItem>
                  ) : categories.length === 0 ? (
                    <SelectItem value="none" disabled>No categories available</SelectItem>
                  ) : (
                    categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
                </Select>
              </div>
              {canManageCategories && (
                <Button
                  type="button"
                  onClick={() => setCategoryModalOpen(true)}
                  className="bg-green-600 text-white hover:bg-green-700 whitespace-nowrap"
                  title="Add New Category"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Category
                </Button>
              )}
            </div>
            {formErrors.category && (
              <p className="mt-1 text-sm text-red-500">{formErrors.category}</p>
            )}
          </div>

          {/* Reported By Field - Only visible to non-Citizen users */}
          {!isCitizen && (
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
                {canManageCategories && (
                  <Button
                    type="button"
                    onClick={() => setUserModalOpen(true)}
                    className="bg-green-600 text-white hover:bg-green-700 whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add User
                  </Button>
                )}
              </div>
            </div>
          )}

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
          setCreateLoginAccount(false);
          setUserForm({
            first_name: "",
            last_name: "",
            email: "",
            password: "",
            phone_number: "",
            national_id: "",
            group: "Citizen",
          });
        }}
        title={t("users", "addNewUser")}
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
              errors.first_name = t("forms", "firstNameRequired");
            }
            
            if (!userForm.last_name?.trim()) {
              errors.last_name = t("forms", "lastNameRequired");
            }
            
            if (!userForm.phone_number?.trim()) {
              errors.phone_number = t("forms", "phoneRequired");
            }

            // Validate role selection
            if (!userForm.group?.trim()) {
              errors.group = t("forms", "roleRequired");
            }

            // Validate email and password if createLoginAccount is enabled
            if (createLoginAccount) {
              if (!userForm.email?.trim()) {
                errors.email = t("forms", "emailRequired");
              }
              if (!userForm.password?.trim()) {
                errors.password = t("forms", "passwordRequired");
              }
            }

            if (Object.keys(errors).length > 0) {
              setUserFieldErrors(errors);
              setUserFormError(t("forms", "fillRequiredFields"));
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

              const assignedRole = userForm.group || availableRolesForCreation[0] || "Citizen";
              
              const payload: Record<string, any> = {
                username: userForm.email || `${userForm.first_name.toLowerCase()}_${Date.now()}`,
                first_name: userForm.first_name.trim(),
                last_name: userForm.last_name.trim(),
                phone_number: userForm.phone_number.trim(),
                status: "active",
                groups: [assignedRole],
              };

              // Add optional fields only if they have values
              if (userForm.email?.trim()) {
                payload.email = userForm.email.trim();
              }
              if (userForm.password?.trim()) {
                payload.password = userForm.password.trim();
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
              setCreateLoginAccount(false);
              setUserForm({
                first_name: "",
                last_name: "",
                email: "",
                password: "",
                phone_number: "",
                national_id: "",
                group: "Citizen",
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
                placeholder={`${t("forms", "firstName")} *`}
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
                placeholder={`${t("forms", "lastName")} *`}
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

          <div>
            <Input
              placeholder={`${t("forms", "phone")} *`}
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

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Input
                placeholder={`${t("forms", "nationalId")} (${t("common", "optional")})`}
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

            {/* Role selection */}
            <div>
              <select
                className={`w-full rounded border border-gray-300 bg-white p-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white ${
                  userFieldErrors.group ? "border-red-500" : ""
                }`}
                value={userForm.group || ""}
                onChange={(e) => {
                  setUserForm((s) => ({ ...s, group: e.target.value }));
                  if (userFieldErrors.group) {
                    setUserFieldErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.group;
                      return newErrors;
                    });
                  }
                }}
                required
              >
                <option value="">{t("common", "select")} {t("users", "role")}</option>
                {availableRolesForCreation.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {userFieldErrors.group && (
                <p className="mt-1 text-xs text-red-500">{userFieldErrors.group}</p>
              )}
              {availableRolesForCreation.length === 0 && (
                <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                  {t("users", "noRolesAvailable")} - {t("common", "loading")}...
                </p>
              )}
            </div>
          </div>

          {/* Create Login Account Toggle - moved to end */}
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-dark-3 dark:bg-dark-2">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={createLoginAccount}
                onChange={(e) => {
                  setCreateLoginAccount(e.target.checked);
                  if (!e.target.checked) {
                    // Clear email and password when toggle is off
                    setUserForm((s) => ({ ...s, email: "", password: "" }));
                  }
                }}
                className="peer sr-only"
              />
              <div className="relative">
                <div className={`h-5 w-9 rounded-full transition-colors dark:bg-[#5A616B] ${
                  createLoginAccount ? "bg-primary" : "bg-gray-3"
                }`} />
                <div
                  className={`absolute -top-1 left-0 size-7 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-transform ${
                    createLoginAccount
                      ? "translate-x-full bg-primary dark:bg-white"
                      : "translate-x-0"
                  }`}
                />
              </div>
              <span className="flex-1 text-sm font-medium text-dark dark:text-white">
                {t("users", "createLoginAccount")}
              </span>
            </label>
          </div>

          {/* Email and Password fields - only shown when toggle is on */}
          {createLoginAccount && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Input
                  placeholder={`${t("forms", "email")} *`}
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
                  required={createLoginAccount}
                />
                {userFieldErrors.email && (
                  <p className="mt-1 text-xs text-red-500">{userFieldErrors.email}</p>
                )}
              </div>
              <div>
                <Input
                  placeholder={`${t("forms", "password")} *`}
                  type="password"
                  value={userForm.password || ""}
                  onChange={(e) => {
                    setUserForm((s) => ({ ...s, password: e.target.value }));
                    if (userFieldErrors.password) {
                      setUserFieldErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.password;
                        return newErrors;
                      });
                    }
                  }}
                  className={userFieldErrors.password ? "border-red-500" : ""}
                  required={createLoginAccount}
                />
                {userFieldErrors.password && (
                  <p className="mt-1 text-xs text-red-500">{userFieldErrors.password}</p>
                )}
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
            disabled={creatingUser}
          >
            {creatingUser ? t("common", "loading") : t("users", "addNewUser")}
          </Button>
        </form>
      </AnimatedModal>

      {/* Add Category Modal */}
      <AnimatedModal
        open={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false);
          setCategoryFormError("");
          setCategoryForm({
            name: "",
            description: "",
          });
        }}
        title="Add New Category"
        maxWidthClassName="max-w-md"
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setCategoryFormError("");

            if (!categoryForm.name?.trim()) {
              setCategoryFormError("Category name is required");
              return;
            }

            if (!API_URL) {
              setCategoryFormError("NEXT_PUBLIC_API_URL is not set");
              return;
            }
            if (!token) {
              setCategoryFormError("You are not authenticated. Please sign in.");
              return;
            }

            try {
              setCreatingCategory(true);

              const payload: Record<string, any> = {
                name: categoryForm.name.trim(),
                is_active: true,
              };

              if (categoryForm.description?.trim()) {
                payload.description = categoryForm.description.trim();
              }

              const res = await fetch(`${API_URL}/categories/`, {
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

                let errorMessage = "";
                if (errorData.detail) {
                  errorMessage = Array.isArray(errorData.detail) ? errorData.detail[0] : String(errorData.detail);
                } else if (errorData.message) {
                  errorMessage = Array.isArray(errorData.message) ? errorData.message[0] : String(errorData.message);
                } else if (errorData.name) {
                  errorMessage = Array.isArray(errorData.name) ? errorData.name[0] : String(errorData.name);
                } else {
                  errorMessage = typeof errorData === 'string' ? errorData : `Create failed (${res.status})`;
                }

                setCategoryFormError(errorMessage);
                return;
              }

              const newCategory = await res.json();

              // Reload categories list
              await loadCategories();

              // If the case creation modal is open, set the newly created category as selected
              if (openDialog) {
                setForm((s) => ({ ...s, category: String(newCategory.id) }));
              }

              // Close modal and reset form
              setCategoryModalOpen(false);
              setCategoryForm({
                name: "",
                description: "",
              });

              // Show success message
              setSuccessMsg(openDialog 
                ? "Category created successfully and selected." 
                : "Category created successfully.");
              setSuccessOpen(true);
              setTimeout(() => setSuccessOpen(false), 3000);
            } catch (err: any) {
              setCategoryFormError(err?.message || "Failed to create category");
            } finally {
              setCreatingCategory(false);
            }
          }}
        >
          {categoryFormError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {categoryFormError}
            </div>
          )}

          <div>
            <Input
              placeholder="Category Name *"
              value={categoryForm.name}
              onChange={(e) => {
                setCategoryForm((s) => ({ ...s, name: e.target.value }));
                if (categoryFormError) setCategoryFormError("");
              }}
              required
            />
          </div>

          <div>
            <TextAreaGroup
              name="description"
              label="Description (Optional)"
              rows={3}
              placeholder="Enter category description..."
              value={categoryForm.description}
              onChange={(e) => {
                setCategoryForm((s) => ({ ...s, description: e.target.value }));
              }}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCategoryModalOpen(false);
                setCategoryFormError("");
                setCategoryForm({
                  name: "",
                  description: "",
                });
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 text-white hover:bg-green-700"
              disabled={creatingCategory}
            >
              {creatingCategory ? "Creating..." : "Create Category"}
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
