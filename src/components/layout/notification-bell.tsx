"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { formatDistanceToNow } from "date-fns";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Bell, BellOff, CheckCheck, Megaphone } from "lucide-react";
import { OnlineStatus } from "@/components/shared/online-status";
import type { PageId } from "@/stores/useAppStore";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AnnouncementNotification {
  id: string;
  title: string;
  content: string;
  priority: string; // "urgent" | "normal" | "low"
  createdAt: string;
  authorName: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "shabab360_seen_announcements";

function getSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set<string>(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markIdsAsSeen(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    const existing = getSeenIds();
    const merged = new Set([...existing, ...ids]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...merged]));
  } catch {
    // ignore storage errors
  }
}

function markAllAsSeen() {
  if (typeof window === "undefined") return;
  try {
    // Store a "mark all" timestamp instead of individual IDs
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ __all: true, at: Date.now() }));
  } catch {
    // ignore
  }
}

function isSeen(announcementId: string, allSeenAt: number | null): boolean {
  if (allSeenAt) return true;
  const seen = getSeenIds();
  return seen.has(announcementId);
}

function getAnnouncementPageId(role: string | undefined): PageId | null {
  if (
    role === "super_admin" ||
    role === "program_admin" ||
    role === "city_head" ||
    role === "park_admin" ||
    role === "park_lead" ||
    role === "murabbi"
  )
    return "admin-announcements";
  if (role === "guardian") return "guardian-announcements";
  if (role === "student") return "student-announcements";
  return null;
}

// ─── Priority Dot ───────────────────────────────────────────────────────────

function PriorityDot({ priority }: { priority: string }) {
  const colorMap: Record<string, string> = {
    urgent: "bg-[#FF0015]",
    normal: "bg-[#4B0A8F] dark:bg-[#8A40B0]",
    low: "bg-muted-foreground",
  };
  return (
    <span
      className={`inline-block size-2 rounded-full shrink-0 ${colorMap[priority] || "bg-muted-foreground"}`}
    />
  );
}

// ─── Desktop Notification Permission ────────────────────────────────────────

function requestNotificationPermission() {
  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "default"
  ) {
    Notification.requestPermission();
  }
}

function showDesktopNotification(title: string, body: string) {
  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: "shabab360-notification",
    });
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();
  const queryClient = useQueryClient();
  const prevNotifIdsRef = useRef<string[]>([]);
  const hasRequestedPermission = useRef(false);

  // Enable real-time notification updates via WebSocket
  useRealtimeNotifications();

  const user = session?.user as {
    id?: string;
    role?: string;
  } | undefined;

  const announcementPage = getAnnouncementPageId(user?.role);

  const { data, isLoading } = useQuery<{
    notifications: AnnouncementNotification[];
    unreadCount: number;
  }>({
    queryKey: ["notifications"],
    queryFn: () => fetch("/api/notifications").then((r) => r.json()),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const notifications = data?.notifications || [];
  const allNotifIds = notifications.map((n) => n.id);

  // Initialize "all seen" timestamp from localStorage (lazy, no effect needed)
  const [allSeenAt, setAllSeenAt] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.__all) return parsed.at;
      }
    } catch {
      // ignore
    }
    return null;
  });

  // Calculate unread count (client-side based on seen status)
  const unreadNotifications = notifications.filter(
    (n) => !isSeen(n.id, allSeenAt)
  );
  const unreadCount = unreadNotifications.length;

  // Detect new urgent announcements for desktop notifications
  useEffect(() => {
    if (!data || !notifications.length) return;

    const prevIds = prevNotifIdsRef.current;
    const newOnes = notifications.filter(
      (n) => !prevIds.includes(n.id) && n.priority === "urgent"
    );

    if (newOnes.length > 0) {
      newOnes.forEach((n) => {
        showDesktopNotification(n.title, n.content);
      });
    }

    prevNotifIdsRef.current = allNotifIds;
  }, [notifications, allNotifIds]);

  // Request notification permission on first bell click
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen && !hasRequestedPermission.current) {
        hasRequestedPermission.current = true;
        requestNotificationPermission();
      }
    },
    []
  );

  // Mark all as read handler
  const handleMarkAllRead = useCallback(() => {
    markAllAsSeen();
    setAllSeenAt(Date.now());
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  // Click notification → navigate to announcements page
  const handleNotificationClick = useCallback(
    (id: string) => {
      markIdsAsSeen([id]);
      setOpen(false);
      if (announcementPage) {
        navigateTo(announcementPage);
      }
    },
    [navigateTo, announcementPage]
  );

  const badgeText =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : "";

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 shrink-0"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          {unreadCount > 0 ? (
            <Bell className="size-[18px]" />
          ) : (
            <BellOff className="size-[18px] text-muted-foreground" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-[#FF0015] rounded-full text-[10px] text-white flex items-center justify-center font-medium leading-none">
              {badgeText}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
        <AnimatePresence mode="wait">
          {open && (
            <motion.div
              key="notification-panel"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <Megaphone className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
                  <h3 className="text-sm font-semibold">Announcements</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-medium text-[#FF0015]">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {user?.id && <OnlineStatus userId={user.id} />}
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-[#4B0A8F] hover:text-[#A0006B] dark:text-[#8A40B0] dark:hover:text-[#D4B8E3] font-medium flex items-center gap-1 transition-colors"
                    >
                      <CheckCheck className="size-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <ScrollArea className="max-h-96">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <div className="size-5 border-2 border-[#4B0A8F] border-t-transparent rounded-full animate-spin mb-2" />
                    <span className="text-xs">Loading...</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <BellOff className="size-8 mb-2 opacity-40" />
                    <p className="text-sm font-medium">No announcements</p>
                    <p className="text-xs mt-1">
                      New announcements will appear here
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((item) => {
                      const seen = isSeen(item.id, allSeenAt);
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNotificationClick(item.id)}
                          className="flex items-start gap-3 px-4 py-3 w-full text-left hover:bg-muted/50 transition-colors"
                        >
                          <div className="mt-1.5">
                            <PriorityDot priority={item.priority} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p
                                className={`text-sm leading-snug truncate ${
                                  seen
                                    ? "text-muted-foreground font-normal"
                                    : "font-medium"
                                }`}
                              >
                                {item.title}
                              </p>
                            </div>
                            <p
                              className={`text-xs mt-0.5 line-clamp-2 ${
                                seen
                                  ? "text-muted-foreground/60"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {item.content}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(item.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          {!seen && (
                            <span className="mt-1.5 size-2 rounded-full bg-[#4B0A8F] dark:bg-[#8A40B0] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Footer */}
              {announcementPage && notifications.length > 0 && (
                <>
                  <Separator />
                  <div className="px-4 py-2.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setOpen(false);
                        navigateTo(announcementPage);
                      }}
                    >
                      <Megaphone className="size-3.5 mr-1.5" />
                      View All Announcements
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}