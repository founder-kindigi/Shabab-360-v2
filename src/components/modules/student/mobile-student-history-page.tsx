"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subMonths, addMonths, parseISO, startOfMonth, endOfMonth, isToday } from "date-fns";
import { toZonedTime, PKT } from "@/lib/timezone";
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
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

type AttendanceRecord = {
  id: string;
  date: string;
  dateKey: string;
  status: string;
  eventTitle: string;
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
  monthlySummary: MonthlySummary[];
};

type FilterTab = "all" | "present" | "absent" | "late" | "excused";

// ─── Animation Config ────────────────────────────────────────────────

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.03, duration: 0.3 },
  }),
};

// ─── Helpers ─────────────────────────────────────────────────────────

function statusColors(status: string) {
  switch (status) {
    case "present":
      return { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", label: "P" };
    case "absent":
      return { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500", label: "A" };
    case "late":
      return { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500", label: "L" };
    case "excused":
      return { bg: "bg-sky-100", text: "text-sky-700", dot: "bg-sky-500", label: "E" };
    default:
      return { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground", label: "-" };
  }
}

// ─── Component ───────────────────────────────────────────────────────

export function MobileStudentHistoryPage() {
  const nowPKT = toZonedTime(new Date(), PKT);
  const [viewMonth, setViewMonth] = useState<Date>(nowPKT);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);

  const { data, isLoading } = useQuery<HistoryResponse>({
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

  const monthLabel = format(viewMonth, "MMMM yyyy");
  const currentMonthSummary = useMemo(() => {
    return data?.monthlySummary?.find(
      (s) => s.month === monthLabel
    ) || { month: monthLabel, present: 0, absent: 0, late: 0, excused: 0, total: 0 };
  }, [data, monthLabel]);

  const filteredRecords = useMemo(() => {
    if (!data?.records) return [];
    if (activeFilter === "all") return data.records;
    return data.records.filter((r) => r.status === activeFilter);
  }, [data, activeFilter]);

  const handlePrevMonth = useCallback(() => setViewMonth((prev) => subMonths(prev, 1)), []);
  const handleNextMonth = useCallback(() => setViewMonth((prev) => addMonths(prev, 1)), []);

  const pct = currentMonthSummary.total > 0 
    ? Math.round((currentMonthSummary.present / currentMonthSummary.total) * 100)
    : 0;
  
  const pctColor = pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600";
  const pctBar = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border/50">
        <h1 className="text-lg font-bold">Attendance History</h1>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          
          {/* Month Selector */}
          <motion.div variants={fadeUp} className="flex items-center justify-between bg-card rounded-2xl p-2 border shadow-sm">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="rounded-xl h-10 w-10">
              <ChevronLeft className="size-5" />
            </Button>
            <span className="font-bold text-[#4B0A8F]">{monthLabel}</span>
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="rounded-xl h-10 w-10">
              <ChevronRight className="size-5" />
            </Button>
          </motion.div>

          {/* Summary Strip */}
          <motion.div variants={fadeUp}>
            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground font-medium">
                    {currentMonthSummary.present + currentMonthSummary.absent + currentMonthSummary.late + currentMonthSummary.excused} / {currentMonthSummary.total} marked
                  </span>
                  <span className={cn("font-bold", pctColor)}>{pct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", pctBar)} style={{ width: `${pct}%` }} />
                </div>
                <div className="grid grid-cols-4 gap-2 pt-2">
                  <StatMini label="P" value={currentMonthSummary.present} color="text-emerald-600" bg="bg-emerald-100" />
                  <StatMini label="A" value={currentMonthSummary.absent} color="text-red-600" bg="bg-red-100" />
                  <StatMini label="L" value={currentMonthSummary.late} color="text-amber-600" bg="bg-amber-100" />
                  <StatMini label="E" value={currentMonthSummary.excused} color="text-sky-600" bg="bg-sky-100" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Filters */}
          <motion.div variants={fadeUp} className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {(["all", "present", "absent", "late", "excused"] as FilterTab[]).map((tab) => {
              const isActive = activeFilter === tab;
              const count = tab === "all" ? data?.records?.length || 0 : data?.records?.filter(r => r.status === tab).length || 0;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-all shrink-0",
                    isActive ? "bg-[#4B0A8F] text-white shadow-sm" : "bg-card border text-muted-foreground"
                  )}
                >
                  <span className="capitalize">{tab}</span>
                  <span className={cn("text-[10px] rounded-full px-1.5", isActive ? "bg-white/20" : "bg-muted")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </motion.div>

          {/* List */}
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground text-center">
              <CalendarDays className="size-10 opacity-40" />
              <p className="text-sm font-medium">No records found for {activeFilter}</p>
            </div>
          ) : (
            <AnimatePresence>
              <div className="space-y-3">
                {filteredRecords.map((record, i) => {
                  const colors = statusColors(record.status);
                  return (
                    <motion.div key={record.id} custom={i} variants={listItem} initial="hidden" animate="visible">
                      <Card className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                        <CardContent className="p-0 flex items-stretch">
                          <div className={cn("w-2", colors.dot)} />
                          <div className="p-4 flex-1 flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-sm">{record.eventTitle}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{record.date}</p>
                            </div>
                            <Badge className={cn("text-xs px-2.5 py-1 border-0 uppercase font-bold", colors.bg, colors.text)}>
                              {record.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          )}

          {/* Bottom spacer */}
          <div className="h-6" />
        </motion.div>
      </div>
    </div>
  );
}

function StatMini({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={cn("rounded-xl flex flex-col items-center justify-center py-2", bg)}>
      <span className={cn("text-base font-bold", color)}>{value}</span>
      <span className="text-[10px] text-muted-foreground font-medium uppercase">{label}</span>
    </div>
  );
}
