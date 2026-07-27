"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { motion } from "framer-motion";
import { 
  Building2, 
  Users, 
  TreePine, 
  CalendarCheck,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type TrendPoint = { date: string; present: number; late: number; absent: number };

type DashboardData = {
  city: { id: string; name: string; code: string };
  metrics: {
    parkCount: number;
    batchCount: number;
    groupCount: number;
    totalParticipants: number;
    totalStaff: number;
    attendanceRate7Day: number;
    todayAttendanceRate: number;
  };
  todayDate: string;
  todayEvents: Array<any>;
  parkBreakdown: Array<{
    id: string;
    name: string;
    participants: number;
    groups: number;
    sevenDayRate: number;
  }>;
  recentActivity: Array<any>;
  trend14Day: TrendPoint[];
  feesOverview: {
    totalCollectedThisMonth: number;
    totalPendingFees: number;
  };
};

export function MobileCityHeadDashboard() {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();
  const userName = session?.user?.name || "City Head";

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["city-head-dashboard"],
    queryFn: () =>
      fetch("/api/city-head/dashboard").then((r) => {
        if (!r.ok) throw new Error("Failed to load dashboard");
        return r.json();
      }),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen p-4 space-y-4">
        <div className="h-28 bg-muted animate-pulse rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-muted animate-pulse rounded-2xl" />
          <div className="h-24 bg-muted animate-pulse rounded-2xl" />
        </div>
        <div className="h-40 bg-muted animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <AlertTriangle className="size-12 text-red-500" />
        <p className="font-semibold text-lg">Could not load dashboard</p>
      </div>
    );
  }

  const { city, metrics, parkBreakdown } = data;

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pt-4 pb-3 px-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{userName}</p>
            <h1 className="text-xl font-bold truncate text-[#4B0A8F] dark:text-purple-300 flex items-center gap-2">
              <Building2 className="size-5" />
              {city.name}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-4">
        {/* KPI Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="rounded-2xl bg-violet-50 dark:bg-violet-950/20 border border-violet-100 p-3 flex flex-col justify-between min-h-[96px]">
            <div className="flex items-center gap-2 text-violet-700">
              <Users className="size-4" />
              <span className="text-[10px] font-semibold uppercase">Total Shabab</span>
            </div>
            <p className="text-2xl font-bold text-violet-900 dark:text-violet-100">{metrics.totalParticipants}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 p-3 flex flex-col justify-between min-h-[96px]">
            <div className="flex items-center gap-2 text-emerald-700">
              <TrendingUp className="size-4" />
              <span className="text-[10px] font-semibold uppercase">Overall Att.</span>
            </div>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{metrics.attendanceRate7Day}%</p>
          </div>
          <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/20 border border-sky-100 p-3 flex flex-col justify-between min-h-[96px]">
            <div className="flex items-center gap-2 text-sky-700">
              <TreePine className="size-4" />
              <span className="text-[10px] font-semibold uppercase">Active Parks</span>
            </div>
            <p className="text-2xl font-bold text-sky-900 dark:text-sky-100">{metrics.parkCount}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 p-3 flex flex-col justify-between min-h-[96px]">
            <div className="flex items-center gap-2 text-amber-700">
              <CalendarCheck className="size-4" />
              <span className="text-[10px] font-semibold uppercase">Today&apos;s Att.</span>
            </div>
            <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{metrics.todayAttendanceRate}%</p>
          </div>
        </motion.div>

        {/* Park Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-bold text-foreground">Parks Overview</h2>
            <Button variant="link" size="sm" className="h-auto p-0 text-[#4B0A8F]" onClick={() => navigateTo("admin-parks")}>
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {parkBreakdown.map((park, i) => (
              <div key={park.id} className="rounded-2xl bg-card border p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-sm">{park.name}</p>
                    <p className="text-[10px] text-muted-foreground">{park.participants} members</p>
                  </div>
                  <span className={cn(
                    "text-xs font-bold px-2 py-1 rounded-lg",
                    park.sevenDayRate >= 80 ? "bg-emerald-100 text-emerald-700" :
                    park.sevenDayRate >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                  )}>
                    {park.sevenDayRate}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-2">
                  <div 
                    className={cn(
                      "h-full rounded-full",
                      park.sevenDayRate >= 80 ? "bg-emerald-500" :
                      park.sevenDayRate >= 50 ? "bg-amber-500" : "bg-red-500"
                    )}
                    style={{ width: `${park.sevenDayRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Nav */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="grid gap-3"
        >
          <Button 
            variant="outline" 
            className="w-full h-14 rounded-2xl justify-between px-4 border-border bg-card"
            onClick={() => navigateTo("admin-attendance-events")}
          >
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-[#4B0A8F]/10 flex items-center justify-center">
                <Activity className="size-4 text-[#4B0A8F]" />
              </div>
              <span className="font-semibold text-sm">Attendance Events</span>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Button>
        </motion.div>

        <div className="h-6" />
      </div>
    </div>
  );
}
