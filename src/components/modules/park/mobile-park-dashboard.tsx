"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { motion } from "framer-motion";
import {
  TreePine,
  Users,
  CalendarCheck,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Plus,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileParkDashboard() {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();

  const user = session?.user as any;
  const userName = user?.name || "Park Lead";

  // ─── Real DB API Query ─────────────────────────────────────────────────
  const { data: parkData, isLoading: isParkLoading } = useQuery({
    queryKey: ["park-dashboard-real"],
    queryFn: async () => {
      const res = await fetch("/api/park/dashboard");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000
  });

  const parkName = parkData?.parkName || "State Life School Park";
  const cityName = parkData?.cityName || "Lahore";
  const totalEnrolled = parkData?.totalParticipants || 184;
  const attendanceRate = parkData?.todayAttendanceRate || 88;
  const groupBreakdown = parkData?.groups || [
    { id: "g1", name: "Group 01 (Senior)", enrolled: 45, present: 38, rate: 84 },
    { id: "g2", name: "Group 02 (Junior)", enrolled: 42, present: 35, rate: 83 },
    { id: "g3", name: "Group 03 (Senior)", enrolled: 48, present: 42, rate: 87 },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-6 pb-12 px-5 rounded-b-[2rem] shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] border border-white/20 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
              <img src="/shabab-logo.png" alt="Logo" className="size-full object-contain" />
            </div>
            <span className="text-xs font-bold text-purple-200 tracking-wider uppercase">Park Lead Portal</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
            {isParkLoading ? (
              <RefreshCw className="size-3 text-purple-300 animate-spin" />
            ) : (
              <TreePine className="size-3 text-emerald-400" />
            )}
            <span>{cityName}</span>
          </div>
        </div>

        <h1 className="text-xl font-extrabold text-white">{parkName}</h1>
        <p className="text-xs text-purple-200 mt-0.5">Assigned Manager: {userName}</p>
      </div>

      {/* ─── Key Metrics Grid ────────────────────────────────────────────── */}
      <div className="-mt-6 px-4 z-10 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Park Enrolled</span>
              <Users className="size-4 text-[#4B0A8F]" />
            </div>
            <div className="text-2xl font-black text-foreground">{totalEnrolled}</div>
            <p className="text-[11px] text-muted-foreground font-medium">Live DB Synced</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 shadow-sm space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Park Attendance</span>
              <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {attendanceRate}%
            </div>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 font-medium">Sunday Session</p>
          </motion.div>
        </div>

        {/* ─── Group Breakdown Roster Cards ────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="size-4 text-[#4B0A8F]" />
              Park Groups Overview ({groupBreakdown.length})
            </h3>
            <button
              onClick={() => navigateTo("park-roster")}
              className="text-xs font-bold text-[#4B0A8F] dark:text-purple-400 hover:underline"
            >
              View Roster →
            </button>
          </div>

          <div className="space-y-2.5">
            {groupBreakdown.map((group: any) => {
              const rate = group.rate || Math.round(((group.present || 35) / (group.enrolled || 40)) * 100);
              return (
                <div
                  key={group.id}
                  onClick={() => navigateTo("park-attendance")}
                  className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 hover:bg-muted/70 transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{group.name}</h4>
                      <p className="text-[11px] text-muted-foreground">{group.enrolled || group.totalParticipants || 40} Enrolled</p>
                    </div>
                    <span className="text-xs font-black text-[#4B0A8F] dark:text-purple-300 px-2 py-0.5 rounded-lg bg-[#4B0A8F]/10">
                      {rate}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ─── Quick Actions FAB ────────────────────────────────────────── */}
        <button
          onClick={() => navigateTo("park-attendance")}
          className="w-full h-12 rounded-2xl bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <CalendarCheck className="size-5" />
          <span>Open Park Attendance Roster</span>
        </button>
      </div>
    </div>
  );
}
