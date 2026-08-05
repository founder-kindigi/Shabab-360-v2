"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Dumbbell,
  Target,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Layers,
  ChevronRight,
  Brain,
  Heart,
  Calendar,
  CheckCircle2,
  Search,
  Filter,
  Flame,
  Award
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileContentPlannerPageProps {
  onBack?: () => void;
}

const LAHORE_BATCH4_CURRICULUM = [
  {
    week: "Week 1",
    day: "Day 1 (Saturday)",
    focusArea: "Team Bonding & Disciplinary Orientation",
    exercises: "Warm-up stretch & 400m agility shuttle run",
    sports: "Basic Football Passing & Positioning Drills",
    skills: "Public Speaking & Self-Introduction Workshop",
    tadreeb: "Ethics of Brotherhood (Mu'akhat) & Mutual Respect",
  },
  {
    week: "Week 1",
    day: "Day 2 (Sunday)",
    focusArea: "Leadership & Physical Fitness",
    exercises: "Core endurance & Push-up sprint sets",
    sports: "Cricket Line & Length Bowling Practice",
    skills: "Time Management & Daily Routine Planning",
    tadreeb: "Responsibility & Ownership in Daily Life",
  },
  {
    week: "Week 2",
    day: "Day 1 (Saturday)",
    focusArea: "Health, Safety & Team Coordination",
    exercises: "Cardio circuit & High-knee intervals",
    sports: "Volleyball Spiking & Net Coordination",
    skills: "First Aid & Emergency Response Basics",
    tadreeb: "Cleanliness (Taharat) & Civic Responsibility",
  },
  {
    week: "Week 2",
    day: "Day 2 (Sunday)",
    focusArea: "Financial Literacy & Character",
    exercises: "Calisthenics & Bodyweight Training",
    sports: "Basketball Dribbling & Free Throw Shooting",
    skills: "Personal Finance & Budgeting Fundamentals",
    tadreeb: "Honesty (Amanat) & Integrity in Trade",
  },
];

export function MobileContentPlannerPage({ onBack }: MobileContentPlannerPageProps) {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  // ─── Real DB Query ─────────────────────────────────────────────────────
  const { data: plansData, isLoading } = useQuery({
    queryKey: ["content-plans-mobile"],
    queryFn: async () => {
      const res = await fetch("/api/admin/content-planner/plans");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000,
  });

  const apiPlans: any[] = plansData?.data ?? plansData?.plans ?? [];

  const filteredSessions = LAHORE_BATCH4_CURRICULUM.filter((s) => {
    const matchSearch =
      !searchQuery ||
      s.week.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.focusArea.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.skills.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.sports.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-foreground pb-28 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-6 pb-8 px-5 rounded-b-[2.5rem] shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="size-9 rounded-2xl bg-white/10 active:scale-95 transition-transform flex items-center justify-center text-white backdrop-blur-md border border-white/15"
              >
                <ArrowLeft className="size-5" />
              </button>
            )}
            <div className="size-10 rounded-2xl bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] border border-white/20 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
              <img src="/shabab-logo.png" alt="Logo" className="size-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                نصاب و سرگرمیاں
              </h1>
              <p className="text-[11px] text-purple-200 font-medium">Curriculum & Activity Modules</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-bold bg-white/10 px-3 py-1.5 rounded-full border border-white/15 backdrop-blur-md">
            {isLoading ? (
              <RefreshCw className="size-3 animate-spin text-purple-300" />
            ) : (
              <Sparkles className="size-3 text-amber-300" />
            )}
            <span>Lahore Batch 4</span>
          </div>
        </div>

        {/* 3 Categories Pill Indicators */}
        <div className="relative z-10 grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 text-center border border-white/10 flex flex-col items-center justify-center">
            <Dumbbell className="size-4 text-emerald-400 mb-1" />
            <span className="text-[10px] uppercase font-bold text-emerald-200">Sports & Fitness</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 text-center border border-white/10 flex flex-col items-center justify-center">
            <Brain className="size-4 text-amber-300 mb-1" />
            <span className="text-[10px] uppercase font-bold text-amber-200">Life Skills</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 text-center border border-white/10 flex flex-col items-center justify-center">
            <Heart className="size-4 text-purple-300 mb-1" />
            <span className="text-[10px] uppercase font-bold text-purple-200">Tadreeb Ethics</span>
          </div>
        </div>
      </div>

      {/* ─── Search & Category Filters ────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activity modules or skills..."
            className="pl-10 h-11 rounded-2xl bg-card border-slate-200 dark:border-slate-800 shadow-sm font-medium text-xs"
          />
        </div>
      </div>

      {/* ─── Session Modules Roster ─────────────────────────────────────── */}
      <div className="px-4 space-y-3">
        {filteredSessions.map((session, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => setSelectedSession(session)}
            className="p-4 rounded-3xl bg-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 cursor-pointer hover:border-purple-300 dark:hover:border-purple-900 transition-all active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 font-bold text-[10px]">
                    {session.week} • {session.day}
                  </Badge>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 leading-snug">
                  {session.focusArea}
                </h3>
              </div>
              <ChevronRight className="size-5 text-slate-400 shrink-0 mt-1" />
            </div>

            {/* 3 Categories preview */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Dumbbell className="size-3.5 text-emerald-600 shrink-0" />
                <span className="truncate font-medium"><strong>Sports:</strong> {session.sports}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Brain className="size-3.5 text-amber-600 shrink-0" />
                <span className="truncate font-medium"><strong>Skills:</strong> {session.skills}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Heart className="size-3.5 text-purple-600 shrink-0" />
                <span className="truncate font-medium"><strong>Tadreeb:</strong> {session.tadreeb}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ─── Detail Drawer for Selected Session ──────────────────────────── */}
      <AnimatePresence>
        {selectedSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-lg bg-card rounded-t-[2.5rem] sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />

              <div className="space-y-1">
                <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 font-bold text-xs">
                  {selectedSession.week} • {selectedSession.day}
                </Badge>
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {selectedSession.focusArea}
                </h2>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 rounded-2xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 tracking-wider flex items-center gap-1.5">
                    <Dumbbell className="size-3.5" /> Sports & Warm-up Exercises
                  </span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                    {selectedSession.sports}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Warm-up: {selectedSession.exercises}
                  </p>
                </div>

                <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 tracking-wider flex items-center gap-1.5">
                    <Brain className="size-3.5" /> Life Skills Module
                  </span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                    {selectedSession.skills}
                  </p>
                </div>

                <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 rounded-2xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 tracking-wider flex items-center gap-1.5">
                    <Heart className="size-3.5" /> Tadreeb & Tarbiyah Ethics
                  </span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                    {selectedSession.tadreeb}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  onClick={() => setSelectedSession(null)}
                  className="w-full bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white rounded-2xl font-bold h-12"
                >
                  Close Syllabus Overview
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
