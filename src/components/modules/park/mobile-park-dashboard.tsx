"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/stores/useAppStore";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  CalendarCheck,
  Users,
  AlertTriangle,
  ChevronRight,
  TreePine,
  MapPin,
  CircleAlert,
  Loader2,
  ListTodo,
  Calendar,
  Contact,
  LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";

// Note: Reusing types from park-dashboard.tsx
type GroupBreakdownItem = {
  id: string;
  name: string;
  totalParticipants: number;
  todayMarkedCount: number;
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  todayExcused: number;
  todayEventStatus: "open" | "closed" | "none";
  todayProgress: number;
};

type NeedsAttentionItem = {
  type: "low_attendance" | "unclosed_yesterday";
  groupId?: string;
  groupName?: string;
  eventId?: string;
  eventTitle?: string;
  rate?: number;
  message: string;
};

type DashboardData = {
  park: { id: string; name: string; cityName: string } | null;
  userName: string | null;
  todayDate: string;
  todayEvents: { total: number; open: number; closed: number };
  recentSummary: {
    last7DaysEvents: number;
    last7DaysAttendanceRate: number;
    prevWeekAttendanceRate: number;
    totalParticipants: number;
    activeGroups: number;
  };
  todayAttendance?: { present: number; late: number; absent: number; total: number };
  groupBreakdown: GroupBreakdownItem[];
  needsAttention: NeedsAttentionItem[];
  openUncompletedCount: number;
  unclosedYesterdayCount: number;
  warningsCount: number;
  events: Array<{
    id: string;
    title: string;
    groupName: string;
    groupId: string;
    eventDate: string;
    isClosed: boolean;
    participantCount: number;
    markedCount: number;
    progress: number;
    closedAt: string | null;
    closedByName: string | null;
  }>;
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, 
    y: 0, 
    transition: { delay: i * 0.04, duration: 0.4, ease: "easeOut" }
  }),
};

export function MobileParkDashboard() {
  const { navigateTo, setSelectedEventId } = useAppStore();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["park-dashboard"],
    queryFn: () =>
      fetch("/api/park/dashboard").then((r) => {
        if (!r.ok) throw new Error("Failed to load dashboard");
        return r.json();
      }),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const closeEventMutation = useMutation({
    mutationFn: (eventId: string) =>
      fetch(`/api/park/attendance/${eventId}/close`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Closed from dashboard - unclosed from yesterday" }),
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to close event");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Event closed successfully");
      queryClient.invalidateQueries({ queryKey: ["park-dashboard"] });
    },
    onError: () => {
      toast.error("Failed to close event");
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-40 rounded-2xl w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-48 rounded-2xl w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <TreePine className="w-12 h-12 text-muted-foreground/50" />
        <p className="font-semibold text-lg">Could not load dashboard</p>
        <p className="text-sm text-muted-foreground">Please try again later.</p>
      </div>
    );
  }

  const {
    park,
    userName,
    todayDate,
    recentSummary,
    todayAttendance,
    needsAttention,
    openUncompletedCount,
    warningsCount,
    events,
  } = data;

  const nextActionEvent = events.find(e => !e.isClosed && e.progress < 100);
  const totalMarked = todayAttendance?.total || 0;
  const attendanceRate = totalMarked > 0 && todayAttendance ? Math.round((todayAttendance.present / totalMarked) * 100) : 0;

  return (
    <div className="flex flex-col pb-24 bg-background">
      {/* Sticky Header Greeting */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm px-4 pt-4 pb-2 border-b">
        <h1 className="text-xl font-bold">Assalamu Alaikum{userName ? `, ${userName}` : ""}</h1>
        <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-sm">
          <MapPin className="w-4 h-4" />
          <span>{park?.name || "Your Park"}</span>
          <span className="mx-1">&middot;</span>
          <span>{todayDate}</span>
        </div>
      </div>

      <div className="p-4 space-y-5 overflow-y-auto">
        
        {/* Next Action / Priority Card */}
        {nextActionEvent && (
          <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp}>
            <div className="bg-gradient-to-r from-[#4B0A8F] to-[#8A40B0] rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded-full uppercase tracking-wider">
                    Next Up
                  </span>
                  <span className="text-sm font-medium text-white/90">
                    {nextActionEvent.markedCount}/{nextActionEvent.participantCount} Marked
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold leading-tight">{nextActionEvent.title}</h3>
                  <p className="text-sm text-white/80 mt-0.5">{nextActionEvent.groupName}</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedEventId(nextActionEvent.id);
                    navigateTo("park-attendance-roster");
                  }}
                  className="mt-2 flex items-center justify-center w-full bg-white text-[#4B0A8F] h-11 rounded-xl font-bold text-sm shadow-sm active:scale-[0.98] transition-transform"
                >
                  Mark Attendance
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick Action Grid */}
        <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUp}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "park-attendance", label: "Events", icon: CalendarCheck, color: "text-[#4B0A8F]", bg: "bg-[#F3ECF6]" },
              { id: "park-roster", label: "Roster", icon: ListTodo, color: "text-amber-600", bg: "bg-amber-50" },
              { id: "park-participants", label: "Participants", icon: Users, color: "text-sky-600", bg: "bg-sky-50" },
              { id: "park-schedule", label: "Schedule", icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-50" },
            ].map((action, idx) => (
              <button
                key={action.id}
                onClick={() => navigateTo(action.id)}
                className="flex flex-col items-center justify-center gap-2 h-24 rounded-2xl bg-card border shadow-sm active:scale-95 transition-transform"
              >
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", action.bg)}>
                  <action.icon className={cn("w-5 h-5", action.color)} />
                </div>
                <span className="text-xs font-semibold">{action.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Today's Summary Card */}
        <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUp}>
          <Card className="rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-muted/30 p-3 border-b flex justify-between items-center">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-[#4B0A8F]" />
                Today's Overview
              </h3>
            </div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-3xl font-bold text-[#4B0A8F]">{attendanceRate}%</p>
                  <p className="text-xs text-muted-foreground font-medium">Present Rate</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-foreground">{recentSummary.totalParticipants}</p>
                  <p className="text-xs text-muted-foreground font-medium">Total Shabab</p>
                </div>
              </div>

              {/* Mini progress bar */}
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex mb-2">
                {todayAttendance && todayAttendance.total > 0 && (
                  <>
                    <div style={{ width: `${(todayAttendance.present / todayAttendance.total) * 100}%` }} className="h-full bg-emerald-500" />
                    <div style={{ width: `${(todayAttendance.late / todayAttendance.total) * 100}%` }} className="h-full bg-amber-500" />
                    <div style={{ width: `${(todayAttendance.absent / todayAttendance.total) * 100}%` }} className="h-full bg-red-500" />
                  </>
                )}
              </div>
              <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                <span className="text-emerald-600">P: {todayAttendance?.present || 0}</span>
                <span className="text-amber-600">L: {todayAttendance?.late || 0}</span>
                <span className="text-red-600">A: {todayAttendance?.absent || 0}</span>
                <span>E: {todayAttendance?.absent || 0}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Needs Attention List */}
        {needsAttention.length > 0 && (
          <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp} className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Needs Attention
            </h3>
            <div className="space-y-2">
              {needsAttention.map((item, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "flex flex-col gap-2 p-3 rounded-2xl border",
                    item.type === "unclosed_yesterday" ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={cn("w-4 h-4 shrink-0 mt-0.5", item.type === "unclosed_yesterday" ? "text-red-600" : "text-amber-600")} />
                    <p className={cn("text-xs font-medium leading-relaxed flex-1", item.type === "unclosed_yesterday" ? "text-red-800" : "text-amber-800")}>
                      {item.message}
                    </p>
                  </div>
                  {item.type === "unclosed_yesterday" && item.eventId && (
                    <button
                      onClick={() => closeEventMutation.mutate(item.eventId!)}
                      disabled={closeEventMutation.isPending}
                      className="ml-6 self-start text-xs font-bold bg-white text-red-600 px-3 py-1.5 rounded-lg shadow-sm active:scale-95 transition-transform"
                    >
                      {closeEventMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Close Event"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="h-6" />
      </div>
    </div>
  );
}
