"use client";
import { useSession } from "next-auth/react";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BookOpen,
  Dumbbell,
  Target,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Layers,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileContentPlannerPageProps {
  onBack?: () => void;
}

export function MobileContentPlannerPage({ onBack }: MobileContentPlannerPageProps) {
  const { data: session } = useSession();
  // ─── Real DB Query ─────────────────────────────────────────────────────
  const { data: plansData, isLoading } = useQuery({
    queryKey: ["content-plans-real"],
    queryFn: async () => {
      const res = await fetch("/api/admin/content-planner/plans");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000
  });

  const plansList: any[] = plansData?.data ?? plansData?.plans ?? [];

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
              <h1 className="text-base font-extrabold text-white">Content & Curriculum</h1>
              <p className="text-[11px] text-purple-200">Halqa Activity Modules</p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-bold bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
            {isLoading ? <RefreshCw className="size-3 animate-spin text-purple-300" /> : <Sparkles className="size-3 text-amber-300" />}
            <span>DB Live</span>
          </div>
        </div>
      </div>

      {/* ─── Curriculum Modules Grid ──────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-xs text-muted-foreground">
            <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-[#4B0A8F]" />
            Loading curriculum modules…
          </div>
        ) : plansList.length === 0 ? (
          <div className="text-center py-12 text-xs text-muted-foreground bg-card rounded-3xl border border-border/80 p-6">
            <BookOpen className="size-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="font-semibold text-foreground">No curriculum plans found</p>
            <p className="mt-1 text-[11px]">There are currently no active content plans or activity modules recorded.</p>
          </div>
        ) : (
          plansList.map((plan: any) => {
            const blockCount = plan._count?.blocks ?? plan.blocks?.length ?? 0;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-2xl flex items-center justify-center shrink-0 text-purple-500 bg-purple-50 dark:bg-purple-950/30">
                    <BookOpen className="size-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {plan.category || plan.type || "Curriculum Module"}
                    </span>
                    <h3 className="text-xs font-bold text-foreground">{plan.title || plan.name}</h3>
                    <p className="text-[11px] text-muted-foreground">{blockCount} Planned Blocks / Sessions</p>
                  </div>
                </div>

                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
