"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Award,
  CalendarCheck,
  TrendingUp,
  Clock,
  ChevronRight,
  ShieldCheck,
  BookOpen,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileStudentDashboard() {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();

  const user = session?.user as any;

  // ─── Real DB API Queries ───────────────────────────────────────────────
  const { data: studentDashData, isLoading } = useQuery({
    queryKey: ["student-dash-real"],
    queryFn: async () => {
      const res = await fetch("/api/student/dashboard");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000
  });

  const { data: attendanceHistoryData } = useQuery({
    queryKey: ["student-attendance-history-real"],
    queryFn: async () => {
      const res = await fetch("/api/student/attendance-history");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000
  });

  const p = studentDashData?.participant;
  const metrics = studentDashData?.metrics;
  const upcoming = studentDashData?.upcomingEvent;

  const parkName = p?.park ?? "—";
  const groupName = p?.group ?? "—";
  const attendanceRate = metrics?.rate30 ?? 0;
  const totalAttended = (metrics?.present30 ?? 0) + (metrics?.late30 ?? 0);
  const totalSessions = metrics?.totalEvents30 ?? 0;
  const studentName = p?.name || user?.name || "Student";

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-6 pb-12 px-5 rounded-b-[2rem] shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] border border-white/20 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
              <img src="/shabab-logo.png" alt="Logo" className="size-full object-contain" />
            </div>
            <span className="text-xs font-bold text-purple-200 tracking-wider uppercase">Student Portal</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold bg-amber-400/20 text-amber-200 px-2.5 py-1 rounded-full border border-amber-400/30">
            {isLoading ? (
              <RefreshCw className="size-3 animate-spin text-amber-300" />
            ) : (
              <Award className="size-3 text-amber-300" />
            )}
            <span>Active Student</span>
          </div>
        </div>

        <h1 className="text-xl font-extrabold text-white">Assalam-o-Alaikum, {studentName}</h1>
        <p className="text-xs text-purple-200 mt-0.5">{parkName} • {groupName}</p>
      </div>

      {/* ─── Attendance Gauge Card ────────────────────────────────────────── */}
      <div className="-mt-6 px-4 z-10 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-3xl bg-card border border-border/80 shadow-sm flex items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">30-Day Attendance Score</span>
            <div className="text-3xl font-black text-foreground">{attendanceRate}%</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <TrendingUp className="size-3.5" />
              {totalAttended} of {totalSessions} Sessions Attended
            </p>
          </div>

          {/* Circle Gauge Graphic */}
          <div className="relative size-16 shrink-0 flex items-center justify-center">
            <svg className="size-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-muted stroke-current"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-[#4B0A8F] dark:text-purple-400 stroke-current"
                strokeDasharray={`${attendanceRate}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-black text-foreground">{attendanceRate}%</span>
          </div>
        </motion.div>

        {/* ─── Next Scheduled Activity Card ───────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-3xl bg-gradient-to-br from-[#4B0A8F]/10 via-card to-card border border-[#4B0A8F]/20 shadow-sm space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#4B0A8F] dark:text-purple-300 flex items-center gap-1.5">
              <CalendarCheck className="size-3.5" />
              Next Scheduled Halqa
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {upcoming ? "Scheduled" : "No Event Scheduled"}
            </span>
          </div>

          <h3 className="text-sm font-extrabold text-foreground">{upcoming?.title || "Regular Halqa Session"}</h3>
          <p className="text-xs text-muted-foreground">
            {upcoming?.eventDateFormatted || "Check back soon for upcoming schedule"}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
