"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, parseISO, startOfMonth, endOfMonth, addMonths, subMonths, getDay, eachDayOfInterval, isSameMonth, isToday } from "date-fns";
import { formatPKT, PKT, toPKT, toZonedTime } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  XCircle,
  Clock,
  ShieldCheck,
  CalendarCheck,
  AlertTriangle,
  Loader2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

type AttendanceRecord = {
  id: string;
  date: string;
  dateKey: string;
  status: string;
  eventTitle: string;
  eventId: string;
  isClosed: boolean;
  markedAt: string | null;
};

type MonthlySummary = {
  month: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
};

type HistoryResponse = {
  records: AttendanceRecord[];
  total: number;
  limit: number;
  offset: number;
  monthlySummary: MonthlySummary[];
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

const listItem = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.03, duration: 0.3 },
  }),
};

// ─── Helpers ─────────────────────────────────────────────────────────

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getDayOfWeek(dateStr: string): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const date = parseISO(dateStr);
  return days[getDay(date)];
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "present":
      return "bg-[#4B0A8F] text-white border-0";
    case "absent":
      return "bg-red-500/10 text-red-600 border-0 dark:text-red-400";
    case "late":
      return "bg-amber-500/10 text-amber-600 border-0 dark:text-amber-400";
    case "excused":
      return "bg-sky-500/10 text-sky-600 border-0 dark:text-sky-400";
    default:
      return "bg-muted text-muted-foreground border-0";
  }
}

function statusLetter(status: string) {
  switch (status) {
    case "present": return "P";
    case "absent": return "A";
    case "late": return "L";
    case "excused": return "E";
    default: return status?.charAt(0)?.toUpperCase() || "?";
  }
}

function dayCellBg(status: string) {
  switch (status) {
    case "present":
      return "bg-green-100 dark:bg-green-900/30";
    case "absent":
      return "bg-red-100 dark:bg-red-900/30";
    case "late":
      return "bg-amber-100 dark:bg-amber-900/30";
    case "excused":
      return "bg-sky-100 dark:bg-sky-900/30";
    default:
      return "bg-muted/30";
  }
}

function dayDotColor(status: string) {
  switch (status) {
    case "present": return "text-green-600 dark:text-green-400";
    case "absent": return "text-red-600 dark:text-red-400";
    case "late": return "text-amber-600 dark:text-amber-400";
    case "excused": return "text-sky-600 dark:text-sky-400";
    default: return "text-muted-foreground";
  }
}

// Adjust for Monday-start week: date-fns getDay returns 0=Sun
function getMondayDay(date: Date): number {
  const d = getDay(date);
  return d === 0 ? 6 : d - 1;
}

// ─── Component ───────────────────────────────────────────────────────

export function StudentHistoryPage() {
  const nowPKT = toZonedTime(new Date(), PKT);
  const [viewMonth, setViewMonth] = useState<Date>(nowPKT);
  const [displayLimit, setDisplayLimit] = useState(15);

  // Month boundaries
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);

  // Fetch full month data for calendar
  const { data: monthData, isLoading: monthLoading } = useQuery<HistoryResponse>({
    queryKey: ["student-attendance-month", format(viewMonth, "yyyy-MM")],
    queryFn: () =>
      fetch(
        `/api/student/attendance-history?from=${format(monthStart, "yyyy-MM-dd")}&to=${format(monthEnd, "yyyy-MM-dd")}&limit=100`
      ).then((r) => {
        if (!r.ok) throw new Error("Failed to load history");
        return r.json();
      }),
    staleTime: 30000,
  });

  // Build calendar day map: "yyyy-MM-dd" → status
  const dayMap = useMemo(() => {
    const map: Record<string, string> = {};
    (monthData?.records || []).forEach((r) => {
      if (r.dateKey) {
        map[r.dateKey] = r.status;
      }
    });
    return map;
  }, [monthData]);

  // Monthly summary for current view month
  const monthLabel = format(viewMonth, "MMMM yyyy");
  const currentMonthSummary = useMemo(() => {
    return monthData?.monthlySummary?.find(
      (s) => s.month === monthLabel
    ) || { month: monthLabel, present: 0, absent: 0, late: 0, excused: 0, total: 0 };
  }, [monthData, monthLabel]);

  // Calendar grid days
  const calendarDays = (() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const firstDayMonday = getMondayDay(monthStart);
    // Prepend empty cells for alignment
    const padding = Array.from({ length: firstDayMonday }).map(() => ({
      empty: true,
      day: 0,
      dateKey: "",
    }));
    return [
      ...padding,
      ...days.map((d) => ({
        empty: false,
        day: d.getDate(),
        dateKey: format(d, "yyyy-MM-dd"),
        date: d,
      })),
    ];
  })();

  const handlePrevMonth = useCallback(() => {
    setViewMonth((prev) => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewMonth((prev) => addMonths(prev, 1));
  }, []);

  const handleLoadMore = useCallback(() => {
    setDisplayLimit((prev) => prev + 15);
  }, []);

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* ─── Header ───────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <h2 className="text-lg font-bold text-foreground">My Attendance History</h2>
        <p className="text-sm text-muted-foreground mt-0.5">View your attendance records and monthly calendar</p>
      </motion.div>

      {/* ─── Monthly Calendar View ────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <Card className="border-border overflow-hidden">
          <CardContent className="p-4 space-y-3">
            {/* Month navigation */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#4B0A8F] dark:text-[#8A40B0]">
                {format(viewMonth, "MMMM yyyy")}
              </h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 h-8 w-8 hover:border-[#D4B8E3] hover:text-[#4B0A8F] dark:hover:border-[#2A0C8F99] dark:hover:text-[#8A40B0]"
                  onClick={handlePrevMonth}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 h-8 w-8 hover:border-[#D4B8E3] hover:text-[#4B0A8F] dark:hover:border-[#2A0C8F99] dark:hover:text-[#8A40B0]"
                  onClick={handleNextMonth}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1">
              {DAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="text-center text-[10px] font-semibold text-muted-foreground py-1"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            {monthLoading && !monthData ? (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((cell, i) => {
                  if (cell.empty) {
                    return <div key={`empty-${i}`} className="aspect-square" />;
                  }

                  const status = dayMap[cell.dateKey];
                  const isTodayDate = isToday(cell.date);
                  const isCurrentMonth = isSameMonth(cell.date, viewMonth);

                  return (
                    <motion.div
                      key={cell.dateKey}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.01, duration: 0.2 }}
                      className={cn(
                        "aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 relative text-center",
                        status ? dayCellBg(status) : isCurrentMonth ? "bg-muted/20" : "bg-muted/10 opacity-50",
                        isTodayDate && "ring-2 ring-[#4B0A8F] dark:ring-[#8A40B0]"
                      )}
                      title={status ? `${statusLetter(status).toUpperCase()} - ${status}` : "No event"}
                    >
                      <span className={cn(
                        "text-xs font-medium leading-none",
                        isTodayDate ? "text-[#4B0A8F] dark:text-[#8A40B0] font-bold" : "text-foreground"
                      )}>
                        {cell.day}
                      </span>
                      {status && (
                        <span className={cn("text-[8px] font-bold leading-none", dayDotColor(status))}>
                          {statusLetter(status)}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              {[
                { label: "Present", color: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" },
                { label: "Absent", color: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" },
                { label: "Late", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" },
                { label: "Excused", color: "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1">
                  <div className={cn("w-3.5 h-3.5 rounded-sm", item.color.split(" ").slice(0, 1).join(" "))} />
                  <span className="text-[10px] text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Monthly Summary Stats ─────────────────────────────────── */}
      <motion.div variants={fadeUp} className="grid grid-cols-5 gap-2 sm:gap-3">
        <StatCard label="Total" value={String(currentMonthSummary.total)} icon={CalendarCheck} color="text-[#4B0A8F] dark:text-[#8A40B0]" bg="bg-[#F3ECF6] dark:bg-[#1F086099]" />
        <StatCard label="Present" value={String(currentMonthSummary.present)} icon={GraduationCap} color="text-[#4B0A8F] dark:text-[#8A40B0]" bg="bg-[#F3ECF6] dark:bg-[#1F086099]" />
        <StatCard label="Absent" value={String(currentMonthSummary.absent)} icon={XCircle} color="text-red-600 dark:text-red-400" bg="bg-red-50 dark:bg-red-950/40" />
        <StatCard label="Late" value={String(currentMonthSummary.late)} icon={Clock} color="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-950/40" />
        <StatCard label="Excused" value={String(currentMonthSummary.excused)} icon={ShieldCheck} color="text-sky-600 dark:text-sky-400" bg="bg-sky-50 dark:bg-sky-950/40" />
      </motion.div>

      {/* ─── Detailed Records List ─────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Detailed Records</h3>
          <Badge variant="outline" className="text-[10px] font-normal">
            {format(viewMonth, "MMM yyyy")}
          </Badge>
        </div>

        {monthLoading && !monthData ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : !monthData?.records?.length ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center">
              <CalendarCheck className="size-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">
                No attendance records found for this month
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Navigate to a different month using the arrows above
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border overflow-hidden">
            <CardContent className="p-0">
              {/* Table header */}
              <div className="hidden sm:grid sm:grid-cols-[100px_60px_1fr_80px] gap-3 px-4 py-2.5 bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                <span>Date</span>
                <span>Day</span>
                <span>Event</span>
                <span className="text-right">Status</span>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {monthData.records.slice(0, displayLimit).map((record, i) => (
                    <motion.div
                      key={record.id}
                      custom={i}
                      variants={listItem}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, x: -8 }}
                      className={cn(
                        "grid sm:grid-cols-[100px_60px_1fr_80px] gap-1 sm:gap-3 px-4 py-3 items-center",
                        i % 2 === 0 ? "bg-background" : "bg-muted/30",
                        i < Math.min(displayLimit, monthData.records.length) - 1 && "border-b border-border/50"
                      )}
                    >
                      {/* Date */}
                      <p className="text-xs font-medium text-foreground">{record.date}</p>

                      {/* Day of week (desktop) */}
                      <p className="text-[11px] text-muted-foreground hidden sm:block">
                        {getDayOfWeek(record.date)}
                      </p>

                      {/* Event title */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{record.eventTitle}</p>
                      </div>

                      {/* Status badge */}
                      <div className="sm:text-right">
                        <Badge
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5",
                            statusBadgeClass(record.status)
                          )}
                        >
                          {statusLetter(record.status)}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Load more */}
              {monthData.records.length > displayLimit && (
                <div className="border-t border-border/50 p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-[#4B0A8F] hover:text-[#4B0A8F] dark:text-[#8A40B0] dark:hover:text-[#8A40B0] h-9"
                    onClick={handleLoadMore}
                  >
                    <Loader2 className="size-3 mr-1.5" />
                    Load More ({monthData.records.length - displayLimit} remaining)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Stat Card Sub-component ────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: string;
  icon: typeof CalendarCheck;
  color: string;
  bg: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 text-center">
        <div className={cn("flex items-center justify-center size-7 rounded-lg mx-auto mb-2", bg)}>
          <Icon className={cn("size-3.5", color)} />
        </div>
        <p className={cn("text-lg font-bold leading-tight", color)}>{value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
      </CardContent>
    </Card>
  );
}