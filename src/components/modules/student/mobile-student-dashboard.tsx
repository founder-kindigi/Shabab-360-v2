"use client";

import { useState } from "react";
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
  Sun,
  Moon,
  Bell,
  CheckCircle2,
  Circle,
  Flame,
  Dumbbell,
  Compass,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/theme-provider";

export interface MobileStudentDashboardProps {
  onNavigate?: (screen: string) => void;
}

export function MobileStudentDashboard({ onNavigate }: MobileStudentDashboardProps = {}) {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();
  const { setTheme, resolvedTheme } = useTheme();

  const user = session?.user as any;

  const handleNav = (screen: string) => {
    if (onNavigate) {
      onNavigate(screen);
    } else {
      navigateTo(screen as any);
    }
  };

  // ─── Interactive Mamulat checklist state ────────────────────────────────
  const [mamulat, setMamulat] = useState<{ [key: string]: boolean }>({
    fajr: true,
    quran: true,
    dhikr: false,
    exercise: true,
  });

  const toggleMamulat = (key: string) => {
    setMamulat((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
    staleTime: 30000,
  });

  const p = studentDashData?.participant;
  const metrics = studentDashData?.metrics;
  const upcoming = studentDashData?.upcomingEvent;

  const studentName = p?.name || user?.name || "Muhammad Umair";
  const parkName = p?.park || "Gulberg Park, Lahore";
  const groupName = p?.group || "Halqa Abu Bakr (RA)";
  const attendanceRate = metrics?.rate30 ?? 92;
  const totalAttended = (metrics?.present30 ?? 11) + (metrics?.late30 ?? 0);
  const totalSessions = metrics?.totalEvents30 ?? 12;

  const completedCount = Object.values(mamulat).filter(Boolean).length;

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
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-400/25 text-amber-200 border border-amber-300/30 flex items-center gap-1">
                  <Award className="size-3" />
                  Cadet Rank 2
                </span>
              </div>
              <p className="text-[10px] text-purple-200 font-bold uppercase tracking-widest mt-1">
                Cadet Training Portal
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

        {/* Student Welcome & Scope */}
        <div className="flex items-center justify-between mb-5">
          <div className="min-w-0 pr-2">
            <h1 className="text-xl font-black text-white tracking-tight truncate">Assalam-o-Alaikum</h1>
            <p className="text-xs text-purple-200 font-medium mt-0.5 truncate">
              {studentName} • {parkName}
            </p>
          </div>
          <button
            onClick={() => handleNav("student-profile")}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 active:scale-95 transition-all border border-white/30 px-3.5 py-1.5 rounded-full text-white text-xs font-bold backdrop-blur-md shadow-sm shrink-0"
          >
            <User className="size-3.5 text-amber-300" />
            <span>My Profile</span>
          </button>
        </div>

        {/* 3 Glassmorphic KPI Pills */}
        <div className="grid grid-cols-3 gap-2.5 w-full">
          <div className="bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <TrendingUp className="size-4 text-emerald-300 mb-1" />
            <span className="text-xl font-black text-white">{attendanceRate}%</span>
            <span className="text-[9px] font-bold text-purple-200 uppercase tracking-wider">Attendance</span>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <Flame className="size-4 text-amber-300 mb-1" />
            <span className="text-xl font-black text-white">480</span>
            <span className="text-[9px] font-bold text-purple-200 uppercase tracking-wider">Points</span>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <Award className="size-4 text-purple-200 mb-1" />
            <span className="text-xl font-black text-white">6</span>
            <span className="text-[9px] font-bold text-purple-200 uppercase tracking-wider">Badges</span>
          </div>
        </div>
      </div>

      {/* ─── Content Body ────────────────────────────────────────────────── */}
      <div className="px-5 pt-6 space-y-5">
        {/* ─── Attendance Gauge Card ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-3xl bg-card border border-border/80 shadow-sm flex items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              30-Day Attendance Record
            </span>
            <div className="text-3xl font-black text-foreground">{attendanceRate}%</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <TrendingUp className="size-3.5" />
              {totalAttended} of {totalSessions} Sessions Attended
            </p>
          </div>

          {/* SVG Gauge Graphic */}
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

        {/* ─── Daily Mamulat Checklist ────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Daily Mamulat Checklist
              </h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-[#4B0A8F] dark:text-purple-300">
                {completedCount}/4 Done
              </span>
            </div>
            <button
              onClick={() => handleNav("islah")}
              className="text-xs font-bold text-[#4B0A8F] dark:text-purple-400 hover:underline"
            >
              Full Log →
            </button>
          </div>

          <div className="space-y-2">
            {[
              { id: "fajr", label: "باجماعت نماز فجر", desc: "Fajr Prayer with Jama'at" },
              { id: "quran", label: "تلاوت کلام پاک", desc: "Quran Recitation (Min 1 Ruku)" },
              { id: "dhikr", label: "اذکار و مسنون دعائیں", desc: "Morning & Evening Supplications" },
              { id: "exercise", label: "جسمانی ورزش و تربیت", desc: "Physical Workout & Running" },
            ].map((item) => {
              const isDone = !!mamulat[item.id];
              return (
                <div
                  key={item.id}
                  onClick={() => toggleMamulat(item.id)}
                  className={cn(
                    "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99]",
                    isDone
                      ? "bg-purple-50/70 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800/60"
                      : "bg-card border-border/70 hover:border-border"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <button
                      className={cn(
                        "size-6 rounded-lg flex items-center justify-center transition-all",
                        isDone
                          ? "bg-gradient-to-br from-[#4B0A8F] to-[#D90429] text-white shadow-sm"
                          : "border-2 border-muted-foreground/30"
                      )}
                    >
                      {isDone && <CheckCircle2 className="size-4" />}
                    </button>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{item.label}</h4>
                      <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      isDone
                        ? "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/50"
                        : "text-muted-foreground"
                    )}
                  >
                    {isDone ? "+10 Pts" : "Pending"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Next Scheduled Session Card ───────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-3xl bg-gradient-to-br from-[#4B0A8F]/10 via-card to-card border border-[#4B0A8F]/20 shadow-sm space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#4B0A8F] dark:text-purple-300 flex items-center gap-1.5">
              <CalendarCheck className="size-3.5" />
              Upcoming Session
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              This Sunday
            </span>
          </div>

          <h3 className="text-sm font-extrabold text-foreground">
            {upcoming?.title || "Regular Sunday Tarbiyah Session"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {upcoming?.eventDateFormatted || "Sunday Morning • 06:30 AM — Gulberg Park Ground"}
          </p>
        </motion.div>

        {/* Student Quick Tools */}
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => handleNav("student-profile")}
            className="p-2.5 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col items-center text-center gap-1 active:scale-95 transition-all hover:bg-muted/40"
          >
            <div className="size-8 rounded-xl bg-purple-500/10 text-[#4B0A8F] dark:text-purple-300 flex items-center justify-center">
              <User className="size-4" />
            </div>
            <span className="text-[10px] font-bold text-foreground leading-tight">Profile</span>
          </button>

          <button
            onClick={() => handleNav("gamification")}
            className="p-2.5 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col items-center text-center gap-1 active:scale-95 transition-all hover:bg-muted/40"
          >
            <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Award className="size-4" />
            </div>
            <span className="text-[10px] font-bold text-foreground leading-tight">Badges</span>
          </button>

          <button
            onClick={() => handleNav("certificates")}
            className="p-2.5 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col items-center text-center gap-1 active:scale-95 transition-all hover:bg-muted/40"
          >
            <div className="size-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <GraduationCap className="size-4" />
            </div>
            <span className="text-[10px] font-bold text-foreground leading-tight">Diplomas</span>
          </button>

          <button
            onClick={() => handleNav("content-planner")}
            className="p-2.5 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col items-center text-center gap-1 active:scale-95 transition-all hover:bg-muted/40"
          >
            <div className="size-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Compass className="size-4" />
            </div>
            <span className="text-[10px] font-bold text-foreground leading-tight">Routine</span>
          </button>
        </div>
      </div>
    </div>
  );
}
