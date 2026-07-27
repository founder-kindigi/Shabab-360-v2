"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/stores/useAppStore";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, parseISO, getDay } from "date-fns";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Users,
  GraduationCap,
  CalendarCheck,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CalendarIcon,
  Loader2,
  ChevronLeft
} from "lucide-react";

type ChildBasic = { id: string; name: string; groupName: string | null; batchName: string | null; parkName: string | null; };
type AttendanceRecord = { id: string; date: string; title: string; groupName: string; parkName: string | null; status: string; markedAt: string | null; };
type HistoryResponse = { participantId: string; from: string; to: string; total: number; limit: number; records: AttendanceRecord[]; };
type DashboardResponse = { children: Array<ChildBasic & { groupName: string | null; batchName: string | null; parkName: string | null }>; };
type PresetKey = "7" | "30" | "60" | "90" | "custom";

const presets: { key: PresetKey; label: string; days: number }[] = [
  { key: "7", label: "7 Days", days: 7 },
  { key: "30", label: "30 Days", days: 30 },
  { key: "60", label: "60 Days", days: 60 },
];

const stagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } };
const fadeUp: Variants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const listItem: Variants = { hidden: { opacity: 0, x: -8 }, visible: (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * 0.04, duration: 0.3 } }) };

function getDayOfWeek(dateStr: string): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const date = parseISO(dateStr);
  return days[getDay(date)];
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "present": return "bg-emerald-500 text-white border-0";
    case "absent": return "bg-red-500 text-white border-0";
    case "late": return "bg-amber-500 text-white border-0";
    case "excused": return "bg-sky-500 text-white border-0";
    default: return "bg-muted text-muted-foreground border-0";
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

const avatarColors = [ "bg-[#4B0A8F] text-white", "bg-[#A0006B] text-white", "bg-emerald-600 text-white", "bg-[#2A0C8F] text-white" ];

export function MobileGuardianHistoryPage() {
  const { selectedParticipantId, setSelectedParticipantId, navigateTo } = useAppStore();
  const [activePreset, setActivePreset] = useState<PresetKey>("30");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
  const [displayLimit, setDisplayLimit] = useState(15);
  const [calendarOpen, setCalendarOpen] = useState<"from" | "to" | null>(null);

  const dateRange = useMemo(() => {
    if (activePreset === "custom" && customFrom && customTo) {
      return { from: format(customFrom, "yyyy-MM-dd"), to: format(customTo, "yyyy-MM-dd") };
    }
    const days = presets.find((p) => p.key === activePreset)?.days || 30;
    const to = new Date();
    const from = subDays(to, days - 1);
    return { from: format(from, "yyyy-MM-dd"), to: format(to, "yyyy-MM-dd") };
  }, [activePreset, customFrom, customTo]);

  const { data: dashboardData, isLoading: dashLoading } = useQuery<DashboardResponse>({
    queryKey: ["guardian-dashboard-children"],
    queryFn: () => fetch("/api/guardian/dashboard").then((r) => r.json()),
    staleTime: 30000,
  });

  const children = useMemo(() => dashboardData?.children || [], [dashboardData]);
  const selectedChild = useMemo(() => children.find((c) => c.id === selectedParticipantId), [children, selectedParticipantId]);

  const { data: historyData, isLoading: historyLoading } = useQuery<HistoryResponse>({
    queryKey: ["guardian-attendance-history", selectedParticipantId, dateRange.from, dateRange.to, displayLimit],
    queryFn: () => fetch(`/api/guardian/attendance-history?participantId=${selectedParticipantId}&from=${dateRange.from}&to=${dateRange.to}&limit=${displayLimit}`).then((r) => r.json()),
    enabled: !!selectedParticipantId,
    staleTime: 10000,
  });

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

  const handleSelectChild = useCallback((id: string) => {
    setSelectedParticipantId(id);
    setDisplayLimit(15);
  }, [setSelectedParticipantId]);

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-background">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3 min-h-[60px] flex items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0 h-11 w-11 rounded-xl" onClick={() => navigateTo("guardian-dashboard")}>
          <ChevronLeft className="size-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">History</h1>
          <p className="text-xs text-muted-foreground truncate">{selectedChild?.name || "Select a child"}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 px-4 pt-4">
        {/* Child Selector Pills */}
        {children.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {children.map((child, i) => {
              const isActive = selectedChild?.id === child.id;
              return (
                <button
                  key={child.id}
                  onClick={() => handleSelectChild(child.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-full min-h-[44px] shrink-0 transition-all font-semibold text-sm",
                    isActive ? "bg-[#4B0A8F] text-white shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  <div className={cn("size-6 rounded-full flex items-center justify-center text-[10px]", isActive ? "bg-white/20" : avatarColors[i % avatarColors.length])}>
                    {child.name.charAt(0)}
                  </div>
                  {child.name.split(" ")[0]}
                </button>
              );
            })}
          </div>
        )}

        {selectedParticipantId ? (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl bg-card border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {presets.map((preset) => (
                      <Button
                        key={preset.key}
                        variant={activePreset === preset.key ? "default" : "outline"}
                        className={cn("h-11 rounded-xl min-w-[80px] font-semibold text-xs", activePreset === preset.key ? "bg-[#4B0A8F] text-white" : "border-border")}
                        onClick={() => { setActivePreset(preset.key); setDisplayLimit(15); setCustomFrom(undefined); setCustomTo(undefined); }}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground text-center">
                    {dateRange.from} → {dateRange.to}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Stats */}
            <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2">
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 p-2 text-center flex flex-col justify-center min-h-[80px]">
                <p className="text-xl font-bold text-emerald-600">{summary.present}</p>
                <p className="text-[10px] font-medium text-emerald-700">Present</p>
              </div>
              <div className="rounded-2xl bg-red-50 dark:bg-red-950/20 p-2 text-center flex flex-col justify-center min-h-[80px]">
                <p className="text-xl font-bold text-red-600">{summary.absent}</p>
                <p className="text-[10px] font-medium text-red-700">Absent</p>
              </div>
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 p-2 text-center flex flex-col justify-center min-h-[80px]">
                <p className="text-xl font-bold text-amber-600">{summary.late}</p>
                <p className="text-[10px] font-medium text-amber-700">Late</p>
              </div>
              <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/20 p-2 text-center flex flex-col justify-center min-h-[80px]">
                <p className="text-xl font-bold text-sky-600">{summary.excused}</p>
                <p className="text-[10px] font-medium text-sky-700">Excused</p>
              </div>
            </motion.div>

            {/* List */}
            <motion.div variants={fadeUp}>
              {historyLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
                </div>
              ) : historyData?.records.length === 0 ? (
                <Card className="rounded-2xl bg-card border">
                  <CardContent className="p-8 text-center">
                    <CalendarCheck className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="font-semibold">No records found</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {historyData?.records.map((record, i) => (
                      <motion.div key={record.id} custom={i} variants={listItem} initial="hidden" animate="visible" exit={{ opacity: 0 }}>
                        <Card className="rounded-2xl bg-card border overflow-hidden">
                          <CardContent className="p-4 flex items-center gap-3">
                            <div className="flex flex-col items-center justify-center min-w-[48px] bg-muted/50 rounded-xl py-2">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground">{getDayOfWeek(record.date)}</span>
                              <span className="text-sm font-black">{parseISO(record.date).getDate()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate">{record.title}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{record.groupName}</p>
                            </div>
                            <Badge className={cn("text-xs font-bold px-3 py-1.5 min-h-[32px]", statusBadgeClass(record.status))}>
                              {statusLetter(record.status)}
                            </Badge>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {historyData && historyData.total > displayLimit && (
                    <Button variant="outline" className="w-full h-12 rounded-xl font-bold text-[#4B0A8F]" onClick={() => setDisplayLimit(d => d + 15)}>
                      Load More
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="size-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-bold">Select a child</p>
            <p className="text-sm text-muted-foreground">Tap a name above to view their history</p>
          </div>
        )}
        <div className="h-6" />
      </div>
    </div>
  );
}
