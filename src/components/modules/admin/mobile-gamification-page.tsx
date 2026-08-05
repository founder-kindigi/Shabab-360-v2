"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Award,
  Star,
  Flame,
  ArrowLeft,
  RefreshCw,
  Plus,
  Search,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Crown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MobileGamificationPageProps {
  onBack?: () => void;
}

const MOCK_LEADERBOARD = [
  {
    id: "st1",
    name: "Muhammad Umair",
    phone: "923274088002",
    parkName: "Gulberg Park",
    groupName: "Group 1",
    points: 520,
    streak: 8,
    badgesCount: 5,
    rank: 1,
  },
  {
    id: "st2",
    name: "Muhammad Huzaifa Saif",
    phone: "923234977806",
    parkName: "Gulberg Park",
    groupName: "Group 2",
    points: 480,
    streak: 6,
    badgesCount: 4,
    rank: 2,
  },
  {
    id: "st3",
    name: "M.Moosa",
    phone: "923004188623",
    parkName: "Gulberg Park",
    groupName: "Group 1",
    points: 410,
    streak: 5,
    badgesCount: 3,
    rank: 3,
  },
  {
    id: "st4",
    name: "Muhammad Yusha",
    phone: "923334649728",
    parkName: "Gulberg Park",
    groupName: "Group 2",
    points: 340,
    streak: 3,
    badgesCount: 2,
    rank: 4,
  },
];

export function MobileGamificationPage({ onBack }: MobileGamificationPageProps) {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // ─── Real DB Query ─────────────────────────────────────────────────────
  const { data: gamificationData, isLoading } = useQuery({
    queryKey: ["gamification-mobile"],
    queryFn: async () => {
      const res = await fetch("/api/admin/gamification/points");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000,
  });

  const filteredLeaderboard = MOCK_LEADERBOARD.filter((item) => {
    return (
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.phone.includes(search)
    );
  });

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-foreground pb-28 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-6 pb-12 px-5 rounded-b-[2.5rem] shadow-xl overflow-hidden">
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
                لیڈر بورڈ و بیجز
              </h1>
              <p className="text-[11px] text-purple-200 font-medium">Points & Student Badges Desk</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-bold bg-white/10 px-3 py-1.5 rounded-full border border-white/15 backdrop-blur-md">
            {isLoading ? (
              <RefreshCw className="size-3 animate-spin text-purple-300" />
            ) : (
              <Trophy className="size-3 text-amber-400" />
            )}
            <span>Batch 4 Leaderboard</span>
          </div>
        </div>
      </div>

      {/* ─── Top 3 Podium Cards ────────────────────────────────────────── */}
      <div className="-mt-7 px-4 z-10 space-y-4">
        <div className="p-4 rounded-3xl bg-card border border-slate-200 dark:border-slate-800 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider flex items-center gap-1.5">
              <Crown className="size-4 text-amber-500" /> Top Performer Podium
            </span>
            <Badge variant="outline" className="text-[10px] font-bold">
              Gulberg Park
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-2">
            {/* Rank 2 */}
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-xs font-black text-slate-500">#2</div>
              <div className="text-xs font-bold truncate">{MOCK_LEADERBOARD[1].name}</div>
              <div className="text-xs font-black text-purple-600">{MOCK_LEADERBOARD[1].points} pts</div>
            </div>

            {/* Rank 1 */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950/40 dark:to-slate-900 border border-amber-300 dark:border-amber-700/50 space-y-1 shadow-sm">
              <div className="text-xs font-black text-amber-600">#1 👑</div>
              <div className="text-xs font-extrabold truncate text-amber-950 dark:text-amber-200">{MOCK_LEADERBOARD[0].name}</div>
              <div className="text-xs font-black text-amber-600">{MOCK_LEADERBOARD[0].points} pts</div>
            </div>

            {/* Rank 3 */}
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-xs font-black text-amber-700">#3</div>
              <div className="text-xs font-bold truncate">{MOCK_LEADERBOARD[2].name}</div>
              <div className="text-xs font-black text-purple-600">{MOCK_LEADERBOARD[2].points} pts</div>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or phone..."
            className="pl-10 h-11 rounded-2xl bg-card border-slate-200 dark:border-slate-800 shadow-sm font-medium text-xs"
          />
        </div>

        {/* Student Leaderboard List */}
        <div className="space-y-3">
          {filteredLeaderboard.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedStudent(item)}
              className="p-4 rounded-3xl bg-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 cursor-pointer hover:border-purple-300 transition-all active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "size-9 rounded-2xl font-black text-xs flex items-center justify-center shrink-0 shadow-sm",
                      item.rank === 1
                        ? "bg-amber-400 text-amber-950"
                        : item.rank === 2
                        ? "bg-slate-300 text-slate-900"
                        : item.rank === 3
                        ? "bg-amber-700 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                    )}
                  >
                    #{item.rank}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {item.name}
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      {item.parkName} • {item.groupName}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black text-purple-600 dark:text-purple-400">
                    {item.points} pts
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-amber-600 font-bold justify-end">
                    <Flame className="size-3 fill-amber-500" /> {item.streak} Streak
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ─── Student Detail Drawer ────────────────────────────────────── */}
      <AnimatePresence>
        {selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-0"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-lg bg-card rounded-t-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    {selectedStudent.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">{selectedStudent.parkName} ({selectedStudent.groupName})</p>
                </div>
                <Badge className="bg-amber-400 text-amber-950 font-black">
                  Rank #{selectedStudent.rank}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Points</span>
                  <div className="text-xl font-black text-purple-600">{selectedStudent.points}</div>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300">Attendance Streak</span>
                  <div className="text-xl font-black text-amber-600 flex items-center justify-center gap-1">
                    <Flame className="size-5 fill-amber-500" /> {selectedStudent.streak}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => {
                    toast.success(`Awarded +50 Bonus Points to ${selectedStudent.name}`);
                    setSelectedStudent(null);
                  }}
                  className="w-full bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white font-bold rounded-2xl h-12 gap-2"
                >
                  <Plus className="size-4" /> Award +50 Bonus Points
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedStudent(null)}
                  className="w-full rounded-2xl font-bold h-12"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
