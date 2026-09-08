"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { motion } from "framer-motion";
import {
  Users,
  CalendarCheck,
  TrendingUp,
  ChevronRight,
  Sun,
  Moon,
  Bell,
  CheckCircle2,
  PhoneCall,
  MessageCircle,
  Award,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/theme-provider";

export interface MobileMurabbiDashboardProps {
  onNavigate?: (screen: string) => void;
}

const FALLBACK_SHABAB = [
  { id: "shabab-1", name: "Muhammad Umair", rate: 92, phone: "923001234567", status: "present" },
  { id: "shabab-2", name: "Abdullah Tariq", rate: 85, phone: "923217654321", status: "present" },
  { id: "shabab-3", name: "Hamza Farooq", rate: 78, phone: "923339876543", status: "absent" },
  { id: "shabab-4", name: "Zaid Bin Haris", rate: 95, phone: "923125554433", status: "present" },
  { id: "shabab-5", name: "Usman Ali", rate: 70, phone: "923451122334", status: "absent" },
];

export function MobileMurabbiDashboard({ onNavigate }: MobileMurabbiDashboardProps = {}) {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();
  const { setTheme, resolvedTheme } = useTheme();

  const user = session?.user as any;
  const userName = user?.name || "Murabbi";

  const handleNav = (screen: string) => {
    if (onNavigate) {
      onNavigate(screen);
    } else {
      navigateTo(screen as any);
    }
  };

  // ─── Real DB API Query ─────────────────────────────────────────────────
  const { data: parkData, isLoading } = useQuery({
    queryKey: ["murabbi-park-data"],
    queryFn: async () => {
      const res = await fetch("/api/park/dashboard");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!session?.user,
    retry: false,
    staleTime: 30000,
  });

  const totalStudents = parkData?.recentSummary?.totalParticipants ?? 14;
  const firstGroup = parkData?.groupBreakdown?.[0];
  const groupName = firstGroup?.name || "Group Abu Bakr (RA)";
  const parkName = parkData?.park?.name || "Gulberg Park";
  const cityName = parkData?.park?.cityName || "Lahore";
  const todayRate = parkData?.recentSummary?.last7DaysAttendanceRate ?? 82;
  const presentCount = Math.round((totalStudents * todayRate) / 100) || 11;

  return (
    <div className="w-full max-w-[460px] mx-auto flex flex-col min-h-screen bg-background text-foreground pb-24 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#D90429] pt-12 pb-8 rounded-b-[2.5rem] shadow-2xl relative z-10 px-5 text-white">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-white/10 border border-white/20 p-1.5 shadow-inner backdrop-blur-sm flex items-center justify-center shrink-0">
              <img src="/logo-white.png" alt="Logo" className="size-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tight leading-none text-white">SHABAB 360</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-400/30 text-purple-100 border border-purple-300/30">
                  Murabbi
                </span>
              </div>
              <p className="text-[10px] text-purple-200 font-bold uppercase tracking-widest mt-1">
                Tarbiyah & Mentor Portal
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

        {/* Murabbi Welcome & Scope */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Assalam-o-Alaikum</h1>
            <p className="text-xs text-purple-200 font-medium mt-0.5">
              {userName} • {groupName}
            </p>
          </div>
          <button className="flex items-center gap-1.5 bg-white/15 border border-white/20 px-3 py-1.5 rounded-full text-white text-xs font-bold backdrop-blur-md">
            <span>{parkName}</span>
          </button>
        </div>

        {/* 3 Glassmorphic KPI Pills */}
        <div className="grid grid-cols-3 gap-2.5 w-full">
          <div className="bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <Users className="size-4 text-purple-200 mb-1" />
            <span className="text-xl font-black text-white">{totalStudents}</span>
            <span className="text-[9px] font-bold text-purple-200 uppercase tracking-wider">Shabab</span>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="size-4 text-emerald-300 mb-1" />
            <span className="text-xl font-black text-white">{presentCount}</span>
            <span className="text-[9px] font-bold text-purple-200 uppercase tracking-wider">Present</span>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <TrendingUp className="size-4 text-amber-300 mb-1" />
            <span className="text-xl font-black text-white">{todayRate}%</span>
            <span className="text-[9px] font-bold text-purple-200 uppercase tracking-wider">Rate</span>
          </div>
        </div>
      </div>

      {/* ─── Content Body ────────────────────────────────────────────────── */}
      <div className="px-5 pt-6 space-y-5">
        {/* Primary Action Card: Mark Group Roster */}
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
                <h3 className="text-sm font-black text-foreground">Sunday Group Session</h3>
                <p className="text-xs text-muted-foreground font-medium">Mark Today's Shabab Attendance</p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              Today
            </span>
          </div>

          <button
            onClick={() => handleNav("parks")}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#4B0A8F] to-[#D90429] hover:opacity-95 text-white font-extrabold text-sm shadow-md shadow-purple-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <span>Mark Group Attendance</span>
            <ArrowRight className="size-4" />
          </button>
        </motion.div>

        {/* Tarbiyah & Mentor Modules */}
        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
            Tarbiyah Toolkit
          </h2>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleNav("islah")}
              className="p-3 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all hover:bg-muted/40"
            >
              <div className="size-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <ClipboardCheck className="size-4" />
              </div>
              <span className="text-[10px] font-bold text-foreground leading-tight">Mamulat</span>
            </button>

            <button
              onClick={() => handleNav("calling")}
              className="p-3 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all hover:bg-muted/40"
            >
              <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <PhoneCall className="size-4" />
              </div>
              <span className="text-[10px] font-bold text-foreground leading-tight">Calling</span>
            </button>

            <button
              onClick={() => handleNav("evaluation")}
              className="p-3 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all hover:bg-muted/40"
            >
              <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Award className="size-4" />
              </div>
              <span className="text-[10px] font-bold text-foreground leading-tight">Evaluations</span>
            </button>

            <button
              onClick={() => handleNav("mashwara")}
              className="p-3 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all hover:bg-muted/40"
            >
              <div className="size-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <BookOpen className="size-4" />
              </div>
              <span className="text-[10px] font-bold text-foreground leading-tight">Mashwara</span>
            </button>
          </div>
        </div>

        {/* ─── Assigned Shabab Roster Preview ─────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Users className="size-4 text-[#4B0A8F] dark:text-purple-400" />
              Group Shabab ({FALLBACK_SHABAB.length})
            </h3>
            <button
              onClick={() => handleNav("calling")}
              className="text-xs font-bold text-[#4B0A8F] dark:text-purple-400 hover:underline"
            >
              View All →
            </button>
          </div>

          <div className="space-y-2.5">
            {FALLBACK_SHABAB.map((shabab, index) => {
              const isPresent = shabab.status === "present";
              const initials = shabab.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("");

              return (
                <motion.div
                  key={shabab.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="p-3.5 rounded-2xl bg-card border border-border/70 hover:border-purple-300 dark:hover:border-purple-800/80 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-[#4B0A8F] dark:text-purple-300 font-extrabold text-xs flex items-center justify-center shrink-0 border border-purple-200/50 dark:border-purple-800/40">
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-extrabold text-foreground truncate">{shabab.name}</h4>
                        <span
                          className={cn(
                            "text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase",
                            isPresent
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                          )}
                        >
                          {isPresent ? "Present" : "Absent"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        30-Day Rate: <span className="font-bold text-foreground">{shabab.rate}%</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={`https://wa.me/${shabab.phone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="size-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center active:scale-95 transition-transform"
                      title="WhatsApp Shabab"
                    >
                      <MessageCircle className="size-4" />
                    </a>
                    <a
                      href={`tel:${shabab.phone}`}
                      className="size-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/40 text-[#4B0A8F] dark:text-purple-300 flex items-center justify-center active:scale-95 transition-transform"
                      title="Call Shabab"
                    >
                      <PhoneCall className="size-4" />
                    </a>
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
