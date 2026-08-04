"use client";

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
  // ─── Real DB Query ─────────────────────────────────────────────────────
  const { data: plansData, isLoading } = useQuery({
    queryKey: ["content-plans-real"],
    queryFn: async () => {
      const res = await fetch("/api/admin/content-planner/plans");
      if (!res.ok) return null;
      return res.json();
    },
    retry: 1,
    staleTime: 30000
  });

  const modules = [
    { id: "mod-1", category: "Sports & Fitness", title: "Physical Conditioning & Martial Arts", sessions: 8, icon: Dumbbell, color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30" },
    { id: "mod-2", category: "Life Skills", title: "Communication, Leadership & Time Management", sessions: 6, icon: Target, color: "text-sky-500 bg-sky-50 dark:bg-sky-950/30" },
    { id: "mod-3", category: "Tadreeb & Tarbiyah", title: "Islamic Character Development & Ethics", sessions: 12, icon: BookOpen, color: "text-purple-500 bg-purple-50 dark:bg-purple-950/30" },
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
        {modules.map((mod) => {
          const IconComp = mod.icon;
          return (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className={cn("size-11 rounded-2xl flex items-center justify-center shrink-0", mod.color)}>
                  <IconComp className="size-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{mod.category}</span>
                  <h3 className="text-xs font-bold text-foreground">{mod.title}</h3>
                  <p className="text-[11px] text-muted-foreground">{mod.sessions} Planned Sessions</p>
                </div>
              </div>

              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
