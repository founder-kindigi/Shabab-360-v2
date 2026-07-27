"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
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
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore, type PageId } from "@/stores/useAppStore";

// --- Types ---

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

// --- Constants ---

const STORAGE_KEY_READ = "shabab360_read_notifications";

const FILTER_TABS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "attendance", label: "Attendance" },
  { value: "fees", label: "Fees" },
  { value: "announcements", label: "Announcements" },
  { value: "system", label: "System" },
];

// --- Helpers ---

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

function getActionBadge(action: string): { cls: string; label: string } {
  const a = action.toLowerCase();
  if (a === "create" || a === "add")
    return { cls: "bg-green-100 text-green-700", label: "Created" };
  if (a === "update" || a === "edit")
    return { cls: "bg-sky-100 text-sky-700", label: "Updated" };
  if (a === "delete" || a === "remove")
    return { cls: "bg-red-100 text-red-700", label: "Deleted" };
  if (a === "close")
    return { cls: "bg-slate-100 text-slate-700", label: "Closed" };
  if (a === "login")
    return { cls: "bg-sky-100 text-sky-700", label: "Login" };
  if (a === "logout")
    return { cls: "bg-sky-100 text-sky-700", label: "Logout" };
  return { cls: "bg-muted text-muted-foreground", label: action };
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

// --- Component ---

export function MobileNotificationsPage() {
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
      fetch(`/api/notifications/history?page=${page}&pageSize=20&type=${activeFilter}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load notifications");
        return r.json();
      }),
    staleTime: 15000,
  });

  const notifications = data?.data || [];
  const pagination = data?.pagination;

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
    fetch(`/api/notifications/${id}/read`, { method: "PATCH" }).catch(() => {});
  }, []);

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

  const handleNotificationClick = useCallback((item: NotificationItem) => {
    markAsRead(item.id);
    const target = getNavigationTarget(item.entityType);
    if (target) {
      navigateTo(target);
    }
  }, [markAsRead, navigateTo]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  return (
    <div className="flex flex-col min-h-screen bg-muted/30 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground">Recent activity</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-full px-3 text-xs"
            disabled={unreadCount === 0}
            onClick={markAllAsRead}
          >
            <CheckCheck className="size-4 mr-1.5" />
            Mark all read
          </Button>
        </div>

        {/* Filter Scrollable Row */}
        <div className="flex overflow-x-auto pb-1 -mx-4 px-4 gap-2 scrollbar-hide">
          {FILTER_TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={activeFilter === tab.value ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-9 rounded-full whitespace-nowrap",
                activeFilter === tab.value && "bg-[#4B0A8F] text-white hover:bg-[#4B0A8F]/90"
              )}
              onClick={() => { setActiveFilter(tab.value); setPage(1); }}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3">
        {(isLoading || isFetching) && notifications.length === 0 && (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="rounded-2xl border-l-4 border-l-muted">
                <CardContent className="p-4 flex gap-3">
                  <Skeleton className="size-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <BellOff className="size-12 text-muted-foreground/40 mb-3" />
            <p className="font-medium">Failed to load notifications</p>
          </div>
        )}

        {!isLoading && !error && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Bell className="size-8 text-muted-foreground/50" />
            </div>
            <p className="font-medium">No notifications</p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {!isLoading && !error && notifications.map((item, idx) => {
            const Icon = getEntityTypeIcon(item.entityType);
            const badge = getActionBadge(item.action);
            const isRead = readIds.has(item.id);
            const navTarget = getNavigationTarget(item.entityType);
            const isClickable = !!navTarget;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.04, duration: 0.3 }}
              >
                <Card
                  className={cn(
                    "rounded-2xl border-l-4 overflow-hidden",
                    getActionBorder(item.action),
                    isClickable && "active:scale-[0.98] transition-transform",
                    isRead && "opacity-60 bg-muted/20"
                  )}
                  onClick={isClickable ? () => handleNotificationClick(item) : undefined}
                >
                  <CardContent className="p-4 flex gap-3">
                    <div className={cn("flex items-center justify-center size-10 rounded-xl shrink-0", badge.cls)}>
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold truncate">{item.actorName}</span>
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", badge.cls)}>
                          {badge.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-snug">
                        {item.description}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1.5">
                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    {!isRead && (
                      <div className="size-2.5 rounded-full bg-[#4B0A8F] shrink-0 mt-1" />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              className="h-10 rounded-xl"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage(p => p - 1)}
            >
              Prev
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              {page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              className="h-10 rounded-xl"
              disabled={page >= pagination.totalPages || isFetching}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
        
        {isFetching && notifications.length > 0 && (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      
      <div className="h-6" />
    </div>
  );
}
