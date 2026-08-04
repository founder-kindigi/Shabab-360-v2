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
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileCityHeadDashboard() {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();

  const user = session?.user as any;
  const userName = user?.name || "City Head";

  const mockCityData = {
    cityName: "Lahore City",
    cityCode: "LHR",
    parkCount: 6,
    batchCount: 2,
    groupCount: 13,
    totalStudents: 254,
    totalStaff: 51,
    cityAttendanceRate: 86,
    parkPerformance: [
      { id: "p1", name: "State Life School Park", enrolled: 48, rate: 92, lead: "Tariq Mahmood" },
      { id: "p2", name: "Model Town Park", enrolled: 42, rate: 88, lead: "Kamran Shah" },
      { id: "p3", name: "Gulberg Central Park", enrolled: 40, rate: 85, lead: "Zubair Ahmad" },
      { id: "p4", name: "Johar Town Park", enrolled: 44, rate: 82, lead: "Waseem Akram" },
      { id: "p5", name: "DHA Phase 5 Park", enrolled: 40, rate: 80, lead: "Usman Ghani" },
      { id: "p6", name: "Iqbal Town Park", enrolled: 40, rate: 78, lead: "Bilal Hassan" },
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
            <span className="text-xs font-bold text-purple-200 tracking-wider uppercase">City Head Portal</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
            <Building2 className="size-3 text-amber-400" />
            <span>Scope: {mockCityData.cityCode}</span>
          </div>
        </div>

        <h1 className="text-xl font-extrabold text-white">{mockCityData.cityName}</h1>
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
            <div className="text-2xl font-black text-foreground">{mockCityData.parkCount}</div>
            <p className="text-[11px] text-muted-foreground font-medium">{mockCityData.groupCount} Groups • {mockCityData.totalStaff} Staff</p>
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
              {mockCityData.cityAttendanceRate}%
            </div>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 font-medium">{mockCityData.totalStudents} Total Students</p>
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
            {mockCityData.parkPerformance.map((park, index) => (
              <div
                key={park.id}
                onClick={() => navigateTo("park-dashboard")}
                className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 hover:bg-muted/70 transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-full bg-[#4B0A8F]/10 text-[#4B0A8F] flex items-center justify-center font-bold text-xs shrink-0">
                    #{index + 1}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-foreground truncate">{park.name}</h4>
                    <p className="text-[11px] text-muted-foreground truncate">Lead: {park.lead} • {park.enrolled} Students</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    {park.rate}%
                  </span>
                  <p className="text-[10px] text-muted-foreground">Attendance</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Action Button */}
        <button
          onClick={() => navigateTo("admin-parks")}
          className="w-full h-12 rounded-2xl bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Plus className="size-5" />
          <span>Provision New City Park</span>
        </button>
      </div>
    </div>
  );
}
