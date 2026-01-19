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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { TextAreaGroup } from "@/components/FormElements/InputGroup/text-area";

/* ===================== Types ===================== */

type ApiCategory = {
  id: number | string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type CategoryRow = {
  id: number | string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
};

const mapCategoryRow = (c: ApiCategory): CategoryRow => ({
  id: c.id,
  name: c.name,
  description: c.description || "",
  is_active: c.is_active ?? true,
  created_at: c.created_at ? String(c.created_at).slice(0, 10) : "—",
});

/* ===================== Page ===================== */

export default function CategoriesPage() {
  const { t } = useTranslation();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const authHeaders: HeadersInit | undefined = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;

  // Table + filters
  const [categories, setCategories] = useState<CategoryRow[]>([]);
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
    description: string;
  }>({
    name: "",
    description: "",
  });

  // Edit modal
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryRow | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    description: string;
    is_active: boolean;
  }>({
    name: "",
    description: "",
    is_active: true,
  });

  // Delete modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Success modal
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  /* ------------- Load Data ------------- */

  const loadCategories = async () => {
    if (!API_URL) return setPageError("API URL not set");
    try {
      setLoading(true);
      setPageError("");

      // Fetch all categories (active and inactive) with pagination support
      // Pass show_inactive=true to get both active and inactive categories
      let allCategories: any[] = [];
      let nextUrl: string | null = `${API_URL}/categories/?show_inactive=true`;

      while (nextUrl) {
        const res = await fetch(nextUrl, {
          headers: authHeaders,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Failed to load categories: ${res.status}`);
        const data: any = await res.json();

        if (Array.isArray(data)) {
          allCategories = allCategories.concat(data);
          nextUrl = null;
        } else if (Array.isArray(data?.results)) {
          allCategories = allCategories.concat(data.results);
          // Ensure show_inactive=true is included in the next URL if pagination is used
          if (data.next) {
            // If next URL doesn't have show_inactive param, add it
            nextUrl = data.next.includes("show_inactive") 
              ? data.next 
              : `${data.next}${data.next.includes("?") ? "&" : "?"}show_inactive=true`;
          } else {
            nextUrl = null;
          }
        } else {
          nextUrl = null;
        }
      }

      setCategories(allCategories.map(mapCategoryRow));
    } catch (e: any) {
      setPageError(e?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------- Filters ------------- */

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((c) =>
      c.name.toLowerCase().includes(term) ||
      (c.description && c.description.toLowerCase().includes(term))
    );
  }, [categories, search]);

  /* ------------- Create ------------- */

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!API_URL) return setCreateError("API URL not set");
    if (!token) return setCreateError("You are not authenticated");
    if (!createForm.name.trim()) return setCreateError("Category name is required");

    let errorHandled = false;

    try {
      setCreating(true);
      const payload: Partial<ApiCategory> = {
        name: createForm.name.trim(),
        description: createForm.description || undefined,
        is_active: true,
      };

      const res = await fetch(`${API_URL}/categories/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const responseText = await res.text();
        let errorMessage = `Create failed: ${res.status}`;

        try {
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
          } else if (errorData.name) {
            errorMessage = Array.isArray(errorData.name) ? errorData.name[0] : String(errorData.name);
          }
        } catch {
          errorMessage = responseText || errorMessage;
        }

        setCreateError(errorMessage);
        errorHandled = true;
        return;
      }

      await loadCategories();
      setOpenCreate(false);
      setCreateForm({
        name: "",
        description: "",
      });

      setSuccessMsg("Category created successfully.");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
    } catch (err: any) {
      if (!errorHandled) {
        setCreateError(err?.message || "Failed to create category");
      }
    } finally {
      setCreating(false);
    }
  };

  /* ------------- Edit ------------- */

  const openEditModal = (row: CategoryRow) => {
    setSelectedCategory(row);
    setEditForm({
      name: row.name,
      description: row.description,
      is_active: row.is_active,
    });
    setEditError("");
    setOpenEdit(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    setEditError("");
    if (!API_URL) return setEditError("API URL not set");
    if (!token) return setEditError("You are not authenticated");
    if (!editForm.name.trim()) return setEditError("Category name is required");

    let errorHandled = false;

    try {
      setEditing(true);
      const payload: Partial<ApiCategory> = {
        name: editForm.name.trim(),
        description: editForm.description || undefined,
        is_active: editForm.is_active,
      };

      const res = await fetch(`${API_URL}/categories/${selectedCategory.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const responseText = await res.text();
        let errorMessage = `Update failed: ${res.status}`;

        try {
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
          } else if (errorData.name) {
            errorMessage = Array.isArray(errorData.name) ? errorData.name[0] : String(errorData.name);
          }
        } catch {
          errorMessage = responseText || errorMessage;
        }

        setEditError(errorMessage);
        errorHandled = true;
        return;
      }

      await loadCategories();
      setOpenEdit(false);
      setSelectedCategory(null);
      setEditForm({
        name: "",
        description: "",
        is_active: true,
      });

      setSuccessMsg("Category updated successfully.");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
    } catch (err: any) {
      if (!errorHandled) {
        setEditError(err?.message || "Failed to update category");
      }
    } finally {
      setEditing(false);
    }
  };

  /* ------------- Delete ------------- */

  const handleDelete = async () => {
    if (!categoryToDelete || !API_URL || !token) return;
    let errorHandled = false;

    try {
      setDeleting(true);
      const res = await fetch(`${API_URL}/categories/${categoryToDelete.id}/`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok && res.status !== 204) {
        const responseText = await res.text();
        let errorMessage = `Delete failed: ${res.status}`;

        try {
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
          errorMessage = responseText || errorMessage;
        }

        setPageError(errorMessage);
        errorHandled = true;
        return;
      }

      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
      setSuccessMsg("Category deleted successfully.");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
      await loadCategories();
    } catch (err: any) {
      if (!errorHandled) {
        setPageError(err?.message || "Failed to delete category");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Breadcrumb pageName="Categories" />

      <div
        className={cn(
          "rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card",
        )}
      >
        {/* Filters & Add Button */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <Input
            placeholder={t("common", "search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[250px]"
          />

          <Button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => setOpenCreate(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Category
          </Button>
        </div>

        {/* Error Message */}
        {pageError && (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-100">
            {pageError}
          </div>
        )}

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="[&>th]:text-center">
              <TableHead className="!text-left">Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
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
            {!loading && pageError && (
              <TableRow>
                <TableCell colSpan={5} className="py-4 text-center text-red-500">
                  {pageError}
                </TableCell>
              </TableRow>
            )}
            {!loading && !pageError && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-4 text-center text-gray-500 dark:text-gray-300">
                  {t("activity", "noRecordsFound")}
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              !pageError &&
              filtered.map((cat) => (
                <TableRow
                  key={cat.id}
                  className="text-center text-base font-medium text-dark dark:text-white"
                >
                  <TableCell className="!text-left">{cat.name}</TableCell>
                  <TableCell className="max-w-md truncate">{cat.description || "—"}</TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        cat.is_active
                          ? "bg-green-200 text-green-800"
                          : "bg-gray-200 text-gray-800"
                      }`}
                    >
                      {cat.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell>{cat.created_at}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditModal(cat)}
                        title={t("common", "edit")}
                      >
                        <Pencil className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setCategoryToDelete(cat);
                          setDeleteConfirmOpen(true);
                        }}
                        title={t("common", "delete")}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Modal */}
      <AnimatedModal
        open={openCreate}
        onClose={() => {
          setOpenCreate(false);
          setCreateError("");
          setCreateForm({
            name: "",
            description: "",
          });
        }}
        title="Add New Category"
        maxWidthClassName="max-w-md"
      >
        <form className="space-y-4" onSubmit={handleCreate}>
          {createError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {createError}
            </div>
          )}

          <div>
            <Input
              placeholder="Category Name *"
              value={createForm.name}
              onChange={(e) => {
                setCreateForm((s) => ({ ...s, name: e.target.value }));
                if (createError) setCreateError("");
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
              value={createForm.description}
              onChange={(e) => {
                setCreateForm((s) => ({ ...s, description: e.target.value }));
              }}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpenCreate(false);
                setCreateError("");
                setCreateForm({
                  name: "",
                  description: "",
                });
              }}
              className="flex-1"
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
              disabled={creating}
            >
              {creating ? "Creating..." : "Create Category"}
            </Button>
          </div>
        </form>
      </AnimatedModal>

      {/* Edit Modal */}
      <AnimatedModal
        open={openEdit}
        onClose={() => {
          setOpenEdit(false);
          setEditError("");
          setSelectedCategory(null);
          setEditForm({
            name: "",
            description: "",
            is_active: true,
          });
        }}
        title="Edit Category"
        maxWidthClassName="max-w-md"
      >
        <form className="space-y-4" onSubmit={handleUpdate}>
          {editError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {editError}
            </div>
          )}

          <div>
            <Input
              placeholder="Category Name *"
              value={editForm.name}
              onChange={(e) => {
                setEditForm((s) => ({ ...s, name: e.target.value }));
                if (editError) setEditError("");
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
              value={editForm.description}
              onChange={(e) => {
                setEditForm((s) => ({ ...s, description: e.target.value }));
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={editForm.is_active}
              onChange={(e) => {
                setEditForm((s) => ({ ...s, is_active: e.target.checked }));
              }}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-dark dark:text-white">
              Active
            </label>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpenEdit(false);
                setEditError("");
                setSelectedCategory(null);
                setEditForm({
                  name: "",
                  description: "",
                  is_active: true,
                });
              }}
              className="flex-1"
              disabled={editing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
              disabled={editing}
            >
              {editing ? "Updating..." : "Update Category"}
            </Button>
          </div>
        </form>
      </AnimatedModal>

      {/* Delete Confirmation Modal */}
      <AnimatedModal
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setCategoryToDelete(null);
        }}
        title="Delete Category"
        maxWidthClassName="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            {t("common", "confirm")} delete category &quot;{categoryToDelete?.name}&quot;? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setCategoryToDelete(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </AnimatedModal>

      {/* Success Modal */}
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

