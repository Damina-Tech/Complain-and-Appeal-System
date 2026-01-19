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
  const [createLoginAccount, setCreateLoginAccount] = useState(false);
  const [form, setForm] = useState<NewUserForm>({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
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

    // Validate email and password if createLoginAccount is enabled
    if (createLoginAccount) {
      if (!form.email?.trim()) {
        errors.email = t("forms", "emailRequired");
      }
      if (!form.password?.trim()) {
        errors.password = t("forms", "passwordRequired");
      }
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
        password: "",
        phone_number: "",
        national_id: "",
        group: defaultRole,
      });
      setCreateLoginAccount(false);
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
    setCreateLoginAccount(false);
    setForm({
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      phone_number: "",
      national_id: "",
      group: defaultRole,
    });
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
              className={`w-full rounded border border-gray-300 bg-white p-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white ${
                fieldErrors.group ? "border-red-500" : ""
              }`}
              value={form.group || ""}
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
            {availableRoles.length === 0 && (
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
                  setForm((s) => ({ ...s, email: "", password: "" }));
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
                required={createLoginAccount}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
              )}
            </div>
            <div>
              <Input
                placeholder={`${t("forms", "password")} *`}
                type="password"
                value={form.password || ""}
                onChange={(e) => {
                  setForm((s) => ({ ...s, password: e.target.value }));
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.password;
                      return newErrors;
                    });
                  }
                }}
                className={fieldErrors.password ? "border-red-500" : ""}
                required={createLoginAccount}
              />
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
              )}
            </div>
          </div>
        )}

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

