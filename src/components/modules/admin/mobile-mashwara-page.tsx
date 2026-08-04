"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  ChevronRight,
  ShieldCheck,
  Building2,
  FileText,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileMashwaraPage() {
  const mockMeetings = [
    {
      id: "m1",
      title: "Weekly City Head & Park Leads Mashwara",
      date: "Sunday, Aug 2, 2026",
      cityName: "Lahore",
      decisionsCount: 4,
      actionItemsCount: 6,
      status: "completed"
    },
    {
      id: "m2",
      title: "Upcoming Lahore Batch 4 Review Mashwara",
      date: "Sunday, Aug 9, 2026",
      cityName: "Lahore",
      decisionsCount: 0,
      actionItemsCount: 2,
      status: "scheduled"
    }
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24 select-none">
      {/* ─── Sticky Header ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pt-3 pb-3 px-4 border-b border-border/60 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-[#4B0A8F]/10 text-[#4B0A8F] flex items-center justify-center font-bold">
              <Calendar className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-bold truncate">هفتہ وار مشورہ (Weekly Mashwara)</h1>
              <p className="text-xs text-muted-foreground">Meetings, Decisions & Tasks</p>
            </div>
          </div>

          <button className="size-9 rounded-xl bg-[#4B0A8F] text-white flex items-center justify-center shadow-md active:scale-95 transition-all">
            <Plus className="size-5" />
          </button>
        </div>
      </div>

      {/* ─── Mashwara Meetings List ───────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {mockMeetings.map((meeting) => (
          <motion.div
            key={meeting.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4B0A8F]/10 text-[#4B0A8F]">
                {meeting.cityName} Scope
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase",
                  meeting.status === "completed"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-purple-100 text-purple-700"
                )}
              >
                {meeting.status}
              </span>
            </div>

            <h3 className="text-sm font-bold text-foreground">{meeting.title}</h3>
            <p className="text-xs text-muted-foreground">{meeting.date}</p>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 text-center border border-purple-200/50">
                <div className="font-black text-[#4B0A8F] dark:text-purple-300">{meeting.decisionsCount}</div>
                <div className="text-[10px] text-muted-foreground">Decisions Made</div>
              </div>

              <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-center border border-emerald-200/50">
                <div className="font-black text-emerald-700 dark:text-emerald-400">{meeting.actionItemsCount}</div>
                <div className="text-[10px] text-muted-foreground">Action Tasks</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
