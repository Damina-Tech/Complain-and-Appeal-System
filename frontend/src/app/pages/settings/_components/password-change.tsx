"use client";

import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuccessModal } from "@/components/ui/success-modal";
import { Lock, Eye, EyeOff } from "lucide-react";
import InputGroup from "@/components/FormElements/InputGroup";
import { useTranslation } from "@/hooks/useTranslation";

export function PasswordChangeForm() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: HeadersInit = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}) as HeadersInit, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.old_password || !formData.new_password || !formData.confirm_password) {
      setError(t("forms", "allFieldsRequired") || "All fields are required.");
      return;
    }

    if (formData.new_password.length < 8) {
      setError(t("forms", "passwordMinLength") || "New password must be at least 8 characters long.");
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      setError(t("forms", "passwordsDoNotMatch") || "New password and confirm password do not match.");
      return;
    }

    if (formData.old_password === formData.new_password) {
      setError(t("forms", "passwordMustBeDifferent") || "New password must be different from old password.");
      return;
    }

    if (!API_URL || !token) {
      setError("API URL or authentication token is missing.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/password/change/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          old_password: formData.old_password,
          new_password: formData.new_password,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to change password" }));
        throw new Error(data.error || data.detail || `Failed: ${res.status}`);
      }

      setFormData({
        old_password: "",
        new_password: "",
        confirm_password: "",
      });
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
    } catch (e: any) {
      setError(e?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ShowcaseSection title={t("settings", "changePassword") || "Change Password"} className="!p-7">
      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-100">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputGroup
          type={showOldPassword ? "text" : "password"}
          name="old_password"
          label={t("settings", "currentPassword") || "Current Password"}
          placeholder={t("settings", "enterCurrentPassword") || "Enter current password"}
          value={formData.old_password}
          handleChange={(e) => setFormData((s) => ({ ...s, old_password: e.target.value }))}
          icon={<Lock />}
          iconPosition="left"
          endIcon={
            <button
              type="button"
              onClick={() => setShowOldPassword(!showOldPassword)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <InputGroup
          type={showNewPassword ? "text" : "password"}
          name="new_password"
          label={t("settings", "newPassword") || "New Password"}
          placeholder={t("settings", "enterNewPassword") || "Enter new password (min. 8 characters)"}
          value={formData.new_password}
          handleChange={(e) => setFormData((s) => ({ ...s, new_password: e.target.value }))}
          icon={<Lock />}
          iconPosition="left"
          endIcon={
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <InputGroup
          type={showConfirmPassword ? "text" : "password"}
          name="confirm_password"
          label={t("settings", "confirmNewPassword") || "Confirm New Password"}
          placeholder={t("settings", "confirmNewPassword") || "Confirm new password"}
          value={formData.confirm_password}
          handleChange={(e) => setFormData((s) => ({ ...s, confirm_password: e.target.value }))}
          icon={<Lock />}
          iconPosition="left"
          endIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFormData({
                old_password: "",
                new_password: "",
                confirm_password: "",
              });
              setError("");
            }}
            className="rounded-lg border border-stroke px-6 py-[7px] font-medium text-dark hover:shadow-1 dark:border-dark-3 dark:text-white"
          >
            {t("common", "clear") || "Clear"}
          </Button>

          <Button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary px-6 py-[7px] font-medium text-gray-2 hover:bg-opacity-90"
          >
            {loading ? t("common", "loading") : t("settings", "changePassword") || "Change Password"}
          </Button>
        </div>
      </form>

      <SuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title={t("common", "success")}
        message={t("settings", "passwordChanged") || "Password changed successfully."}
        autoCloseMs={3000}
      />
    </ShowcaseSection>
  );
}

