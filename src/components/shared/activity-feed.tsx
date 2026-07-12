"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, ArrowRight } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface NotificationItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  actorName: string;
  timestamp: string;
  read: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getActionColor(action: string): string {
  const a = action.toLowerCase();
  if (a === "create" || a === "add") return "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400";
  if (a === "update" || a === "edit") return "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400";
  if (a === "delete" || a === "remove") return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400";
  if (a === "close") return "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400";
  if (a === "login" || a === "logout") return "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400";
  return "bg-muted text-muted-foreground";
}

function getDotColor(action: string): string {
  const a = action.toLowerCase();
  if (a === "create" || a === "add") return "bg-green-500";
  if (a === "update" || a === "edit") return "bg-sky-500";
  if (a === "delete" || a === "remove") return "bg-red-500";
  if (a === "close") return "bg-slate-400";
  if (a === "login" || a === "logout") return "bg-sky-400";
  return "bg-muted-foreground";
}

function getInitials(name: string): string {
  if (!name) return "??";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Component ──────────────────────────────────────────────────────────────

interface ActivityFeedProps {
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

export function ActivityFeed({
  limit = 5,
  showHeader = true,
  className,
}: ActivityFeedProps) {
  const { navigateTo } = useAppStore();

  const { data, isLoading } = useQuery<{
    data: NotificationItem[];
    pagination: { totalItems: number };
  }>({
    queryKey: ["activity-feed", limit],
    queryFn: () =>
      fetch(`/api/notifications/history?page=1&pageSize=${limit}`).then(
        (r) => {
          if (!r.ok) throw new Error("Failed to load activity");
          return r.json();
        },
      ),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const items = data?.data || [];

  return (
    <Card className={cn("overflow-hidden", className)}>
      {showHeader && (
        <CardHeader className="pb-3 bg-muted/20 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="size-4 text-[#4B0A8F]" />
            Recent Activity
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn("p-4", !showHeader && "pt-2")}>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: Math.min(limit, 5) }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="size-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-0">
            {items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.25 }}
                className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                {/* Avatar circle */}
                <div
                  className={cn(
                    "flex items-center justify-center size-8 rounded-full shrink-0 text-[10px] font-semibold",
                    getActionColor(item.action),
                  )}
                >
                  {getInitials(item.actorName)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm leading-snug">
                    <span className="font-medium">{item.actorName}</span>{" "}
                    <span className="text-muted-foreground">
                      {item.description.replace(item.actorName + " ", "")}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    {formatDistanceToNow(new Date(item.timestamp), {
                      addSuffix: true,
                    })}
                  </p>
                </div>

                {/* Action dot */}
                <div
                  className={cn(
                    "size-2 rounded-full mt-1.5 shrink-0",
                    getDotColor(item.action),
                  )}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center">
            <div className="rounded-full bg-muted p-3 w-fit mx-auto mb-2">
              <Activity className="size-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        )}

        {/* View all link */}
        {items.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-[#4B0A8F] hover:text-[#4B0A8F] dark:text-[#8A40B0] dark:hover:text-[#8A40B0] h-8"
              onClick={() => navigateTo("notifications")}
            >
              View All Notifications
              <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}