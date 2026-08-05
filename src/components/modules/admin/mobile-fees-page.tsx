"use client";
import { useSession } from "next-auth/react";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  DollarSign,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Plus,
  TrendingUp,
  CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileFeesPageProps {
  onBack?: () => void;
}

export function MobileFeesPage({ onBack }: MobileFeesPageProps) {
  const { data: session } = useSession();
  // ─── Real DB Query ─────────────────────────────────────────────────────
  const { data: feesData, isLoading } = useQuery({
    queryKey: ["fees-report-real"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reports/fee-report");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000
  });

  const summary = feesData?.summary;
  const totalCollected = summary?.totalCollected ?? 0;
  const totalPending = summary?.totalPending ?? 0;
  const totalOverdue = summary?.totalOverdue ?? 0;
  const totalExpected = totalCollected + totalPending + totalOverdue;
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  const monthBreakdown: any[] = feesData?.data ?? [];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-6 pb-12 px-5 rounded-b-[2rem] shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="size-8 rounded-xl bg-white/10 flex items-center justify-center text-white"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <div className="size-9 rounded-xl bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] border border-white/20 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
              <img src="/shabab-logo.png" alt="Logo" className="size-full object-contain" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white">Membership Fees Desk</h1>
              <p className="text-[11px] text-purple-200">Collections & Financial Summary</p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-bold bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
            {isLoading ? <RefreshCw className="size-3 animate-spin text-purple-300" /> : <DollarSign className="size-3 text-emerald-400" />}
            <span>DB Live</span>
          </div>
        </div>
      </div>

      {/* ─── Key Metrics Grid ────────────────────────────────────────────── */}
      <div className="-mt-6 px-4 z-10 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1.5"
          >
            <span className="text-xs font-semibold text-muted-foreground">Total Collected</span>
            <div className="text-xl font-black text-foreground">PKR {totalCollected.toLocaleString()}</div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Synced from DB</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 shadow-sm space-y-1.5"
          >
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Collection Rate</span>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-400">{collectionRate}%</div>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 font-medium">
              PKR {totalPending.toLocaleString()} Pending
            </p>
          </motion.div>
        </div>

        {/* ─── Fee Collections Breakdown ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3"
        >
          <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
            <Receipt className="size-4 text-[#4B0A8F]" />
            Monthly Collection Breakdown
          </h3>

          <div className="space-y-2.5">
            {monthBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {isLoading ? "Loading fee report…" : "No fee collection records found"}
              </p>
            ) : (
              monthBreakdown.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{item.label}</h4>
                    <p className="text-[11px] text-muted-foreground">{item.count ?? 0} Transactions</p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black text-foreground">PKR {Number(item.value).toLocaleString()}</span>
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      Completed
                    </div>
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
