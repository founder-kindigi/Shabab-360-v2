"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { motion } from "framer-motion";
import {
  TreePine,
  Users,
  CalendarCheck,
  TrendingUp,
  ChevronRight,
  Sun,
  Moon,
  Bell,
  BookOpen,
  ClipboardList,
  Layers,
  ArrowRight,
  Package,
  ShieldCheck,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/theme-provider";

export interface MobileParkDashboardProps {
  onNavigate?: (screen: string) => void;
  onSelectPark?: (park: any) => void;
}

const FALLBACK_GROUPS = [
  { id: "grp-1", name: "Group Abu Bakr (RA)", murabbi: "Murabbi Usman", enrolled: 14, rate: 86 },
  { id: "grp-2", name: "Group Umar Farooq (RA)", murabbi: "Murabbi Bilal", enrolled: 16, rate: 75 },
  { id: "grp-3", name: "Group Usman Ghani (RA)", murabbi: "Murabbi Tariq", enrolled: 12, rate: 67 },
  { id: "grp-4", name: "Group Ali Murtaza (RA)", murabbi: "Murabbi Hamza", enrolled: 12, rate: 83 },
];

export function MobileParkDashboard({ onNavigate, onSelectPark }: MobileParkDashboardProps = {}) {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();
  const { setTheme, resolvedTheme } = useTheme();

  const user = session?.user as any;
  const userName = user?.name || "Park Lead";

  const handleNav = (screen: string) => {
    if (onNavigate) {
      onNavigate(screen);
    } else {
      navigateTo(screen as any);
    }
  };

  // ─── Real DB API Query ─────────────────────────────────────────────────
  const { data: parkData, isLoading, refetch } = useQuery({
    queryKey: ["park-dashboard-real"],
    queryFn: async () => {
      const res = await fetch("/api/park/dashboard");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000,
  });

  const parkName = parkData?.park?.name || "Gulberg Park";
  const cityName = parkData?.park?.cityName || "Lahore";
  const totalEnrolled = parkData?.recentSummary?.totalParticipants ?? 54;
  const attendanceRate = parkData?.recentSummary?.last7DaysAttendanceRate ?? 78;

  const rawGroups: any[] = parkData?.groupBreakdown ?? [];
  const groupBreakdown = rawGroups.length > 0
    ? rawGroups.map((g) => ({
        id: g.id,
        name: g.name,
        murabbi: g.murabbiName || "Assigned Murabbi",
        enrolled: g.totalParticipants ?? g.enrolled ?? 12,
        rate: g.todayProgress ?? g.rate ?? 75,
      }))
    : FALLBACK_GROUPS;

  const totalMurabbis = groupBreakdown.length || 4;

  const handleOpenParkDetail = () => {
    if (onSelectPark) {
      onSelectPark({
        parkId: parkData?.park?.id || "park-lhr-2",
        parkName,
        murabbiCount: totalMurabbis,
        studentCount: totalEnrolled,
      });
    } else {
      handleNav("park-detail");
    }
  };

  return (
    <div className="w-full max-w-[460px] mx-auto flex flex-col min-h-screen bg-background text-foreground pb-24 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#D90429] pt-12 pb-8 rounded-b-[2.5rem] shadow-2xl relative z-10 px-5 text-white">
        {/* Top row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-white/10 border border-white/20 p-1.5 shadow-inner backdrop-blur-sm flex items-center justify-center shrink-0">
              <img src="/logo-white.png" alt="Logo" className="size-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tight leading-none text-white">SHABAB 360</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  Park Lead
                </span>
              </div>
              <p className="text-[10px] text-purple-200 font-bold uppercase tracking-widest mt-1">
                Field Operations Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="size-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white active:scale-95 transition-transform"
              title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="size-4 text-amber-300" />
              ) : (
                <Moon className="size-4 text-purple-200" />
              )}
            </button>
            <button
              onClick={() => handleNav("notifications")}
              className="size-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white relative active:scale-95 transition-transform"
            >
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 size-2 bg-[#D90429] rounded-full border border-white"></span>
            </button>
          </div>
        </div>

        {/* Park Info & Batch */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">{parkName}</h1>
            <p className="text-xs text-purple-200 font-medium mt-0.5">
              {cityName} • Manager: {userName}
            </p>
          </div>
          <button className="flex items-center gap-1.5 bg-white/15 border border-white/20 px-3 py-1.5 rounded-full text-white text-xs font-bold backdrop-blur-md">
            <span>Batch 4</span>
            <span className="opacity-70 text-[10px]">▼</span>
          </button>
        </div>

        {/* 3 Glassmorphic KPI Pills */}
        <div className="grid grid-cols-3 gap-2.5 w-full">
          <div className="bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <Users className="size-4 text-purple-200 mb-1" />
            <span className="text-xl font-black text-white">{totalEnrolled}</span>
            <span className="text-[9px] font-bold text-purple-200 uppercase tracking-wider">Shabab</span>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <ShieldCheck className="size-4 text-purple-200 mb-1" />
            <span className="text-xl font-black text-white">{totalMurabbis}</span>
            <span className="text-[9px] font-bold text-purple-200 uppercase tracking-wider">Murabbis</span>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <TrendingUp className="size-4 text-emerald-300 mb-1" />
            <span className="text-xl font-black text-white">{attendanceRate}%</span>
            <span className="text-[9px] font-bold text-purple-200 uppercase tracking-wider">Today Att.</span>
          </div>
        </div>
      </div>

      {/* ─── Body Content ────────────────────────────────────────────────── */}
      <div className="px-5 pt-6 space-y-5">
        {/* Primary Action Card: Mark Roster */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-3xl bg-gradient-to-br from-card via-card to-purple-50/50 dark:to-purple-950/20 border border-[#4B0A8F]/30 shadow-md space-y-3.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-2xl bg-[#4B0A8F]/15 text-[#4B0A8F] dark:text-purple-300 flex items-center justify-center font-bold">
                <CalendarCheck className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-foreground">Sunday Training Session</h3>
                <p className="text-xs text-muted-foreground font-medium">Full Park Attendance Roster</p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              Live Session
            </span>
          </div>

          <button
            onClick={handleOpenParkDetail}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#4B0A8F] to-[#D90429] hover:opacity-95 text-white font-extrabold text-sm shadow-md shadow-purple-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <span>Open & Mark Attendance Roster</span>
            <ArrowRight className="size-4" />
          </button>
        </motion.div>

        {/* Operational Modules Row */}
        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
            Park Modules
          </h2>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={handleOpenParkDetail}
              className="p-3 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all hover:bg-muted/40"
            >
              <div className="size-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Users className="size-4" />
              </div>
              <span className="text-[10px] font-bold text-foreground leading-tight">Structure</span>
            </button>

            <button
              onClick={handleOpenParkDetail}
              className="p-3 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all hover:bg-muted/40"
            >
              <div className="size-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <BookOpen className="size-4" />
              </div>
              <span className="text-[10px] font-bold text-foreground leading-tight">Lessons</span>
            </button>

            <button
              onClick={handleOpenParkDetail}
              className="p-3 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all hover:bg-muted/40"
            >
              <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <ClipboardList className="size-4" />
              </div>
              <span className="text-[10px] font-bold text-foreground leading-tight">Planner</span>
            </button>

            <button
              onClick={() => handleNav("inventory")}
              className="p-3 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all hover:bg-muted/40"
            >
              <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Package className="size-4" />
              </div>
              <span className="text-[10px] font-bold text-foreground leading-tight">Inventory</span>
            </button>
          </div>
        </div>

        {/* ─── Groups Breakdown ─────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="size-4 text-[#4B0A8F] dark:text-purple-400" />
              Groups Breakdown ({groupBreakdown.length})
            </h3>
            <button
              onClick={handleOpenParkDetail}
              className="text-xs font-bold text-[#4B0A8F] dark:text-purple-400 hover:underline"
            >
              All Groups →
            </button>
          </div>

          <div className="space-y-2.5">
            {groupBreakdown.map((group, index) => {
              const barColor = group.rate >= 75 ? "bg-emerald-500" : group.rate >= 50 ? "bg-amber-500" : "bg-rose-500";
              return (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  onClick={handleOpenParkDetail}
                  className="p-3.5 rounded-2xl bg-card border border-border/70 hover:border-purple-300 dark:hover:border-purple-800/80 shadow-sm transition-all cursor-pointer space-y-2 active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-foreground">{group.name}</h4>
                      <p className="text-[11px] text-muted-foreground">
                        {group.murabbi} • {group.enrolled} Shabab
                      </p>
                    </div>
                    <span className="text-xs font-black text-[#4B0A8F] dark:text-purple-300 px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950/60">
                      {group.rate}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", barColor)}
                      style={{ width: `${group.rate}%` }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
