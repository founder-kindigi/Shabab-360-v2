"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Heart,
  BookOpen,
  CalendarCheck,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Users,
  Award,
  Star,
  Send,
  Plus,
  Moon,
  Sun,
  ShieldCheck,
  MessageSquare,
  Bookmark,
  Layers,
  Building2,
  TreePine,
  ExternalLink,
  Check,
  X,
  Share2,
  Trophy,
  Flame,
  CheckCircle,
  Search,
  Filter,
  UserCheck,
  Crown,
  UserX,
  ChevronRight,
  Shield,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Guided Cadet Mock Dataset (Matching islahimamulat.com structure) ───
export type GuidedCadet = {
  id: string;
  name: string;
  parkName: string;
  groupName: string;
  wakeupTime: string;
  sleepTime: string;
  lastLoggedDate: string;
  jamaatCount: number; // out of 5
  tilawatMins: number;
  streakDays: number;
  is40DayChampion: boolean;
  hasUnreadLog: boolean;
  isInactive: boolean;
};

const MOCK_GUIDED_CADETS: GuidedCadet[] = [
  {
    id: "c-1",
    name: "Muhammad Umair",
    parkName: "Gulberg Park",
    groupName: "Group 1 • Murabbi Ikram",
    wakeupTime: "05:30 AM",
    sleepTime: "10:30 PM",
    lastLoggedDate: "11 Aug 2026",
    jamaatCount: 5,
    tilawatMins: 25,
    streakDays: 42,
    is40DayChampion: true,
    hasUnreadLog: true,
    isInactive: false,
  },
  {
    id: "c-2",
    name: "Muhammad Ahmad",
    parkName: "Gulberg Park",
    groupName: "Group 1 • Murabbi Ikram",
    wakeupTime: "06:00 AM",
    sleepTime: "11:00 PM",
    lastLoggedDate: "11 Aug 2026",
    jamaatCount: 4,
    tilawatMins: 15,
    streakDays: 14,
    is40DayChampion: false,
    hasUnreadLog: true,
    isInactive: false,
  },
  {
    id: "c-3",
    name: "M. Abdullah Qureshi",
    parkName: "Gulberg Park",
    groupName: "Group 1 • Murabbi Ikram",
    wakeupTime: "05:15 AM",
    sleepTime: "10:00 PM",
    lastLoggedDate: "11 Aug 2026",
    jamaatCount: 5,
    tilawatMins: 30,
    streakDays: 40,
    is40DayChampion: true,
    hasUnreadLog: false,
    isInactive: false,
  },
  {
    id: "c-4",
    name: "Muhammad Huzaifa Saif",
    parkName: "Gulberg Park",
    groupName: "Group 2 • Murabbi Hanzala",
    wakeupTime: "05:45 AM",
    sleepTime: "10:45 PM",
    lastLoggedDate: "10 Aug 2026",
    jamaatCount: 5,
    tilawatMins: 20,
    streakDays: 9,
    is40DayChampion: false,
    hasUnreadLog: false,
    isInactive: false,
  },
  {
    id: "c-5",
    name: "Muhammad Yusha",
    parkName: "Gulberg Park",
    groupName: "Group 2 • Murabbi Hanzala",
    wakeupTime: "07:30 AM",
    sleepTime: "12:00 AM",
    lastLoggedDate: "02 Aug 2026",
    jamaatCount: 2,
    tilawatMins: 0,
    streakDays: 0,
    is40DayChampion: false,
    hasUnreadLog: false,
    isInactive: true, // No logs for 7+ days
  },
];

// ─── Routine Presets ───
const ROUTINE_PRESETS = [
  {
    id: "level-1",
    name: "Level 1: Beginner Youth Mamulat",
    targetAudience: "New Admissions & Junior Cadets",
    description: "Core foundation routine focusing on 5 Fardh prayers in Jama'at and basic morning supplications.",
    dailyTilawat: "10-15 Minutes",
    dailyAzkar: "100x Astaghfirullah, 100x Darood Shareef",
    prayersTarget: "5 Jama'at Prayers",
    badge: "Foundation",
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: "level-2",
    name: "Level 2: Intermediate Student Routine",
    targetAudience: "Active Shabab Cadets & Group Members",
    description: "Standard daily routine including Morning/Evening Azkar, Quran Tilawat, and 15 mins religious book reading.",
    dailyTilawat: "20-30 Minutes (1 Ruku+)",
    dailyAzkar: "Masnoon Morning & Evening Supplications",
    prayersTarget: "5 Jama'at + Sunnah",
    badge: "Standard",
    color: "from-[#4B0A8F] to-indigo-600",
  },
  {
    id: "level-3",
    name: "Level 3: Advanced Murabbi Routine",
    targetAudience: "Murabbis, Park Leads & Senior Cadets",
    description: "Comprehensive spiritual regimen with Tahajjud, Surah Yaseen/Mulk daily, and 30 mins Seerah Mutala'ah.",
    dailyTilawat: "1 Juz / 30 Minutes + Surah Yaseen",
    dailyAzkar: "Full Masnoon Azkar + Tahajjud",
    prayersTarget: "5 Jama'at + Tahajjud + Ishraq",
    badge: "Leadership",
    color: "from-amber-500 to-orange-600",
  },
];

export function IslahMamulatPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  // Workspace Switcher: "cadet" (Personal Daily Log) vs "murabbi" (Guided Cadets Desk)
  const [workspaceRole, setWorkspaceRole] = useState<"cadet" | "murabbi">("cadet");

  // Murabbi Filter Pill: "all" | "today" | "streak7" | "champions" | "inactive"
  const [murabbiFilter, setMurabbiFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Cadet Log State
  const [wakeupTime, setWakeupTime] = useState("05:30 AM");
  const [sleepTime, setSleepTime] = useState("10:30 PM");
  const [fajr, setFajr] = useState(true);
  const [dhuhr, setDhuhr] = useState(true);
  const [asr, setAsr] = useState(true);
  const [maghrib, setMaghrib] = useState(true);
  const [isha, setIsha] = useState(true);
  const [tilawatMins, setTilawatMins] = useState(25);
  const [morningAzkar, setMorningAzkar] = useState(true);
  const [eveningAzkar, setEveningAzkar] = useState(true);
  const [tahajjud, setTahajjud] = useState(true);
  const [mutalaahMins, setMutalaahMins] = useState(20);
  const [hifzNazar, setHifzNazar] = useState(5);
  const [logNotes, setLogNotes] = useState("");
  const [streakDays, setStreakDays] = useState(14);

  // Murabbi Inspection Modal State
  const [selectedCadet, setSelectedCadet] = useState<GuidedCadet | null>(null);
  const [guidanceNote, setGuidanceNote] = useState("");

  // Filtered Guided Cadets for Murabbi Desk
  const filteredCadets = useMemo(() => {
    return MOCK_GUIDED_CADETS.filter((cadet) => {
      const matchesSearch = cadet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cadet.groupName.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      if (murabbiFilter === "today") return cadet.lastLoggedDate === "11 Aug 2026";
      if (murabbiFilter === "streak7") return cadet.streakDays >= 7;
      if (murabbiFilter === "champions") return cadet.is40DayChampion;
      if (murabbiFilter === "inactive") return cadet.isInactive;

      return true;
    });
  }, [murabbiFilter, searchQuery]);

  // Submit Log Mutation
  const logMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/islah/daily-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to submit log");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Daily Mamulat log submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["islah-daily-logs"] });
    },
    onError: () => {
      toast.error("Failed to submit daily log.");
    },
  });

  const handleSaveDailyLog = () => {
    logMutation.mutate({
      date: new Date().toISOString().slice(0, 10),
      wakeupTime,
      sleepTime,
      fajrJamaat: fajr,
      dhuhrJamaat: dhuhr,
      asrJamaat: asr,
      maghribJamaat: maghrib,
      ishaJamaat: isha,
      quranTilawatMinutes: tilawatMins,
      quranJuzCount: `${tilawatMins} Mins`,
      morningAdhkarDone: morningAzkar,
      eveningAdhkarDone: eveningAzkar,
      tahajjudDone: tahajjud,
      mutalaahMinutes: mutalaahMins,
      hifzNazarRating: hifzNazar,
      notes: logNotes,
    });
  };

  // Generate Urdu WhatsApp Karguzari Text
  const generateWhatsAppMessage = () => {
    const todayStr = new Date().toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const msg = `السلام عليكم و رحمة اللہ و برکاتہ

*تاریخ: ${todayStr}*
*اصلاحِ معمولات کارگزاری (دن: ${streakDays} of 40)*

*فرض نماز باجماعت:*
${fajr ? "(✓)" : "(✕)"} فجر باجماعت
${dhuhr ? "(✓)" : "(✕)"} ظہر باجماعت
${asr ? "(✓)" : "(✕)"} عصر باجماعت
${maghrib ? "(✓)" : "(✕)"} مغرب باجماعت
${isha ? "(✓)" : "(✕)"} عشاء باجماعت

*یومیہ معمولات:*
${tilawatMins > 0 ? `(✓) تلاوت قرآن: ${tilawatMins} منٹ` : "(✕) تلاوت قرآن"}
${morningAzkar ? "(✓)" : "(✕)"} صبح کے اذکار
${eveningAzkar ? "(✓)" : "(✕)"} شام کے اذکار
${tahajjud ? "(✓)" : "(✕)"} تہجد
${mutalaahMins > 0 ? `(✓) مطالعہ: ${mutalaahMins} منٹ` : "(✕) مطالعہ"}

جاگنے کا وقت: ${wakeupTime}
سونے کا وقت: ${sleepTime}

*Shabab 360 Islah Studio*: https://islahimamulat.com/`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
    toast.success("Opening WhatsApp with your formatted Islah report!");
  };

  const handleVerifyCadetLog = () => {
    if (!selectedCadet) return;
    toast.success(`Verified Islah log for ${selectedCadet.name}! Guidance note sent.`);
    setSelectedCadet(null);
    setGuidanceNote("");
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-1 pb-12 space-y-6">
      {/* ─── PAGE HEADER & WORKSPACE ROLE SWITCHER ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              اصلاح و معمولات — Islah-i-Mamulat Studio
            </h1>
            <Badge className="bg-emerald-600 text-white font-bold">Al-Burhan Synced</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Spiritual Routine Tracker & Self-Reformation Studio • Daily Prayers, Wakeup/Sleep Times, 40-Day Champions & Murabbi Inspection.
          </p>
        </div>

        {/* Workspace Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setWorkspaceRole("cadet")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm",
              workspaceRole === "cadet"
                ? "bg-emerald-600 text-white shadow-emerald-500/20"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <GraduationCap className="size-4" />
            <span>My Daily Mamulat (Cadet View)</span>
          </button>

          <button
            type="button"
            onClick={() => setWorkspaceRole("murabbi")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all",
              workspaceRole === "murabbi"
                ? "bg-[#4B0A8F] text-white shadow-purple-500/20"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Shield className="size-4" />
            <span>Murabbi Guidance Desk</span>
          </button>
        </div>
      </div>

      {/* ─── WORKSPACE 1: CADET DAILY MAMULAT VIEW ─── */}
      {workspaceRole === "cadet" ? (
        <div className="space-y-6">
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Daily Compliance Rate
                    </p>
                    <h3 className="text-2xl font-bold text-foreground mt-1">88% Fulfillment</h3>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                      Jama'at & Quran Tilawat
                    </p>
                  </div>
                  <div className="size-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Heart className="size-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      40-Day Champions Streak
                    </p>
                    <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">Day {streakDays} / 40</h3>
                    <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                      <Flame className="size-3 text-amber-500 fill-amber-500" /> Active 14-Day Streak
                    </p>
                  </div>
                  <div className="size-12 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Trophy className="size-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Total Days Recorded
                    </p>
                    <h3 className="text-2xl font-bold text-foreground mt-1">42 Days</h3>
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">
                      Gulberg Park Cadets
                    </p>
                  </div>
                  <div className="size-12 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <CalendarCheck className="size-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Murabbi Verification
                    </p>
                    <h3 className="text-2xl font-bold text-foreground mt-1">18 Verified</h3>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                      Active Mentorship
                    </p>
                  </div>
                  <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Sparkles className="size-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Mamulat Checklist Card */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
            <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">
                    Today's Islah-i-Mamulat Checklist & Sleep/Wake Timings
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Record your 5 Fardh Jama'at prayers, wake-up/sleep timings, Quran tilawat, and daily Azkar.
                  </CardDescription>
                </div>
                <Badge className="bg-emerald-600 text-white font-mono text-xs">
                  Day {streakDays} of 40 Challenge
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* 40-Day Progress Bar */}
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Trophy className="size-4 text-amber-600" />
                    40-Day Champion Challenge Progress
                  </span>
                  <span className="font-mono font-bold text-amber-800 dark:text-amber-200">
                    {Math.round((streakDays / 40) * 100)}% Completed
                  </span>
                </div>
                <Progress value={(streakDays / 40) * 100} className="h-2.5 bg-amber-200 dark:bg-amber-950" />
              </div>

              {/* Wakeup & Sleep Time Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sun className="size-4 text-amber-500" /> Wake-up Time (جاگنے کا وقت)
                  </Label>
                  <Input
                    value={wakeupTime}
                    onChange={(e) => setWakeupTime(e.target.value)}
                    className="text-xs bg-white dark:bg-slate-900"
                    placeholder="e.g. 05:30 AM"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Moon className="size-4 text-indigo-500" /> Sleep Time (سونے کا وقت)
                  </Label>
                  <Input
                    value={sleepTime}
                    onChange={(e) => setSleepTime(e.target.value)}
                    className="text-xs bg-white dark:bg-slate-900"
                    placeholder="e.g. 10:30 PM"
                  />
                </div>
              </div>

              {/* 5 Fardh Jama'at Prayers */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Heart className="size-4 text-emerald-600" />
                  5 Fardh Prayers in Jama'at (پنجگانہ باجماعت نماز)
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: "Fajr (فجر)", state: fajr, setter: setFajr },
                    { label: "Dhuhr (ظہر)", state: dhuhr, setter: setDhuhr },
                    { label: "Asr (عصر)", state: asr, setter: setAsr },
                    { label: "Maghrib (مغرب)", state: maghrib, setter: setMaghrib },
                    { label: "Isha (عشاء)", state: isha, setter: setIsha },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => item.setter(!item.state)}
                      className={cn(
                        "p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all",
                        item.state
                          ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
                      )}
                    >
                      <span>{item.label}</span>
                      {item.state ? (
                        <CheckCircle className="size-4 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <X className="size-4 text-slate-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Daily Spiritual Regimen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <Label className="flex items-center gap-1.5">
                        <BookOpen className="size-4 text-purple-600" /> Tilawat-e-Quran Minutes
                      </Label>
                      <span className="text-purple-600 font-mono">{tilawatMins} Mins</span>
                    </div>
                    <Input
                      type="number"
                      value={tilawatMins}
                      onChange={(e) => setTilawatMins(Number(e.target.value))}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <Label className="flex items-center gap-1.5">
                        <BookOpen className="size-4 text-blue-600" /> Religious Mutala'ah Minutes
                      </Label>
                      <span className="text-blue-600 font-mono">{mutalaahMins} Mins</span>
                    </div>
                    <Input
                      type="number"
                      value={mutalaahMins}
                      onChange={(e) => setMutalaahMins(Number(e.target.value))}
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <label className="flex items-center gap-2.5 text-xs font-bold text-foreground cursor-pointer">
                    <Checkbox checked={morningAzkar} onCheckedChange={(v: any) => setMorningAzkar(!!v)} />
                    <span>Masnoon Morning Azkar (صبح کے اذکار)</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs font-bold text-foreground cursor-pointer">
                    <Checkbox checked={eveningAzkar} onCheckedChange={(v: any) => setEveningAzkar(!!v)} />
                    <span>Masnoon Evening Azkar (شام کے اذکار)</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs font-bold text-foreground cursor-pointer">
                    <Checkbox checked={tahajjud} onCheckedChange={(v: any) => setTahajjud(!!v)} />
                    <span>Tahajjud Prayer (تہجد کی نماز)</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={generateWhatsAppMessage}
                  className="gap-2 text-xs font-bold border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 w-full sm:w-auto"
                >
                  <Share2 className="size-4 text-emerald-600" />
                  <span>Share Log on WhatsApp</span>
                </Button>

                <Button
                  onClick={handleSaveDailyLog}
                  disabled={logMutation.isPending}
                  className="gap-2 text-xs font-bold bg-[#4B0A8F] hover:bg-[#3b0873] text-white w-full sm:w-auto"
                >
                  <CheckCircle2 className="size-4" />
                  <span>{logMutation.isPending ? "Saving..." : "Save Daily Log"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ─── WORKSPACE 2: MURABBI GUIDANCE DESK (MODELED AFTER ISLAHIMAMULAT.COM MURABBI DASHBOARD) ─── */
        <div className="space-y-6">
          {/* 4 Stat Summary Cards (Exact matching islahimamulat.com Murabbi Dashboard) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Total Guided Cadets
                    </p>
                    <h3 className="text-2xl font-bold text-foreground mt-1">48 Cadets</h3>
                    <p className="text-xs text-purple-600 font-medium mt-1">
                      My Youth Groups
                    </p>
                  </div>
                  <div className="size-12 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600">
                    <Users className="size-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Logged Today
                    </p>
                    <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">32 Cadets</h3>
                    <p className="text-xs text-emerald-600 font-medium mt-1">
                      67% Response Rate
                    </p>
                  </div>
                  <div className="size-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                    <CalendarCheck className="size-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      7-Day Streak Cadets
                    </p>
                    <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">28 Cadets</h3>
                    <p className="text-xs text-blue-600 font-medium mt-1 flex items-center gap-1">
                      <Flame className="size-3" /> Consistent Routine
                    </p>
                  </div>
                  <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
                    <Flame className="size-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      40-Day Champions
                    </p>
                    <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">12 Cadets</h3>
                    <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                      <Crown className="size-3" /> Top Spiritual Performers
                    </p>
                  </div>
                  <div className="size-12 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
                    <Crown className="size-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMurabbiFilter("all")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                  murabbiFilter === "all"
                    ? "bg-[#4B0A8F] text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
                )}
              >
                All Cadets ({MOCK_GUIDED_CADETS.length})
              </button>

              <button
                type="button"
                onClick={() => setMurabbiFilter("today")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                  murabbiFilter === "today"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
                )}
              >
                Logged Today (3)
              </button>

              <button
                type="button"
                onClick={() => setMurabbiFilter("streak7")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                  murabbiFilter === "streak7"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
                )}
              >
                7-Day Streak (4)
              </button>

              <button
                type="button"
                onClick={() => setMurabbiFilter("champions")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                  murabbiFilter === "champions"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
                )}
              >
                40-Day Champions (2)
              </button>

              <button
                type="button"
                onClick={() => setMurabbiFilter("inactive")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                  murabbiFilter === "inactive"
                    ? "bg-red-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
                )}
              >
                ⚠️ Inactive 7+ Days (1)
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search cadet name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Guided Cadets Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCadets.map((cadet) => (
              <Card
                key={cadet.id}
                className={cn(
                  "border shadow-sm rounded-2xl overflow-hidden transition-all hover:border-purple-300 dark:hover:border-purple-800 bg-white dark:bg-slate-900",
                  cadet.isInactive ? "border-red-200 dark:border-red-900/60 bg-red-50/20" : "border-slate-200 dark:border-slate-800"
                )}
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-foreground">{cadet.name}</h4>
                        {cadet.is40DayChampion && (
                          <Badge className="bg-amber-600 text-white text-[9px] font-bold gap-1 px-1.5">
                            <Crown className="size-3" /> 40-Day Champion
                          </Badge>
                        )}
                        {cadet.isInactive && (
                          <Badge className="bg-red-600 text-white text-[9px] font-bold gap-1 px-1.5">
                            <UserX className="size-3" /> Inactive (7+ Days)
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cadet.groupName} • {cadet.parkName}
                      </p>
                    </div>

                    {cadet.hasUnreadLog && (
                      <Badge className="bg-purple-600 text-white text-[10px] animate-pulse">
                        Unread Log
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-medium">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Wakeup / Sleep</span>
                      <span className="font-mono font-bold text-foreground">{cadet.wakeupTime} / {cadet.sleepTime}</span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[10px]">Jama'at & Tilawat</span>
                      <span className="font-bold text-emerald-600">{cadet.jamaatCount}/5 Jama'at • {cadet.tilawatMins}m</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Flame className="size-3.5" /> Day {cadet.streakDays} Streak
                    </span>

                    <Button
                      size="sm"
                      onClick={() => setSelectedCadet(cadet)}
                      className="gap-1.5 text-xs font-bold bg-[#4B0A8F] hover:bg-[#3b0873] text-white h-8"
                    >
                      <span>Inspect Log & Guidance</span>
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─── MURABBI INSPECTION & GUIDANCE MODAL ─── */}
      <Dialog open={!!selectedCadet} onOpenChange={() => setSelectedCadet(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="size-5 text-purple-600" />
              Inspect Islah Log: {selectedCadet?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review daily mamulat compliance and provide Murabbi guidance & encouragement notes.
            </DialogDescription>
          </DialogHeader>

          {selectedCadet && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-1">
                <p className="font-bold text-foreground">{selectedCadet.name} ({selectedCadet.groupName})</p>
                <p className="text-muted-foreground text-[11px]">
                  Logged for {selectedCadet.lastLoggedDate} • Wakeup: {selectedCadet.wakeupTime} • Sleep: {selectedCadet.sleepTime}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">Write Murabbi Guidance Note / Dua</Label>
                <Textarea
                  placeholder="e.g. MashAllah excelente consistency! Maintain Fajr Jama'at and increase Tilawat by 5 mins..."
                  value={guidanceNote}
                  onChange={(e) => setGuidanceNote(e.target.value)}
                  className="text-xs min-h-[90px]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedCadet(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleVerifyCadetLog} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5">
              <CheckCircle2 className="size-4" />
              <span>Verify & Send Note</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
