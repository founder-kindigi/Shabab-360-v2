"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { DataCard } from "@/components/layout/data-card";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toPKT, formatPKT } from "@/lib/timezone";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  TreePine,
  CalendarCheck,
  Users,
  TrendingUp,
  MapPin,
  Building2,
  Activity,
  Plus,
  Pencil,
  Trash2,
  Lock,
  BarChart3,
  CircleDot,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

type DashboardData = {
  city: { id: string; name: string; code: string };
  metrics: {
    parkCount: number;
    batchCount: number;
    groupCount: number;
    totalParticipants: number;
    totalStaff: number;
    attendanceRate7Day: number;
  };
  todayDate: string;
  todayEvents: Array<{
    id: string;
    title: string;
    groupName: string;
    parkName: string;
    isClosed: boolean;
    participantCount: number;
    markedCount: number;
    progress: number;
    closedAt: string | null;
    closedByName: string | null;
  }>;
  parkBreakdown: Array<{
    id: string;
    name: string;
    participants: number;
    groups: number;
    sevenDayRate: number;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    userName: string;
    createdAt: string;
  }>;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

function progressColor(pct: number) {
  if (pct >= 80) return "bg-[#4B0A8F]";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function progressTextColor(pct: number) {
  if (pct >= 80) return "text-[#4B0A8F] dark:text-[#8A40B0]";
  if (pct >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getGreeting(): string {
  const hour = toPKT(new Date()).getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatPKTDate(): string {
  const d = toPKT(new Date());
  return d.toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function actionIcon(action: string) {
  if (action.includes("create") || action.includes("add"))
    return Plus;
  if (action.includes("update") || action.includes("edit"))
    return Pencil;
  if (action.includes("delete") || action.includes("remove"))
    return Trash2;
  if (action.includes("close"))
    return Lock;
  if (action.includes("view"))
    return BarChart3;
  return CircleDot;
}

function actionColor(action: string) {
  if (action.includes("create") || action.includes("add"))
    return "bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0]";
  if (action.includes("update") || action.includes("edit"))
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400";
  if (action.includes("delete") || action.includes("remove"))
    return "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400";
  if (action.includes("close"))
    return "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400";
  if (action.includes("view"))
    return "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400";
  return "bg-muted text-muted-foreground";
}

// ── Component ───────────────────────────────────────────────────────────────

export function CityHeadDashboard() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "City Head";

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["city-head-dashboard"],
    queryFn: () =>
      fetch("/api/city-head/dashboard").then((r) => {
        if (!r.ok) throw new Error("Failed to load dashboard");
        return r.json();
      }),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  // ── Loading State ──
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
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  // ── Error State ──
  if (error || !data) {
    return (
      <EmptyState
        icon={Building2}
        title="Could not load dashboard"
        description="There was an error loading city data. Please try again."
      />
    );
  }

  const { city, metrics, todayDate, todayEvents, parkBreakdown, recentActivity } =
    data;

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── 1. Greeting Banner ── */}
      <motion.div variants={fadeUp}>
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#2A0C8F] via-[#A0006B] to-[#FF0015] px-5 py-5 md:px-6 md:py-6 text-white shadow-lg">
          {/* Decorative shapes */}
          <div className="absolute -top-6 -right-6 size-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -right-4 size-16 rounded-full bg-white/5" />
          <div className="absolute top-1/2 -right-10 size-20 rounded-full bg-white/5" />

          <div className="relative">
            <p className="text-white/80 text-sm font-medium">
              Assalamu Alaikum, {userName}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1">
              {city.name}
            </h1>
            <div className="flex items-center gap-1.5 mt-1.5 text-white/70 text-sm">
              <MapPin className="size-3.5" />
              <span>City Head Dashboard</span>
              <span className="mx-1">&middot;</span>
              <Badge className="bg-white/20 text-white border-0 text-[10px] hover:bg-white/25">
                {city.code}
              </Badge>
            </div>
            <p className="text-white/50 text-xs mt-2">
              {formatPKTDate()}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── 2. Metric Cards (2x2) ── */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
        <DataCard
          title="Parks"
          value={metrics.parkCount}
          icon={TreePine}
          variant="brand"
        />
        <DataCard
          title="Active Batches"
          value={metrics.batchCount}
          icon={CalendarCheck}
          variant="sky"
        />
        <DataCard
          title="Total Shabab"
          value={metrics.totalParticipants}
          icon={Users}
          variant="violet"
        />
        <DataCard
          title="7-Day Attendance"
          value={`${metrics.attendanceRate7Day}%`}
          icon={TrendingUp}
          variant={
            metrics.attendanceRate7Day >= 80
              ? "brand"
              : metrics.attendanceRate7Day >= 50
                ? "amber"
                : "rose"
          }
        />
      </motion.div>

      {/* ── 3. My Parks ── */}
      <motion.div variants={fadeUp} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">My Parks</h3>
          <Badge variant="outline" className="text-[10px] font-normal">
            {parkBreakdown.length} {parkBreakdown.length === 1 ? "park" : "parks"}
          </Badge>
        </div>

        {parkBreakdown.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <TreePine className="size-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No parks found in your city
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {parkBreakdown.map((park, i) => (
              <motion.div
                key={park.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center size-8 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086080] shrink-0">
                            <TreePine className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
                          </div>
                          <p className="text-sm font-semibold truncate">
                            {park.name}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          Shabab
                        </p>
                        <p className="text-lg font-bold text-foreground">
                          {park.participants}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          Groups
                        </p>
                        <p className="text-lg font-bold text-foreground">
                          {park.groups}
                        </p>
                      </div>
                    </div>

                    {/* 7-day rate bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">7-Day Rate</span>
                        <span
                          className={cn(
                            "font-semibold",
                            progressTextColor(park.sevenDayRate)
                          )}
                        >
                          {park.sevenDayRate}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            progressColor(park.sevenDayRate)
                          )}
                          style={{ width: `${park.sevenDayRate}%` }}
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

      {/* ── 4. Today's Sessions ── */}
      <motion.div variants={fadeUp} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Today&apos;s Sessions</h3>
          <Badge variant="outline" className="text-[10px] font-normal">
            {todayEvents.length} {todayEvents.length === 1 ? "session" : "sessions"}
          </Badge>
        </div>

        {todayEvents.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <CalendarCheck className="size-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No sessions scheduled today across your parks
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {todayEvents.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <Card
                  className={cn(
                    "transition-shadow hover:shadow-sm",
                    event.isClosed
                      ? "border-border/60"
                      : "border-[#D4B8E399] dark:border-[#2A0C8F4D]"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate">
                            {event.title}
                          </p>
                          <Badge
                            variant={event.isClosed ? "secondary" : "default"}
                            className={cn(
                              "text-[10px] shrink-0",
                              event.isClosed
                                ? "bg-muted text-muted-foreground"
                                : "bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0]"
                            )}
                          >
                            {event.isClosed ? "Closed" : "Open"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" />
                          <span className="truncate">{event.parkName}</span>
                          <span className="mx-0.5">&middot;</span>
                          <span className="truncate">{event.groupName}</span>
                        </div>
                      </div>

                      {/* Progress */}
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
                                "h-full rounded-full transition-all duration-500",
                                progressColor(event.progress)
                              )}
                              style={{ width: `${event.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile progress */}
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
                            "h-full rounded-full transition-all duration-500",
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

      {/* ── 5. Recent Activity ── */}
      <motion.div variants={fadeUp} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent Activity</h3>
          <Badge variant="outline" className="text-[10px] font-normal">
            Last 10
          </Badge>
        </div>

        {recentActivity.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Activity className="size-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No recent activity to show
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="relative space-y-0">
                {recentActivity.map((activity, i) => {
                  const Icon = actionIcon(activity.action);
                  const isLast = i === recentActivity.length - 1;
                  return (
                    <div key={activity.id} className="relative flex gap-3 pb-4">
                      {/* Connecting line */}
                      {!isLast && (
                        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
                      )}

                      {/* Icon circle */}
                      <div
                        className={cn(
                          "relative z-10 flex items-center justify-center size-[30px] rounded-full shrink-0",
                          actionColor(activity.action)
                        )}
                      >
                        <Icon className="size-3.5" />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">
                            {activity.userName}
                          </p>
                          <span className="text-xs text-muted-foreground capitalize">
                            {activity.action.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                          {activity.entityType.replace(/_/g, " ")}
                          {activity.entityId ? ` #${activity.entityId.slice(0, 6)}` : ""}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          {formatDistanceToNow(new Date(activity.createdAt), {
                            addSuffix: true,
                          })}
                          {" · "}
                          {formatPKT(new Date(activity.createdAt), "dd MMM, hh:mm a")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
}