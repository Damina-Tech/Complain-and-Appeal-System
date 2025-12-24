"use client";

import {
  CallIcon,
  EmailIcon,
  PencilSquareIcon,
  UserIcon,
} from "@/assets/icons";
import InputGroup from "@/components/FormElements/InputGroup";
import { TextAreaGroup } from "@/components/FormElements/InputGroup/text-area";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SuccessModal } from "@/components/ui/success-modal";
import { useTranslation } from "@/hooks/useTranslation";

type UserData = {
  id: number | string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  national_id: string;
  address: string;
};

export function PersonalInfoForm() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const [formData, setFormData] = useState<UserData>({
    id: "",
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    national_id: "",
    address: "",
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple loads
    if (hasLoadedRef.current || !API_URL || !token) return;
    
    const loadUserData = async () => {
      hasLoadedRef.current = true;
      const headers: HeadersInit = { Authorization: `Bearer ${token}` };
      
      try {
        setLoading(true);
        // First get current user info to get the user ID
        const meRes = await fetch(`${API_URL}/auth/me/`, {
          headers,
          cache: "no-store",
        });
        if (!meRes.ok) throw new Error(`Failed to load user info: ${meRes.status}`);
        const meData = await meRes.json();
        const userId = meData.id;
        
        if (!userId) throw new Error("User ID not found");
        
        const res = await fetch(`${API_URL}/users/${userId}/`, {
          headers,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
        const data = await res.json();
        setFormData({
          id: data.id || "",
          username: data.username || "",
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          phone_number: data.phone_number || "",
          national_id: data.national_id || "",
          address: data.address || "",
        });
      } catch (e: any) {
        setError(e?.message || "Failed to load user data");
        hasLoadedRef.current = false; // Reset on error to allow retry
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, [API_URL, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!API_URL || !token || !formData.id) return;

    try {
      setSaving(true);
      setError("");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      
      const res = await fetch(`${API_URL}/users/${formData.id}/`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone_number: formData.phone_number,
          national_id: formData.national_id,
          address: formData.address,
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Update failed: ${res.status}`);
      }

      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
    } catch (e: any) {
      setError(e?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ShowcaseSection title={t("settings", "personalInformation") || "Personal Information"} className="!p-7">
        <div className="py-8 text-center text-gray-500">{t("common", "loading")}</div>
      </ShowcaseSection>
    );
  }

  return (
    <ShowcaseSection title={t("settings", "personalInformation") || "Personal Information"} className="!p-7">
      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-100">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
          <InputGroup
            className="w-full sm:w-1/2"
            type="text"
            name="first_name"
            label={t("forms", "firstName")}
            placeholder={t("forms", "firstName")}
            value={formData.first_name}
            onChange={(e) => setFormData((s) => ({ ...s, first_name: e.target.value }))}
            icon={<UserIcon />}
            iconPosition="left"
            height="sm"
          />

          <InputGroup
            className="w-full sm:w-1/2"
            type="text"
            name="last_name"
            label={t("forms", "lastName")}
            placeholder={t("forms", "lastName")}
            value={formData.last_name}
            onChange={(e) => setFormData((s) => ({ ...s, last_name: e.target.value }))}
            icon={<UserIcon />}
            iconPosition="left"
            height="sm"
          />
        </div>

        <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
          <InputGroup
            className="w-full sm:w-1/2"
            type="email"
            name="email"
            label={t("forms", "emailAddress") || "Email Address"}
            placeholder="email@example.com"
            value={formData.email}
            onChange={(e) => setFormData((s) => ({ ...s, email: e.target.value }))}
            icon={<EmailIcon />}
            iconPosition="left"
            height="sm"
          />

          <InputGroup
            className="w-full sm:w-1/2"
            type="text"
            name="phone_number"
            label={t("forms", "phone")}
            placeholder="+1234567890"
            value={formData.phone_number}
            onChange={(e) => setFormData((s) => ({ ...s, phone_number: e.target.value }))}
            icon={<CallIcon />}
            iconPosition="left"
            height="sm"
          />
        </div>

        <InputGroup
          className="mb-5.5"
          type="text"
          name="username"
          label={t("forms", "username") || "Username"}
          placeholder={t("forms", "username") || "username"}
          value={formData.username}
          disabled
          icon={<UserIcon />}
          iconPosition="left"
          height="sm"
        />

        <InputGroup
          className="mb-5.5"
          type="text"
          name="national_id"
          label={t("forms", "nationalId")}
          placeholder={t("forms", "nationalId")}
          value={formData.national_id}
          onChange={(e) => setFormData((s) => ({ ...s, national_id: e.target.value }))}
          icon={<UserIcon />}
          iconPosition="left"
          height="sm"
        />

        <TextAreaGroup
          className="mb-5.5"
          label={t("forms", "address") || "Address"}
          placeholder={t("forms", "enterAddress") || "Enter your address"}
          value={formData.address}
          onChange={(e) => setFormData((s) => ({ ...s, address: e.target.value }))}
          icon={<PencilSquareIcon />}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-lg border border-stroke px-6 py-[7px] font-medium text-dark hover:shadow-1 dark:border-dark-3 dark:text-white"
          >
            {t("common", "cancel")}
          </Button>

          <Button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-6 py-[7px] font-medium text-gray-2 hover:bg-opacity-90"
          >
            {saving ? t("common", "loading") : t("common", "save")}
          </Button>
        </div>
      </form>

      <SuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title={t("common", "success")}
        message={t("settings", "profileUpdated") || "Profile updated successfully."}
        autoCloseMs={3000}
      />
    </ShowcaseSection>
  );
}
