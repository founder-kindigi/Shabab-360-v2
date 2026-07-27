"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { motion, type Variants } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  CalendarCheck,
  CalendarX,
  Flame,
  TrendingUp,
  Wallet,
  Clock,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

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

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// ─── Helper Functions ────────────────────────────────────────────────

function statusBadgeWide(status: string | null) {
  if (!status) return null;
  switch (status) {
    case "present":
      return (
        <Badge className="bg-emerald-500 text-white border-0 text-xs font-semibold px-2.5 py-1">
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

function rateColor(rate: number) {
  if (rate >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (rate >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function progressColor(pct: number) {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}

// ─── Component ───────────────────────────────────────────────────────

export function MobileStudentDashboard() {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["student-dashboard"],
    queryFn: () =>
      fetch("/api/student/dashboard").then((r) => {
        if (!r.ok) throw new Error("Failed to load dashboard");
        return r.json();
      }),
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-40 rounded-2xl" />
        <div className="h-6" />
      </div>
    );
  }

  if (error || !data || !data.participant) {
    return (
      <div className="p-4 space-y-4">
        <Card className="rounded-2xl border-red-200 dark:border-red-800/50 bg-card">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="size-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Could not load dashboard
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { participant, metrics, todayEvent, feeSummary, streak } = data;
  const initials = participant.name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border/50">
        <h1 className="text-lg font-bold">Dashboard</h1>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          
          {/* Welcome Card */}
          <motion.div variants={fadeUp}>
            <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#4B0A8F] to-[#2A0C8F] text-white overflow-hidden relative shadow-md">
              <div className="absolute -top-12 -right-12 size-32 rounded-full bg-white/10" />
              <div className="absolute -bottom-6 -right-6 size-20 rounded-full bg-white/5" />
              <CardContent className="p-5 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold border-2 border-white/40 shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white/80 text-xs font-medium">Assalamu Alaikum,</p>
                    <h2 className="text-lg font-bold truncate">{participant.name}</h2>
                    <div className="flex items-center gap-2 mt-1 text-xs text-white/90">
                      <Badge className="bg-white/20 text-white border-0 px-2 py-0.5 rounded-full text-[10px]">
                        {participant.batch}
                      </Badge>
                      <span className="truncate">{participant.group}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Today's Event */}
          <motion.div variants={fadeUp}>
            <Card className="rounded-2xl border bg-card overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <CalendarCheck className="size-4 text-[#4B0A8F]" />
                    Today&apos;s Session
                  </h3>
                  {todayEvent && (
                    <Badge className={cn("text-[10px]", todayEvent.status === "Open" ? "bg-[#4B0A8F]/10 text-[#4B0A8F]" : "bg-muted text-muted-foreground")}>
                      {todayEvent.status}
                    </Badge>
                  )}
                </div>

                {todayEvent ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{todayEvent.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Your status:</span>
                      {todayEvent.myStatus ? (
                        statusBadgeWide(todayEvent.myStatus)
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Not marked</span>
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">{todayEvent.markedCount}/{todayEvent.participantCount} marked</span>
                        <span className={cn("font-bold", rateColor(todayEvent.progress))}>{todayEvent.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div className={cn("h-full rounded-full", progressColor(todayEvent.progress))} style={{ width: `${todayEvent.progress}%` }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-1">
                    <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                      <CalendarX className="size-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">No session today</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Fee Status Card */}
          {feeSummary && (feeSummary.totalExpected > 0 || feeSummary.outstanding > 0) && (
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl border bg-card overflow-hidden" onClick={() => navigateTo("student-fees")}>
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Wallet className="size-4 text-[#4B0A8F]" />
                      Fee Status
                    </h3>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Due Amount</p>
                      <p className={cn("text-lg font-bold tabular-nums", feeSummary.outstanding > 0 ? "text-red-600" : "text-emerald-600")}>
                        Rs {feeSummary.outstanding.toLocaleString()}
                      </p>
                    </div>
                    {feeSummary.outstanding === 0 ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-0">All Paid</Badge>
                    ) : feeSummary.nextDueDate ? (
                      <div className="text-xs text-red-600 flex items-center gap-1">
                        <Clock className="size-3" />
                        Due: {feeSummary.nextDueDate}
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Quick Stats Grid */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
            <Card className="rounded-2xl border bg-card">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center h-24">
                <div className="size-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                  <TrendingUp className="size-4" />
                </div>
                <p className="text-lg font-bold">{metrics.totalEvents30 > 0 ? `${metrics.rate30}%` : "—"}</p>
                <p className="text-[10px] text-muted-foreground">30-Day Attendance</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border bg-card">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center h-24">
                <div className="size-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-1">
                  <Flame className="size-4" />
                </div>
                <p className="text-lg font-bold">{streak.current > 0 ? streak.current : "—"}</p>
                <p className="text-[10px] text-muted-foreground">Current Streak</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Bottom spacer */}
          <div className="h-6" />
        </motion.div>
      </div>
    </div>
  );
}
