"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { motion, type Variants } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { DataCard } from "@/components/layout/data-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/shared/sparkline";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
  CalendarCheck,
  MapPin,
  TreePine,
  CalendarClock,
  ClipboardList,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────

type DailyTrend = {
  date: string;
  label: string;
  rate: number;
  hasEvent: boolean;
};

type TodayEvent = {
  id: string;
  title: string;
  isClosed: boolean;
  participantCount: number;
  markedCount: number;
  progress: number;
  counts: { present: number; absent: number; late: number; excused: number };
};

type Absentee = {
  id: string;
  name: string;
  count: number;
};

type UpcomingEvent = {
  id: string;
  title: string;
  eventDate: string;
  eventDateRaw: string;
};

type DashboardData = {
  groupName: string;
  batchName: string;
  parkName: string;
  cityName: string;
  todayDate: string;
  totalParticipants: number;
  todayEvent: TodayEvent | null;
  todayRate: number;
  dailyTrend: DailyTrend[];
  sparklineData: number[];
  thisWeekRate: number;
  lastWeekRate: number;
  topAbsentees: Absentee[];
  upcomingEvents: UpcomingEvent[];
  attendanceSummary: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
  };
};

// ─── Animation Config ────────────────────────────────────────────────

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// ─── Helper Functions ────────────────────────────────────────────────

function rateColor(rate: number) {
  if (rate >= 80) return "text-[#4B0A8F] dark:text-[#8A40B0]";
  if (rate >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function rateBarColor(rate: number) {
  if (rate >= 80) return "bg-[#4B0A8F]";
  if (rate >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function progressColor(pct: number) {
  if (pct >= 80) return "bg-[#4B0A8F]";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}

// ─── Component ───────────────────────────────────────────────────────

export function MurabbiDashboard() {
  const { data: session } = useSession();
  const { navigateTo, setSelectedEventId } = useAppStore();
  const user = session?.user as { name?: string } | undefined;

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["murabbi-dashboard"],
    queryFn: () =>
      fetch("/api/murabbi/dashboard").then((r) => {
        if (!r.ok) throw new Error("Failed to load dashboard");
        return r.json();
      }),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  // ─── Loading Skeleton ───────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────
  if (error || !data) {
    return (
      <Card className="border-red-200 dark:border-red-800/50">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="size-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Could not load dashboard
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Please check your connection and try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const weekDiff = data.thisWeekRate - data.lastWeekRate;
  const hasOpenEvent =
    data.todayEvent && !data.todayEvent.isClosed && data.todayEvent.progress < 100;

  // Average attendance rate from sparkline (non-zero values)
  const validRates = data.sparklineData.filter((r) => r > 0);
  const avgRate = validRates.length > 0
    ? Math.round(validRates.reduce((s, r) => s + r, 0) / validRates.length)
    : 0;

  const handleMarkAttendance = () => {
    if (data.todayEvent) {
      setSelectedEventId(data.todayEvent.id);
      navigateTo("park-attendance");
    }
  };

  return (
    <motion.div
      data-tour="dashboard"
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ─── 1. Gradient Greeting Banner ─────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#2A0C8F] via-[#A0006B] to-[#FF0015] px-5 py-5 text-white shadow-lg">
          <div className="absolute -top-8 -right-8 size-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -right-6 size-20 rounded-full bg-white/5" />
          <div className="absolute top-1/2 -right-12 size-24 rounded-full bg-white/5" />

          <div className="relative">
            <p className="text-white/80 text-sm font-medium">
              Assalamu Alaikum,
            </p>
            <h1 className="text-2xl font-bold mt-1">{user?.name || "Murabbi"}</h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-white/80 text-sm">
              <span className="flex items-center gap-1.5">
                <Users className="size-3.5" />
                {data.groupName}
              </span>
              <span>{data.batchName}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-white/50 text-xs">
              <span className="flex items-center gap-1.5">
                <TreePine className="size-3" />
                {data.parkName}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3" />
                {data.cityName}
              </span>
            </div>
            <p className="text-white/40 text-xs mt-2">{data.todayDate}</p>
          </div>
        </div>
      </motion.div>

      {/* ─── 2. My Group Overview Cards ──────────────────────────── */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-center size-9 rounded-lg bg-sky-100 dark:bg-sky-950/60">
              <Users className="size-4.5 text-sky-600 dark:text-sky-400" />
            </div>
            <p className="text-2xl font-bold mt-3">{data.totalParticipants}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Shabab</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center size-9 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086099]">
                <TrendingUp className="size-4.5 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>
              {data.sparklineData.filter((r) => r > 0).length >= 2 && (
                <Sparkline
                  data={data.sparklineData}
                  width={60}
                  height={24}
                  color="#4B0A8F"
                />
              )}
            </div>
            <p className={cn("text-2xl font-bold mt-3", rateColor(avgRate))}>
              {avgRate > 0 ? `${avgRate}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Avg Attendance</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-center size-9 rounded-lg bg-violet-100 dark:bg-violet-950/60">
              <TrendingUp className="size-4 text-violet-600 dark:text-violet-400" />
            </div>
            {weekDiff !== 0 && (
              <div
                className={cn(
                  "absolute top-2 right-2 flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                  weekDiff > 0
                    ? "bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0]"
                    : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                )}
              >
                {weekDiff > 0 ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {weekDiff > 0 ? "+" : ""}
                {weekDiff}%
              </div>
            )}
            <p className="text-2xl font-bold mt-3">{data.thisWeekRate}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">This Week</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── 3. Today's Session Quick Action ─────────────────────── */}
      <motion.div variants={fadeUp}>
        <Card
          className={cn(
            "overflow-hidden transition-shadow",
            hasOpenEvent
              ? "border-[#D4B8E3] dark:border-[#2A0C8F99] shadow-[#4B0A8F1A] dark:shadow-[#4B0A8F33]"
              : "border-border"
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#4B0A8F] dark:text-[#8A40B0]">
                  {data.todayEvent
                    ? data.todayEvent.isClosed
                      ? "Session Completed"
                      : "Today's Session"
                    : "No Session Today"}
                </p>
                <p className="text-sm font-bold mt-1 truncate">
                  {data.todayEvent
                    ? data.todayEvent.title
                    : "No attendance event scheduled"}
                </p>
                {data.todayEvent && !data.todayEvent.isClosed && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {data.todayEvent.markedCount}/{data.todayEvent.participantCount} marked &middot;{" "}
                    {data.todayEvent.progress}%
                  </p>
                )}
              </div>

              {data.todayEvent && !data.todayEvent.isClosed ? (
                <Button
                  onClick={handleMarkAttendance}
                  className="shrink-0 bg-gradient-to-r from-[#2A0C8F] via-[#A0006B] to-[#FF0015] hover:from-[#2A0C8F] hover:to-[#FF0015] text-white font-semibold h-11 px-5 text-sm shadow-md relative"
                >
                  {hasOpenEvent && (
                    <motion.span
                      className="absolute inline-flex size-2.5 rounded-full bg-white opacity-75"
                      animate={{ scale: [1, 1.4, 1], opacity: [0.75, 0.3, 0.75] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      style={{ top: 6, right: 6 }}
                    />
                  )}
                  <CheckCircle2 className="size-4 mr-2" />
                  Mark Attendance
                </Button>
              ) : data.todayEvent?.isClosed ? (
                <Badge
                  variant="secondary"
                  className="shrink-0 bg-muted text-muted-foreground text-xs py-1.5 px-3"
                >
                  Closed
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="shrink-0 bg-muted text-muted-foreground text-xs py-1.5 px-3"
                >
                  <CalendarCheck className="size-3 mr-1.5" />
                  No session
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── 3. Four Metric Cards ────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
      >
        {/* Total Shabab */}
        <DataCard
          title="Total Shabab"
          value={data.totalParticipants}
          icon={Users}
          variant="sky"
        />

        {/* Today's Rate */}
        <DataCard
          title="Today's Rate"
          value={data.todayEvent ? `${data.todayRate}%` : "—"}
          icon={TrendingUp}
          variant="brand"
        />

        {/* This Week Rate */}
        <DataCard
          title="This Week"
          value={`${data.thisWeekRate}%`}
          icon={TrendingUp}
          variant="violet"
          trend={weekDiff > 0 ? "up" : weekDiff < 0 ? "down" : undefined}
          trendValue={weekDiff !== 0 ? `${weekDiff > 0 ? "+" : ""}${weekDiff}%` : undefined}
        />

        {/* Last Week Rate */}
        <DataCard
          title="Last Week"
          value={`${data.lastWeekRate}%`}
          icon={Clock}
          variant="amber"
        />
      </motion.div>

      {/* ─── 4. Today's Session Card ─────────────────────────────── */}
      {data.todayEvent && (
        <motion.div variants={fadeUp}>
          <Card className="overflow-hidden border-border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Today&apos;s Attendance</h3>
                <Badge
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5",
                    rateColor(data.todayRate)
                  )}
                >
                  {data.todayRate}% rate
                </Badge>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <StatusPill
                  icon={CheckCircle2}
                  label="Present"
                  count={data.attendanceSummary.present}
                  colorClass="text-[#4B0A8F] dark:text-[#8A40B0] bg-[#F3ECF6] dark:bg-[#1F086066]"
                />
                <StatusPill
                  icon={XCircle}
                  label="Absent"
                  count={data.attendanceSummary.absent}
                  colorClass="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40"
                />
                <StatusPill
                  icon={Clock}
                  label="Late"
                  count={data.attendanceSummary.late}
                  colorClass="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
                />
                <StatusPill
                  icon={ShieldCheck}
                  label="Excused"
                  count={data.attendanceSummary.excused}
                  colorClass="text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40"
                />
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">
                    {data.todayEvent.markedCount}/{data.todayEvent.participantCount} marked
                  </span>
                  <span className={cn("font-semibold", rateColor(data.todayEvent.progress))}>
                    {data.todayEvent.progress}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      progressColor(data.todayEvent.progress)
                    )}
                    style={{ width: `${data.todayEvent.progress}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── 5. Weekly Trend with Sparkline ────────────────────────── */}
      <motion.div variants={fadeUp}>
        <Card className="overflow-hidden border-border">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">7-Day Trend</h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-normal">
                  {data.lastWeekRate}% last week
                </Badge>
                {data.sparklineData.filter((r) => r > 0).length >= 2 && (
                  <Sparkline
                    data={data.sparklineData}
                    width={80}
                    height={28}
                    color="#4B0A8F"
                  />
                )}
              </div>
            </div>

            <div className="flex items-end justify-between gap-1.5 sm:gap-3 h-32 sm:h-40">
              {data.dailyTrend.map((day, i) => (
                <div
                  key={day.date}
                  className="flex flex-col items-center gap-1.5 flex-1"
                >
                  <span
                    className={cn(
                      "text-[10px] sm:text-xs font-semibold tabular-nums",
                      day.hasEvent ? rateColor(day.rate) : "text-muted-foreground/40"
                    )}
                  >
                    {day.hasEvent ? `${day.rate}%` : "—"}
                  </span>

                  <div className="w-full flex-1 flex items-end">
                    <div className="w-full rounded-t-sm bg-muted/50 relative overflow-hidden" style={{ height: "100%" }}>
                      {day.hasEvent && (
                        <motion.div
                          className={cn(
                            "absolute bottom-0 left-0 right-0 rounded-t-sm",
                            rateBarColor(day.rate)
                          )}
                          initial={{ height: 0 }}
                          animate={{ height: `${day.rate}%` }}
                          transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                        />
                      )}
                    </div>
                  </div>

                  <span
                    className={cn(
                      "text-[10px] sm:text-xs font-medium",
                      i === data.dailyTrend.length - 1
                        ? "text-[#4B0A8F] dark:text-[#8A40B0] font-bold"
                        : "text-muted-foreground"
                    )}
                  >
                    {day.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── 6. Upcoming Events ──────────────────────────────────── */}
      <motion.div variants={fadeUp} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Upcoming Events</h3>
          <Badge variant="outline" className="text-[10px] font-normal">
            Next {data.upcomingEvents.length}
          </Badge>
        </div>

        {data.upcomingEvents.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <CalendarClock className="size-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No upcoming events scheduled
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {data.upcomingEvents.map((evt, i) => (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <Card className="border-border overflow-hidden">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex items-center justify-center size-10 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086080] shrink-0">
                      <CalendarCheck className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{evt.title}</p>
                      <p className="text-[10px] text-muted-foreground">{evt.eventDate}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ─── 7. Quick Actions ─────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="space-y-3">
        <h3 className="text-sm font-semibold">Quick Actions</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <Card
            className="cursor-pointer overflow-hidden border-border hover:border-[#D4B8E3] dark:hover:border-[#2A0C8F99] transition-colors"
            onClick={handleMarkAttendance}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086099] shrink-0">
                <ClipboardList className="size-4.5 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Mark Attendance</p>
                <p className="text-[10px] text-muted-foreground">
                  {hasOpenEvent ? "Session is open" : "No open session"}
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer overflow-hidden border-border hover:border-[#D4B8E3] dark:hover:border-[#2A0C8F99] transition-colors"
            onClick={() => navigateTo("murabbi-groups")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086099] shrink-0">
                <Eye className="size-4.5 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">View Groups</p>
                <p className="text-[10px] text-muted-foreground">
                  {data.totalParticipants} shabab in group
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ─── 8. Needs Attention ──────────────────────────────────── */}
      {data.topAbsentees.length > 0 && (
        <motion.div variants={fadeUp} className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Needs Attention</h3>
            <Badge
              variant="secondary"
              className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
            >
              {data.topAbsentees.length} shabab
            </Badge>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {data.topAbsentees.map((person, i) => (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <Card
                  className={cn(
                    "border-l-4 overflow-hidden",
                    person.count >= 4
                      ? "border-l-red-500"
                      : "border-l-amber-500"
                  )}
                >
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-3">
                      <div
                        className={cn(
                          "flex items-center justify-center size-9 rounded-full text-xs font-bold shrink-0",
                          person.count >= 4
                            ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                        )}
                      >
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{person.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {person.count} absence{person.count > 1 ? "s" : ""} in 7 days
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        "shrink-0 text-[10px] font-bold px-2 py-0.5",
                        person.count >= 4
                          ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                      )}
                    >
                      {person.count}x
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Status Pill Sub-component ──────────────────────────────────────

function StatusPill({
  icon: Icon,
  label,
  count,
  colorClass,
}: {
  icon: typeof CheckCircle2;
  label: string;
  count: number;
  colorClass: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2.5 py-2 min-h-[44px]",
        colorClass
      )}
    >
      <Icon className="size-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-bold leading-tight">{count}</p>
        <p className="text-[10px] opacity-70 leading-tight">{label}</p>
      </div>
    </div>
  );
}
