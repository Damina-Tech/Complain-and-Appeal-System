"use client";

import { useMemo, useState, useEffect } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Button } from "@/components/ui/button";
import { SuccessModal } from "@/components/ui/success-modal";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { useUsers } from "./hooks/useUsers";
import { useUserPermissions } from "./hooks/useUserPermissions";
import { UserFilters } from "./components/UserFilters";
import { UsersTable } from "./components/UsersTable";
import { CreateUserModal } from "./components/CreateUserModal";
import { ViewUserModal } from "./components/ViewUserModal";
import { EditUserModal } from "./components/EditUserModal";
import { DeleteUserModal } from "./components/DeleteUserModal";
import { UserRow, EditForm, NewUserForm, ApiUser } from "./types";
import { PAGE_SIZE } from "./constants";
import { mapUser, extractErrorMessage, getErrorMessage } from "./utils";

export default function UsersPage() {
  const { t } = useTranslation();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Data hooks
  const { users, roles, loading, pageError, setUsers, reloadUsers } = useUsers();
  const {
    isAdmin,
    canCreateUser,
    canModifyUser,
    getAvailableRolesForCreation,
  } = useUserPermissions();

  // Filters and pagination
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);

  // Form states
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editError, setEditError] = useState("");

  // Success modal
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [successTitle, setSuccessTitle] = useState("Success");

  // Available roles for creation
  const availableRolesForCreation = useMemo(
    () => getAvailableRolesForCreation(roles),
    [roles, getAvailableRolesForCreation]
  );

  // Build dynamic status options from data
  const statusOptions = useMemo(() => {
    const set = new Set<string>(["active", "inactive", "suspended"]);
    users.forEach((u) => set.add((u.status || "").toLowerCase()));
    return ["all", ...Array.from(set)];
  }, [users]);

  // Role options for filter
  const roleOptions = useMemo(() => {
    const set = new Set<string>(roles);
    users.forEach((u) => u.roles.forEach((r) => r !== "—" && set.add(r)));
    return ["all", ...Array.from(set)];
  }, [roles, users]);

  // Filter client-side
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !term ||
        [u.name, u.email, u.phone, u.nationalId]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term));

      const matchRole =
        roleFilter === "all" || u.roles.includes(roleFilter);

      const matchStatus =
        statusFilter === "all" || (u.status || "").toLowerCase() === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter, users]);

  const statusChoices = useMemo(
    () => statusOptions.filter((s) => s !== "all"),
    [statusOptions]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const startItem = filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const endItem = filtered.length
    ? Math.min(filtered.length, currentPage * PAGE_SIZE)
    : 0;

  // Create user handler
  const handleCreate = async (form: NewUserForm) => {
    if (!API_URL || !token) {
      throw new Error(t("common", "error"));
    }

    setCreating(true);
    try {
      const assignedRole = form.group || availableRolesForCreation[0] || "Citizen";
      
      const payload: Record<string, any> = {
        username: form.email || `${form.first_name.toLowerCase()}_${Date.now()}`,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone_number: form.phone_number.trim(),
        status: "active",
        groups: [assignedRole],
      };

      if (form.email?.trim()) {
        payload.email = form.email.trim();
      }
      if (form.password?.trim()) {
        payload.password = form.password.trim();
      }
      if (form.national_id?.trim()) {
        payload.national_id = form.national_id.trim();
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
              formFieldName = 'email';
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
          throw { fieldErrors: newFieldErrors, message: t("forms", "validationError") };
        }

        let errorMessage = "";
        if (errorData.detail) {
          errorMessage = Array.isArray(errorData.detail) ? errorData.detail[0] : String(errorData.detail);
        } else if (errorData.message) {
          errorMessage = Array.isArray(errorData.message) ? errorData.message[0] : String(errorData.message);
        } else {
          errorMessage = typeof errorData === 'string' ? errorData : JSON.stringify(errorData);
        }

        throw new Error(errorMessage || `${t("common", "error")} (${res.status})`);
      }

      // Reload users
      await reloadUsers();

      setSuccessTitle(t("users", "userCreated"));
      setSuccessMsg(t("users", "createUserSuccess"));
      setSuccessOpen(true);
    } finally {
      setCreating(false);
    }
  };

  // Update user handler
  const handleUpdateUser = async (form: EditForm, userId: number | string) => {
    if (!selectedUser) return;

    // Double-check permission before updating
    if (!canModifyUser(selectedUser)) {
      throw new Error("You cannot edit users with the same or higher role level.");
    }

    if (!API_URL || !token) {
      throw new Error(t("common", "error"));
    }

    setUpdating(true);
    setEditError("");
    try {
      const trimmedEmail = form.email.trim();
      if (!trimmedEmail) {
        throw new Error(t("forms", "emailRequired"));
      }

      const payload: Record<string, any> = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: trimmedEmail,
        phone_number: form.phone_number.trim() || null,
        national_id: form.national_id.trim() || null,
        status: form.status || "active",
      };

      // Only allow role changes if user has permission and target role is allowed
      if (canModifyUser(selectedUser)) {
        // For edit, only Admin can change roles; Director/Mayor Office cannot change roles
        if (isAdmin && form.group) {
          payload.groups = [form.group];
        }
      }

      const res = await fetch(`${API_URL}/users/${userId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorMessage = await extractErrorMessage(res);
        throw new Error(errorMessage);
      }

      const updated: ApiUser = await res.json();
      const mapped = mapUser(updated);

      setUsers((prev) => prev.map((u) => (u.id === mapped.id ? mapped : u)));
      setSelectedUser(mapped);
      setSuccessTitle(t("users", "userUpdated"));
      setSuccessMsg(t("users", "updateUserSuccess"));
      setSuccessOpen(true);
      setEditModalOpen(false);
    } catch (err: any) {
      setEditError(err?.message || t("common", "error"));
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  // Delete user handler
  const handleDeleteUser = async () => {
    if (!userToDelete || !API_URL || !token) return;

    // Double-check permission before deleting
    if (!canModifyUser(userToDelete)) {
      setEditError("You cannot delete users with the same or higher role level.");
      return;
    }

    setDeleting(true);
    setEditError("");
    try {
      const res = await fetch(`${API_URL}/users/${userToDelete.id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorMessage = await extractErrorMessage(res);
        setEditError(errorMessage);
        throw new Error(errorMessage);
      }

      // Remove user from list
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setSuccessTitle(t("users", "userDeleted"));
      setSuccessMsg(t("users", "deleteUserSuccess"));
      setSuccessOpen(true);
      setDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      // Error already set in editError
      throw err;
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Breadcrumb pageName={t("users", "users")} />

      <div
        className={cn(
          "rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card"
        )}
      >
        <UserFilters
          search={search}
          onSearchChange={setSearch}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          roleOptions={roleOptions}
          statusOptions={statusOptions}
          canCreateUser={canCreateUser}
          onAddUserClick={() => setCreateModalOpen(true)}
        />

        <UsersTable
          users={paginated}
          loading={loading}
          pageError={pageError}
          canModifyUser={canModifyUser}
          onView={(user) => {
            setSelectedUser(user);
            setViewModalOpen(true);
          }}
          onEdit={(user) => {
            setSelectedUser(user);
            setEditModalOpen(true);
          }}
          onDelete={(user) => {
            setUserToDelete(user);
            setDeleteModalOpen(true);
          }}
        />
      </div>

      {!loading && !pageError && filtered.length > PAGE_SIZE && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t("activity", "showing")} {startItem.toLocaleString()}-{endItem.toLocaleString()}{" "}
            {t("activity", "of")} {filtered.length.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="px-3"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              {t("common", "previous")}
            </Button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {t("common", "page")} {currentPage} {t("activity", "of")} {totalPages}
            </span>
            <Button
              variant="outline"
              className="px-3"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              {t("common", "next")}
            </Button>
          </div>
        </div>
      )}

      <CreateUserModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreate}
        availableRoles={availableRolesForCreation}
        defaultRole={availableRolesForCreation[0] || "Citizen"}
      />

      <ViewUserModal
        open={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
      />

      <EditUserModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedUser(null);
          setEditError("");
        }}
        onSubmit={handleUpdateUser}
        user={selectedUser}
        roles={roles}
        statusChoices={statusChoices}
        isAdmin={isAdmin}
        updating={updating}
        error={editError}
      />

      <DeleteUserModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setUserToDelete(null);
          setEditError("");
        }}
        onConfirm={handleDeleteUser}
        user={userToDelete}
        deleting={deleting}
        error={editError}
      />

      <SuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title={successTitle}
        message={successMsg}
        autoCloseMs={6000}
      />
    </>
  );
}
