"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/stores/useAppStore";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, parseISO, eachDayOfInterval, getDay } from "date-fns";
import { formatPKT, PKT } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Users,
  GraduationCap,
  CalendarCheck,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CalendarIcon,
  Loader2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

type ChildBasic = {
  id: string;
  name: string;
  groupName: string | null;
  batchName: string | null;
  parkName: string | null;
};

type AttendanceRecord = {
  id: string;
  date: string;
  title: string;
  groupName: string;
  parkName: string | null;
  status: string;
  markedAt: string | null;
};

type HistoryResponse = {
  participantId: string;
  from: string;
  to: string;
  total: number;
  limit: number;
  records: AttendanceRecord[];
};

type DashboardResponse = {
  children: Array<ChildBasic & { groupName: string | null; batchName: string | null; parkName: string | null }>;
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

// ─── Date Range Presets ─────────────────────────────────────────────

type PresetKey = "7" | "30" | "60" | "90" | "custom";

const presets: { key: PresetKey; label: string; days: number }[] = [
  { key: "7", label: "7 Days", days: 7 },
  { key: "30", label: "30 Days", days: 30 },
  { key: "60", label: "60 Days", days: 60 },
  { key: "90", label: "90 Days", days: 90 },
];

// ─── Helpers ─────────────────────────────────────────────────────────

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

const avatarColors = [
  "bg-[#4B0A8F] text-white",
  "bg-[#A0006B] text-white",
  "bg-[#FF0015] text-white",
  "bg-[#2A0C8F] text-white",
  "bg-amber-600 text-white",
  "bg-rose-600 text-white",
];

// ─── Component ───────────────────────────────────────────────────────

export function GuardianHistoryPage() {
  const { selectedParticipantId, setSelectedParticipantId, navigateTo } = useAppStore();

  // Date range state
  const [activePreset, setActivePreset] = useState<PresetKey>("30");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
  const [displayLimit, setDisplayLimit] = useState(15);
  const [calendarOpen, setCalendarOpen] = useState<"from" | "to" | null>(null);

  // Compute date range
  const dateRange = useMemo(() => {
    if (activePreset === "custom" && customFrom && customTo) {
      return {
        from: format(customFrom, "yyyy-MM-dd"),
        to: format(customTo, "yyyy-MM-dd"),
      };
    }
    const days = presets.find((p) => p.key === activePreset)?.days || 30;
    const to = new Date();
    const from = subDays(to, days - 1);
    return {
      from: format(from, "yyyy-MM-dd"),
      to: format(to, "yyyy-MM-dd"),
    };
  }, [activePreset, customFrom, customTo]);

  // Fetch guardian dashboard for child list
  const { data: dashboardData, isLoading: dashLoading } = useQuery<DashboardResponse>({
    queryKey: ["guardian-dashboard-children"],
    queryFn: () =>
      fetch("/api/guardian/dashboard").then((r) => {
        if (!r.ok) throw new Error("Failed to load children");
        return r.json();
      }),
    staleTime: 30000,
  });

  const children = useMemo(() => dashboardData?.children || [], [dashboardData]);
  const selectedChild = useMemo(
    () => children.find((c) => c.id === selectedParticipantId),
    [children, selectedParticipantId]
  );

  // Fetch attendance history
  const { data: historyData, isLoading: historyLoading, error } = useQuery<HistoryResponse>({
    queryKey: ["guardian-attendance-history", selectedParticipantId, dateRange.from, dateRange.to, displayLimit],
    queryFn: () =>
      fetch(
        `/api/guardian/attendance-history?participantId=${selectedParticipantId}&from=${dateRange.from}&to=${dateRange.to}&limit=${displayLimit}`
      ).then((r) => {
        if (!r.ok) throw new Error("Failed to load history");
        return r.json();
      }),
    enabled: !!selectedParticipantId,
    staleTime: 10000,
  });

  // Compute summary stats from all records
  const summary = useMemo(() => {
    const records = historyData?.records || [];
    const total = records.length;
    const present = records.filter((r) => r.status === "present").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const late = records.filter((r) => r.status === "late").length;
    const excused = records.filter((r) => r.status === "excused").length;
    const presentPct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, absent, late, excused, presentPct };
  }, [historyData]);

  const handlePresetChange = useCallback((key: PresetKey) => {
    setActivePreset(key);
    setDisplayLimit(15);
    if (key !== "custom") {
      setCustomFrom(undefined);
      setCustomTo(undefined);
    }
  }, []);

  const handleSelectChild = useCallback(
    (id: string) => {
      setSelectedParticipantId(id);
      setDisplayLimit(15);
    },
    [setSelectedParticipantId]
  );

  const handleLoadMore = useCallback(() => {
    setDisplayLimit((prev) => prev + 15);
  }, []);

  // ─── Child Selector (no child selected) ──────────────────────────
  if (!selectedParticipantId) {
    return (
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={fadeUp}>
          <h2 className="text-lg font-bold text-foreground">Attendance History</h2>
          <p className="text-sm text-muted-foreground mt-1">Select a child to view attendance records</p>
        </motion.div>

        {dashLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : children.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-6 text-center">
              <Users className="size-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No children found</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Contact your park admin to link participants.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {children.map((child, index) => (
              <motion.div
                key={child.id}
                variants={fadeUp}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className="cursor-pointer overflow-hidden border-border hover:border-[#D4B8E3] dark:hover:border-[#2A0C8F99] transition-colors h-full"
                  onClick={() => handleSelectChild(child.id)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
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
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{child.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {child.groupName || "No group"}
                        {child.batchName ? ` · ${child.batchName}` : ""}
                      </p>
                      {child.parkName && (
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          {child.parkName}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // ─── Attendance History View ──────────────────────────────────────
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* ─── Header ───────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-foreground">Attendance History</h2>
          {selectedChild && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {selectedChild.name}
              {selectedChild.groupName ? ` · ${selectedChild.groupName}` : ""}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground h-8 shrink-0"
          onClick={() => setSelectedParticipantId(null)}
        >
          <Users className="size-3.5 mr-1" />
          Switch
        </Button>
      </motion.div>

      {/* ─── Date Range Filter ────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <Card className="border-border overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CalendarDays className="size-3.5" />
              <span>Date Range</span>
            </div>

            {/* Preset buttons */}
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <Button
                  key={preset.key}
                  variant={activePreset === preset.key ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 text-xs px-3",
                    activePreset === preset.key
                      ? "bg-[#4B0A8F] hover:bg-[#4B0A8F] text-white border-0"
                      : "hover:border-[#D4B8E3] hover:text-[#4B0A8F] dark:hover:border-[#2A0C8F99] dark:hover:text-[#8A40B0]"
                  )}
                  onClick={() => handlePresetChange(preset.key)}
                >
                  {preset.label}
                </Button>
              ))}
              <Popover
                open={calendarOpen !== null}
                onOpenChange={(open) => {
                  if (!open) setCalendarOpen(null);
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant={activePreset === "custom" ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-8 text-xs px-3",
                      activePreset === "custom"
                        ? "bg-[#4B0A8F] hover:bg-[#4B0A8F] text-white border-0"
                        : "hover:border-[#D4B8E3] hover:text-[#4B0A8F] dark:hover:border-[#2A0C8F99] dark:hover:text-[#8A40B0]"
                    )}
                    onClick={() => setCalendarOpen("from")}
                  >
                    <CalendarIcon className="size-3 mr-1.5" />
                    Custom
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">From</p>
                      <Calendar
                        mode="single"
                        selected={customFrom}
                        onSelect={(d) => {
                          setCustomFrom(d);
                          if (d) {
                            setActivePreset("custom");
                            setCalendarOpen("to");
                          }
                        }}
                        modifiersClassNames={{ selected: "bg-[#4B0A8F] text-white rounded-md" }}
                        className="rounded-md"
                      />
                    </div>
                    {customFrom && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">To</p>
                        <Calendar
                          mode="single"
                          selected={customTo}
                          onSelect={(d) => {
                            setCustomTo(d);
                            if (d) {
                              setActivePreset("custom");
                              setCalendarOpen(null);
                            }
                          }}
                          disabled={{ before: customFrom }}
                          modifiersClassNames={{ selected: "bg-[#4B0A8F] text-white rounded-md" }}
                          className="rounded-md"
                        />
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Active range label */}
            <p className="text-[11px] text-muted-foreground/70">
              {dateRange.from} → {dateRange.to}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Summary Stats ────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="grid grid-cols-5 gap-2 sm:gap-3">
        <StatCard label="Total" value={historyLoading && !historyData ? "—" : String(summary.total)} icon={CalendarCheck} color="text-[#4B0A8F] dark:text-[#8A40B0]" bg="bg-[#F3ECF6] dark:bg-[#1F086099]" />
        <StatCard label="Present %" value={historyLoading && !historyData ? "—" : `${summary.presentPct}%`} icon={GraduationCap} color={summary.presentPct >= 80 ? "text-[#4B0A8F] dark:text-[#8A40B0]" : summary.presentPct >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"} bg={summary.presentPct >= 80 ? "bg-[#F3ECF6] dark:bg-[#1F086099]" : "bg-muted"} />
        <StatCard label="Absent" value={historyLoading && !historyData ? "—" : String(summary.absent)} icon={XCircle} color="text-red-600 dark:text-red-400" bg="bg-red-50 dark:bg-red-950/40" />
        <StatCard label="Late" value={historyLoading && !historyData ? "—" : String(summary.late)} icon={Clock} color="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-950/40" />
        <StatCard label="Excused" value={historyLoading && !historyData ? "—" : String(summary.excused)} icon={ShieldCheck} color="text-sky-600 dark:text-sky-400" bg="bg-sky-50 dark:bg-sky-950/40" />
      </motion.div>

      {/* ─── Attendance Records List ──────────────────────────────── */}
      <motion.div variants={fadeUp}>
        {historyLoading && !historyData ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <Card className="border-red-200 dark:border-red-800/50">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="size-6 text-red-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Failed to load attendance records
              </p>
            </CardContent>
          </Card>
        ) : !historyData?.records?.length ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center">
              <CalendarCheck className="size-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">
                No attendance records found for this period
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Try selecting a different date range
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border overflow-hidden">
            <CardContent className="p-0">
              {/* Table header */}
              <div className="hidden sm:grid sm:grid-cols-[100px_60px_1fr_120px_80px] gap-3 px-4 py-2.5 bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                <span>Date</span>
                <span>Day</span>
                <span>Event</span>
                <span>Group</span>
                <span className="text-right">Status</span>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {historyData.records.map((record, i) => (
                    <motion.div
                      key={record.id}
                      custom={i}
                      variants={listItem}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, x: -8 }}
                      className={cn(
                        "grid sm:grid-cols-[100px_60px_1fr_120px_80px] gap-1 sm:gap-3 px-4 py-3 items-center",
                        i % 2 === 0 ? "bg-background" : "bg-muted/30",
                        i < historyData.records.length - 1 && "border-b border-border/50"
                      )}
                    >
                      {/* Date */}
                      <p className="text-xs font-medium text-foreground">{record.date}</p>

                      {/* Day of week */}
                      <p className="text-[11px] text-muted-foreground hidden sm:block">
                        {getDayOfWeek(record.date)}
                      </p>

                      {/* Event title + group (mobile) */}
                      <div className="min-w-0 col-span-2 sm:col-span-1">
                        <p className="text-sm font-medium truncate">{record.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate sm:hidden">
                          {record.groupName}
                        </p>
                      </div>

                      {/* Group (desktop) */}
                      <p className="text-xs text-muted-foreground truncate hidden sm:block">
                        {record.groupName}
                      </p>

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
              {historyData.total > displayLimit && (
                <div className="border-t border-border/50 p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-[#4B0A8F] hover:text-[#4B0A8F] dark:text-[#8A40B0] dark:hover:text-[#8A40B0] h-9"
                    onClick={handleLoadMore}
                  >
                    <Loader2 className="size-3 mr-1.5" />
                    Load More ({historyData.total - displayLimit} remaining)
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