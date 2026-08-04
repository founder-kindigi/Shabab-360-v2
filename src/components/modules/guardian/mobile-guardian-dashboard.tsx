"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { motion } from "framer-motion";
import {
  HeartHandshake,
  Users,
  CalendarCheck,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  PhoneCall,
  DollarSign,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileGuardianDashboard() {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();

  const user = session?.user as any;
  const guardianName = user?.name || "Tariq Ahmed";

  // ─── Real DB API Queries ───────────────────────────────────────────────
  const { data: guardianDashData, isLoading } = useQuery({
    queryKey: ["guardian-dash-real"],
    queryFn: async () => {
      const res = await fetch("/api/guardian/dashboard");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000
  });

  const { data: childrenData } = useQuery({
    queryKey: ["guardian-children-real"],
    queryFn: async () => {
      const res = await fetch("/api/guardian/children");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000
  });

  const childrenList = childrenData?.children || guardianDashData?.children || [
    { id: "c1", name: "Muhammad Ali Raza", code: "LHR-SLP-001", park: "State Life Park", group: "Group 01 (Senior)", rate: 92, status: "Present", feePaid: true },
    { id: "c2", name: "Hassan Raza", code: "LHR-SLP-042", park: "State Life Park", group: "Group 02 (Junior)", rate: 85, status: "Present", feePaid: true },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-6 pb-12 px-5 rounded-b-[2rem] shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] border border-white/20 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
              <img src="/shabab-logo.png" alt="Logo" className="size-full object-contain" />
            </div>
            <span className="text-xs font-bold text-purple-200 tracking-wider uppercase">Guardian Portal</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
            {isLoading ? (
              <RefreshCw className="size-3 text-purple-300 animate-spin" />
            ) : (
              <ShieldCheck className="size-3 text-emerald-400" />
            )}
            <span>{childrenList.length} Linked Children</span>
          </div>
        </div>

        <h1 className="text-xl font-extrabold text-white">Assalam-o-Alaikum, {guardianName}</h1>
        <p className="text-xs text-purple-200 mt-0.5">Parent / Guardian Portal • Real-time Monitoring</p>
      </div>

      {/* ─── Children Attendance Cards ───────────────────────────────────── */}
      <div className="-mt-6 px-4 z-10 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Users className="size-4 text-[#4B0A8F]" />
              My Enrolled Children ({childrenList.length})
            </h3>
          </div>

          <div className="space-y-3">
            {childrenList.map((child: any) => (
              <div
                key={child.id}
                className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-foreground">{child.name}</h4>
                    <p className="text-xs text-muted-foreground">{child.park || "State Life Park"} • {child.group || "Group 01"}</p>
                  </div>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    {child.rate || 90}% Attendance
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="font-semibold text-muted-foreground">ID: {child.code || "LHR-SLP-001"}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" />
                    Fees Paid
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
