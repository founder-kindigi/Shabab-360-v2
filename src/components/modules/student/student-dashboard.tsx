"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { DataCard } from "@/components/layout/data-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/empty-state";
import { formatPKT, toPKT } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  Users,
  CalendarCheck,
  MapPin,
  TreePine,
  CalendarX,
  Flame,
  Trophy,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  AlertTriangle,
  CalendarDays,
  Megaphone,
  Wallet,
  User,
  Clock,
  Timer,
} from "lucide-react";
import { HeatmapCalendar } from "@/components/shared/heatmap-calendar";

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
  status: "Open" | "Closed" | null;
  myStatus: string | null;
  participantCount: number;
  markedCount: number;
  progress: number;
  groupName: string;
};

type RecentRecord = {
  date: string;
  dateKey: string;
  status: string;
  eventTitle: string;
  groupName: string;
};

type HeatmapDay = {
  day: number;
  dayOfWeek: number;
  status: string | null;
};

type DashboardData = {
  participant: {
    id: string;
    name: string;
    group: string;
    batch: string;
    park: string;
    city: string | null;
    state: string;
    joinedAt: string;
  } | null;
  metrics: {
    totalEvents30: number;
    totalEvents7: number;
    present30: number;
    absent30: number;
    late30: number;
    excused30: number;
    rate30: number;
    rate7: number;
  };
  todayEvent: TodayEvent | null;
  recentRecords: RecentRecord[];
  streak: { current: number; longest: number };
  dailyTrend: DailyTrend[];
  todayDate: string;
  feeSummary?: {
    totalExpected: number;
    totalPaid: number;
    outstanding: number;
    nextDueDate: string | null;
  };
  heatmapData: HeatmapDay[];
  upcomingEvent: {
    id: string;
    title: string;
    eventDate: string;
    eventDateFormatted: string;
  } | null;
};

// ─── Animation Config ────────────────────────────────────────────────

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
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

function statusBadge(status: string | null) {
  if (!status) return null;
  switch (status) {
    case "present":
      return (
        <Badge className="bg-[#4B0A8F] text-white border-0 text-[10px] font-bold px-2 py-0.5">
          P
        </Badge>
      );
    case "absent":
      return (
        <Badge className="bg-red-500/10 text-red-600 border-0 text-[10px] font-bold px-2 py-0.5 dark:text-red-400">
          A
        </Badge>
      );
    case "late":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-0 text-[10px] font-bold px-2 py-0.5 dark:text-amber-400">
          L
        </Badge>
      );
    case "excused":
      return (
        <Badge className="bg-sky-500/10 text-sky-600 border-0 text-[10px] font-bold px-2 py-0.5 dark:text-sky-400">
          E
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
          {status}
        </Badge>
      );
  }
}

function statusBadgeWide(status: string | null) {
  if (!status) return null;
  switch (status) {
    case "present":
      return (
        <Badge className="bg-[#4B0A8F] text-white border-0 text-xs font-semibold px-2.5 py-1">
          Present
        </Badge>
      );
    case "absent":
      return (
        <Badge className="bg-red-500/10 text-red-600 border-0 text-xs font-semibold px-2.5 py-1 dark:text-red-400">
          Absent
        </Badge>
      );
    case "late":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-0 text-xs font-semibold px-2.5 py-1 dark:text-amber-400">
          Late
        </Badge>
      );
    case "excused":
      return (
        <Badge className="bg-sky-500/10 text-sky-600 border-0 text-xs font-semibold px-2.5 py-1 dark:text-sky-400">
          Excused
        </Badge>
      );
    default:
      return null;
  }
}

function getTimeUntil(targetDate: string): string {
  const now = new Date();
  const target = new Date(targetDate);
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return "Today";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${minutes}m`;
}

// ─── Component ───────────────────────────────────────────────────────

export function StudentDashboard() {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();
  const userName = session?.user?.name || "Student";

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["student-dashboard"],
    queryFn: () =>
      fetch("/api/student/dashboard").then((r) => {
        if (!r.ok) throw new Error("Failed to load dashboard");
        return r.json();
      }),
    staleTime: 30000,
  });

  // ─── Loading Skeleton ───────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    );
  }

  // ─── No participant found ──────────────────────────────────────
  if (data && data.participant === null) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={GraduationCap}
          title="No profile found"
          description="Your participant profile could not be found. Please contact your admin."
        />
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────
  if (error || !data || !data.participant) {
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

  const { participant, metrics, todayEvent, recentRecords, streak, dailyTrend, todayDate } =
    data;

  const hasTrendData = dailyTrend.some((d) => d.hasEvent);

  // Convert heatmapData to Record<string, string> for HeatmapCalendar
  const heatmapMap: Record<string, string> = {};
  const pktNow = toPKT(new Date());
  const currentYear = pktNow.getFullYear();
  const currentMonth = pktNow.getMonth();
  for (const day of data.heatmapData) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`;
    heatmapMap[dateStr] = day.status ?? "";
  }

  return (
    <motion.div
      data-tour="dashboard"
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ─── 1. Greeting Banner ─────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#2A0C8F] via-[#A0006B] to-[#FF0015] px-5 py-5 text-white shadow-lg">
          <div className="absolute -top-8 -right-8 size-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -right-6 size-20 rounded-full bg-white/5" />
          <div className="absolute top-1/2 -right-12 size-24 rounded-full bg-white/5" />

          <div className="relative">
            <p className="text-white/80 text-sm font-medium">
              Assalamu Alaikum,
            </p>
            <h1 className="text-2xl font-bold mt-1">{participant.name}</h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-white/80 text-sm">
              <span className="flex items-center gap-1.5">
                <Users className="size-3.5" />
                {participant.group}
              </span>
              <span>{participant.batch}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-white/50 text-xs">
              <span className="flex items-center gap-1.5">
                <TreePine className="size-3" />
                {participant.park}
              </span>
              {participant.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3" />
                  {participant.city}
                </span>
              )}
            </div>
            <p className="text-white/40 text-xs mt-2">{todayDate}</p>
          </div>
        </div>
      </motion.div>

      {/* ─── 2. Profile Card ────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <Card className="overflow-hidden border-[#D4B8E3] dark:border-[#2A0C8F99]">
          <div className="border-l-4 border-[#4B0A8F] dark:border-[#8A40B0]" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-[#F3ECF6] dark:bg-[#1F086080] p-3 shrink-0">
                <GraduationCap className="size-6 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-base font-semibold">{participant.name}</p>
                  <Badge
                    variant="outline"
                    className="text-[#4B0A8F] border-[#D4B8E3] bg-[#F3ECF6] dark:text-[#8A40B0] dark:border-[#2A0C8F] dark:bg-[#1F086080] capitalize text-[10px]"
                  >
                    {participant.state || "active"}
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="size-3.5 shrink-0" />
                    <span>
                      Group: <span className="text-foreground font-medium">{participant.group}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarCheck className="size-3.5 shrink-0" />
                    <span>
                      Batch: <span className="text-foreground font-medium">{participant.batch}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TreePine className="size-3.5 shrink-0" />
                    <span>
                      Park: <span className="text-foreground font-medium">{participant.park}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    <span>
                      City: <span className="text-foreground font-medium">{participant.city || "N/A"}</span>
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground/70 mt-2">
                  Member since {formatPKT(new Date(participant.joinedAt), "dd MMM yyyy")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── 3. Today's Session Card ────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <Card className="overflow-hidden border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Today&apos;s Session</h3>
              {todayEvent && (
                <Badge
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5",
                    todayEvent.status === "Open"
                      ? "bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0]"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {todayEvent.status}
                </Badge>
              )}
            </div>

            {todayEvent ? (
              <>
                <p className="text-sm font-medium">{todayEvent.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="size-3" />
                  <span>{todayEvent.groupName}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Your status:</span>
                  {todayEvent.myStatus ? (
                    statusBadgeWide(todayEvent.myStatus)
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      Not yet marked
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-muted-foreground">
                      {todayEvent.markedCount}/{todayEvent.participantCount} marked
                    </span>
                    <span className={cn("font-semibold", rateColor(todayEvent.progress))}>
                      {todayEvent.progress}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        progressColor(todayEvent.progress)
                      )}
                      style={{ width: `${todayEvent.progress}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 py-2">
                <div className="flex items-center justify-center size-10 rounded-full bg-muted">
                  <CalendarX className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    No session today
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    There is no attendance event scheduled for today
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── 4. Attendance Metrics (3 cards) ───────────────────── */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-3 gap-3 md:gap-4"
      >
        {/* 30-Day Rate */}
        <DataCard
          title="30-Day Rate"
          value={metrics.totalEvents30 > 0 ? `${metrics.rate30}%` : "—"}
          icon={TrendingUp}
          variant="brand"
          trend={metrics.rate7 !== 0 ? (metrics.rate30 >= metrics.rate7 ? "up" : "down") : undefined}
          trendValue={metrics.rate7 !== 0 ? `vs 7-day` : undefined}
        />

        {/* Current Streak */}
        <DataCard
          title="Current Streak"
          value={streak.current > 0 ? streak.current : "—"}
          icon={Flame}
          variant="amber"
        />

        {/* Best Streak */}
        <DataCard
          title="Best Streak"
          value={streak.longest > 0 ? streak.longest : "—"}
          icon={Trophy}
          variant="violet"
        />
      </motion.div>

      {/* ─── 3. Attendance Heatmap Calendar ────────────────────── */}
      <motion.div variants={fadeUp}>
        <Card className="overflow-hidden border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Attendance History</h3>
              <Badge variant="outline" className="text-[10px] font-normal">
                {formatPKT(new Date(), "MMMM yyyy")}
              </Badge>
            </div>

            <HeatmapCalendar data={heatmapMap} months={6} />
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── 4. Fee Status Card ────────────────────────────────── */}
      {data.feeSummary && (data.feeSummary.totalExpected > 0 || data.feeSummary.outstanding > 0) && (
        <motion.div variants={fadeUp}>
          <Card
            className="overflow-hidden border-border cursor-pointer hover:border-[#D4B8E3] dark:hover:border-[#2A0C8F99] transition-colors"
            onClick={() => navigateTo("student-fees")}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Wallet className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
                <h3 className="text-sm font-semibold">Fee Status</h3>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Total
                  </p>
                  <p className="text-sm font-bold tabular-nums">
                    Rs {data.feeSummary.totalExpected.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Paid
                  </p>
                  <p className="text-sm font-bold tabular-nums text-[#4B0A8F] dark:text-[#8A40B0]">
                    Rs {data.feeSummary.totalPaid.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Remaining
                  </p>
                  <p className={cn(
                    "text-sm font-bold tabular-nums",
                    data.feeSummary.outstanding > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-[#4B0A8F] dark:text-[#8A40B0]"
                  )}>
                    Rs {data.feeSummary.outstanding.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Fee progress bar */}
              {data.feeSummary.totalExpected > 0 && (
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-1.5">
                    <span className="text-muted-foreground">
                      {data.feeSummary.totalExpected > 0
                        ? `${Math.round((data.feeSummary.totalPaid / data.feeSummary.totalExpected) * 100)}% paid`
                        : ""}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        data.feeSummary.outstanding === 0
                          ? "bg-[#4B0A8F]"
                          : data.feeSummary.totalPaid / data.feeSummary.totalExpected >= 0.5
                            ? "bg-amber-500"
                            : "bg-red-500"
                      )}
                      style={{
                        width: `${data.feeSummary.totalExpected > 0
                          ? Math.round((data.feeSummary.totalPaid / data.feeSummary.totalExpected) * 100)
                          : 0}%`
                      }}
                    />
                  </div>
                </div>
              )}

              {data.feeSummary.nextDueDate && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <Clock className="size-3" />
                  <span>Next due: {data.feeSummary.nextDueDate}</span>
                </div>
              )}

              {data.feeSummary.outstanding === 0 && data.feeSummary.totalExpected > 0 && (
                <p className="text-xs text-[#4B0A8F] dark:text-[#8A40B0] font-medium">
                  ✅ All fees paid!
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── 5. Upcoming Event with Countdown ───────────────────── */}
      {data.upcomingEvent && (
        <motion.div variants={fadeUp}>
          <Card className="overflow-hidden border-[#D4B8E3] dark:border-[#2A0C8F99]">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex items-center justify-center size-12 rounded-xl bg-[#F3ECF6] dark:bg-[#1F086080] shrink-0">
                <Timer className="size-6 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-[#4B0A8F] dark:text-[#8A40B0] font-semibold">
                  Next Event
                </p>
                <p className="text-sm font-bold truncate">{data.upcomingEvent.title}</p>
                <p className="text-xs text-muted-foreground">{data.upcomingEvent.eventDateFormatted}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-[#4B0A8F] dark:text-[#8A40B0] tabular-nums">
                  {getTimeUntil(data.upcomingEvent.eventDate)}
                </p>
                <p className="text-[10px] text-muted-foreground">remaining</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── 6. Today's Session Card ────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <Card className="overflow-hidden border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Today&apos;s Session</h3>
              {todayEvent && (
                <Badge
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5",
                    todayEvent.status === "Open"
                      ? "bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0]"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {todayEvent.status}
                </Badge>
              )}
            </div>

            {todayEvent ? (
              <>
                <p className="text-sm font-medium">{todayEvent.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="size-3" />
                  <span>{todayEvent.groupName}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Your status:</span>
                  {todayEvent.myStatus ? (
                    statusBadgeWide(todayEvent.myStatus)
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      Not yet marked
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-muted-foreground">
                      {todayEvent.markedCount}/{todayEvent.participantCount} marked
                    </span>
                    <span className={cn("font-semibold", rateColor(todayEvent.progress))}>
                      {todayEvent.progress}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        progressColor(todayEvent.progress)
                      )}
                      style={{ width: `${todayEvent.progress}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 py-2">
                <div className="flex items-center justify-center size-10 rounded-full bg-muted">
                  <CalendarX className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    No session today
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    There is no attendance event scheduled for today
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── 7. Weekly Trend ──────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <Card className="overflow-hidden border-border">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Weekly Trend</h3>
              <Badge variant="outline" className="text-[10px] font-normal">
                Last 7 days
              </Badge>
            </div>

            {!hasTrendData ? (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                No attendance data this week
              </div>
            ) : (
              <div className="flex items-end justify-between gap-1.5 sm:gap-3 h-32 sm:h-40">
                {dailyTrend.map((day, i) => (
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
                      <div
                        className="w-full rounded-t-sm bg-muted/50 relative overflow-hidden"
                        style={{ height: "100%" }}
                      >
                        {day.hasEvent && (
                          <motion.div
                            className={cn(
                              "absolute bottom-0 left-0 right-0 rounded-t-sm",
                              rateBarColor(day.rate)
                            )}
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(day.rate, 4)}%` }}
                            transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                          />
                        )}
                      </div>
                    </div>

                    <span
                      className={cn(
                        "text-[10px] sm:text-xs font-medium",
                        i === dailyTrend.length - 1
                          ? "text-[#4B0A8F] dark:text-[#8A40B0] font-bold"
                          : "text-muted-foreground"
                      )}
                    >
                      {day.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── 8. Recent Attendance ───────────────────────────────── */}
      <motion.div variants={fadeUp} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent Attendance</h3>
          <Badge variant="outline" className="text-[10px] font-normal">
            Last {recentRecords.length}
          </Badge>
        </div>

        {recentRecords.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <CalendarCheck className="size-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No attendance records yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {recentRecords.map((record, i) => (
                  <motion.div
                    key={`${record.dateKey}-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      i < recentRecords.length - 1 && "border-b border-border/50"
                    )}
                  >
                    <div className="w-20 sm:w-24 shrink-0">
                      <p className="text-xs font-medium text-foreground">
                        {record.date}
                      </p>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {record.eventTitle}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {record.groupName}
                      </p>
                    </div>

                    <div className="shrink-0">{statusBadge(record.status)}</div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {recentRecords.length > 0 && (
          <Button
            variant="ghost"
            className="w-full text-xs text-[#4B0A8F] hover:text-[#4B0A8F] dark:text-[#8A40B0] dark:hover:text-[#8A40B0] h-9"
            onClick={() => navigateTo("student-history")}
          >
            View Full History
            <ChevronRight className="size-3.5 ml-1" />
          </Button>
        )}
      </motion.div>

      {/* ─── 9. Quick Actions ───────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-12 justify-start gap-3 px-4 text-sm font-medium hover:border-[#D4B8E3] hover:bg-[#F3ECF6] dark:hover:border-[#2A0C8F99] dark:hover:bg-[#1F08604D]"
            onClick={() => navigateTo("student-fees")}
          >
            <Wallet className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
            View Fees
          </Button>
          <Button
            variant="outline"
            className="h-12 justify-start gap-3 px-4 text-sm font-medium hover:border-[#D4B8E3] hover:bg-[#F3ECF6] dark:hover:border-[#2A0C8F99] dark:hover:bg-[#1F08604D]"
            onClick={() => navigateTo("student-schedule")}
          >
            <CalendarDays className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
            View Schedule
          </Button>
          <Button
            variant="outline"
            className="h-12 justify-start gap-3 px-4 text-sm font-medium hover:border-[#D4B8E3] hover:bg-[#F3ECF6] dark:hover:border-[#2A0C8F99] dark:hover:bg-[#1F08604D]"
            onClick={() => navigateTo("student-profile")}
          >
            <User className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
            My Profile
          </Button>
          <Button
            variant="outline"
            className="h-12 justify-start gap-3 px-4 text-sm font-medium hover:border-[#D4B8E3] hover:bg-[#F3ECF6] dark:hover:border-[#2A0C8F99] dark:hover:bg-[#1F08604D]"
            onClick={() => navigateTo("student-announcements")}
          >
            <Megaphone className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
            Announcements
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}