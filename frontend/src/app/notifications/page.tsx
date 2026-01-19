"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check, CheckCheck, RefreshCw, Bell, Inbox, FileText, Calendar } from "lucide-react";
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

/* ===================== Helpers ===================== */

const fetchAllPaginated = async <T,>(url: string, headers: HeadersInit): Promise<T[]> => {
  let next: string | null = url;
  const all: T[] = [];
  while (next) {
    const res: Response = await fetch(next, { headers, cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      all.push(...(data as T[]));
      next = null;
    } else if (Array.isArray((data as any)?.results)) {
      all.push(...((data as any).results as T[]));
      next = (data as any).next || null;
    } else {
      all.push(data as T);
      next = null;
    }
  }
  return all;
};

/* ===================== Page ===================== */

export default function NotificationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: HeadersInit = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}) as HeadersInit, [token]);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRead, setFilterRead] = useState<"all" | "unread" | "read">("all");

  // Load notifications
  const loadNotifications = useCallback(async (force = false) => {
    if (!API_URL || !token) {
      setError("Missing API URL or authentication token.");
      return;
    }

    if (!force && loading) return;

    try {
      setLoading(true);
      setError("");
      
      // Fetch all notifications (limit is handled by API, but we fetch all pages)
      const url = `${API_URL}/notifications/?limit=100`;
      const data = await fetchAllPaginated<Notification>(url, headers);
      
      // Sort by created_at (newest first)
      data.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setNotifications(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [API_URL, token, headers, loading]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications(true);
  }, [loadNotifications]);

  const markAsRead = async (notificationId: number | string) => {
    if (!API_URL || !token) return;
    try {
      const res = await fetch(`${API_URL}/notifications/${notificationId}/mark_read/`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
        );
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!API_URL || !token) return;
    try {
      const res = await fetch(`${API_URL}/notifications/mark_all_read/`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    router.push(`/notifications/${notification.id}`);
  };

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Filter by read status
    if (filterRead === "unread") {
      filtered = filtered.filter((n) => !n.is_read);
    } else if (filterRead === "read") {
      filtered = filtered.filter((n) => n.is_read);
    }

    // Filter by search term
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title?.toLowerCase().includes(term) ||
          n.message?.toLowerCase().includes(term) ||
          n.notification_type?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [notifications, filterRead, search]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return t("notifications", "justNow");
      if (diffMins < 60) return `${diffMins} ${t("notifications", "minutesAgo")}`;
      if (diffHours < 24) return `${diffHours} ${t("notifications", "hoursAgo")}`;
      if (diffDays < 7) return `${diffDays} ${t("notifications", "daysAgo")}`;
      
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "assignment":
      case "case_assigned":
        return "📋";
      case "transfer":
      case "case_transferred":
        return "🔄";
      case "announcement":
        return "📢";
      case "case_status":
        return "📝";
      default:
        return "🔔";
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

  return (
    <>
      <Breadcrumb pageName={t("notifications", "title")} />

      <div className="rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("notifications", "title")}
            </h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary px-3 py-1 text-sm font-medium text-white">
                {unreadCount} {t("notifications", "new")}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              {t("notifications", "refresh")}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="flex items-center gap-2"
              >
                <CheckCheck className="h-4 w-4" />
                {t("notifications", "markAllRead")}
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              placeholder={t("common", "search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterRead === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterRead("all")}
            >
              {t("common", "all")}
            </Button>
            <Button
              variant={filterRead === "unread" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterRead("unread")}
            >
              {t("notifications", "unread")}
            </Button>
            <Button
              variant={filterRead === "read" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterRead("read")}
            >
              {t("notifications", "read")}
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Notifications List */}
        {loading && notifications.length === 0 ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                {t("notifications", "loadingNotifications")}
              </p>
            </div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
            <Inbox className="mb-4 h-16 w-16 text-gray-400 dark:text-gray-600" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
              {search || filterRead !== "all"
                ? t("notifications", "noMatchingNotifications")
                : t("notifications", "noNotifications")}
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {search || filterRead !== "all"
                ? t("notifications", "tryDifferentFilters")
                : t("notifications", "notificationsWillAppearHere")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "group cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md",
                  !notification.is_read
                    ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
                    : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800",
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="shrink-0 text-3xl">{getNotificationIcon(notification.notification_type)}</div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3
                            className={cn(
                              "text-base font-semibold truncate",
                              !notification.is_read
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-700 dark:text-gray-300",
                            )}
                          >
                            {notification.title}
                          </h3>
                          {!notification.is_read && (
                            <span className="shrink-0 rounded-full bg-blue-500 h-2 w-2"></span>
                          )}
                        </div>
                        <p className="mb-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(notification.created_at)}
                          </span>
                          <span className="rounded bg-gray-200 px-2 py-0.5 dark:bg-gray-700">
                            {getNotificationTypeLabel(notification.notification_type)}
                          </span>
                          {notification.related_case_id && (
                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                              <FileText className="h-3 w-3" />
                              {notification.related_case_title || `${t("cases", "case")} #${notification.related_case_id}`}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="h-8 w-8 p-0"
                            title={t("notifications", "markAsRead")}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

