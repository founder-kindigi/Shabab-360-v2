"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { motion } from "framer-motion";
import {
  Building2,
  TreePine,
  Users,
  TrendingUp,
  Layers,
  MapPin,
  ChevronRight,
  Plus,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileCityHeadDashboard() {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();

  const user = session?.user as any;
  const userName = user?.name || "City Head";

  // ─── Real DB Query ─────────────────────────────────────────────────────
  const { data: adminDashData, isLoading } = useQuery({
    queryKey: ["city-head-dash-real"],
    queryFn: async () => {
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000
  });

  const cityName     = adminDashData?.city?.name ?? "—";
  const cityCode     = adminDashData?.city?.code ?? "—";
  const parkCount    = adminDashData?.parks        ?? 0;
  const groupCount   = adminDashData?.groups       ?? 0;
  const totalStudents = adminDashData?.participants ?? 0;
  const totalStaff   = adminDashData?.staff         ?? 0;
  const todayAtt     = adminDashData?.todayAttendance;
  const cityRate     = (todayAtt?.total ?? 0) > 0
    ? Math.round(((todayAtt.present + todayAtt.late) / todayAtt.total) * 100)
    : 0;

  // Real parks from API — no hardcoded fallback
  const parksList: any[] = adminDashData?.cityParks ?? [];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-6 pb-12 px-5 rounded-b-[2rem] shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] border border-white/20 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
              <img src="/shabab-logo.png" alt="Logo" className="size-full object-contain" />
            </div>
            <span className="text-xs font-bold text-purple-200 tracking-wider uppercase">City Head Portal</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
            {isLoading ? (
              <RefreshCw className="size-3 text-amber-300 animate-spin" />
            ) : (
              <Building2 className="size-3 text-amber-400" />
            )}
            <span>Scope: {cityCode}</span>
          </div>
        </div>

        <h1 className="text-xl font-extrabold text-white">{cityName}</h1>
        <p className="text-xs text-purple-200 mt-0.5">Executive Director: {userName}</p>
      </div>

      {/* ─── Key City Metrics Grid ───────────────────────────────────────── */}
      <div className="-mt-6 px-4 z-10 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">City Parks</span>
              <TreePine className="size-4 text-[#4B0A8F]" />
            </div>
            <div className="text-2xl font-black text-foreground">{parkCount}</div>
            <p className="text-[11px] text-muted-foreground font-medium">{groupCount} Groups • {totalStaff} Staff</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 shadow-sm space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">City Avg Rate</span>
              <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {cityRate}%
            </div>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 font-medium">{totalStudents} Total Students</p>
          </motion.div>
        </div>

        {/* ─── City Parks Performance List ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <BarChart3 className="size-4 text-[#4B0A8F]" />
              Parks Performance Ranking
            </h3>
            <button
              onClick={() => navigateTo("admin-parks")}
              className="text-xs font-bold text-[#4B0A8F] dark:text-purple-400 hover:underline"
            >
              All Parks →
            </button>
          </div>

          <div className="space-y-2.5">
            {parksList.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                {isLoading ? "Loading parks…" : "No parks found for this city"}
              </p>
            ) : (
              parksList.map((park: any, index: number) => (
                <div
                  key={park.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigateTo("park-dashboard")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigateTo("park-dashboard");
                    }
                  }}
                  className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 hover:bg-muted/70 transition-all cursor-pointer flex items-center justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-full bg-[#4B0A8F]/10 text-[#4B0A8F] flex items-center justify-center font-bold text-xs shrink-0">
                      #{index + 1}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate">{park.name}</h4>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {park._count?.batches ?? 0} Batch{park._count?.batches !== 1 ? "es" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-[#4B0A8F] dark:text-purple-300">
                      View →
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
