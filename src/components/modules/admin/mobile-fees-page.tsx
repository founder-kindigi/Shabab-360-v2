"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  Search,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldCheck,
  Building2,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileFeesPage() {
  const mockFees = [
    {
      id: "f1",
      title: "Monthly Membership Fee (Aug 2026)",
      city: "Lahore",
      amountDue: "PKR 1,000",
      totalCollected: "PKR 184,000",
      status: "active"
    },
    {
      id: "f2",
      title: "Special Youth Camp Fee",
      city: "Lahore",
      amountDue: "PKR 500",
      totalCollected: "PKR 71,000",
      status: "active"
    }
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24 select-none">
      {/* ─── Sticky Header ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pt-3 pb-3 px-4 border-b border-border/60 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-[#4B0A8F]/10 text-[#4B0A8F] flex items-center justify-center font-bold">
              <DollarSign className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-bold truncate">Fees & Collections Desk</h1>
              <p className="text-xs text-muted-foreground">Receipts & Financial Records</p>
            </div>
          </div>

          <button className="size-9 rounded-xl bg-[#4B0A8F] text-white flex items-center justify-center shadow-md active:scale-95 transition-all">
            <Plus className="size-5" />
          </button>
        </div>
      </div>

      {/* ─── Fees List ────────────────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {mockFees.map((fee) => (
          <motion.div
            key={fee.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4B0A8F]/10 text-[#4B0A8F]">
                {fee.city} Scope
              </span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 uppercase">
                {fee.status}
              </span>
            </div>

            <h3 className="text-sm font-bold text-foreground">{fee.title}</h3>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 text-center border border-purple-200/50">
                <div className="font-black text-[#4B0A8F] dark:text-purple-300">{fee.amountDue}</div>
                <div className="text-[10px] text-muted-foreground">Per Student Fee</div>
              </div>

              <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-center border border-emerald-200/50">
                <div className="font-black text-emerald-700 dark:text-emerald-400">{fee.totalCollected}</div>
                <div className="text-[10px] text-muted-foreground">Total Collected</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
