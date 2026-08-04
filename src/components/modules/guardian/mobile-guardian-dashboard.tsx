"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Users,
  CheckCircle2,
  TrendingUp,
  Clock,
  ChevronRight,
  PhoneCall,
  DollarSign,
  CalendarCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileGuardianDashboard() {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();

  const user = session?.user as any;
  const guardianName = user?.name || "Tariq Ahmed";

  const mockGuardianData = {
    children: [
      {
        id: "c1",
        name: "Muhammad Ali Raza",
        code: "LHR-SLP-001",
        park: "State Life Park",
        group: "Group 01 (Senior)",
        attendanceRate: 92,
        lastStatus: "present",
        lastDate: "Last Sunday (Aug 2)"
      },
      {
        id: "c2",
        name: "Hassan Ahmed",
        code: "LHR-SLP-002",
        park: "State Life Park",
        group: "Group 02 (Junior)",
        attendanceRate: 88,
        lastStatus: "present",
        lastDate: "Last Sunday (Aug 2)"
      }
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
            <span className="text-xs font-bold text-purple-200 tracking-wider uppercase">Guardian Portal</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
            <ShieldCheck className="size-3 text-emerald-400" />
            <span>Verified Guardian</span>
          </div>
        </div>

        <h1 className="text-xl font-extrabold text-white">Assalam-o-Alaikum, {guardianName}</h1>
        <p className="text-xs text-purple-200 mt-0.5">Linked Children: {mockGuardianData.children.length}</p>
      </div>

      {/* ─── Linked Children Cards ───────────────────────────────────────── */}
      <div className="-mt-6 px-4 z-10 space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            My Enrolled Children
          </h3>
          <span className="text-xs text-muted-foreground">{mockGuardianData.children.length} Active</span>
        </div>

        <div className="space-y-3">
          {mockGuardianData.children.map((child) => (
            <motion.div
              key={child.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-full bg-[#4B0A8F]/10 text-[#4B0A8F] flex items-center justify-center font-black text-xs">
                    {child.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{child.name}</h4>
                    <p className="text-[11px] text-muted-foreground">{child.code} • {child.group}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {child.attendanceRate}%
                  </span>
                  <p className="text-[10px] text-muted-foreground">Attendance</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Last Session Status: Present
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                  {child.lastDate}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
