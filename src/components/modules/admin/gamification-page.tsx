"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Trophy,
  Award,
  Star,
  Flame,
  Plus,
  Search,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Crown,
  Eye,
  History,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface StudentLeaderboardRecord {
  id: string;
  name: string;
  phone: string;
  parkName: string;
  groupName: string;
  points: number;
  streak: number;
  badgesCount: number;
  rank: number;
}

interface BadgeItem {
  id: string;
  code: string;
  name: string;
  description: string;
  category: "attendance" | "achievement" | "leadership" | "special";
  requiredPoints: number;
  awardedCount: number;
}

interface PointTxRecord {
  id: string;
  studentName: string;
  points: number;
  category: "attendance" | "participation" | "quiz" | "conduct" | "manual_bonus";
  reason: string;
  awardedBy: string;
  date: string;
}

const MOCK_LEADERBOARD: StudentLeaderboardRecord[] = [
  {
    id: "st1",
    name: "Muhammad Umair",
    phone: "923274088002",
    parkName: "Gulberg Park",
    groupName: "Group 1 (Murabbi: Ikram)",
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
    groupName: "Group 2 (Murabbi: Hanzala)",
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
    groupName: "Group 1 (Murabbi: Ikram)",
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
    groupName: "Group 2 (Murabbi: Hanzala)",
    points: 340,
    streak: 3,
    badgesCount: 2,
    rank: 4,
  },
  {
    id: "st5",
    name: "Muaz Zakariya Majid",
    phone: "923334349783",
    parkName: "Gulberg Park",
    groupName: "Group 1 (Murabbi: Ikram)",
    points: 310,
    streak: 4,
    badgesCount: 2,
    rank: 5,
  },
];

const MOCK_BADGES: BadgeItem[] = [
  {
    id: "b1",
    code: "BADGE-ATT-8",
    name: "8-Week Perfect Attendance Champion",
    description: "Awarded for 100% presence across 8 consecutive weekly sessions.",
    category: "attendance",
    requiredPoints: 400,
    awardedCount: 14,
  },
  {
    id: "b2",
    code: "BADGE-TAR-01",
    name: "Tarbiyah Ethics Star",
    description: "Demonstrated exceptional ethical conduct and peer mentorship.",
    category: "achievement",
    requiredPoints: 300,
    awardedCount: 22,
  },
  {
    id: "b3",
    code: "BADGE-SPT-MVP",
    name: "Sports Gala MVP",
    description: "Top agility and teamwork score in sports events.",
    category: "achievement",
    requiredPoints: 250,
    awardedCount: 8,
  },
  {
    id: "b4",
    code: "BADGE-LEAD-01",
    name: "Youth Leadership Honor",
    description: "Selected as Group Captain and demonstrated park leadership.",
    category: "leadership",
    requiredPoints: 500,
    awardedCount: 6,
  },
];

const MOCK_TX_LOG: PointTxRecord[] = [
  {
    id: "tx1",
    studentName: "Muhammad Umair",
    points: 50,
    category: "attendance",
    reason: "Session 8 Attendance + Perfect Streak Bonus",
    awardedBy: "System (Automated)",
    date: "2026-08-01",
  },
  {
    id: "tx2",
    studentName: "Muhammad Huzaifa Saif",
    points: 100,
    category: "manual_bonus",
    reason: "Outstanding Public Speaking presentation in Skills Workshop",
    awardedBy: "Ikram Meer (Murabbi)",
    date: "2026-08-03",
  },
];

export function GamificationPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState<"leaderboard" | "badges" | "log">("leaderboard");
  const [search, setSearch] = useState("");
  const [parkFilter, setParkFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [bonusModalOpen, setBonusModalOpen] = useState(false);
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);

  // Form State
  const [formStudent, setFormStudent] = useState("st1");
  const [formPoints, setFormPoints] = useState(50);
  const [formCategory, setFormCategory] = useState("manual_bonus");
  const [formReason, setFormReason] = useState("");

  const { data: apiPoints, isLoading } = useQuery({
    queryKey: ["admin-gamification-points"],
    queryFn: () => fetch("/api/admin/gamification/points").then((r) => r.json()),
  });

  const leaderboardList = MOCK_LEADERBOARD;

  const filteredLeaderboard = useMemo(() => {
    return leaderboardList.filter((item) => {
      const matchSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.phone.includes(search);
      const matchPark = parkFilter === "all" || item.parkName === parkFilter;
      return matchSearch && matchPark;
    });
  }, [leaderboardList, search, parkFilter]);

  const totalPages = Math.ceil(filteredLeaderboard.length / pageSize) || 1;
  const paginatedLeaderboard = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLeaderboard.slice(start, start + pageSize);
  }, [filteredLeaderboard, page]);

  const totalPointsAwarded = leaderboardList.reduce((acc, s) => acc + s.points, 0);

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto px-4 sm:px-6">
      <PageHeader
        title="Gamification, Badges & Points Leaderboard Desk"
        description="Manage student points transactions, automated attendance streak rewards, badge awards, and park leaderboards."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => setBonusModalOpen(true)}
              className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white font-bold rounded-xl h-11 px-5 shadow-md gap-2"
            >
              <Plus className="size-5" />
              Award Manual Bonus Points
            </Button>
          </div>
        }
      />

      {/* ─── 4 Top KPI Metric Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl text-amber-600 dark:text-amber-300 shrink-0">
              <Trophy className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Points Awarded</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalPointsAwarded.toLocaleString()} pts</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50/60 to-white dark:from-purple-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl text-purple-600 dark:text-purple-300 shrink-0">
              <Award className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Badges Catalog</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{MOCK_BADGES.length} badges</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50/60 to-white dark:from-emerald-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-300 shrink-0">
              <Crown className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Top Park Leader</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Gulberg Park</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50/60 to-white dark:from-rose-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-rose-100 dark:bg-rose-900/50 rounded-xl text-rose-600 dark:text-rose-300 shrink-0">
              <Flame className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Streaks</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">42 students</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Main Tabs Switcher ────────────────────────────────────────── */}
      <Tabs defaultValue="leaderboard" value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <TabsList className="bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
            <TabsTrigger value="leaderboard" className="rounded-lg font-bold text-xs sm:text-sm px-4">
              <Trophy className="size-4 mr-2" /> Student Points Leaderboard
            </TabsTrigger>
            <TabsTrigger value="badges" className="rounded-lg font-bold text-xs sm:text-sm px-4">
              <Award className="size-4 mr-2" /> Badges Catalogue
            </TabsTrigger>
            <TabsTrigger value="log" className="rounded-lg font-bold text-xs sm:text-sm px-4">
              <History className="size-4 mr-2" /> Points Transaction Log
            </TabsTrigger>
          </TabsList>

          {activeTab === "leaderboard" && (
            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search student or phone..."
                  className="pl-9 h-10 rounded-xl bg-white dark:bg-slate-900 text-xs font-medium"
                />
              </div>
            </div>
          )}
        </div>

        {/* ─── Tab 1: Student Points Leaderboard ──────────────────────────── */}
        <TabsContent value="leaderboard" className="space-y-4 m-0">
          <Card className="border-0 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Rank & Student</th>
                    <th className="p-4">Park & Group</th>
                    <th className="p-4">Total Points</th>
                    <th className="p-4">Attendance Streak</th>
                    <th className="p-4">Badges Earned</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedLeaderboard.map((item) => (
                    <tr key={item.id} className="hover:bg-purple-50/30 dark:hover:bg-purple-950/10 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "size-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-sm",
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
                            <div className="font-bold text-slate-900 dark:text-slate-100">{item.name}</div>
                            <span className="text-xs text-muted-foreground font-medium">{item.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <div>{item.parkName}</div>
                        <span className="text-muted-foreground">{item.groupName}</span>
                      </td>
                      <td className="p-4 font-black text-purple-600 dark:text-purple-400 text-base">
                        {item.points} pts
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-xs font-extrabold text-amber-600">
                          <Flame className="size-4 fill-amber-500" /> {item.streak} Sessions
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="font-bold text-xs">
                          {item.badgesCount} Badges
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setFormStudent(item.id);
                            setBonusModalOpen(true);
                          }}
                          className="h-8 px-3 text-xs font-bold text-purple-600 dark:text-purple-300 hover:bg-purple-50 rounded-xl"
                        >
                          <Plus className="size-3.5 mr-1" /> Award Points
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                Page {page} of {totalPages} ({filteredLeaderboard.length} total students)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 text-xs font-bold rounded-lg"
                >
                  <ChevronLeft className="size-4 mr-1" /> Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 text-xs font-bold rounded-lg"
                >
                  Next <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ─── Tab 2: Badges Catalogue ────────────────────────────────────── */}
        <TabsContent value="badges" className="space-y-4 m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MOCK_BADGES.map((b) => (
              <Card key={b.id} className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-2xl text-amber-600 shrink-0">
                      <Award className="size-6" />
                    </div>
                    <div>
                      <Badge className="bg-purple-100 text-purple-700 font-bold text-[10px] uppercase">
                        {b.category}
                      </Badge>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                        {b.name}
                      </h3>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs font-bold">
                    {b.code}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground font-medium">{b.description}</p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs font-bold">
                  <span className="text-slate-600">Required: {b.requiredPoints} pts</span>
                  <span className="text-purple-600">Awarded to {b.awardedCount} students</span>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── Tab 3: Points Transaction Log ─────────────────────────────── */}
        <TabsContent value="log" className="space-y-4 m-0">
          <Card className="border-0 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 space-y-4 rounded-2xl">
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <History className="size-5 text-purple-600" /> Immutable Points Allocation Log
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {MOCK_TX_LOG.map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold">{tx.studentName}</div>
                    <p className="text-xs text-muted-foreground">{tx.reason} • Awarded by {tx.awardedBy}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-emerald-600">+{tx.points} pts</div>
                    <span className="text-[10px] text-slate-400 font-medium">{tx.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Award Bonus Points Modal ────────────────────────────────────── */}
      <Dialog open={bonusModalOpen} onOpenChange={setBonusModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-0 rounded-2xl shadow-2xl">
          <div className="p-6 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-slate-900 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
                <Trophy className="size-5 text-amber-500" /> Award Bonus Points
              </DialogTitle>
              <DialogDescription className="text-xs font-medium">
                Award manual bonus points to a student for exceptional performance or leadership.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                toast.success(`Successfully awarded +${formPoints} points!`);
                setBonusModalOpen(false);
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Select Student</Label>
                <Select value={formStudent} onValueChange={setFormStudent}>
                  <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold">
                    <SelectValue placeholder="Select Student" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="st1">Muhammad Umair (Gulberg Group 1)</SelectItem>
                    <SelectItem value="st2">Muhammad Huzaifa Saif (Gulberg Group 2)</SelectItem>
                    <SelectItem value="st3">M.Moosa (Gulberg Group 1)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">Points Amount</Label>
                  <Input
                    type="number"
                    value={formPoints}
                    onChange={(e) => setFormPoints(Number(e.target.value))}
                    className="h-11 rounded-xl bg-white dark:bg-slate-800 text-sm font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">Category</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual_bonus">Manual Bonus</SelectItem>
                      <SelectItem value="participation">Workshop Participation</SelectItem>
                      <SelectItem value="conduct">Ethical Conduct</SelectItem>
                      <SelectItem value="quiz">Tadreeb Quiz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Reason / Commendation</Label>
                <Input
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="e.g. Excellent presentation in Life Skills session"
                  className="h-11 rounded-xl bg-white dark:bg-slate-800 text-xs font-medium"
                />
              </div>

              <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 sm:justify-between">
                <Button type="button" variant="ghost" onClick={() => setBonusModalOpen(false)} className="rounded-xl font-bold">
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl px-6">
                  Award Points
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
