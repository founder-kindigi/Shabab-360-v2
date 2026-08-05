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

  const meetingsList: any[] = mashwaraData?.data ?? mashwaraData?.meetings ?? [];

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
        {isLoading ? (
          <div className="text-center py-12 text-xs text-muted-foreground">
            <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-[#4B0A8F]" />
            Loading Mashwara roster…
          </div>
        ) : meetingsList.length === 0 ? (
          <div className="text-center py-12 text-xs text-muted-foreground bg-card rounded-3xl border border-border/80 p-6">
            <CalendarCheck className="size-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="font-semibold text-foreground">No Mashwara meetings recorded</p>
            <p className="mt-1 text-[11px]">There are currently no scheduled or past executive consultations.</p>
          </div>
        ) : (
          meetingsList.map((meeting: any) => {
            const decisionsCount = meeting._count?.decisions ?? meeting.decisionsCount ?? 0;
            const actionItemsCount = meeting._count?.actionItems ?? meeting.actionItems?.length ?? 0;
            const dateStr = meeting.scheduledAt
              ? new Date(meeting.scheduledAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
              : meeting.date ?? "Scheduled";
            return (
              <motion.div
                key={meeting.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground">{meeting.title}</h3>
                    <p className="text-xs text-muted-foreground">{dateStr} {meeting.location ? `• ${meeting.location}` : ""}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-100 text-[#4B0A8F] dark:bg-purple-950/40 dark:text-purple-300">
                    {decisionsCount} Decisions
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60 text-muted-foreground">
                  <span>Status: <strong className="capitalize text-foreground">{meeting.status}</strong></span>
                  <span>{actionItemsCount} Action Items</span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
