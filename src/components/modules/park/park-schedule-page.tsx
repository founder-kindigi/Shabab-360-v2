"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
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
  Users,
  Plus,
  TreePine,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ==================== TYPES ====================

type ScheduleEvent = {
  id: string;
  title: string;
  eventDate: string;
  dayOfWeek: number; // 0=Mon, 6=Sun
  dateStr: string;
  timeStr: string;
  isClosed: boolean;
  participantCount: number;
  markedCount: number;
  progress: number;
};

type ScheduleGroup = {
  id: string;
  name: string;
  participantCount: number;
  events: ScheduleEvent[];
  typicalDays: number[];
};

type ScheduleBatch = {
  id: string;
  name: string;
  groups: ScheduleGroup[];
};

type ScheduleData = {
  park: { id: string; name: string; cityName: string | null } | null;
  batches: ScheduleBatch[];
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  summary: { totalSessions: number; completedSessions: number; openSessions: number };
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

function progressColor(pct: number) {
  if (pct >= 80) return "bg-[#4B0A8F]";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
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

// ==================== COMPONENT ====================

export function ParkSchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0);

  const { data, isLoading, error } = useQuery<ScheduleData>({
    queryKey: ["park-schedule", weekOffset],
    queryFn: () =>
      fetch(`/api/park/schedule?weekOffset=${weekOffset}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load schedule");
        return r.json();
      }),
    staleTime: 30000,
  });

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="space-y-5">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-52" />
        </div>
        {/* Summary skeleton */}
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        {/* Grid skeleton */}
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  // ── Error State ──
  if (error || !data) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Could not load schedule"
        description="There was an error loading schedule data. Please try again."
      />
    );
  }

  const { park, batches, weekStart, weekLabel, summary } = data;
  const weekDays = getWeekDays(weekStart);

  // Flatten all groups across batches
  const allGroups = batches.flatMap((b) =>
    b.groups.map((g) => ({ ...g, batchName: b.name }))
  );

  const totalGroups = allGroups.length;

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* ── 1. Header ── */}
      <motion.div variants={fadeUp}>
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#2A0C8F] via-[#4B0A8F] to-[#A0006B] px-5 py-4 md:px-6 md:py-5 text-white shadow-lg">
          <div className="absolute -top-6 -right-6 size-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -right-4 size-16 rounded-full bg-white/5" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-white/70 text-xs">
                <TreePine className="size-3.5" />
                <span>{park?.cityName}</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold mt-1">
                Schedule
                <span className="ml-2 text-white/70 font-normal text-base">
                  {park?.name}
                </span>
              </h1>
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

      {/* ── 2. Summary Cards ── */}
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

        <Card className="border-0 shadow-sm overflow-hidden border-l-[3px] border-l-[#A0006B] dark:border-l-[#D46B95]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-8 rounded-lg bg-[#F5E8EF] dark:bg-[#2A0C8F33]">
                <CalendarClock className="size-4 text-[#A0006B] dark:text-[#D46B95]" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Completed
                </p>
                <p className="text-xl font-bold">{summary.completedSessions}</p>
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
                  Open
                </p>
                <p className="text-xl font-bold">{summary.openSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── 3. Weekly Calendar Grid ── */}
      <motion.div variants={fadeUp}>
        {totalGroups === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CalendarClock className="size-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                No groups found in your park
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Schedule will appear once groups are created
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/* Scrollable container for mobile */}
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Column Headers */}
                  <div className="grid grid-cols-[180px_repeat(7,1fr)] border-b">
                    <div className="p-3 text-xs font-semibold text-muted-foreground border-r bg-muted/30">
                      Group
                    </div>
                    {weekDays.map((day, i) => (
                      <div
                        key={i}
                        className={cn(
                          "p-3 text-center border-r last:border-r-0",
                          day.isToday
                            ? "bg-[#F3ECF6] dark:bg-[#1F086080] border-l-[3px] border-l-[#4B0A8F] dark:border-l-[#8A40B0]"
                            : "bg-muted/20"
                        )}
                      >
                        <p
                          className={cn(
                            "text-[10px] uppercase tracking-wider font-medium",
                            day.isToday
                              ? "text-[#4B0A8F] dark:text-[#8A40B0]"
                              : "text-muted-foreground"
                          )}
                        >
                          {DAY_LABELS[i]}
                        </p>
                        <p
                          className={cn(
                            "text-lg font-bold mt-0.5",
                            day.isToday
                              ? "text-[#4B0A8F] dark:text-[#8A40B0]"
                              : "text-foreground"
                          )}
                        >
                          {day.dateNum}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Group Rows */}
                  {batches.map((batch) => (
                    <div key={batch.id}>
                      {/* Batch header row */}
                      <div className="grid grid-cols-[180px_repeat(7,1fr)] border-b bg-muted/10">
                        <div className="col-span-8 px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground border-b">
                          {batch.name}
                        </div>
                      </div>

                      {batch.groups.map((group) => (
                        <div
                          key={group.id}
                          className="grid grid-cols-[180px_repeat(7,1fr)] border-b last:border-b-0"
                        >
                          {/* Group name cell */}
                          <div className="p-3 border-r flex items-center gap-2">
                            <div className="flex items-center justify-center size-6 rounded-md bg-[#F3ECF6] dark:bg-[#1F086080] shrink-0">
                              <Users className="size-3 text-[#4B0A8F] dark:text-[#8A40B0]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate">
                                {group.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {group.participantCount} shabab
                              </p>
                            </div>
                          </div>

                          {/* Day cells */}
                          {weekDays.map((day, dayIdx) => {
                            const event = group.events.find(
                              (e) => e.dayOfWeek === dayIdx
                            );
                            const isTypical = group.typicalDays.includes(dayIdx);
                            const isToday = day.isToday;
                            const isPast = !isToday && day.dateStr < formatPKT(toPKT(new Date()), "yyyy-MM-dd");

                            return (
                              <div
                                key={dayIdx}
                                className={cn(
                                  "p-1.5 border-r last:border-r-0 min-h-[72px]",
                                  isToday &&
                                    "bg-[#F3ECF6]/50 dark:bg-[#1F086040] border-l-[3px] border-l-[#4B0A8F] dark:border-l-[#8A40B0]"
                                )}
                              >
                                {event ? (
                                  <AnimatePresence>
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ duration: 0.2 }}
                                      className={cn(
                                        "rounded-lg p-2 h-full flex flex-col justify-between",
                                        event.isClosed
                                          ? "bg-muted/80 border border-border/50"
                                          : "bg-[#F3ECF6] dark:bg-[#2A0C8F33] border border-[#D4B8E399] dark:border-[#2A0C8F4D]"
                                      )}
                                    >
                                      <div>
                                        <p className="text-[10px] font-semibold truncate leading-tight">
                                          {event.title}
                                        </p>
                                        <div className="flex items-center gap-1 mt-1">
                                          {statusBadge(event.isClosed)}
                                        </div>
                                      </div>
                                      <div className="mt-1.5 space-y-1">
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                          <Clock className="size-2.5" />
                                          <span>{event.timeStr}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px]">
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
                                        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
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
                                  </AnimatePresence>
                                ) : isTypical && !isPast ? (
                                  <div className="h-full flex items-center justify-center">
                                    <div className="border-2 border-dashed border-[#D4B8E399] dark:border-[#2A0C8F4D] rounded-lg w-full h-full flex flex-col items-center justify-center gap-1 opacity-60">
                                      <Plus className="size-3 text-muted-foreground" />
                                      <span className="text-[9px] text-muted-foreground font-medium">
                                        Expected
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-full flex items-center justify-center">
                                    <div className="w-full h-full rounded-lg bg-muted/20" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
}