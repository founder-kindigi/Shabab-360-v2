"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/stores/useAppStore";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/layout/page-header";
import { DataCard } from "@/components/layout/data-card";
import { EmptyState } from "@/components/layout/empty-state";
import { OfflineQueuePanel } from "./offline-queue-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster, toast } from "sonner";
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
  XCircle,
  Star,
  ShieldAlert,
  CircleAlert,
  Layers,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AttendanceChart } from "@/components/shared/attendance-chart";
import { Sparkline } from "@/components/shared/sparkline";

// ==================== TYPES ====================

type AttendanceTrendPoint = {
  date: string;
  rate: number;
  marked: number;
  total: number;
  present: number;
  late: number;
  absent: number;
};

type GroupBreakdownItem = {
  id: string;
  name: string;
  totalParticipants: number;
  todayMarkedCount: number;
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  todayExcused: number;
  todayEventStatus: "open" | "closed" | "none";
  todayProgress: number;
};

type TopPerformer = {
  id: string;
  name: string;
  groupName: string;
  attended: number;
  total: number;
  rate: number;
};

type NeedsAttentionItem = {
  type: "low_attendance" | "unclosed_yesterday";
  groupId?: string;
  groupName?: string;
  eventId?: string;
  eventTitle?: string;
  rate?: number;
  message: string;
};

type DashboardData = {
  park: { id: string; name: string; cityName: string } | null;
  userName: string | null;
  todayDate: string;
  todayEvents: { total: number; open: number; closed: number };
  recentSummary: {
    last7DaysEvents: number;
    last7DaysAttendanceRate: number;
    prevWeekAttendanceRate: number;
    totalParticipants: number;
    activeGroups: number;
  };
  attendanceTrend: AttendanceTrendPoint[];
  todayAttendance?: { present: number; late: number; absent: number; total: number };
  groupBreakdown: GroupBreakdownItem[];
  topPerformers: TopPerformer[];
  needsAttention: NeedsAttentionItem[];
  openUncompletedCount: number;
  unclosedYesterdayCount: number;
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

// ==================== ANIMATION VARIANTS ====================

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// ==================== HELPERS ====================

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

function barColor(pct: number) {
  if (pct >= 80) return "bg-[#4B0A8F] dark:bg-[#8A40B0]";
  if (pct >= 50) return "bg-amber-500 dark:bg-amber-400";
  return "bg-red-500 dark:bg-red-400";
}

// ==================== GROUP PERFORMANCE CARD ====================

function GroupPerformanceCard({
  group,
  onClick,
}: {
  group: GroupBreakdownItem;
  onClick: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Card
        className="cursor-pointer transition-shadow hover:shadow-md border-border/60 overflow-hidden"
        onClick={onClick}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold truncate">{group.name}</h4>
            {group.todayEventStatus === "none" ? (
              <Badge
                variant="secondary"
                className="text-[10px] bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              >
                No session today
              </Badge>
            ) : group.todayEventStatus === "open" ? (
              <Badge className="text-[10px] bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0]">
                Open
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="text-[10px] bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              >
                Closed
              </Badge>
            )}
          </div>

          {group.todayEventStatus === "none" ? (
            <p className="text-xs text-muted-foreground">
              {group.totalParticipants} shabab in group
            </p>
          ) : (
            <>
              {/* Progress bar */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-muted-foreground">
                    {group.todayMarkedCount}/{group.totalParticipants} marked
                  </span>
                  <span
                    className={cn("font-semibold", progressTextColor(group.todayProgress))}
                  >
                    {group.todayProgress}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", progressColor(group.todayProgress))}
                    initial={{ width: 0 }}
                    animate={{ width: `${group.todayProgress}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* P/A/L/E badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {group.todayPresent > 0 && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0]">
                    P: {group.todayPresent}
                  </span>
                )}
                {group.todayAbsent > 0 && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400">
                    A: {group.todayAbsent}
                  </span>
                )}
                {group.todayLate > 0 && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                    L: {group.todayLate}
                  </span>
                )}
                {group.todayExcused > 0 && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400">
                    E: {group.todayExcused}
                  </span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ==================== TOP PERFORMERS ====================

function TopPerformersSection({ performers }: { performers: TopPerformer[] }) {
  if (performers.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Star className="size-4 text-amber-500" />
        <h3 className="text-sm font-semibold">Top Performers (7 Days)</h3>
      </div>
      <div className="space-y-2.5">
        {performers.map((p, i) => (
          <motion.div
            key={p.id}
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
          >
            <span
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0",
                i === 0
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                  : i === 1
                  ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  : i === 2
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{p.name}</p>
              <p className="text-[11px] text-muted-foreground">{p.groupName}</p>
            </div>
            <div className="text-right shrink-0">
              <p
                className={cn(
                  "text-sm font-bold",
                  p.rate >= 80
                    ? "text-[#4B0A8F] dark:text-[#8A40B0]"
                    : p.rate >= 50
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {p.rate}%
              </p>
              <p className="text-[10px] text-muted-foreground">
                {p.attended}/{p.total}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export function ParkDashboard() {
  const { navigateTo, setSelectedEventId, setSelectedGroup } = useAppStore();
  const queryClient = useQueryClient();

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

  // Mutation to close unclosed yesterday events
  const closeEventMutation = useMutation({
    mutationFn: (eventId: string) =>
      fetch(`/api/park/attendance/${eventId}/close`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Closed from dashboard - unclosed from yesterday" }),
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to close event");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Event closed successfully");
      queryClient.invalidateQueries({ queryKey: ["park-dashboard"] });
    },
    onError: () => {
      toast.error("Failed to close event");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-52 rounded-xl" />
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

  const {
    park,
    userName,
    todayDate,
    todayEvents,
    recentSummary,
    attendanceTrend,
    todayAttendance,
    groupBreakdown,
    topPerformers,
    needsAttention,
    openUncompletedCount,
    unclosedYesterdayCount,
    attentionItems,
    events,
  } = data;

  // Find first open, incompletely-marked event for "Next Action"
  const nextActionEvent = events.find(
    (e) => !e.isClosed && e.progress < 100
  );

  // Compute week-over-week trend
  const currentRate = recentSummary.last7DaysAttendanceRate;
  const prevRate = recentSummary.prevWeekAttendanceRate;
  const rateTrend =
    prevRate > 0
      ? currentRate > prevRate
        ? "up"
        : currentRate < prevRate
        ? "down"
        : "neutral"
      : "neutral";
  const rateDiff = prevRate > 0 ? Math.abs(currentRate - prevRate) : 0;

  return (
    <>
      <Toaster position="top-center" richColors />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* ==================== ENHANCED GREETING BANNER ==================== */}
        <motion.div variants={fadeUp}>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#2A0C8F] via-[#A0006B] to-[#FF0015] px-5 py-5 text-white shadow-lg">
            {/* Decorative shapes */}
            <div className="absolute -top-6 -right-6 size-28 rounded-full bg-white/10" />
            <div className="absolute top-2 -right-2 size-12 rounded-full bg-white/5" />
            <div className="absolute -bottom-4 -right-4 size-20 rounded-full bg-white/5" />
            <div className="absolute -bottom-8 -left-4 size-16 rounded-full bg-white/5" />
            <div className="absolute top-1/3 -left-6 size-10 rounded-full bg-white/10" />

            <div className="relative">
              <p className="text-white/80 text-sm font-medium">
                Assalamu Alaikum{userName ? `, ${userName}` : ""}
              </p>
              <h1 className="text-2xl font-bold mt-1">
                {park?.name || "Your Park"}
              </h1>
              {park?.cityName && (
                <div className="flex items-center gap-1.5 mt-1.5 text-white/70 text-sm">
                  <MapPin className="size-3.5" />
                  {park.cityName}
                </div>
              )}
              <div className="flex items-center justify-between mt-2">
                <p className="text-white/50 text-xs">{todayDate}</p>
                {openUncompletedCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1"
                  >
                    <CircleAlert className="size-3.5 text-amber-200" />
                    <span className="text-xs font-medium text-white">
                      {openUncompletedCount} session{openUncompletedCount !== 1 ? "s" : ""} need attention
                    </span>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ==================== TODAY'S ATTENDANCE INLINE ==================== */}
        {todayAttendance && todayAttendance.total > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 bg-muted/20 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CalendarCheck className="size-4 text-[#4B0A8F]" />
                  Today&apos;s Attendance
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 px-4">
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#4B0A8F] dark:text-[#8A40B0]">
                      {todayAttendance.present}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Present</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#A0006B]">
                      {todayAttendance.late}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Late</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#FF0015]">
                      {todayAttendance.absent}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Absent</p>
                  </div>
                  <div className="ml-auto flex items-center gap-4">
                    {attendanceTrend && attendanceTrend.length > 1 && (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-muted-foreground">7-Day Present Trend</span>
                        <Sparkline
                          data={attendanceTrend.slice(-7).map((t) => t.present)}
                          width={90}
                          height={32}
                          color="#4B0A8F"
                          showTrend
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ==================== METRIC CARDS (2x3 desktop, 2x2 mobile) ==================== */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <DataCard
            title="Today's Events"
            value={todayEvents.total}
            icon={CalendarCheck}
            variant="brand"
          />
          <DataCard
            title="Open Events"
            value={todayEvents.open}
            icon={Clock}
            variant={todayEvents.open > 0 ? "amber" : "brand"}
            trend={todayEvents.open === 0 ? "neutral" : undefined}
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
            value={`${currentRate}%`}
            icon={TrendingUp}
            variant={
              currentRate >= 80
                ? "violet"
                : currentRate >= 50
                ? "amber"
                : "rose"
            }
            trend={rateTrend}
            trendValue={
              rateDiff > 0
                ? `${rateDiff}% vs prev week`
                : prevRate > 0
                ? "Same as prev week"
                : undefined
            }
          />
          <DataCard
            title="Active Groups"
            value={recentSummary.activeGroups}
            icon={Layers}
            variant="rose"
          />
          {/* Unclosed Yesterday — only shows if > 0 */}
          {unclosedYesterdayCount > 0 && (
            <DataCard
              title="Unclosed Yesterday"
              value={unclosedYesterdayCount}
              icon={XCircle}
              variant="slate"
              trend="down"
              trendValue="Needs action"
            />
          )}
        </motion.div>

        {/* ==================== ATTENTION ITEMS (ENHANCED) ==================== */}
        {needsAttention.length > 0 && (
          <motion.div variants={fadeUp} className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <ShieldAlert className="size-4 text-amber-500" />
              Needs Attention
            </h3>
            <AnimatePresence>
              {needsAttention.map((item, i) => (
                <motion.div
                  key={`${item.type}-${item.groupId || item.eventId || i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg border",
                    item.type === "unclosed_yesterday"
                      ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/50"
                      : "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50"
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      "size-4 shrink-0",
                      item.type === "unclosed_yesterday"
                        ? "text-red-600 dark:text-red-400"
                        : "text-amber-600 dark:text-amber-400"
                    )}
                  />
                  <p
                    className={cn(
                      "text-sm font-medium flex-1",
                      item.type === "unclosed_yesterday"
                        ? "text-red-800 dark:text-red-300"
                        : "text-amber-800 dark:text-amber-300"
                    )}
                  >
                    {item.message}
                  </p>
                  {item.type === "unclosed_yesterday" && item.eventId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 text-[11px] h-7 px-2.5 border-red-200 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/50"
                      disabled={closeEventMutation.isPending}
                      onClick={() => closeEventMutation.mutate(item.eventId!)}
                    >
                      {closeEventMutation.isPending ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        "Close"
                      )}
                    </Button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ==================== NEXT ACTION CARD ==================== */}
        {nextActionEvent && (
          <motion.div variants={fadeUp}>
            <Card className="overflow-hidden border-[#D4B8E3] dark:border-[#2A0C8F80]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#4B0A8F] dark:text-[#8A40B0]">
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
                    className="bg-[#4B0A8F] hover:bg-[#4B0A8F] text-white shrink-0"
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

        {/* ==================== ATTENDANCE TREND CHART (12 Days) ==================== */}
        {attendanceTrend && attendanceTrend.length > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-muted/20 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="size-4 text-[#4B0A8F]" />
                  Attendance Trend (12 Days)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2 px-4">
                <AttendanceChart
                  data={attendanceTrend.map((t) => ({
                    date: t.date,
                    present: t.present,
                    late: t.late,
                    absent: t.absent,
                  }))}
                  height={220}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ==================== GROUP PERFORMANCE GRID ==================== */}
        {groupBreakdown.length > 0 && (
          <motion.div variants={fadeUp} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Group Performance</h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-[#4B0A8F] hover:text-[#4B0A8F] dark:text-[#8A40B0]"
                onClick={() => navigateTo("park-attendance")}
              >
                View All
                <ChevronRight className="size-3.5 ml-1" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupBreakdown.map((group, i) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.35 }}
                >
                  <GroupPerformanceCard
                    group={group}
                    onClick={() => {
                      setSelectedGroup(group.id);
                      navigateTo("park-attendance");
                    }}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ==================== TOP PERFORMERS ==================== */}
        <motion.div variants={fadeUp}>
          <TopPerformersSection performers={topPerformers} />
        </motion.div>

        {/* ==================== TODAY'S EVENTS ==================== */}
        <motion.div variants={fadeUp} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Today&apos;s Events</h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-[#4B0A8F] hover:text-[#4B0A8F] dark:text-[#8A40B0]"
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
            <div className="space-y-2 max-h-96 overflow-y-auto">
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
                        : "border-[#D4B8E399] dark:border-[#2A0C8F4D]"
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
                                  : "bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0]"
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
                              className="bg-[#4B0A8F] hover:bg-[#4B0A8F] text-white"
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

        {/* ==================== OFFLINE QUEUE PANEL ==================== */}
        <motion.div variants={fadeUp}>
          <OfflineQueuePanel />
        </motion.div>
      </motion.div>
    </>
  );
}