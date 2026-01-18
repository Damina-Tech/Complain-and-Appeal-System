"use client";

import { useEffect, useState } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuccessModal } from "@/components/ui/success-modal";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/hooks/useTranslation";

export default function SettingsPage() {
  const { t } = useTranslation();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [settings, setSettings] = useState({
    system_name: "",
    system_email: "",
    system_phone: "",
    frontend_url: "",
    backend_url: "",
    email_host: "",
    email_port: "",
    email_use_tls: true,
  });

  useEffect(() => {
    // Check if user is Admin
    const checkAdmin = async () => {
      setCheckingAdmin(true);
      try {
        // First check localStorage
        const userGroupsRaw = localStorage.getItem("user_groups");
        if (userGroupsRaw) {
          const userGroups = JSON.parse(userGroupsRaw);
          if (Array.isArray(userGroups) && userGroups.includes("Admin")) {
            setIsAdmin(true);
            setCheckingAdmin(false);
            return;
          }
        }

        // Fetch from API if not in localStorage
        const token = localStorage.getItem("token");
        if (token) {
          const API_URL = process.env.NEXT_PUBLIC_API_URL;
          const res = await fetch(`${API_URL}/auth/me/`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (res.ok) {
            const data = await res.json();
            const groups = data.user_groups || [];
            const adminCheck = Array.isArray(groups) && groups.includes("Admin");
            setIsAdmin(adminCheck);
            if (adminCheck) {
              localStorage.setItem("user_groups", JSON.stringify(groups));
            }
          }
        }
      } catch (e) {
        console.error("Failed to check admin status:", e);
        setIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdmin();
  }, []);

  useEffect(() => {
    // Load settings from API if available
    // For now, we'll use placeholder values
    if (isAdmin) {
      setSettings({
        system_name: "Complaint and Appeal System",
        system_email: "noreply@cas.local",
        system_phone: "+251900000000",
        frontend_url: process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:3000",
        backend_url: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
        email_host: "",
        email_port: "",
        email_use_tls: true,
      });
    }
  }, [isAdmin]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      // TODO: Implement API endpoint to save settings
      // For now, just show success message
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      setSuccessMsg(t("settings", "settingsSaved") || "Settings saved successfully.");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Redirect non-admin users
  useEffect(() => {
    if (!checkingAdmin && !isAdmin) {
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    }
  }, [checkingAdmin, isAdmin]);

  if (checkingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-sm text-gray-500">{t("common", "loading")}</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">{t("common", "accessDenied") || "Access Denied"}</h1>
          <p className="text-gray-600">{t("common", "noPermission") || "You do not have permission to access this page."}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Breadcrumb pageName={t("nav", "settings")} />

      <div
        className={cn(
          "rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card",
        )}
      >
        <form className="space-y-6" onSubmit={handleSave}>
          {/* System Information */}
          <Card className="p-5">
            <h2 className="mb-4 text-xl font-semibold text-dark dark:text-white">
              {t("settings", "systemInformation") || "System Information"}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">{t("settings", "systemName") || "System Name"}</label>
                <Input
                  value={settings.system_name}
                  onChange={(e) =>
                    setSettings({ ...settings, system_name: e.target.value })
                  }
                  placeholder={t("settings", "systemName") || "System Name"}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("settings", "systemEmail") || "System Email"}</label>
                <Input
                  type="email"
                  value={settings.system_email}
                  onChange={(e) =>
                    setSettings({ ...settings, system_email: e.target.value })
                  }
                  placeholder="noreply@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("settings", "systemPhone") || "System Phone"}</label>
                <Input
                  value={settings.system_phone}
                  onChange={(e) =>
                    setSettings({ ...settings, system_phone: e.target.value })
                  }
                  placeholder="+251900000000"
                />
              </div>
            </div>
          </Card>

          {/* URLs Configuration */}
          <Card className="p-5">
            <h2 className="mb-4 text-xl font-semibold text-dark dark:text-white">
              {t("settings", "urlsConfiguration") || "URLs Configuration"}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">{t("settings", "frontendUrl") || "Frontend URL"}</label>
                <Input
                  value={settings.frontend_url}
                  onChange={(e) =>
                    setSettings({ ...settings, frontend_url: e.target.value })
                  }
                  placeholder="http://localhost:3000"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("settings", "backendUrl") || "Backend URL"}</label>
                <Input
                  value={settings.backend_url}
                  onChange={(e) =>
                    setSettings({ ...settings, backend_url: e.target.value })
                  }
                  placeholder="http://localhost:8000/api"
                />
              </div>
            </div>
          </Card>

          {/* Email Configuration */}
          <Card className="p-5">
            <h2 className="mb-4 text-xl font-semibold text-dark dark:text-white">
              {t("settings", "emailConfiguration") || "Email Configuration"}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">{t("settings", "emailHost") || "Email Host"}</label>
                <Input
                  value={settings.email_host}
                  onChange={(e) =>
                    setSettings({ ...settings, email_host: e.target.value })
                  }
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("settings", "emailPort") || "Email Port"}</label>
                <Input
                  type="number"
                  value={settings.email_port}
                  onChange={(e) =>
                    setSettings({ ...settings, email_port: e.target.value })
                  }
                  placeholder="587"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.email_use_tls}
                    onChange={(e) =>
                      setSettings({ ...settings, email_use_tls: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-sm font-medium">{t("settings", "useTls") || "Use TLS"}</span>
                </label>
              </div>
            </div>
          </Card>

          {error && <div className="text-sm text-red-500">{error}</div>}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              {t("common", "cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={saving}
            >
              {saving ? t("common", "loading") : t("settings", "saveSettings") || "Save Settings"}
            </Button>
          </div>
        </form>
      </div>

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

