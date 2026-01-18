"use client";

import { useState, FormEvent, useEffect } from "react";
import { AnimatedModal } from "@/components/ui/animated-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/useTranslation";
import { UserRow, EditForm } from "../types";

interface EditUserModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: EditForm, userId: number | string) => Promise<void>;
  user: UserRow | null;
  roles: string[];
  statusChoices: string[];
  isAdmin: boolean;
  updating: boolean;
  error?: string;
}

export function EditUserModal({
  open,
  onClose,
  onSubmit,
  user,
  roles,
  statusChoices,
  isAdmin,
  updating,
  error,
}: EditUserModalProps) {
  const { t } = useTranslation();
  const [editForm, setEditForm] = useState<EditForm>({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    national_id: "",
    status: "active",
    group: "",
  });
  const [editError, setEditError] = useState(error || "");

  useEffect(() => {
    if (user && open) {
      setEditForm({
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email === "—" ? "" : user.email,
        phone_number: user.phone === "—" ? "" : user.phone,
        national_id: user.nationalId === "—" ? "" : user.nationalId,
        status: user.status || "active",
        group: user.roles.find((role) => role !== "—") || "",
      });
      setEditError(error || "");
    }
  }, [user, open, error]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedEmail = editForm.email.trim();
    if (!trimmedEmail) {
      setEditError(t("forms", "emailRequired"));
      return;
    }

    try {
      setEditError("");
      await onSubmit(editForm, user.id);
      onClose();
    } catch (err: any) {
      setEditError(err?.message || t("common", "error"));
    }
  };

  const handleClose = () => {
    setEditError("");
    onClose();
  };

  if (!user) return null;

  return (
    <AnimatedModal open={open} onClose={handleClose} title={t("users", "editUser")}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder={t("forms", "firstName")}
            value={editForm.first_name}
            onChange={(e) =>
              setEditForm((s) => ({ ...s, first_name: e.target.value }))
            }
            disabled={updating}
          />
          <Input
            placeholder={t("forms", "lastName")}
            value={editForm.last_name}
            onChange={(e) =>
              setEditForm((s) => ({ ...s, last_name: e.target.value }))
            }
            disabled={updating}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder={t("forms", "email")}
            type="email"
            value={editForm.email}
            onChange={(e) =>
              setEditForm((s) => ({ ...s, email: e.target.value }))
            }
            disabled={updating}
            required
          />
          <Input
            placeholder={t("forms", "phone")}
            value={editForm.phone_number}
            onChange={(e) =>
              setEditForm((s) => ({ ...s, phone_number: e.target.value }))
            }
            disabled={updating}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder={t("forms", "nationalId")}
            value={editForm.national_id}
            onChange={(e) =>
              setEditForm((s) => ({ ...s, national_id: e.target.value }))
            }
            disabled={updating}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t("users", "status")}
            </label>
            <select
              className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
              value={editForm.status}
              onChange={(e) =>
                setEditForm((s) => ({ ...s, status: e.target.value }))
              }
              disabled={updating}
            >
              {statusChoices.map((status) => (
                <option key={status} value={status}>
                  {status[0].toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
            {t("users", "role")}
          </label>
          {isAdmin ? (
            <select
              className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
              value={editForm.group}
              onChange={(e) =>
                setEditForm((s) => ({ ...s, group: e.target.value }))
              }
              disabled={updating}
            >
              <option value="">{t("common", "none")}</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          ) : (
            <Input value={user.roles.join(", ")} readOnly />
          )}
        </div>
        {editError && <div className="text-sm text-red-500">{editError}</div>}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={updating}
          >
            {t("common", "cancel")}
          </Button>
          <Button type="submit" className="bg-blue-600 text-white" disabled={updating}>
            {updating ? t("common", "loading") : t("common", "save")}
          </Button>
        </div>
      </form>
    </AnimatedModal>
  );
}

