"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { motion } from "framer-motion";
import { 
  Users, 
  ChevronRight, 
  AlertTriangle, 
  CalendarCheck,
  CheckCircle2,
  Clock,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type DailyTrend = {
  date: string;
  label: string;
  rate: number;
  hasEvent: boolean;
};

type TodayEvent = {
  id: string;
  title: string;
  isClosed: boolean;
  participantCount: number;
  markedCount: number;
  progress: number;
  counts: { present: number; absent: number; late: number; excused: number };
};

type Absentee = {
  id: string;
  name: string;
  count: number;
};

type UpcomingEvent = {
  id: string;
  title: string;
  eventDate: string;
  eventDateRaw: string;
};

type DashboardData = {
  groupName: string;
  batchName: string;
  parkName: string;
  cityName: string;
  todayDate: string;
  totalParticipants: number;
  todayEvent: TodayEvent | null;
  todayRate: number;
  dailyTrend: DailyTrend[];
  sparklineData: number[];
  thisWeekRate: number;
  lastWeekRate: number;
  topAbsentees: Absentee[];
  upcomingEvents: UpcomingEvent[];
  attendanceSummary: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
  };
};

export function MobileMurabbiDashboard() {
  const { data: session } = useSession();
  const { navigateTo, setSelectedEventId } = useAppStore();
  const user = session?.user as { name?: string } | undefined;

  const { data, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: ["murabbi-dashboard"],
    queryFn: () =>
      fetch("/api/murabbi/dashboard").then((r) => {
        if (!r.ok) throw new Error("Failed to load dashboard");
        return r.json();
      }),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen p-4 space-y-4">
        <div className="h-24 bg-muted animate-pulse rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-muted animate-pulse rounded-2xl" />
          <div className="h-24 bg-muted animate-pulse rounded-2xl" />
        </div>
        <div className="h-32 bg-muted animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <AlertTriangle className="size-12 text-red-500" />
        <p className="font-semibold text-lg">Could not load dashboard</p>
        <Button variant="outline" onClick={() => refetch()} className="min-h-[44px]">
          <RefreshCw className="size-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const handleMarkAttendance = () => {
    if (data.todayEvent) {
      setSelectedEventId(data.todayEvent.id);
      navigateTo("park-attendance");
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pt-4 pb-3 px-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Assalamu Alaikum</p>
            <h1 className="text-lg font-bold truncate text-[#4B0A8F] dark:text-purple-300">
              {user?.name || "Murabbi"}
            </h1>
          </div>
          <div className="size-10 rounded-full bg-[#4B0A8F]/10 flex items-center justify-center shrink-0">
            <span className="font-bold text-[#4B0A8F] dark:text-purple-300">
              {user?.name?.charAt(0).toUpperCase() || "M"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-4">
        {/* Today's Group Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="rounded-2xl bg-card border p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-base">{data.groupName}</p>
              <p className="text-xs text-muted-foreground">{data.batchName}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">{data.todayDate}</p>
              <p className="text-xs font-medium text-[#4B0A8F]">{data.parkName}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center justify-center bg-sky-50 dark:bg-sky-950/30 rounded-xl p-2 min-h-[60px]">
              <span className="text-lg font-bold text-sky-700 dark:text-sky-400">{data.totalParticipants}</span>
              <span className="text-[10px] font-medium text-sky-600/70 dark:text-sky-400/70">Total</span>
            </div>
            <div className="flex flex-col items-center justify-center bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-2 min-h-[60px]">
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{data.attendanceSummary.present}</span>
              <span className="text-[10px] font-medium text-emerald-600/70 dark:text-emerald-400/70">Present</span>
            </div>
            <div className="flex flex-col items-center justify-center bg-red-50 dark:bg-red-950/30 rounded-xl p-2 min-h-[60px]">
              <span className="text-lg font-bold text-red-700 dark:text-red-400">{data.attendanceSummary.absent}</span>
              <span className="text-[10px] font-medium text-red-600/70 dark:text-red-400/70">Absent</span>
            </div>
          </div>
        </motion.div>

        {/* Action / Event Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          {data.todayEvent ? (
            <div 
              className={cn(
                "rounded-2xl border p-4 cursor-pointer transition-colors active:scale-[0.98] min-h-[88px] flex items-center justify-between",
                data.todayEvent.isClosed ? "bg-card" : "bg-[#4B0A8F]/5 border-[#4B0A8F]/20"
              )}
              onClick={handleMarkAttendance}
            >
              <div>
                <p className="text-xs font-semibold text-[#4B0A8F] uppercase tracking-wider mb-1">
                  {data.todayEvent.isClosed ? "Completed" : "Today's Session"}
                </p>
                <p className="font-bold text-sm">{data.todayEvent.title}</p>
                {!data.todayEvent.isClosed && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {data.todayEvent.progress}% marked
                  </p>
                )}
              </div>
              <div className={cn(
                "size-10 rounded-full flex items-center justify-center shrink-0",
                data.todayEvent.isClosed ? "bg-muted" : "bg-[#4B0A8F] text-white"
              )}>
                {data.todayEvent.isClosed ? <CheckCircle2 className="size-5" /> : <ChevronRight className="size-5" />}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-card border p-4 min-h-[88px] flex items-center gap-3">
              <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <CalendarCheck className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm">No session today</p>
                <p className="text-xs text-muted-foreground">Enjoy your day off!</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Warning Alerts */}
        {data.topAbsentees.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="size-4 text-red-600" />
              <h3 className="text-sm font-bold text-red-800 dark:text-red-300">Needs Attention</h3>
            </div>
            <div className="space-y-2">
              {data.topAbsentees.map((person) => (
                <div key={person.id} className="flex items-center justify-between bg-white/50 dark:bg-black/20 rounded-xl p-2.5">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {person.name.charAt(0)}
                    </div>
                    <span className="font-medium text-sm text-red-900 dark:text-red-200">{person.name}</span>
                  </div>
                  <span className="text-xs font-bold text-red-600 px-2 py-1 bg-red-100 dark:bg-red-900/50 rounded-full">
                    {person.count}x absent
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Upcoming Schedule Strip */}
        {data.upcomingEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="space-y-2"
          >
            <h3 className="text-sm font-semibold px-1">Upcoming Events</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar px-1">
              {data.upcomingEvents.map((evt) => (
                <div key={evt.id} className="min-w-[140px] rounded-2xl bg-card border p-3 shrink-0 flex flex-col justify-between min-h-[80px]">
                  <p className="text-xs font-semibold truncate">{evt.title}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-2">
                    <Clock className="size-3" />
                    <span>{evt.eventDate}</span>
                  </div>
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
