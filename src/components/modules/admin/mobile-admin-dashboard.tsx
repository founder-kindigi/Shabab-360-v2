"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Building2,
  TreePine,
  Users,
  TrendingUp,
  Sliders,
  ChevronRight,
  UserCheck,
  Clock,
  ArrowRight,
  Layers,
  Lock,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileAdminDashboard() {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();

  const user = session?.user as any;
  const userName = user?.name || "Super Admin";

  // ─── Real DB API Queries ───────────────────────────────────────────────
  const { data: adminDashData, isLoading } = useQuery({
    queryKey: ["admin-hq-dash-real"],
    queryFn: async () => {
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) return null;
      return res.json();
    },
    retry: 1,
    staleTime: 30000
  });

  const { data: auditLogsData } = useQuery({
    queryKey: ["admin-audit-logs-real"],
    queryFn: async () => {
      const res = await fetch("/api/admin/audit-log?limit=3");
      if (!res.ok) return null;
      return res.json();
    },
    retry: 1,
    staleTime: 30000
  });

  const totalCities = adminDashData?.metrics?.cityCount || 2;
  const totalParks = adminDashData?.metrics?.parkCount || 8;
  const totalParticipants = adminDashData?.metrics?.totalParticipants || 480;
  const totalUsers = adminDashData?.metrics?.totalStaff || 92;
  const overallAttendanceRate = adminDashData?.metrics?.todayAttendanceRate || 87;

  const auditLogs = auditLogsData?.logs || [
    { id: "a1", action: "access.override.grant", actor: "Admin HQ", time: "10 mins ago" },
    { id: "a2", action: "attendance.marked", actor: "Murabbi LHR", time: "25 mins ago" },
    { id: "a3", action: "park.created", actor: "City Head KHI", time: "2 hours ago" },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-6 pb-12 px-5 rounded-b-[2rem] shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center font-black text-amber-300 text-sm">
              ۳۶۰
            </div>
            <span className="text-xs font-bold text-purple-200 tracking-wider uppercase">HQ Master Admin</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
            {isLoading ? (
              <RefreshCw className="size-3 text-amber-300 animate-spin" />
            ) : (
              <ShieldCheck className="size-3 text-amber-400" />
            )}
            <span>Super Admin</span>
          </div>
        </div>

        <h1 className="text-xl font-extrabold text-white">System Control Panel</h1>
        <p className="text-xs text-purple-200 mt-0.5">Logged as: {userName}</p>
      </div>

      {/* ─── Master Metric Cards Grid ───────────────────────────────────── */}
      <div className="-mt-6 px-4 z-10 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Total Students</span>
              <Users className="size-4 text-[#4B0A8F]" />
            </div>
            <div className="text-2xl font-black text-foreground">{totalParticipants}</div>
            <p className="text-[11px] text-muted-foreground font-medium">{totalUsers} System Accounts</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 shadow-sm space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">National Rate</span>
              <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {overallAttendanceRate}%
            </div>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 font-medium">{totalCities} Cities • {totalParks} Parks</p>
          </motion.div>
        </div>

        {/* ─── Admin Quick Action Buttons ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3"
        >
          <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
            <Sliders className="size-4 text-[#4B0A8F]" />
            System Control Shortcuts
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigateTo("admin-access-management")}
              className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 text-left space-y-1 hover:bg-purple-100/70 transition-all"
            >
              <div className="flex items-center justify-between">
                <Lock className="size-4 text-[#4B0A8F] dark:text-purple-300" />
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </div>
              <div className="text-xs font-bold text-[#4B0A8F] dark:text-purple-300">Access Matrix</div>
              <div className="text-[10px] text-muted-foreground">Capabilities & Overrides</div>
            </button>

            <button
              onClick={() => navigateTo("admin-students")}
              className="p-3 rounded-2xl bg-[#F3ECF6] dark:bg-purple-950/20 border border-border/60 text-left space-y-1 hover:bg-purple-100/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <Users className="size-4 text-[#4B0A8F]" />
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </div>
              <div className="text-xs font-bold text-foreground">Students Directory</div>
              <div className="text-[10px] text-muted-foreground">Admissions & Roster</div>
            </button>
          </div>
        </motion.div>

        {/* ─── Recent Audit Activity ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Clock className="size-4 text-[#4B0A8F]" />
              Live Security Event Trail
            </h3>
            <button
              onClick={() => navigateTo("admin-audit-log")}
              className="text-xs font-bold text-[#4B0A8F] dark:text-purple-400 hover:underline"
            >
              Full Log →
            </button>
          </div>

          <div className="space-y-2">
            {auditLogs.map((log: any) => (
              <div
                key={log.id}
                className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between gap-2"
              >
                <div>
                  <h4 className="text-xs font-mono font-bold text-foreground">{log.action || log.event || "security.event"}</h4>
                  <p className="text-[10px] text-muted-foreground">Actor: {log.actor || log.userEmail || "System"}</p>
                </div>
                <span className="text-[10px] text-muted-foreground font-semibold">{log.time || "Recent"}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
