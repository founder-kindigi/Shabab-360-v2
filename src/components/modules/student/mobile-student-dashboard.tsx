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
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileStudentDashboard() {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();

  const user = session?.user as any;
  const studentName = user?.name || "Muhammad Ali Raza";

  const mockStudentData = {
    code: "LHR-SLP-001",
    parkName: "State Life Park",
    groupName: "Group 01 (Senior)",
    attendancePercentage: 92,
    totalAttended: 11,
    totalSessions: 12,
    badgeTitle: "Gold Attendance Rank",
    upcomingActivity: {
      title: "Sports & Martial Arts Halqa",
      date: "Sunday, Aug 9, 2026",
      time: "08:00 AM",
      location: "State Life Park Grounds"
    },
    recentAnnouncements: [
      { id: "an1", title: "Upcoming Special Tadreeb Camp Registration", date: "2 days ago" },
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
            <span className="text-xs font-bold text-purple-200 tracking-wider uppercase">Student Portal</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold bg-amber-400/20 text-amber-200 px-2.5 py-1 rounded-full border border-amber-400/30">
            <Award className="size-3 text-amber-300" />
            <span>{mockStudentData.badgeTitle}</span>
          </div>
        </div>

        <h1 className="text-xl font-extrabold text-white">Assalam-o-Alaikum, {studentName}</h1>
        <p className="text-xs text-purple-200 mt-0.5">ID: {mockStudentData.code} • {mockStudentData.groupName}</p>
      </div>

      {/* ─── Student Metrics ────────────────────────────────────────────── */}
      <div className="-mt-6 px-4 z-10 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 shadow-sm space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">My Attendance</span>
              <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {mockStudentData.attendancePercentage}%
            </div>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 font-medium">
              {mockStudentData.totalAttended} of {mockStudentData.totalSessions} Attended
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">My Group</span>
              <GraduationCap className="size-4 text-[#4B0A8F]" />
            </div>
            <div className="text-base font-bold text-foreground truncate">{mockStudentData.groupName}</div>
            <p className="text-[11px] text-muted-foreground font-medium">{mockStudentData.parkName}</p>
          </motion.div>
        </div>

        {/* ─── Next Activity Card ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Clock className="size-4 text-[#4B0A8F]" />
              Next Scheduled Activity
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              Confirmed
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/50 space-y-1.5">
            <h4 className="text-sm font-bold text-foreground">{mockStudentData.upcomingActivity.title}</h4>
            <p className="text-xs text-[#4B0A8F] dark:text-purple-300 font-semibold">
              {mockStudentData.upcomingActivity.date} • {mockStudentData.upcomingActivity.time}
            </p>
            <p className="text-[11px] text-muted-foreground">{mockStudentData.upcomingActivity.location}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
