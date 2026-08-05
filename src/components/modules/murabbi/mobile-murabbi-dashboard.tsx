"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { motion } from "framer-motion";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  CalendarCheck,
  ChevronRight,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  PhoneCall,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileMurabbiDashboard() {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();

  const user = session?.user as any;
  const userName = user?.name || "Murabbi";

  // ─── Real DB API Queries ───────────────────────────────────────────────
  const { data: parkData, isLoading: isParkLoading } = useQuery({
    queryKey: ["murabbi-park-data"],
    queryFn: async () => {
      const res = await fetch("/api/park/dashboard");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!session?.user,
    retry: false,
    staleTime: 30000
  });

  // park/dashboard is the canonical source for murabbi scoped data
  // Calculate real metrics from /api/park/dashboard response
  // (park/dashboard is scoped to the murabbi's assigned group when role=murabbi)
  const totalStudents  = parkData?.recentSummary?.totalParticipants        ?? 0;
  const firstGroup     = parkData?.groupBreakdown?.[0];
  const groupName      = firstGroup?.name ?? "My Group";
  const parkName       = parkData?.park?.name    ?? "Loading…";
  const cityName       = parkData?.park?.cityName ?? "";
  const todayRate      = parkData?.recentSummary?.last7DaysAttendanceRate  ?? 0;

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-6 pb-12 px-5 rounded-b-[2rem] shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] border border-white/20 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
              <img src="/shabab-logo.png" alt="Logo" className="size-full object-contain" />
            </div>
            <span className="text-xs font-bold text-purple-200 tracking-wider uppercase">Murabbi Portal</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
            {isParkLoading ? (
              <RefreshCw className="size-3 text-purple-300 animate-spin" />
            ) : (
              <ShieldCheck className="size-3 text-emerald-400" />
            )}
            <span>{groupName}</span>
          </div>
        </div>

        <h1 className="text-xl font-extrabold text-white">Assalam-o-Alaikum, {userName}</h1>
        <p className="text-xs text-purple-200 mt-0.5">{parkName} • {cityName}</p>
      </div>

      {/* ─── Metric Cards Grid ────────────────────────────────────────────── */}
      <div className="-mt-6 px-4 z-10 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Card 1: Total Group Students */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Total Group</span>
              <Users className="size-4 text-[#4B0A8F]" />
            </div>
            <div className="text-2xl font-black text-foreground">{totalStudents}</div>
            <p className="text-[11px] text-muted-foreground font-medium">Active Enrolled</p>
          </motion.div>

          {/* Card 2: Attendance Rate */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 shadow-sm space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Today Rate</span>
              <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {todayRate}%
            </div>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 font-medium">
              Live DB Synced
            </p>
          </motion.div>
        </div>

        {/* ─── Main Action Card: Mark Roster ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-3xl bg-gradient-to-br from-card via-card to-purple-50/50 dark:to-purple-950/20 border border-[#4B0A8F]/20 shadow-md space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-2xl bg-[#4B0A8F]/10 text-[#4B0A8F] flex items-center justify-center">
                <CalendarCheck className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Sunday Halqa Session</h3>
                <p className="text-xs text-muted-foreground font-medium">Today's Roster</p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              Active Roster
            </span>
          </div>

          <button
            onClick={() => navigateTo("park-attendance")}
            className="w-full h-12 rounded-2xl bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white font-bold text-sm shadow-md shadow-[#4B0A8F]/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <span>Open & Mark Attendance Roster</span>
            <ArrowRight className="size-4" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
