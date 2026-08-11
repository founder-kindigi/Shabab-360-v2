"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Routine Level Presets ───
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

// ─── Guidance Notes Mock ───
const GUIDANCE_NOTES = [
  {
    id: "guide-1",
    author: "Sheikh & Murabbi Hanzala Tauseef",
    title: "Consistency in Fajr Jama'at & Morning Azkar",
    date: "10 Aug 2026",
    content: "The key to spiritual growth is consistency (Istiqaamat) in Fajr Jama'at. Even on weekends, maintain the morning time after Fajr for Quran Tilawat and Azkar.",
    targetPark: "Gulberg Park",
    likes: 42,
  },
  {
    id: "guide-2",
    author: "Murabbi Ikram Meer",
    title: "Purity of Intention (Ikhlaas) in Mutala'ah",
    date: "08 Aug 2026",
    content: "When reading Seerah books during Mutala'ah time, intend to practice every Sunnah learned rather than just finishing pages.",
    targetPark: "All Parks",
    likes: 38,
  },
];

export function IslahMamulatPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"tracker" | "karguzari" | "guidance" | "presets" | "analytics">("tracker");

  // Modals state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isGuidanceModalOpen, setIsGuidanceModalOpen] = useState(false);

  // Daily Tracker Interactive State (matching islahimamulat.com)
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

  // 40-Day Challenge Streak Tracker
  const [streakDays, setStreakDays] = useState(14);

  // Guidance Form State
  const [guideTitle, setGuideTitle] = useState("");
  const [guideContent, setGuideContent] = useState("");

  // ─── Fetch Daily Logs ───
  const { data: logData, isLoading } = useQuery({
    queryKey: ["islah-daily-logs"],
    queryFn: async () => {
      const res = await fetch("/api/islah/daily-log");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  const dailyLogs = logData || [];

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
      setIsLogModalOpen(false);
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

  // ─── Generate Urdu WhatsApp Message (matching islahimamulat.com format) ───
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-1 pb-12 space-y-6">
      {/* ─── Page Header & Portal Link ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              اصلاح و معمولات — Islah-i-Mamulat Studio
            </h1>
            <Badge className="bg-emerald-600 text-white font-bold">Al-Burhan Portal Synced</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Spiritual Routine Tracker & Self-Reformation Studio • Daily Prayers, Wakeup/Sleep Times, 40-Day Champions & Murabbi Inspection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("https://islahimamulat.com/", "_blank")}
            className="gap-2 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50"
          >
            <ExternalLink className="size-4 text-emerald-600" />
            <span>Open islahimamulat.com</span>
          </Button>

          <Button
            size="sm"
            onClick={generateWhatsAppMessage}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow"
          >
            <Share2 className="size-4" />
            <span>Share Log on WhatsApp</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsLogModalOpen(true)}
            className="gap-2 bg-[#4B0A8F] hover:bg-[#3b0873] text-white shadow"
          >
            <CheckCircle2 className="size-4" />
            <span>Log Daily Mamulat</span>
          </Button>
        </div>
      </div>

      {/* ─── 4 Top KPI Cards (with 40-Day Champions) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden relative">
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

        {/* 40-Day Champions Card */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden relative">
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

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Monthly Islah Karguzaris
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-1">142 Reports</h3>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">
                  Across 6 Active Parks
                </p>
              </div>
              <div className="size-12 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <CalendarCheck className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Murabbi Guidance Notes
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

      {/* ─── Tabs Navigation ─── */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl">
          <TabsTrigger value="tracker" className="rounded-lg text-xs font-bold gap-2">
            <CheckCircle2 className="size-3.5" /> Daily Mamulat Tracker
          </TabsTrigger>
          <TabsTrigger value="karguzari" className="rounded-lg text-xs font-bold gap-2">
            <BookOpen className="size-3.5" /> Islah Karguzari Roster
          </TabsTrigger>
          <TabsTrigger value="guidance" className="rounded-lg text-xs font-bold gap-2">
            <MessageSquare className="size-3.5" /> Murabbi Guidance Feed
          </TabsTrigger>
          <TabsTrigger value="presets" className="rounded-lg text-xs font-bold gap-2">
            <Layers className="size-3.5" /> Routine Presets (Levels 1-3)
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: DAILY MAMULAT TRACKER ─── */}
        <TabsContent value="tracker" className="space-y-4">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
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
                {/* Tilawat & Mutala'ah Sliders */}
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

                {/* Daily Azkar & Tahajjud Checkboxes */}
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

              {/* Submit & WhatsApp Action Buttons */}
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
        </TabsContent>

        {/* ─── TAB 2: ISLAH KARGUZARI ROSTER ─── */}
        <TabsContent value="karguzari" className="space-y-4">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-foreground">Youth Cadets Islah Karguzari Roster</h3>
              <Badge className="bg-blue-600 text-white">Gulberg Park</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-muted-foreground font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Cadet Name</th>
                    <th className="py-3 px-4">Wakeup / Sleep</th>
                    <th className="py-3 px-4">Jama'at Prayers</th>
                    <th className="py-3 px-4">Tilawat</th>
                    <th className="py-3 px-4">40-Day Streak</th>
                    <th className="py-3 px-4 text-center">Murabbi Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-bold text-foreground">Muhammad Umair</td>
                    <td className="py-3 px-4 font-mono">05:30 AM / 10:30 PM</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">5 / 5 Jama'at</td>
                    <td className="py-3 px-4">25 Mins</td>
                    <td className="py-3 px-4 font-bold text-amber-600">Day 14 (Active)</td>
                    <td className="py-3 px-4 text-center">
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Verified by Murabbi
                      </Badge>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-bold text-foreground">Muhammad Ahmad</td>
                    <td className="py-3 px-4 font-mono">06:00 AM / 11:00 PM</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">4 / 5 Jama'at</td>
                    <td className="py-3 px-4">15 Mins</td>
                    <td className="py-3 px-4 font-bold text-amber-600">Day 8 (Active)</td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="outline" className="text-amber-600">Pending Review</Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
