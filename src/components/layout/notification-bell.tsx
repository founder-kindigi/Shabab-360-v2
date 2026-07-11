"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  History,
} from "lucide-react";

interface Notification {
  id: string;
  action: string;
  entityType: string;
  description: string;
  timestamp: string;
  actorName: string;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;

  // Fallback: formatted date
  return new Date(dateStr).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
  });
}

function ActionIcon({ action }: { action: string }) {
  switch (action) {
    case "CREATE":
      return (
        <div className="flex items-center justify-center size-8 rounded-full bg-[#F3ECF6] dark:bg-[#1F0860] shrink-0">
          <Plus className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
        </div>
      );
    case "UPDATE":
      return (
        <div className="flex items-center justify-center size-8 rounded-full bg-amber-100 dark:bg-amber-950 shrink-0">
          <Pencil className="size-4 text-amber-600 dark:text-amber-400" />
        </div>
      );
    case "DELETE":
      return (
        <div className="flex items-center justify-center size-8 rounded-full bg-red-100 dark:bg-red-950 shrink-0">
          <Trash2 className="size-4 text-red-600 dark:text-red-400" />
        </div>
      );
    case "CLOSE":
      return (
        <div className="flex items-center justify-center size-8 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0">
          <CheckCircle2 className="size-4 text-slate-600 dark:text-slate-400" />
        </div>
      );
    default:
      return (
        <div className="flex items-center justify-center size-8 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0">
          <Clock className="size-4 text-slate-600 dark:text-slate-400" />
        </div>
      );
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();

  // Enable real-time notification updates via WebSocket.
  // The existing 60s polling remains as a fallback.
  useRealtimeNotifications();

  const user = session?.user as {
    role?: string;
  } | undefined;

  // Determine if user has access to audit log page
  const canViewAuditLog =
    user?.role === "super_admin" ||
    user?.role === "program_admin" ||
    user?.role === "city_head";

  const { data, isLoading } = useQuery<{
    notifications: Notification[];
    unreadCount: number;
  }>({
    queryKey: ["notifications"],
    queryFn: () => fetch("/api/notifications").then((r) => r.json()),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;
  const displayed = notifications.slice(0, 10);

  const badgeText =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 shrink-0"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="size-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 size-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium leading-none min-w-[16px]">
              {badgeText}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0"
      >
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
                <h3 className="text-sm font-semibold">Recent Activity</h3>
                {canViewAuditLog && (
                  <button
                    onClick={() => {
                      setOpen(false);
                      navigateTo("admin-audit-log");
                    }}
                    className="text-xs text-[#4B0A8F] hover:text-[#A0006B] dark:text-[#8A40B0] dark:hover:text-[#8A40B0] font-medium"
                  >
                    View All
                  </button>
                )}
              </div>

              {/* List */}
              <ScrollArea className="max-h-96">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <div className="size-5 border-2 border-[#4B0A8F] border-t-transparent rounded-full animate-spin mb-2" />
                    <span className="text-xs">Loading...</span>
                  </div>
                ) : displayed.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <XCircle className="size-8 mb-2 opacity-40" />
                    <p className="text-sm font-medium">No recent activity</p>
                    <p className="text-xs mt-1">
                      New actions will appear here
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {displayed.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <ActionIcon action={item.action} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug">
                            {item.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatRelativeTime(item.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Footer */}
              {canViewAuditLog && (
                <div className="border-t px-4 py-2.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setOpen(false);
                      navigateTo("admin-audit-log");
                    }}
                  >
                    <History className="size-3.5 mr-1.5" />
                    View Audit Log
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}