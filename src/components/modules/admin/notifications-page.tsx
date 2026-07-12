"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  BellOff,
  CalendarCheck,
  DollarSign,
  Megaphone,
  Settings,
  UserPlus,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore, type PageId } from "@/stores/useAppStore";

// ─── Types ──────────────────────────────────────────────────────────────────

interface NotificationItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  actorName: string;
  actorEmail: string | null;
  timestamp: string;
  read: boolean;
  details: unknown;
}

type FilterType = "all" | "attendance" | "fees" | "announcements" | "system";

// ─── Constants ──────────────────────────────────────────────────────────────

const STORAGE_KEY_READ = "shabab360_read_notifications";

const FILTER_TABS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "attendance", label: "Attendance" },
  { value: "fees", label: "Fees" },
  { value: "announcements", label: "Announcements" },
  { value: "system", label: "System" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_READ);
    return raw ? new Set<string>(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_READ, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

function getEntityTypeIcon(entityType: string) {
  const t = entityType.toUpperCase();
  if (t.includes("ATTENDANCE")) return CalendarCheck;
  if (t.includes("FEE") || t.includes("PAYMENT")) return DollarSign;
  if (t.includes("ANNOUNCEMENT")) return Megaphone;
  if (t.includes("USER") || t.includes("STAFF") || t.includes("PARTICIPANT") || t.includes("GUARDIAN"))
    return UserPlus;
  return Settings;
}

function getActionBorder(action: string): string {
  const a = action.toLowerCase();
  if (a === "create" || a === "add") return "border-l-green-500";
  if (a === "update" || a === "edit") return "border-l-sky-500";
  if (a === "delete" || a === "remove") return "border-l-red-500";
  return "border-l-slate-400";
}

function getActionBadge(action: string): {
  cls: string;
  label: string;
} {
  const a = action.toLowerCase();
  if (a === "create" || a === "add")
    return {
      cls: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
      label: "Created",
    };
  if (a === "update" || a === "edit")
    return {
      cls: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400",
      label: "Updated",
    };
  if (a === "delete" || a === "remove")
    return {
      cls: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
      label: "Deleted",
    };
  if (a === "close")
    return {
      cls: "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400",
      label: "Closed",
    };
  if (a === "login")
    return {
      cls: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400",
      label: "Login",
    };
  if (a === "logout")
    return {
      cls: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400",
      label: "Logout",
    };
  return {
    cls: "bg-muted text-muted-foreground",
    label: action,
  };
}

function getNavigationTarget(entityType: string): PageId | null {
  const t = entityType.toUpperCase();
  if (t.includes("ATTENDANCE")) return "admin-attendance-events";
  if (t.includes("FEE") || t.includes("PAYMENT")) return "admin-fees";
  if (t.includes("ANNOUNCEMENT")) return "admin-announcements";
  if (t.includes("CITY")) return "admin-cities";
  if (t.includes("PARK")) return "admin-parks";
  if (t.includes("BATCH")) return "admin-batches";
  if (t.includes("GROUP")) return "admin-groups";
  if (t.includes("USER") || t.includes("STAFF")) return "admin-users";
  if (t.includes("PARTICIPANT")) return "admin-students";
  if (t.includes("GUARDIAN")) return "admin-guardians";
  return null;
}

// ─── Loading skeleton ──────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <Card className="border-l-4 border-l-muted">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="size-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-full max-w-md" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="size-2.5 rounded-full shrink-0 mt-2" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function NotificationsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [page, setPage] = useState(1);
  const [readIds, setReadIds] = useState<Set<string>>(() => getReadIds());
  const { navigateTo } = useAppStore();

  const { data, isLoading, isFetching, error } = useQuery<{
    data: NotificationItem[];
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    };
  }>({
    queryKey: ["notifications-history", activeFilter, page],
    queryFn: () =>
      fetch(
        `/api/notifications/history?page=${page}&pageSize=20&type=${activeFilter}`,
      ).then((r) => {
        if (!r.ok) throw new Error("Failed to load notifications");
        return r.json();
      }),
    staleTime: 15000,
  });

  const notifications = data?.data || [];
  const pagination = data?.pagination;

  // Mark single notification as read
  const markAsRead = useCallback(
    (id: string) => {
      setReadIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        saveReadIds(next);
        return next;
      });
      // Fire-and-forget PATCH
      fetch(`/api/notifications/${id}/read`, { method: "PATCH" }).catch(
        () => {},
      );
    },
    [],
  );

  // Mark all visible as read
  const markAllAsRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    setReadIds((prev) => {
      const next = new Set(prev);
      allIds.forEach((id) => next.add(id));
      saveReadIds(next);
      return next;
    });
    toast.success(`Marked ${allIds.length} notifications as read`);
  }, [notifications]);

  // Handle notification click
  const handleNotificationClick = useCallback(
    (item: NotificationItem) => {
      markAsRead(item.id);
      const target = getNavigationTarget(item.entityType);
      if (target) {
        navigateTo(target);
      }
    },
    [markAsRead, navigateTo],
  );

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={activeFilter === tab.value ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 text-xs",
              activeFilter === tab.value &&
                "bg-[#4B0A8F] hover:bg-[#4B0A8F] text-white",
            )}
            onClick={() => setActiveFilter(tab.value)}
          >
            {tab.label}
          </Button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px] bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0]"
            >
              {unreadCount} unread
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={unreadCount === 0}
            onClick={markAllAsRead}
          >
            <CheckCheck className="size-3.5 mr-1" />
            Mark all read
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {(isLoading || isFetching) && notifications.length === 0 && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <NotificationSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <BellOff className="size-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Failed to load notifications
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Please try again
            </p>
          </CardContent>
        </Card>
      )}

      {/* Notifications list */}
      {!isLoading && !error && notifications.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="rounded-full bg-muted p-4 w-fit mx-auto mb-3">
              <Bell className="size-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium">No notifications</p>
            <p className="text-xs text-muted-foreground mt-1">
              {activeFilter === "all"
                ? "Activity will appear here as your team uses the system."
                : `No ${activeFilter} notifications found.`}
            </p>
          </CardContent>
        </Card>
      )}

      <AnimatePresence mode="popLayout">
        {!isLoading && !error && notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((item, idx) => {
              const Icon = getEntityTypeIcon(item.entityType);
              const badge = getActionBadge(item.action);
              const isRead = readIds.has(item.id);
              const navTarget = getNavigationTarget(item.entityType);
              const isClickable = !!navTarget;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.03, duration: 0.25 }}
                >
                  <Card
                    className={cn(
                      "border-l-4 transition-all",
                      getActionBorder(item.action),
                      isClickable && "cursor-pointer hover:shadow-sm",
                      isRead && "opacity-60",
                    )}
                    onClick={
                      isClickable
                        ? () => handleNotificationClick(item)
                        : undefined
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Entity type icon */}
                        <div
                          className={cn(
                            "flex items-center justify-center size-10 rounded-lg shrink-0",
                            badge.cls,
                          )}
                        >
                          <Icon className="size-5" />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">
                              {item.actorName}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                                badge.cls,
                              )}
                            >
                              {badge.label}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                            {item.description}
                          </p>
                          <p className="text-[11px] text-muted-foreground/70 mt-1">
                            {formatDistanceToNow(new Date(item.timestamp), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>

                        {/* Unread dot */}
                        {!isRead && (
                          <div className="size-2.5 rounded-full bg-[#4B0A8F] dark:bg-[#8A40B0] mt-2 shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={page <= 1 || isFetching}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="size-3.5 mr-1" />
                  Previous
                </Button>

                <span className="text-xs text-muted-foreground px-2">
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={
                    page >= pagination.totalPages || isFetching
                  }
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="size-3.5 ml-1" />
                </Button>

                {isFetching && (
                  <Loader2 className="size-4 animate-spin text-muted-foreground ml-2" />
                )}
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Refetching overlay */}
      {isFetching && notifications.length > 0 && (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="size-4 animate-spin text-muted-foreground mr-2" />
          <span className="text-xs text-muted-foreground">Refreshing...</span>
        </div>
      )}
    </div>
  );
}