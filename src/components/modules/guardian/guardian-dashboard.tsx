"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/stores/useAppStore";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GraduationCap,
  CalendarCheck,
  TrendingUp,
  Bell,
  ChevronRight,
  AlertTriangle,
  MapPin,
  TreePine,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────

type ChildAttendance = {
  totalEvents30: number;
  present30: number;
  absent30: number;
  late30: number;
  excused30: number;
  rate30: number;
  rate7: number;
  last5: Array<{ date: string; status: string; title: string }>;
};

type ChildData = {
  id: string;
  name: string;
  groupName: string | null;
  batchName: string | null;
  parkName: string | null;
  cityName: string | null;
  groupId: string;
  attendance: ChildAttendance;
};

type TodayEvent = {
  id: string;
  title: string;
  isClosed: boolean;
  groupName: string;
  parkName: string | null;
  markedCount: number;
  participantCount: number;
  progress: number;
};

type DashboardData = {
  guardian: { name: string; phone: string } | null;
  children: ChildData[];
  todayEvents: TodayEvent[];
  unreadAnnouncements: number;
  todayDate: string;
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

// ─── Avatar colors (no green/teal/emerald) ───────────────────────────

const avatarColors = [
  "bg-[#4B0A8F] text-white",
  "bg-[#A0006B] text-white",
  "bg-[#FF0015] text-white",
  "bg-[#2A0C8F] text-white",
  "bg-amber-600 text-white",
  "bg-rose-600 text-white",
];

// ─── Helper Functions ────────────────────────────────────────────────

function rateColor(rate: number) {
  if (rate >= 80) return "text-[#4B0A8F] dark:text-[#8A40B0]";
  if (rate >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function rateBarColor(rate: number) {
  if (rate >= 80) return "bg-[#4B0A8F] dark:bg-[#8A40B0]";
  if (rate >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "present":
      return "bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086066] dark:text-[#8A40B0]";
    case "absent":
      return "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400";
    case "late":
      return "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400";
    case "excused":
      return "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// ─── Component ───────────────────────────────────────────────────────

export function GuardianDashboard() {
  const { navigateTo, setSelectedParticipantId } = useAppStore();

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["guardian-dashboard"],
    queryFn: () =>
      fetch("/api/guardian/dashboard").then((r) => {
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
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
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

  const guardianName = data.guardian?.name || "Guardian";
  const children = data.children || [];
  const todayEvents = data.todayEvents || [];
  const unreadAnnouncements = data.unreadAnnouncements || 0;

  // Compute average 30-day rate across children
  const childrenWithEvents = children.filter(
    (c) => c.attendance.totalEvents30 > 0
  );
  const avgRate30 =
    childrenWithEvents.length > 0
      ? Math.round(
          childrenWithEvents.reduce((sum, c) => sum + c.attendance.rate30, 0) /
            childrenWithEvents.length
        )
      : 0;

  const handleViewHistory = (participantId: string) => {
    setSelectedParticipantId(participantId);
    navigateTo("guardian-history");
  };

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ─── 1. Greeting Banner ─────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#2A0C8F] via-[#A0006B] to-[#FF0015] px-5 py-5 text-white shadow-lg">
          {/* Decorative shapes */}
          <div className="absolute -top-8 -right-8 size-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -right-6 size-20 rounded-full bg-white/5" />
          <div className="absolute top-1/2 -right-12 size-24 rounded-full bg-white/5" />
          <div className="absolute -bottom-4 left-1/4 size-16 rounded-full bg-white/5" />

          <div className="relative">
            <p className="text-white/80 text-sm font-medium">
              Assalamu Alaikum,
            </p>
            <h1 className="text-2xl font-bold mt-1">{guardianName}</h1>
            <p className="text-white/40 text-xs mt-2">{data.todayDate}</p>
          </div>
        </div>
      </motion.div>

      {/* ─── 2. Summary Metric Cards (2x2 → 4 cols) ───────────── */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      >
        {/* My Children */}
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-center size-9 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086099]">
              <GraduationCap className="size-4.5 text-[#4B0A8F] dark:text-[#8A40B0]" />
            </div>
            <p className="text-2xl font-bold mt-3">{children.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              My Children
            </p>
          </CardContent>
        </Card>

        {/* Today's Sessions */}
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-center size-9 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086099]">
              <CalendarCheck className="size-4.5 text-[#4B0A8F] dark:text-[#8A40B0]" />
            </div>
            <p className="text-2xl font-bold mt-3">{todayEvents.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Today&apos;s Sessions
            </p>
          </CardContent>
        </Card>

        {/* 30-Day Avg Rate */}
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-center size-9 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086099]">
              <TrendingUp className="size-4.5 text-[#4B0A8F] dark:text-[#8A40B0]" />
            </div>
            <p
              className={cn(
                "text-2xl font-bold mt-3",
                rateColor(avgRate30)
              )}
            >
              {childrenWithEvents.length > 0 ? `${avgRate30}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              30-Day Avg Rate
            </p>
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card className="overflow-hidden cursor-pointer" onClick={() => navigateTo("guardian-announcements")}>
          <CardContent className="p-4">
            <div className="relative flex items-center justify-center size-9 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086099]">
              <Bell className="size-4.5 text-[#4B0A8F] dark:text-[#8A40B0]" />
              {unreadAnnouncements > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center size-4.5 rounded-full bg-[#FF0015] text-white text-[9px] font-bold">
                  {unreadAnnouncements > 9 ? "9+" : unreadAnnouncements}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold mt-3">{unreadAnnouncements}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Announcements</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── 3. My Children Section ─────────────────────────────── */}
      <motion.div variants={fadeUp} className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">My Children</h3>
          <Badge
            variant="secondary"
            className="text-[10px] bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086066] dark:text-[#8A40B0]"
          >
            {children.length}
          </Badge>
        </div>

        {children.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-6 text-center">
              <Users className="size-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">
                No children linked yet
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Contact your park admin to link participants.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            {children.map((child, index) => (
              <motion.div
                key={child.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <Card className="overflow-hidden border-border h-full">
                  <CardContent className="p-4 space-y-3">
                    {/* Child header */}
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex items-center justify-center size-10 rounded-full text-sm font-bold shrink-0",
                          avatarColors[index % avatarColors.length]
                        )}
                      >
                        {child.name
                          .split(" ")
                          .map((w) => w.charAt(0))
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {child.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {child.groupName || "No group"}
                          {child.batchName ? ` · ${child.batchName}` : ""}
                        </p>
                        {child.parkName && (
                          <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                            <MapPin className="size-3" />
                            {child.parkName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 30-day attendance rate */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">
                          30-day attendance
                        </span>
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            rateColor(child.attendance.rate30)
                          )}
                        >
                          {child.attendance.totalEvents30 > 0
                            ? `${child.attendance.rate30}%`
                            : "No data"}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            rateBarColor(child.attendance.rate30)
                          )}
                          style={{
                            width: `${child.attendance.rate30}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* P/A/L/E mini badges */}
                    <div className="grid grid-cols-4 gap-1.5">
                      <MiniStatusPill
                        icon={CheckCircle2}
                        count={child.attendance.present30}
                        label="P"
                        colorClass="bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086066] dark:text-[#8A40B0]"
                      />
                      <MiniStatusPill
                        icon={XCircle}
                        count={child.attendance.absent30}
                        label="A"
                        colorClass="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                      />
                      <MiniStatusPill
                        icon={Clock}
                        count={child.attendance.late30}
                        label="L"
                        colorClass="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                      />
                      <MiniStatusPill
                        icon={ShieldCheck}
                        count={child.attendance.excused30}
                        label="E"
                        colorClass="bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400"
                      />
                    </div>

                    {/* View History button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-[#4B0A8F] hover:text-[#4B0A8F] dark:text-[#8A40B0] dark:hover:text-[#8A40B0] h-9"
                      onClick={() => handleViewHistory(child.id)}
                    >
                      View History
                      <ChevronRight className="size-3.5 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ─── 4. Today's Sessions ────────────────────────────────── */}
      {todayEvents.length > 0 && (
        <motion.div variants={fadeUp} className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarCheck className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
            <h3 className="text-sm font-semibold">Today&apos;s Sessions</h3>
            <Badge
              variant="secondary"
              className="text-[10px] bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086066] dark:text-[#8A40B0]"
            >
              {todayEvents.length}
            </Badge>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {todayEvents.map((evt, i) => (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <Card className="border-border overflow-hidden">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {evt.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <TreePine className="size-3" />
                          {evt.groupName}
                          {evt.parkName ? ` · ${evt.parkName}` : ""}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "shrink-0 text-[10px] px-2 py-0.5",
                          evt.isClosed
                            ? "bg-muted text-muted-foreground"
                            : "bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086066] dark:text-[#8A40B0]"
                        )}
                      >
                        {evt.isClosed ? "Closed" : "Open"}
                      </Badge>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            rateBarColor(evt.progress)
                          )}
                          style={{ width: `${evt.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                        {evt.markedCount}/{evt.participantCount}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── 5. Quick Actions ───────────────────────────────────── */}
      <motion.div variants={fadeUp} className="space-y-3">
        <h3 className="text-sm font-semibold">Quick Actions</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <Card
            className="cursor-pointer overflow-hidden border-border hover:border-[#D4B8E3] dark:hover:border-[#2A0C8F99] transition-colors"
            onClick={() => navigateTo("guardian-announcements")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086099] shrink-0">
                <Bell className="size-4.5 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">View Announcements</p>
                <p className="text-[10px] text-muted-foreground">
                  {unreadAnnouncements > 0
                    ? `${unreadAnnouncements} unread announcement${unreadAnnouncements > 1 ? "s" : ""}`
                    : "No new announcements"}
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border opacity-60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-muted shrink-0">
                <Users className="size-4.5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Contact Admin</p>
                <p className="text-[10px] text-muted-foreground">
                  Coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Mini Status Pill Sub-component ──────────────────────────────────

function MiniStatusPill({
  icon: Icon,
  count,
  label,
  colorClass,
}: {
  icon: typeof CheckCircle2;
  count: number;
  label: string;
  colorClass: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-md px-2 py-1.5 min-h-[36px]",
        colorClass
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-bold leading-tight tabular-nums">{count}</p>
        <p className="text-[9px] opacity-70 leading-tight">{label}</p>
      </div>
    </div>
  );
}