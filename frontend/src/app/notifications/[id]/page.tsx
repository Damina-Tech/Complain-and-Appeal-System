"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

type Notification = {
  id: number | string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_case_id?: number | string | null;
  related_case_title?: string | null;
  related_announcement_id?: number | string | null;
};

export default function NotificationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const id = params?.id as string;
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingRead, setMarkingRead] = useState(false);

  useEffect(() => {
    if (!id || !API_URL || !token) {
      setError(t("notifications", "missingInfo"));
      setLoading(false);
      return;
    }

    const loadNotification = async () => {
      try {
        setLoading(true);
        setError("");
        
        const res = await fetch(`${API_URL}/notifications/${id}/`, {
          headers,
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`${t("notifications", "failedToLoad")}: ${res.status}`);
        }

        const data = await res.json();
        setNotification(data);

        // Mark as read if not already read
        if (!data.is_read) {
          await markAsRead(id);
        }
      } catch (e: any) {
        setError(e?.message || t("notifications", "failedToLoad"));
      } finally {
        setLoading(false);
      }
    };

    loadNotification();
  }, [id, API_URL, token]);

  const markAsRead = async (notificationId: string) => {
    if (!API_URL || !token || markingRead) return;
    
    try {
      setMarkingRead(true);
      const res = await fetch(`${API_URL}/notifications/${notificationId}/mark_read/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
      });

      if (res.ok && notification) {
        setNotification({ ...notification, is_read: true });
      }
    } catch (e) {
      console.error("Failed to mark notification as read:", e);
    } finally {
      setMarkingRead(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      assignment: t("notifications", "assignment"),
      transfer: t("notifications", "transfer"),
      announcement: t("notifications", "announcement"),
      case_status: t("notifications", "caseStatus"),
      case_assigned: t("notifications", "caseAssigned"),
      case_transferred: t("notifications", "caseTransferred"),
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t("notifications", "loadingNotification")}</p>
        </div>
      </div>
    );
  }

  if (error || !notification) {
    return (
      <>
        <Breadcrumb pageName={t("notifications", "notificationDetails")} />
        <div className="rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <div className="text-center text-red-500">
            <p className="mb-4">{error || t("notifications", "notificationNotFound")}</p>
            <Button onClick={() => router.back()}>{t("common", "back")}</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb pageName={t("notifications", "notificationDetails")} />

      <div className="rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common", "back")}
          </Button>
          {!notification.is_read && (
            <Button
              onClick={() => markAsRead(String(notification.id))}
              disabled={markingRead}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {markingRead ? t("notifications", "marking") : t("notifications", "markAsRead")}
            </Button>
          )}
        </div>

        {/* Notification Content */}
        <div className="space-y-6">
          {/* Title */}
          <div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
              {notification.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  notification.is_read
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                )}
              >
                {notification.is_read ? t("notifications", "read") : t("notifications", "unread")}
              </span>
              <span className="flex items-center gap-1">
                <span className="rounded bg-gray-100 px-2 py-1 dark:bg-gray-800">
                  {getNotificationTypeLabel(notification.notification_type)}
                </span>
              </span>
            </div>
          </div>

          {/* Message */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start gap-3">
              <FileText className="mt-1 h-5 w-5 text-gray-500 dark:text-gray-400" />
              <div className="flex-1">
                <p className="whitespace-pre-wrap text-gray-900 dark:text-white">
                  {notification.message}
                </p>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <Calendar className="mt-1 h-5 w-5 text-gray-500 dark:text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("notifications", "dateTime")}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDate(notification.created_at)}
                </p>
              </div>
            </div>

            {notification.related_case_id && (
              <div className="flex items-start gap-3">
                <FileText className="mt-1 h-5 w-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("notifications", "relatedCase")}</p>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-sm text-blue-600 hover:text-blue-700"
                    onClick={() => router.push(`/cases/${notification.related_case_id}/view`)}
                  >
                    {notification.related_case_title || `${t("cases", "case")} #${notification.related_case_id}`}
                  </Button>
                </div>
              </div>
            )}

            {notification.related_announcement_id && (
              <div className="flex items-start gap-3">
                <FileText className="mt-1 h-5 w-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("notifications", "relatedAnnouncement")}</p>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-sm text-blue-600 hover:text-blue-700"
                    onClick={() => router.push("/announcements")}
                  >
                    {t("notifications", "viewAnnouncement")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

