"use client";

import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback, useRef } from "react";
import { BellIcon } from "./icons";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "next/navigation";
import { Check, CheckCheck, RefreshCw } from "lucide-react";

type Notification = {
  id: number | string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_case_id?: number | string | null;
  related_case_title?: string | null;
};

// Constants
const LAST_CHECK_KEY = "notification_last_check";
const MIN_CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutes minimum between checks

export function Notification() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isMobile = useIsMobile();
  const router = useRouter();
  const pathname = usePathname();

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

  // Track if we've loaded initial data
  const hasLoadedInitial = useRef(false);
  const lastCheckTime = useRef<number>(0);

  // Load notifications and unread count together
  const loadNotifications = useCallback(async (force = false) => {
    if (!API_URL || !token) return;

    // Check if enough time has passed since last check (unless forced)
    const now = Date.now();
    if (!force && now - lastCheckTime.current < MIN_CHECK_INTERVAL) {
      return;
    }
    lastCheckTime.current = now;

    try {
      setLoading(true);
      
      // Load both notifications and unread count in parallel
      const [notifsRes, countRes] = await Promise.all([
        fetch(`${API_URL}/notifications/?limit=30`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_URL}/notifications/unread_count/`, {
          headers,
          cache: "default",
        }),
      ]);

      if (notifsRes.ok) {
        const data = await notifsRes.json();
        const notifs = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
        setNotifications(notifs);
        
        // Use unread_count from API if available
        if (data.unread_count !== undefined) {
          setUnreadCount(data.unread_count);
        } else {
          setUnreadCount(notifs.filter((n: Notification) => !n.is_read).length);
        }
      }

      if (countRes.ok) {
        const countData = await countRes.json();
        setUnreadCount(countData.count || 0);
      }

      // Store last check time in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(LAST_CHECK_KEY, String(now));
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [API_URL, token, headers]);

  // Manual refresh function
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
        setUnreadCount((prev) => Math.max(0, prev - 1));
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
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    setIsOpen(false);
    
    // Navigate to related case if available
    if (notification.related_case_id) {
      router.push(`/cases/${notification.related_case_id}/view`);
    }
  };

  // Load on mount (only once)
  useEffect(() => {
    if (!hasLoadedInitial.current && API_URL && token) {
      hasLoadedInitial.current = true;
      
      // Get last check time from localStorage
      if (typeof window !== "undefined") {
        const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
        if (lastCheck) {
          lastCheckTime.current = parseInt(lastCheck, 10);
        }
      }
      
      loadNotifications();
    }
  }, [API_URL, token, loadNotifications]);

  // Load when dropdown opens (with throttling)
  useEffect(() => {
    if (isOpen && !loading) {
      const now = Date.now();
      // Only reload if it's been more than 30 seconds since last check
      if (now - lastCheckTime.current > 30000) {
        loadNotifications();
      }
    }
  }, [isOpen, loadNotifications, loading]);

  // Load when window regains focus (user returns to tab)
  useEffect(() => {
    const handleFocus = () => {
      if (!document.hidden && API_URL && token) {
        const now = Date.now();
        // Only check if it's been more than 1 minute since last check
        if (now - lastCheckTime.current > 60000) {
          loadNotifications();
        }
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [API_URL, token, loadNotifications]);

  // Load when route changes (user navigates)
  useEffect(() => {
    if (pathname && hasLoadedInitial.current) {
      const now = Date.now();
      // Only check if it's been more than 1 minute since last check
      if (now - lastCheckTime.current > 60000) {
        loadNotifications();
      }
    }
  }, [pathname, loadNotifications]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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

  return (
    <Dropdown
      isOpen={isOpen}
      setIsOpen={(open) => {
        setIsOpen(open);
      }}
    >
      <DropdownTrigger
        className="grid size-12 place-items-center rounded-full border bg-gray-2 text-dark outline-none hover:text-primary focus-visible:border-primary focus-visible:text-primary dark:border-dark-4 dark:bg-dark-3 dark:text-white dark:focus-visible:border-primary"
        aria-label="View Notifications"
      >
        <span className="relative">
          <BellIcon />

          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -right-1 -top-1 z-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-gray-2 dark:ring-dark-3",
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
      </DropdownTrigger>

      <DropdownContent
        align={isMobile ? "end" : "center"}
        className="border border-stroke bg-white px-3.5 py-3 shadow-md dark:border-dark-3 dark:bg-gray-dark min-[350px]:min-w-[24rem] max-h-[28rem]"
      >
        <div className="mb-1 flex items-center justify-between px-2 py-1.5">
          <span className="text-lg font-medium text-dark dark:text-white">
            Notifications
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="h-6 w-6 p-0"
              title="Refresh notifications"
            >
              <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
            </Button>
            {unreadCount > 0 && (
              <span className="rounded-md bg-primary px-[9px] py-0.5 text-xs font-medium text-white">
                {unreadCount} new
              </span>
            )}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-6 px-2 text-xs"
                title="Mark all as read"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <ul className="mb-3 max-h-[20rem] space-y-1.5 overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <li className="px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading notifications...
            </li>
          ) : notifications.length === 0 ? (
            <li className="px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No notifications
            </li>
          ) : (
            notifications.map((notification) => (
              <li key={notification.id} role="menuitem">
                <button
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left outline-none transition-colors hover:bg-gray-2 focus-visible:bg-gray-2 dark:hover:bg-dark-3 dark:focus-visible:bg-dark-3",
                    !notification.is_read && "bg-blue-50 dark:bg-blue-900/20",
                  )}
                >
                  <span className="text-2xl">{getNotificationIcon(notification.notification_type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <strong
                        className={cn(
                          "block text-sm font-medium",
                          notification.is_read
                            ? "text-dark-5 dark:text-dark-6"
                            : "text-dark dark:text-white",
                        )}
                      >
                        {notification.title}
                      </strong>
                      {!notification.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="shrink-0 rounded p-1 hover:bg-gray-200 dark:hover:bg-dark-4"
                          title="Mark as read"
                        >
                          <Check className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                        </button>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs font-medium text-dark-5 dark:text-dark-6">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-xs text-dark-5 dark:text-dark-6">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>

        {notifications.length > 0 && (
          <button
            onClick={() => {
              setIsOpen(false);
              router.push("/notifications");
            }}
            className="block w-full rounded-lg border border-primary p-2 text-center text-sm font-medium tracking-wide text-primary outline-none transition-colors hover:bg-blue-light-5 focus:bg-blue-light-5 focus:text-primary focus-visible:border-primary dark:border-dark-3 dark:text-dark-6 dark:hover:border-dark-5 dark:hover:bg-dark-3 dark:hover:text-dark-7 dark:focus-visible:border-dark-5 dark:focus-visible:bg-dark-3 dark:focus-visible:text-dark-7"
          >
            See all notifications
          </button>
        )}
      </DropdownContent>
    </Dropdown>
  );
}
