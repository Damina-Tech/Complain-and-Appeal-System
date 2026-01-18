"use client";

import { useState, FormEvent } from "react";
import { AnimatedModal } from "@/components/ui/animated-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/useTranslation";
import { NewUserForm } from "../types";
import { getErrorMessage } from "../utils";

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: NewUserForm) => Promise<void>;
  availableRoles: string[];
  defaultRole?: string;
}

export function CreateUserModal({
  open,
  onClose,
  onSubmit,
  availableRoles,
  defaultRole = "Citizen",
}: CreateUserModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<NewUserForm>({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    national_id: "",
    group: defaultRole,
  });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});

    // Client-side validation
    const errors: Record<string, string> = {};
    
    if (!form.first_name?.trim()) {
      errors.first_name = t("forms", "firstNameRequired");
    }
    
    if (!form.last_name?.trim()) {
      errors.last_name = t("forms", "lastNameRequired");
    }
    
    if (!form.phone_number?.trim()) {
      errors.phone_number = t("forms", "phoneRequired");
    }
    
    // Validate role selection
    if (!form.group?.trim()) {
      errors.group = t("forms", "roleRequired");
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(t("forms", "fillRequiredFields"));
      return;
    }

    try {
      setCreating(true);
      await onSubmit(form);
      // Reset form on success
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        national_id: "",
        group: defaultRole,
      });
      setFieldErrors({});
      onClose();
    } catch (err: any) {
      // Handle API errors
      if (err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      }
      if (err.message) {
        setFormError(err.message);
      } else {
        setFormError(t("common", "error"));
      }
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setFormError("");
    setFieldErrors({});
    onClose();
  };

  return (
    <AnimatedModal
      open={open}
      onClose={handleClose}
      title={t("users", "addNewUser")}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* General error message at top */}
        {formError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-red-600 dark:text-red-400">⚠</span>
              <div>
                <p className="font-medium">{t("common", "error")}</p>
                <p className="mt-1">{formError}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Input
              placeholder={`${t("forms", "firstName")} *`}
              value={form.first_name}
              onChange={(e) => {
                setForm((s) => ({ ...s, first_name: e.target.value }));
                if (fieldErrors.first_name) {
                  setFieldErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.first_name;
                    return newErrors;
                  });
                }
              }}
              className={fieldErrors.first_name ? "border-red-500" : ""}
              required
            />
            {fieldErrors.first_name && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.first_name}</p>
            )}
          </div>
          <div>
            <Input
              placeholder={`${t("forms", "lastName")} *`}
              value={form.last_name}
              onChange={(e) => {
                setForm((s) => ({ ...s, last_name: e.target.value }));
                if (fieldErrors.last_name) {
                  setFieldErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.last_name;
                    return newErrors;
                  });
                }
              }}
              className={fieldErrors.last_name ? "border-red-500" : ""}
              required
            />
            {fieldErrors.last_name && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.last_name}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Input
              placeholder={`${t("forms", "email")} (${t("common", "optional")})`}
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm((s) => ({ ...s, email: e.target.value }));
                if (fieldErrors.email) {
                  setFieldErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.email;
                    return newErrors;
                  });
                }
              }}
              className={fieldErrors.email ? "border-red-500" : ""}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
            )}
          </div>
          <div>
            <Input
              placeholder={`${t("forms", "phone")} *`}
              value={form.phone_number}
              onChange={(e) => {
                setForm((s) => ({ ...s, phone_number: e.target.value }));
                if (fieldErrors.phone_number) {
                  setFieldErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.phone_number;
                    return newErrors;
                  });
                }
              }}
              className={fieldErrors.phone_number ? "border-red-500" : ""}
              required
            />
            {fieldErrors.phone_number && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.phone_number}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Input
              placeholder={`${t("forms", "nationalId")} (${t("common", "optional")})`}
              value={form.national_id}
              onChange={(e) => {
                setForm((s) => ({ ...s, national_id: e.target.value }));
                if (fieldErrors.national_id) {
                  setFieldErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.national_id;
                    return newErrors;
                  });
                }
              }}
              className={fieldErrors.national_id ? "border-red-500" : ""}
            />
            {fieldErrors.national_id && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.national_id}</p>
            )}
          </div>

          {/* Role selection */}
          <div>
            <select
              className={`w-full rounded border p-2 dark:border-dark-3 dark:bg-dark-2 ${
                fieldErrors.group ? "border-red-500" : "border-gray-300"
              }`}
              value={form.group}
              onChange={(e) => {
                setForm((s) => ({ ...s, group: e.target.value }));
                if (fieldErrors.group) {
                  setFieldErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.group;
                    return newErrors;
                  });
                }
              }}
              required
            >
              <option value="">{t("common", "select")} {t("users", "role")}</option>
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {fieldErrors.group && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.group}</p>
            )}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-blue-600 text-white hover:bg-blue-700"
          disabled={creating}
        >
          {creating ? t("common", "loading") : t("users", "addNewUser")}
        </Button>
      </form>
    </AnimatedModal>
  );
}

