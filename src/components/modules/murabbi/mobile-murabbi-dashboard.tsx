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
  PhoneCall
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileMurabbiDashboard() {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();

  const user = session?.user as any;
  const userName = user?.name || "Murabbi";

  // Simulated or API fetched dashboard state
  const mockData = {
    groupName: "Group 01 (Senior)",
    parkName: "State Life Park",
    cityName: "Lahore",
    totalStudents: 12,
    todayAttendanceRate: 83,
    markedCount: 10,
    unmarkedCount: 2,
    topAbsentees: [
      { id: "s3", name: "Usman Tariq", consecutiveAbsences: 3, risk: "High (Dropout Warning)" },
      { id: "s8", name: "Saad Malik", consecutiveAbsences: 2, risk: "Medium" },
    ],
    upcomingSessions: [
      { id: "ev1", title: "Regular Sunday Halqa & Sports", date: "Sunday, Aug 9, 2026", time: "08:00 AM" },
      { id: "ev2", title: "Special Tadreeb Workshop", date: "Sunday, Aug 16, 2026", time: "09:30 AM" },
    ]
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-6 pb-12 px-5 rounded-b-[2rem] shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center font-black text-amber-300 text-sm">
              ۳۶۰
            </div>
            <span className="text-xs font-bold text-purple-200 tracking-wider uppercase">Murabbi Portal</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
            <ShieldCheck className="size-3 text-emerald-400" />
            <span>Assigned: {mockData.groupName}</span>
          </div>
        </div>

        <h1 className="text-xl font-extrabold text-white">Assalam-o-Alaikum, {userName}</h1>
        <p className="text-xs text-purple-200 mt-0.5">{mockData.parkName} • {mockData.cityName}</p>
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
            <div className="text-2xl font-black text-foreground">{mockData.totalStudents}</div>
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
              {mockData.todayAttendanceRate}%
            </div>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 font-medium">
              {mockData.markedCount} of {mockData.totalStudents} marked
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
              {mockData.unmarkedCount} Pending
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
              <span>Marking Progress</span>
              <span>{mockData.markedCount}/{mockData.totalStudents}</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-[#4B0A8F] rounded-full transition-all duration-500"
                style={{ width: `${(mockData.markedCount / mockData.totalStudents) * 100}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => navigateTo("park-attendance")}
            className="w-full h-12 rounded-2xl bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white font-bold text-sm shadow-md shadow-[#4B0A8F]/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <span>Open & Mark Attendance Roster</span>
            <ArrowRight className="size-4" />
          </button>
        </motion.div>

        {/* ─── Consecutive Absence Risk Watchlist ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <AlertTriangle className="size-4 text-amber-500" />
              Dropout Warning Watchlist
            </h3>
            <span className="text-[11px] text-muted-foreground font-semibold">
              {mockData.topAbsentees.length} Students
            </span>
          </div>

          <div className="space-y-2">
            {mockData.topAbsentees.map((student) => (
              <div
                key={student.id}
                className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/40 flex items-center justify-between gap-2"
              >
                <div>
                  <h4 className="text-xs font-bold text-foreground">{student.name}</h4>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                    {student.consecutiveAbsences} consecutive absences • {student.risk}
                  </p>
                </div>
                <button
                  onClick={() => navigateTo("admin-calling")}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-semibold flex items-center gap-1 shadow-sm active:scale-95 transition-all shrink-0"
                >
                  <PhoneCall className="size-3" />
                  <span>Call</span>
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ─── Upcoming Schedule ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3"
        >
          <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
            <Clock className="size-4 text-[#4B0A8F]" />
            Upcoming Halqa Schedule
          </h3>

          <div className="space-y-2">
            {mockData.upcomingSessions.map((session) => (
              <div
                key={session.id}
                className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between gap-2"
              >
                <div>
                  <h4 className="text-xs font-bold text-foreground">{session.title}</h4>
                  <p className="text-[11px] text-muted-foreground">{session.date} • {session.time}</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
