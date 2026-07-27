"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { motion } from "framer-motion";
import { 
  Building2, 
  Users, 
  TreePine, 
  GraduationCap,
  ChevronRight,
  TrendingUp,
  Activity,
  Wallet,
  CalendarCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function MobileAdminDashboard() {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();
  const user = session?.user as { name?: string } | undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-dashboard-mobile"],
    queryFn: () => fetch("/api/admin/dashboard").then((r) => r.json()),
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen p-4 space-y-4">
        <div className="h-16 bg-muted animate-pulse rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-muted animate-pulse rounded-2xl" />
          <div className="h-24 bg-muted animate-pulse rounded-2xl" />
        </div>
        <div className="h-40 bg-muted animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <p className="font-semibold text-lg text-red-500">Failed to load dashboard</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pt-4 pb-3 px-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Overview</p>
            <h1 className="text-xl font-bold text-[#4B0A8F] dark:text-purple-300">
              HQ Dashboard
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-5">
        
        {/* Org Summary Chips */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 overflow-x-auto pb-2 no-scrollbar"
        >
          <div className="flex items-center gap-2 bg-card border rounded-full px-4 py-2 shrink-0">
            <Building2 className="size-4 text-violet-500" />
            <span className="text-xs font-semibold">{data.cities} Cities</span>
          </div>
          <div className="flex items-center gap-2 bg-card border rounded-full px-4 py-2 shrink-0">
            <TreePine className="size-4 text-emerald-500" />
            <span className="text-xs font-semibold">{data.parks} Parks</span>
          </div>
          <div className="flex items-center gap-2 bg-card border rounded-full px-4 py-2 shrink-0">
            <GraduationCap className="size-4 text-sky-500" />
            <span className="text-xs font-semibold">{data.participants} Shabab</span>
          </div>
          <div className="flex items-center gap-2 bg-card border rounded-full px-4 py-2 shrink-0">
            <Users className="size-4 text-amber-500" />
            <span className="text-xs font-semibold">{data.staff} Staff</span>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="rounded-2xl bg-gradient-to-br from-[#4B0A8F] to-[#7B2CBF] p-4 text-white min-h-[100px] flex flex-col justify-between shadow-sm">
            <CalendarCheck className="size-5 opacity-70" />
            <div>
              <p className="text-3xl font-bold">{data.todayAttendance?.present || 0}</p>
              <p className="text-[10px] font-medium opacity-80 uppercase tracking-wider">Present Today</p>
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 text-white min-h-[100px] flex flex-col justify-between shadow-sm">
            <Wallet className="size-5 opacity-70" />
            <div>
              <p className="text-2xl font-bold truncate">
                {data.feeSummary?.collectionRate || 0}%
              </p>
              <p className="text-[10px] font-medium opacity-80 uppercase tracking-wider">Fee Collection</p>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions Grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <h2 className="text-sm font-bold mb-3 px-1">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Cities", icon: Building2, path: "admin-cities" },
              { label: "Parks", icon: TreePine, path: "admin-parks" },
              { label: "Staff", icon: Users, path: "admin-users" },
              { label: "Reports", icon: TrendingUp, path: "admin-reports" },
              { label: "Attendance", icon: CalendarCheck, path: "admin-attendance-events" },
              { label: "Fees", icon: Wallet, path: "admin-fees" }
            ].map((action, i) => (
              <Button
                key={action.label}
                variant="outline"
                className="h-16 rounded-2xl bg-card border-border flex flex-col items-center justify-center gap-1 hover:border-[#4B0A8F]/50"
                onClick={() => navigateTo(action.path as any)}
              >
                <action.icon className="size-5 text-[#4B0A8F]" />
                <span className="text-xs font-semibold">{action.label}</span>
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-2xl bg-card border p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-bold">Recent Activity</h2>
          </div>
          <div className="space-y-4">
            {data.recentActivity?.slice(0, 4).map((item: any, i: number) => (
              <div key={i} className="flex gap-3">
                <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold">{item.user?.name?.charAt(0) || "U"}</span>
                </div>
                <div>
                  <p className="text-xs font-medium leading-snug">
                    <span className="font-bold">{item.user?.name || "Someone"}</span> {item.action.toLowerCase()}d a {item.entityType.toLowerCase()}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="h-6" />
      </div>
    </div>
  );
}
