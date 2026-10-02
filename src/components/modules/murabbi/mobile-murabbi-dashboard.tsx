"use client";
import Image from "next/image";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Users,
  CalendarCheck, CalendarX,
  TrendingUp,
  Sun,
  Moon,
  Bell,
  CheckCircle2,
  PhoneCall,
  Award,
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  RefreshCw,
  TreePine,
} from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";

export interface MobileMurabbiDashboardProps {
  /** PWA navigation is owned by PwaApp; this dashboard never navigates by itself. */
  onNavigate?: (screen: string) => void;
  onOpenAttendance?: (park: { parkId: string; parkName: string; murabbiCount: number; studentCount: number }) => void;
}

/**
 * Assigned Murabbi home.
 *
 * The attendance action is always available when the server confirms a real
 * assigned group, so a non-class day no longer hides the only route into the
 * scoped group attendance workspace. The park and group come only from the
 * server-scoped dashboard response; nothing is inferred client-side.
 */
export function MobileMurabbiDashboard({ onNavigate, onOpenAttendance }: MobileMurabbiDashboardProps = {}) {
  const { data: session } = useSession();
  const { setTheme, resolvedTheme } = useTheme();

  const user = session?.user as any;
  const userName = user?.name || "Murabbi";

  const handleNav = (screen: string) => {
    onNavigate?.(screen);
  };

  const { data: parkData, isLoading, isError, refetch } = useQuery({
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

  const parkId: string = parkData?.park?.id ?? "";
  const parkName: string = parkData?.park?.name || "No Park Assigned";
  const cityName: string = parkData?.park?.cityName || "";
  const groups: any[] = parkData?.groupBreakdown ?? [];
  const assignedGroup = groups[0];
  const hasGroup = Boolean(assignedGroup);
  const groupName: string = assignedGroup?.name || "No group assigned yet";
  const totalStudents = parkData?.recentSummary?.totalParticipants ?? 0;
  const presentCount = parkData?.todayAttendance?.present ?? 0;
  const todayRate = parkData?.todayAttendance?.rate ?? 0;
  const activeEvent = parkData?.events?.find((e: any) => !e.isClosed);
  const hasScheduledSession = Boolean(activeEvent);

  const openGroupAttendance = () => {
    // Only ever hand PwaApp a park the server confirmed for this Murabbi.
    if (!parkId || !hasGroup) return;
    onOpenAttendance?.({ parkId, parkName, murabbiCount: 0, studentCount: totalStudents });
  };

  // ── Loading / failure / missing-scope states ───────────────────────────────
  if (isLoading) {
    return (
      <div className="w-full max-w-[460px] mx-auto flex flex-col items-center justify-center min-h-screen bg-background text-foreground gap-4">
        <RefreshCw className="size-8 text-muted-foreground animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Loading your group…</p>
      </div>
    );
  }

  if (isError || parkData === null) {
    return (
      <div className="w-full max-w-[460px] mx-auto flex flex-col items-center justify-center min-h-screen bg-background text-foreground gap-4 px-8 text-center">
        <CalendarX className="size-8 text-rose-500" />
        <p className="text-sm font-bold text-foreground">Could not load your group</p>
        <p className="text-xs text-muted-foreground">Check your connection or contact your Park Lead.</p>
        <button
          onClick={() => refetch()}
          className="mt-2 px-4 py-2 rounded-xl bg-[#4B0A8F] text-white text-xs font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!parkId) {
    return (
      <div className="w-full max-w-[460px] mx-auto flex flex-col items-center justify-center min-h-screen bg-background text-foreground gap-4 px-8 text-center">
        <TreePine className="size-8 text-muted-foreground" />
        <p className="text-sm font-bold text-foreground">No park assigned</p>
        <p className="text-xs text-muted-foreground">You have not been assigned to a park yet. Contact your administrator.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[460px] mx-auto flex flex-col min-h-screen bg-background text-foreground pb-24 select-none">
      {/* Top Brand Header */}
      <div className="w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#D90429] pt-12 pb-8 rounded-b-[2.5rem] shadow-2xl relative z-10 px-5 text-white">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-white/10 border border-white/20 p-1.5 shadow-inner backdrop-blur-sm flex items-center justify-center shrink-0">
              <Image src="/logo-white.png" alt="Logo" width={160} height={160} className="size-full object-contain" />
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

        {hasGroup && (
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
        )}
      </div>

      {/* Content Body */}
      <div className="px-5 pt-6 space-y-5">
        {!hasGroup ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-3xl bg-card border border-border/70 shadow-sm text-center space-y-2 flex flex-col items-center justify-center"
          >
            <div className="size-10 rounded-2xl bg-muted/50 text-muted-foreground flex items-center justify-center mb-1">
              <TreePine className="size-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No group assigned yet</h3>
            <p className="text-xs text-muted-foreground font-medium">
              Group attendance stays unavailable until a Park Lead assigns your group. {cityName || parkName} is your assigned park.
            </p>
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-3xl bg-gradient-to-br from-card via-card to-purple-50/50 dark:to-purple-950/20 border border-[#4B0A8F]/30 shadow-md space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-2xl bg-[#4B0A8F]/15 text-[#4B0A8F] dark:text-purple-300 flex items-center justify-center font-bold">
                    {hasScheduledSession ? <CalendarCheck className="size-5" /> : <CalendarX className="size-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-foreground">
                      {hasScheduledSession ? (activeEvent?.title || "Scheduled Session") : "No class scheduled today"}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium">
                      {hasScheduledSession
                        ? `${groupName} · mark today's Shabab attendance`
                        : "Open your group attendance and check other dates."}
                    </p>
                  </div>
                </div>
                <span
                  className={
                    hasScheduledSession
                      ? "text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-muted text-muted-foreground"
                  }
                >
                  {hasScheduledSession ? "Today" : "No session today"}
                </span>
              </div>

              <button
                onClick={openGroupAttendance}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#4B0A8F] to-[#D90429] hover:opacity-95 text-white font-extrabold text-sm shadow-md shadow-purple-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <span>{hasScheduledSession ? "Mark Group Attendance" : "Open Group Attendance"}</span>
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
          </>
        )}
      </div>
    </div>
  );
}
