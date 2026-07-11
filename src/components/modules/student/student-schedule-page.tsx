"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toPKT, formatPKT } from "@/lib/timezone";
import {
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  CalendarClock,
  Clock,
  MapPin,
  TreePine,
  Users,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ==================== TYPES ====================

type ScheduleEvent = {
  id: string;
  title: string;
  eventDate: string;
  dayOfWeek: number;
  dateStr: string;
  timeStr: string;
  isClosed: boolean;
  myStatus: string | null;
  markedCount: number;
  participantCount: number;
  progress: number;
};

type UpcomingEvent = {
  id: string;
  title: string;
  eventDate: string;
  dateStr: string;
  timeStr: string;
  isClosed: boolean;
};

type ScheduleData = {
  participant: { id: string; name: string } | null;
  group: {
    id: string;
    name: string;
    batchName: string;
    parkName: string;
    cityName: string | null;
  } | null;
  events: ScheduleEvent[];
  typicalDays: number[];
  upcoming: UpcomingEvent[];
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  summary: {
    totalSessions: number;
    completedSessions: number;
    myCompleted: number;
    myAbsent: number;
    remaining: number;
  };
};

// ==================== HELPERS ====================

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

function getWeekDays(weekStart: string) {
  const start = new Date(weekStart);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const pkt = toPKT(d);
    return {
      dayOfWeek: i,
      dateNum: pkt.getDate(),
      dateStr: formatPKT(pkt, "yyyy-MM-dd"),
      isToday: formatPKT(toPKT(new Date()), "yyyy-MM-dd") === formatPKT(pkt, "yyyy-MM-dd"),
    };
  });
}

function myStatusBadge(status: string | null) {
  if (!status) return null;
  const config: Record<string, { label: string; cls: string }> = {
    present: { label: "P", cls: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400" },
    absent: { label: "A", cls: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400" },
    late: { label: "L", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" },
    excused: { label: "E", cls: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400" },
  };
  const c = config[status];
  if (!c) return null;
  return (
    <Badge className={cn("text-[10px] font-bold w-6 h-6 flex items-center justify-center p-0", c.cls)}>
      {c.label}
    </Badge>
  );
}

function statusBadge(isClosed: boolean) {
  return isClosed ? (
    <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground">
      Closed
    </Badge>
  ) : (
    <Badge className="text-[10px] bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0]">
      Open
    </Badge>
  );
}

function progressColor(pct: number) {
  if (pct >= 80) return "bg-[#4B0A8F]";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}

// ==================== COMPONENT ====================

export function StudentSchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0);

  const { data, isLoading, error } = useQuery<ScheduleData>({
    queryKey: ["student-schedule", weekOffset],
    queryFn: () =>
      fetch(`/api/student/schedule?weekOffset=${weekOffset}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load schedule");
        return r.json();
      }),
    staleTime: 30000,
  });

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-52" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  // ── Error / No participant ──
  if (error || !data || !data.participant) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Could not load schedule"
        description="There was an error loading your schedule. Please try again."
      />
    );
  }

  const { group, events, typicalDays, upcoming, weekStart, weekLabel, summary } = data;
  const weekDays = getWeekDays(weekStart);

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* ── 1. Header ── */}
      <motion.div variants={fadeUp}>
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#2A0C8F] via-[#A0006B] to-[#FF0015] px-5 py-4 md:px-6 md:py-5 text-white shadow-lg">
          <div className="absolute -top-6 -right-6 size-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -right-4 size-16 rounded-full bg-white/5" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">My Schedule</h1>
              <div className="flex items-center gap-1.5 text-white/70 text-xs mt-1 flex-wrap">
                {group?.parkName && (
                  <>
                    <TreePine className="size-3" />
                    <span>{group.parkName}</span>
                    <span className="mx-0.5">&middot;</span>
                  </>
                )}
                {group?.batchName && (
                  <>
                    <span>{group.batchName}</span>
                    <span className="mx-0.5">&middot;</span>
                  </>
                )}
                {group?.name && (
                  <>
                    <Users className="size-3" />
                    <span>{group.name}</span>
                  </>
                )}
              </div>
            </div>

            {/* Week Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/15"
                onClick={() => setWeekOffset((w) => w - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="text-center min-w-[160px]">
                <p className="text-sm font-medium">{weekLabel}</p>
                {weekOffset === 0 && (
                  <p className="text-[10px] text-white/60">This Week</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/15"
                onClick={() => setWeekOffset((w) => Math.min(w + 1, 0))}
                disabled={weekOffset >= 0}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 2. This Week Summary ── */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm overflow-hidden border-l-[3px] border-l-[#4B0A8F] dark:border-l-[#8A40B0]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-8 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086080]">
                <CalendarCheck className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Sessions
                </p>
                <p className="text-xl font-bold">{summary.totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm overflow-hidden border-l-[3px] border-l-green-500 dark:border-l-green-400">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-8 rounded-lg bg-green-100 dark:bg-green-950/50">
                <CalendarCheck className="size-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Attended
                </p>
                <p className="text-xl font-bold">{summary.myCompleted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm overflow-hidden border-l-[3px] border-l-amber-400 dark:border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-8 rounded-lg bg-amber-100 dark:bg-amber-950/50">
                <Clock className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Remaining
                </p>
                <p className="text-xl font-bold">{summary.remaining}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── 3. Weekly Calendar (single row) ── */}
      <motion.div variants={fadeUp}>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Horizontal scrollable on mobile */}
            <div className="overflow-x-auto">
              <div className="min-w-[600px] grid grid-cols-7">
                {weekDays.map((day, i) => {
                  const event = events.find((e) => e.dayOfWeek === i);
                  const isTypical = typicalDays.includes(i);
                  const isToday = day.isToday;
                  const isPast = !isToday && day.dateStr < formatPKT(toPKT(new Date()), "yyyy-MM-dd");

                  return (
                    <div
                      key={i}
                      className={cn(
                        "border-r last:border-r-0 min-h-[180px]",
                        isToday
                          ? "bg-[#F3ECF6]/40 dark:bg-[#1F086040]"
                          : "bg-background"
                      )}
                    >
                      {/* Day header */}
                      <div
                        className={cn(
                          "p-3 text-center border-b",
                          isToday
                            ? "bg-[#F3ECF6] dark:bg-[#1F086080] border-l-[3px] border-l-[#4B0A8F] dark:border-l-[#8A40B0]"
                            : "bg-muted/20"
                        )}
                      >
                        <p
                          className={cn(
                            "text-[10px] uppercase tracking-wider font-medium",
                            isToday
                              ? "text-[#4B0A8F] dark:text-[#8A40B0]"
                              : "text-muted-foreground"
                          )}
                        >
                          {DAY_LABELS[i]}
                        </p>
                        <p
                          className={cn(
                            "text-xl font-bold mt-0.5",
                            isToday
                              ? "text-[#4B0A8F] dark:text-[#8A40B0]"
                              : "text-foreground"
                          )}
                        >
                          {day.dateNum}
                        </p>
                      </div>

                      {/* Day content */}
                      <div className="p-2">
                        {event ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.25 }}
                            className={cn(
                              "rounded-lg p-2.5 h-full flex flex-col gap-2",
                              event.isClosed
                                ? "bg-muted/80 border border-border/50"
                                : "bg-[#F3ECF6] dark:bg-[#2A0C8F33] border border-[#D4B8E399] dark:border-[#2A0C8F4D]"
                            )}
                          >
                            {/* My status badge */}
                            <div className="flex items-center justify-between">
                              {myStatusBadge(event.myStatus)}
                              {statusBadge(event.isClosed)}
                            </div>

                            <div>
                              <p className="text-xs font-semibold leading-tight">
                                {event.title}
                              </p>
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                                <Clock className="size-2.5" />
                                <span>{event.timeStr}</span>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-auto">
                              <div className="flex items-center justify-between text-[10px] mb-1">
                                <span className="text-muted-foreground">
                                  {event.markedCount}/{event.participantCount}
                                </span>
                                <span
                                  className={cn(
                                    "font-semibold",
                                    event.progress >= 80
                                      ? "text-[#4B0A8F] dark:text-[#8A40B0]"
                                      : event.progress >= 50
                                        ? "text-amber-600 dark:text-amber-400"
                                        : "text-red-600 dark:text-red-400"
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
                          </motion.div>
                        ) : isTypical && !isPast ? (
                          <div className="h-full flex items-center justify-center">
                            <div className="border-2 border-dashed border-[#D4B8E399] dark:border-[#2A0C8F4D] rounded-lg w-full p-4 flex flex-col items-center justify-center gap-1.5 opacity-60">
                              <CalendarClock className="size-5 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground font-medium">
                                Expected
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── 4. Upcoming Events ── */}
      <motion.div variants={fadeUp} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Upcoming Sessions</h3>
          <Badge variant="outline" className="text-[10px] font-normal">
            Next {upcoming.length}
          </Badge>
        </div>

        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <CalendarClock className="size-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No upcoming sessions found
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {upcoming.map((ev, i) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <Card className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center size-10 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086080] shrink-0">
                        <CalendarCheck className="size-5 text-[#4B0A8F] dark:text-[#8A40B0]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{ev.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{ev.dateStr}</span>
                          <span>&middot;</span>
                          <span>{ev.timeStr}</span>
                        </div>
                      </div>
                      {statusBadge(ev.isClosed)}
                      <ArrowRight className="size-4 text-muted-foreground/40 shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}