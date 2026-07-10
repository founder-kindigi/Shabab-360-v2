"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/stores/useAppStore";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/page-header";
import { DataCard } from "@/components/layout/data-card";
import { EmptyState } from "@/components/layout/empty-state";
import { OfflineQueuePanel } from "./offline-queue-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarCheck,
  Clock,
  Users,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Loader2,
  TreePine,
  MapPin,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardData = {
  park: { id: string; name: string; cityName: string } | null;
  todayDate: string;
  todayEvents: { total: number; open: number; closed: number };
  recentSummary: {
    last7DaysEvents: number;
    last7DaysAttendanceRate: number;
    totalParticipants: number;
    activeGroups: number;
  };
  attentionItems: Array<{
    type: string;
    message: string;
    severity: string;
  }>;
  events: Array<{
    id: string;
    title: string;
    groupName: string;
    groupId: string;
    eventDate: string;
    isClosed: boolean;
    participantCount: number;
    markedCount: number;
    progress: number;
    closedAt: string | null;
    closedByName: string | null;
  }>;
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

function progressColor(pct: number) {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function progressTextColor(pct: number) {
  if (pct >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export function ParkDashboard() {
  const { navigateTo, setSelectedEventId } = useAppStore();

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["park-dashboard"],
    queryFn: () =>
      fetch("/api/park/dashboard").then((r) => {
        if (!r.ok) throw new Error("Failed to load dashboard");
        return r.json();
      }),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <EmptyState
          icon={TreePine}
          title="Could not load dashboard"
          description="There was an error loading park data. Please try again."
        />
      </div>
    );
  }

  const { park, todayDate, todayEvents, recentSummary, attentionItems, events } =
    data;

  // Find first open, incompletely-marked event for "Next Action"
  const nextActionEvent = events.find(
    (e) => !e.isClosed && e.progress < 100
  );

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Greeting Section */}
      <motion.div variants={fadeUp}>
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 px-5 py-5 text-white shadow-lg">
          {/* Decorative shapes */}
          <div className="absolute -top-6 -right-6 size-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -right-4 size-16 rounded-full bg-white/5" />
          <div className="absolute top-1/2 -right-10 size-20 rounded-full bg-white/5" />

          <div className="relative">
            <p className="text-emerald-100 text-sm font-medium">
              {getGreeting()}
            </p>
            <h1 className="text-2xl font-bold mt-1">
              {park?.name || "Your Park"}
            </h1>
            {park?.cityName && (
              <div className="flex items-center gap-1.5 mt-1.5 text-emerald-200 text-sm">
                <MapPin className="size-3.5" />
                {park.cityName}
              </div>
            )}
            <p className="text-emerald-200/70 text-xs mt-2">
              {todayDate}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Metric Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
        <DataCard
          title="Today's Events"
          value={todayEvents.total}
          icon={CalendarCheck}
          variant="emerald"
        />
        <DataCard
          title="Open Events"
          value={todayEvents.open}
          icon={Clock}
          variant={todayEvents.open > 0 ? "amber" : "emerald"}
          trend={
            todayEvents.open > 0
              ? undefined
              : "neutral"
          }
          trendValue={todayEvents.open === 0 ? "All done" : undefined}
        />
        <DataCard
          title="Total Shabab"
          value={recentSummary.totalParticipants}
          icon={Users}
          variant="sky"
        />
        <DataCard
          title="7-Day Rate"
          value={`${recentSummary.last7DaysAttendanceRate}%`}
          icon={TrendingUp}
          variant={
            recentSummary.last7DaysAttendanceRate >= 80
              ? "emerald"
              : recentSummary.last7DaysAttendanceRate >= 50
              ? "amber"
              : "rose"
          }
        />
      </motion.div>

      {/* Attention Items */}
      {attentionItems.length > 0 && (
        <motion.div variants={fadeUp} className="space-y-2">
          {attentionItems.map((item, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2.5 px-4 py-3 rounded-lg border",
                item.severity === "warning"
                  ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50"
                  : "bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-800/50"
              )}
            >
              <AlertTriangle
                className={cn(
                  "size-4 shrink-0",
                  item.severity === "warning"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-sky-600 dark:text-sky-400"
                )}
              />
              <p
                className={cn(
                  "text-sm font-medium",
                  item.severity === "warning"
                    ? "text-amber-800 dark:text-amber-300"
                    : "text-sky-800 dark:text-sky-300"
                )}
              >
                {item.message}
              </p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Next Action Card */}
      {nextActionEvent && (
        <motion.div variants={fadeUp}>
          <Card className="overflow-hidden border-emerald-200 dark:border-emerald-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Next Action
                  </p>
                  <p className="text-sm font-bold mt-1 truncate">
                    {nextActionEvent.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {nextActionEvent.groupName} &middot;{" "}
                    {nextActionEvent.markedCount}/{nextActionEvent.participantCount} marked
                  </p>
                </div>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  onClick={() => {
                    setSelectedEventId(nextActionEvent.id);
                    navigateTo("park-attendance-roster");
                  }}
                >
                  Mark
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Today's Events */}
      <motion.div variants={fadeUp} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Today&apos;s Events</h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            onClick={() => navigateTo("park-attendance")}
          >
            View All
            <ChevronRight className="size-3.5 ml-1" />
          </Button>
        </div>

        {events.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <CalendarCheck className="size-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No events scheduled today
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <Card
                  className={cn(
                    "transition-shadow hover:shadow-sm",
                    event.isClosed
                      ? "border-border/60"
                      : "border-emerald-200/60 dark:border-emerald-800/30"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">
                            {event.title}
                          </p>
                          <Badge
                            variant={event.isClosed ? "secondary" : "default"}
                            className={cn(
                              "text-[10px] shrink-0",
                              event.isClosed
                                ? "bg-muted text-muted-foreground"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                            )}
                          >
                            {event.isClosed ? "Closed" : "Open"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {event.groupName}
                        </p>
                      </div>

                      {/* Progress + action */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-20 hidden sm:block">
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="text-muted-foreground">
                              {event.markedCount}/{event.participantCount}
                            </span>
                            <span
                              className={cn(
                                "font-semibold",
                                progressTextColor(event.progress)
                              )}
                            >
                              {event.progress}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                progressColor(event.progress)
                              )}
                              style={{ width: `${event.progress}%` }}
                            />
                          </div>
                        </div>

                        {!event.isClosed && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => {
                              setSelectedEventId(event.id);
                              navigateTo("park-attendance-roster");
                            }}
                          >
                            <ChevronRight className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Mobile progress (shown on small screens) */}
                    <div className="mt-2 sm:hidden">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">
                          {event.markedCount}/{event.participantCount} marked
                        </span>
                        <span
                          className={cn(
                            "font-semibold",
                            progressTextColor(event.progress)
                          )}
                        >
                          {event.progress}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            progressColor(event.progress)
                          )}
                          style={{ width: `${event.progress}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Offline Queue Panel */}
      <motion.div variants={fadeUp}>
        <OfflineQueuePanel />
      </motion.div>
    </motion.div>
  );
}