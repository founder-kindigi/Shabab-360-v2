"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  CalendarDays,
  Activity,
  ClipboardCheck,
  Building2,
  PieChart,
} from "lucide-react";

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: "easeOut" },
  }),
};

export function MobileReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "overview", 30],
    queryFn: () => fetch("/api/admin/reports?type=attendance-overview&days=30").then((r) => r.json()),
  });

  return (
    <div className="flex flex-col min-h-screen bg-muted/30 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b px-4 py-4 space-y-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">30-day overview</p>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        )}

        {!isLoading && data && (
          <motion.div
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <motion.div custom={0} variants={cardVariants}>
              <Card className="rounded-2xl border-none shadow-sm relative overflow-hidden bg-gradient-to-br from-[#4B0A8F]/10 to-[#A0006B]/10">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#4B0A8F] uppercase tracking-wider mb-1">Overall Rate</p>
                    <p className="text-3xl font-bold text-[#4B0A8F]">{data.overallRate}%</p>
                  </div>
                  <div className="flex items-center justify-center size-12 rounded-full bg-white/50 text-[#4B0A8F]">
                    <Activity className="size-6" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid grid-cols-2 gap-4">
              <motion.div custom={1} variants={cardVariants}>
                <Card className="rounded-2xl border-none shadow-sm h-full">
                  <CardContent className="p-4">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Total Events</p>
                    <p className="text-xl font-bold">{data.totalEvents}</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div custom={2} variants={cardVariants}>
                <Card className="rounded-2xl border-none shadow-sm h-full">
                  <CardContent className="p-4">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Records</p>
                    <p className="text-xl font-bold">{data.totalRecords}</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <motion.div custom={3} variants={cardVariants}>
              <Card className="rounded-2xl border-none shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ClipboardCheck className="size-4 text-[#A0006B]" />
                    <h3 className="font-semibold text-sm">Status Distribution</h3>
                  </div>
                  <div className="space-y-3">
                    {/* Status bars */}
                    {[
                      { label: "Present", val: data.statusDistribution.present, color: "bg-emerald-500", tColor: "text-emerald-700" },
                      { label: "Absent", val: data.statusDistribution.absent, color: "bg-red-500", tColor: "text-red-700" },
                      { label: "Late", val: data.statusDistribution.late, color: "bg-amber-500", tColor: "text-amber-700" },
                      { label: "Excused", val: data.statusDistribution.excused, color: "bg-violet-500", tColor: "text-violet-700" },
                    ].map(s => {
                      const total = Object.values(data.statusDistribution).reduce((a: any,b: any)=>a+b, 0) as number;
                      const pct = total ? (s.val / total) * 100 : 0;
                      if (!s.val) return null;
                      return (
                        <div key={s.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-muted-foreground">{s.label}</span>
                            <span className={s.tColor}>{s.val} ({Math.round(pct)}%)</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", s.color)} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </div>

      <div className="h-6" />
    </div>
  );
}
