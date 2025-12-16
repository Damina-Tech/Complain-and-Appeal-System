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
import { useRouter } from "next/navigation";
import { Check, CheckCheck } from "lucide-react";

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

export function Notification() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();
  const router = useRouter();

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

  // Refs to track state and prevent unnecessary calls
  const lastNotificationTimestamp = useRef<string | null>(null);
  const lastPollTime = useRef<number>(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const consecutiveErrorsRef = useRef(0);
  const backoffDelayRef = useRef(60000); // Start with 60 seconds

  const loadNotifications = useCallback(async (since?: string) => {
    if (!API_URL || !token) return;
    try {
      setLoading(true);
      const url = since 
        ? `${API_URL}/notifications/?limit=30&since=${encodeURIComponent(since)}`
        : `${API_URL}/notifications/?limit=30`;
      
      const res = await fetch(url, {
        headers,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Failed to load notifications: ${res.status}`);
      const data = await res.json();
      const notifs = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
      
      if (since && notifs.length > 0) {
        // Only append new notifications
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n: Notification) => n.id));
          const newNotifs = notifs.filter((n: Notification) => !existingIds.has(n.id));
          return [...newNotifs, ...prev].slice(0, 30); // Keep only latest 30
        });
      } else {
        setNotifications(notifs);
      }
      
      // Update last notification timestamp
      if (notifs.length > 0) {
        lastNotificationTimestamp.current = notifs[0].created_at;
      }
      
      // Use unread_count from API if available, otherwise calculate
      if (data.unread_count !== undefined) {
        setUnreadCount(data.unread_count);
      } else {
        setUnreadCount(notifs.filter((n: Notification) => !n.is_read).length);
      }
      
      // Reset error counter on success
      consecutiveErrorsRef.current = 0;
      backoffDelayRef.current = 60000; // Reset to 60 seconds
    } catch (error) {
      console.error("Failed to load notifications:", error);
      consecutiveErrorsRef.current += 1;
      // Exponential backoff: 60s, 120s, 240s, max 5min
      backoffDelayRef.current = Math.min(
        5 * 60 * 1000,
        backoffDelayRef.current * 2
      );
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, headers]);

  const loadUnreadCount = useCallback(async () => {
    if (!API_URL || !token) return;
    
    // Throttle: Don't poll if last poll was less than 10 seconds ago
    const now = Date.now();
    if (now - lastPollTime.current < 10000) {
      return;
    }
    lastPollTime.current = now;

    try {
      // Use count_only parameter for lighter request
      const res = await fetch(`${API_URL}/notifications/unread_count/`, {
        headers,
        // Allow browser cache for 10 seconds to reduce server load
        cache: "default",
      });
      if (res.ok) {
        const data = await res.json();
        const newCount = data.count || 0;
        
        // Only update if count actually changed to prevent unnecessary re-renders
        setUnreadCount((prev) => {
          if (prev !== newCount) {
            return newCount;
          }
          return prev;
        });
        
        // If count increased, fetch new notifications
        if (newCount > unreadCount && lastNotificationTimestamp.current) {
          loadNotifications(lastNotificationTimestamp.current);
        }
        
        // Reset error counter on success
        consecutiveErrorsRef.current = 0;
        backoffDelayRef.current = 60000; // Reset to 60 seconds
      }
    } catch (error) {
      console.error("Failed to load unread count:", error);
      consecutiveErrorsRef.current += 1;
      // Exponential backoff
      backoffDelayRef.current = Math.min(
        5 * 60 * 1000,
        backoffDelayRef.current * 2
      );
    }
  }, [API_URL, token, headers, unreadCount, loadNotifications]);

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

  // Smart polling with exponential backoff and visibility control
  useEffect(() => {
    let lastActivity = Date.now();
    const INACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - stop polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          isPollingRef.current = false;
        }
      } else {
        // Tab is visible - resume polling immediately
        loadUnreadCount();
        startPolling();
      }
    };

    const handleActivity = () => {
      lastActivity = Date.now();
      // Reset backoff on user activity
      if (backoffDelayRef.current > 60000) {
        backoffDelayRef.current = 60000;
      }
    };

    const startPolling = () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;

      const poll = () => {
        if (document.hidden) {
          isPollingRef.current = false;
          return;
        }

        const isInactive = Date.now() - lastActivity > INACTIVITY_THRESHOLD;
        
        // Use dynamic interval based on activity and error state
        const baseInterval = isInactive ? 5 * 60 * 1000 : backoffDelayRef.current;
        
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        
        pollIntervalRef.current = setInterval(() => {
          if (document.hidden) {
            isPollingRef.current = false;
            return;
          }
          
          const stillInactive = Date.now() - lastActivity > INACTIVITY_THRESHOLD;
          if (!stillInactive) {
            loadUnreadCount();
          }
        }, baseInterval);
      };

      poll();
    };

    // Initial load
    loadNotifications();
    loadUnreadCount();

    // Start polling after initial load
    const initialDelay = setTimeout(() => {
      startPolling();
    }, 5000); // Wait 5 seconds before first poll

    // Listen for visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Track user activity (throttled to reduce overhead)
    let activityTimeout: NodeJS.Timeout | null = null;
    const activityEvents = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    const throttledActivity = () => {
      if (activityTimeout) return;
      handleActivity();
      activityTimeout = setTimeout(() => {
        activityTimeout = null;
      }, 1000); // Throttle to once per second
    };

    activityEvents.forEach((event) => {
      document.addEventListener(event, throttledActivity, { passive: true });
    });

    return () => {
      clearTimeout(initialDelay);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      activityEvents.forEach((event) => {
        document.removeEventListener(event, throttledActivity);
      });
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
    };
  }, [loadNotifications, loadUnreadCount]);

  // Reload when dropdown opens (only if not already loaded recently)
  useEffect(() => {
    if (isOpen) {
      // Only reload if notifications are empty or more than 2 minutes old
      const shouldReload = notifications.length === 0 || 
        (notifications.length > 0 && 
         Date.now() - new Date(notifications[0].created_at).getTime() > 2 * 60 * 1000);
      
      if (shouldReload) {
        loadNotifications();
      } else {
        // Just refresh unread count when opening
        loadUnreadCount();
      }
    }
  }, [isOpen, loadNotifications, loadUnreadCount, notifications]);

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
