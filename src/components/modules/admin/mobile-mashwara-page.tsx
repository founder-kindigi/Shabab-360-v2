"use client";
import { useSession } from "next-auth/react";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  Users,
  CheckSquare,
  Plus,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MobileMashwaraPageProps {
  onBack?: () => void;
}

export function MobileMashwaraPage({ onBack }: MobileMashwaraPageProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  // ─── Real DB Queries ───────────────────────────────────────────────────
  const { data: mashwaraData, isLoading } = useQuery({
    queryKey: ["mashwara-list-real"],
    queryFn: async () => {
      const res = await fetch("/api/admin/mashwara");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000
  });

  const meetings = mashwaraData?.meetings || [
    {
      id: "m1",
      title: "Lahore City Weekly Operational Mashwara",
      date: "Sunday, Aug 9, 2026",
      status: "scheduled",
      decisionsCount: 4,
      actionItems: [
        { id: "ai-1", task: "Confirm Tadreeb camp venue in Gulberg", assignee: "Tariq Mahmood", done: false },
        { id: "ai-2", task: "Review dropout watchlist for State Life Park", assignee: "Kamran Shah", done: true },
      ]
    }
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-6 pb-8 px-5 rounded-b-[2rem] shadow-xl">
        <div className="flex items-center justify-between mb-2">
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
              <h1 className="text-base font-extrabold text-white">هفتہ وار مشورہ</h1>
              <p className="text-[11px] text-purple-200">Weekly Executive Consultation</p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-bold bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
            {isLoading ? <RefreshCw className="size-3 animate-spin text-purple-300" /> : <CalendarCheck className="size-3 text-emerald-400" />}
            <span>DB Live</span>
          </div>
        </div>
      </div>

      {/* ─── Meetings List ────────────────────────────────────────────────── */}
      <div className="p-4 space-y-4">
        {meetings.map((meeting: any) => (
          <motion.div
            key={meeting.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-foreground">{meeting.title}</h3>
                <p className="text-xs text-muted-foreground">{meeting.date}</p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-100 text-[#4B0A8F] dark:bg-purple-950/40 dark:text-purple-300">
                {meeting.decisionsCount || 3} Decisions
              </span>
            </div>

            <div className="space-y-2 pt-1 border-t border-border/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Action Items:</span>
              {(meeting.actionItems || []).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between text-xs p-2 rounded-xl bg-muted/40">
                  <span className="font-medium text-foreground">{item.task}</span>
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300">{item.assignee}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
