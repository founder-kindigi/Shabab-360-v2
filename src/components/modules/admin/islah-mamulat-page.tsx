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

  // Daily Tracker Interactive State
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-1 pb-6 space-y-6">
      {/* ─── Page Header & Portal Link ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              اصلاح و معمولات — Islah-i-Mamulat Studio
            </h1>
            <Badge className="bg-[#4B0A8F] text-white">Al-Burhan Module</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Spiritual Routine Tracker & Self-Reformation Studio • Daily Prayers, Quran Tilawat, Azkar & Murabbi Guidance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("https://islahimamulat.com/", "_blank")}
            className="gap-2 border-slate-300 dark:border-slate-700"
          >
            <ExternalLink className="size-4 text-blue-600 dark:text-blue-400" />
            <span>Open islahimamulat.com</span>
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

      {/* ─── 4 Top KPI Cards ─── */}
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

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Active Trackers
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-1">240 Members</h3>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">
                  Across 6 Lahore Parks
                </p>
              </div>
              <div className="size-12 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Users className="size-6" />
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
                <h3 className="text-2xl font-bold text-foreground mt-1">180 Reports</h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                  Submitted This Month
                </p>
              </div>
              <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
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
                <h3 className="text-2xl font-bold text-foreground mt-1">142 Advice Notes</h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                  Issued Spiritual Guidance
                </p>
              </div>
              <div className="size-12 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <BookOpen className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Navigation Tabs ─── */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <TabsList className="grid grid-cols-5 w-full bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="tracker" className="gap-2 text-xs font-medium rounded-lg">
            <CheckCircle2 className="size-3.5" />
            <span>Daily Tracker (یومیہ معمولات)</span>
          </TabsTrigger>
          <TabsTrigger value="karguzari" className="gap-2 text-xs font-medium rounded-lg">
            <CalendarCheck className="size-3.5" />
            <span>Monthly Karguzari (کارگزاری)</span>
          </TabsTrigger>
          <TabsTrigger value="guidance" className="gap-2 text-xs font-medium rounded-lg">
            <BookOpen className="size-3.5" />
            <span>Murabbi Advice (رہنمائی)</span>
          </TabsTrigger>
          <TabsTrigger value="presets" className="gap-2 text-xs font-medium rounded-lg">
            <Layers className="size-3.5" />
            <span>Routine Presets (نصاب)</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2 text-xs font-medium rounded-lg">
            <TrendingUp className="size-3.5" />
            <span>Park Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: DAILY MAMULAT TRACKER ─── */}
        <TabsContent value="tracker" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Interactive Daily Checklist (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        Today's Spiritual Routine Checklist (معمولاتِ یومیہ)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Mark your daily prayers, Quran recitation, azkar, and self-reflection.
                      </CardDescription>
                    </div>
                    <Badge className="bg-[#4B0A8F] text-white text-xs">
                      {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 pt-0">
                  {/* 🕌 Fardh Jama'at Prayers */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      🕌 5 Fardh Jama'at Prayers (پنجگانہ باجماعت نماز)
                    </Label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { label: "Fajr", state: fajr, setter: setFajr },
                        { label: "Dhuhr", state: dhuhr, setter: setDhuhr },
                        { label: "Asr", state: asr, setter: setAsr },
                        { label: "Maghrib", state: maghrib, setter: setMaghrib },
                        { label: "Isha", state: isha, setter: setIsha },
                      ].map((p) => (
                        <Button
                          key={p.label}
                          type="button"
                          variant={p.state ? "default" : "outline"}
                          onClick={() => p.setter(!p.state)}
                          className={cn(
                            "h-10 text-xs font-bold flex flex-col items-center justify-center p-1 rounded-xl transition-all",
                            p.state
                              ? "bg-[#4B0A8F] hover:bg-[#3b0873] text-white shadow-sm"
                              : "border-slate-300 dark:border-slate-700 text-muted-foreground"
                          )}
                        >
                          <span>{p.label}</span>
                          <span className="text-[10px] font-normal">{p.state ? "✓ Jama'at" : "Missed"}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* 📖 Quran Tilawat & Azkar */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <Label className="text-xs font-bold text-foreground">📖 Quran Tilawat (تلاوت)</Label>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-purple-600">{tilawatMins} Mins</span>
                        <input
                          type="range"
                          min="5"
                          max="60"
                          step="5"
                          value={tilawatMins}
                          onChange={(e) => setTilawatMins(Number(e.target.value))}
                          className="w-24 h-1.5 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <Label className="text-xs font-bold text-foreground">📚 Mutala'ah Reading (مطالعہ)</Label>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-purple-600">{mutalaahMins} Mins</span>
                        <input
                          type="range"
                          min="5"
                          max="60"
                          step="5"
                          value={mutalaahMins}
                          onChange={(e) => setMutalaahMins(Number(e.target.value))}
                          className="w-24 h-1.5 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 📿 Morning/Evening Azkar & Tahajjud Toggles */}
                  <div className="grid grid-cols-3 gap-2">
                    <label className={cn("p-2.5 rounded-xl border text-xs font-semibold cursor-pointer flex items-center justify-between", morningAzkar ? "bg-purple-50 border-purple-300 text-purple-900 dark:bg-purple-950/40 dark:text-purple-300" : "border-slate-200 text-muted-foreground")}>
                      <span>🌅 Morning Azkar</span>
                      <Checkbox checked={morningAzkar} onCheckedChange={(v) => setMorningAzkar(!!v)} />
                    </label>

                    <label className={cn("p-2.5 rounded-xl border text-xs font-semibold cursor-pointer flex items-center justify-between", eveningAzkar ? "bg-purple-50 border-purple-300 text-purple-900 dark:bg-purple-950/40 dark:text-purple-300" : "border-slate-200 text-muted-foreground")}>
                      <span>🌆 Evening Azkar</span>
                      <Checkbox checked={eveningAzkar} onCheckedChange={(v) => setEveningAzkar(!!v)} />
                    </label>

                    <label className={cn("p-2.5 rounded-xl border text-xs font-semibold cursor-pointer flex items-center justify-between", tahajjud ? "bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300" : "border-slate-200 text-muted-foreground")}>
                      <span>🌙 Tahajjud Nafil</span>
                      <Checkbox checked={tahajjud} onCheckedChange={(v) => setTahajjud(!!v)} />
                    </label>
                  </div>

                  {/* 🛡️ Hifz-i-Nazar Rating */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground">🛡️ Hifz-i-Nazar & Moral Self-Restraint (حفظِ نظر)</Label>
                      <span className="text-xs font-bold text-amber-600">{hifzNazar} / 5 Stars</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setHifzNazar(star)}
                          className={cn("size-8 rounded-lg flex items-center justify-center transition-all", star <= hifzNazar ? "text-amber-500 bg-amber-50 dark:bg-amber-950/50" : "text-slate-300")}
                        >
                          <Star className="size-5 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleSaveDailyLog}
                    disabled={logMutation.isPending}
                    className="w-full bg-[#4B0A8F] hover:bg-[#3b0873] text-white gap-2 shadow"
                  >
                    <CheckCircle2 className="size-4" />
                    <span>Save Today's Spiritual Log</span>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right: Submitted Logs History (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold text-foreground">Submitted Logs Roster</CardTitle>
                  <CardDescription className="text-xs">History of recent daily spiritual entries.</CardDescription>
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  {dailyLogs.map((log: any) => (
                    <div key={log.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{log.userName}</span>
                        <Badge variant="outline" className="text-[10px]">{log.date}</Badge>
                      </div>

                      <div className="flex flex-wrap gap-1 text-[10px]">
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                          Jama'at: {[log.fajrJamaat, log.dhuhrJamaat, log.asrJamaat, log.maghribJamaat, log.ishaJamaat].filter(Boolean).length}/5
                        </Badge>
                        <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                          Tilawat: {log.quranTilawatMinutes}m
                        </Badge>
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                          Rating: {log.hifzNazarRating}★
                        </Badge>
                      </div>

                      {log.notes && <p className="text-muted-foreground italic text-[11px] mt-1">{log.notes}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── TAB 2: MONTHLY ISLAH KARGUZARI ─── */}
        <TabsContent value="karguzari" className="mt-4 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">ماہانہ اصلاحی کارگزاری — Monthly Progress Roster</h3>
            <p className="text-xs text-muted-foreground">Monthly performance reports logged by participants across Lahore parks.</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-muted-foreground font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Participant Name</th>
                    <th className="py-3 px-4">Park Scope</th>
                    <th className="py-3 px-4">Jama'at Score</th>
                    <th className="py-3 px-4">Quran Tilawat</th>
                    <th className="py-3 px-4">Mutala'ah Books</th>
                    <th className="py-3 px-4 text-right">Performance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-foreground">
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-foreground">Muhammad Umair</td>
                    <td className="py-3 px-4 text-muted-foreground">Gulberg Park</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">142 / 150 (94%)</td>
                    <td className="py-3 px-4 font-medium">12 Juz Completed</td>
                    <td className="py-3 px-4 text-muted-foreground">Seerah Book 1</td>
                    <td className="py-3 px-4 text-right">
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-[10px]">
                        Mumtaz (Excellent)
                      </Badge>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-foreground">M Abdullah Qureshi</td>
                    <td className="py-3 px-4 text-muted-foreground">Gulberg Park</td>
                    <td className="py-3 px-4 font-bold text-amber-600">120 / 150 (80%)</td>
                    <td className="py-3 px-4 font-medium">8 Juz Completed</td>
                    <td className="py-3 px-4 text-muted-foreground">Islamic Ethics Vol 2</td>
                    <td className="py-3 px-4 text-right">
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 text-[10px]">
                        Jayyid (Good)
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ─── TAB 3: MURABBI ADVICE FEED ─── */}
        <TabsContent value="guidance" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">اصلاحی رہنمائی و نصائح — Murabbi Guidance Feed</h3>
              <p className="text-xs text-muted-foreground">Spiritual advice notes and instruction dispatches from Sheikh & Murabbis.</p>
            </div>
            <Button
              onClick={() => setIsGuidanceModalOpen(true)}
              className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white gap-2 text-xs"
            >
              <Plus className="size-3.5" />
              <span>Add Guidance Note</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GUIDANCE_NOTES.map((g) => (
              <Card key={g.id} className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 text-purple-300 text-[10px] mb-1">
                        {g.targetPark}
                      </Badge>
                      <CardTitle className="text-base font-bold text-foreground">{g.title}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">{g.author} • {g.date}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground space-y-3">
                  <p className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 text-foreground">
                    "{g.content}"
                  </p>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-purple-600 font-semibold">{g.likes} Members Read</span>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-500">
                      <Share2 className="size-3 mr-1" /> Share Note
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── TAB 4: ROUTINE PRESETS ─── */}
        <TabsContent value="presets" className="mt-4 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">معمولات کا نصاب — Spiritual Routine Curriculum Presets</h3>
            <p className="text-xs text-muted-foreground">Pre-configured spiritual target levels tailored for cadets, students, and Murabbis.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ROUTINE_PRESETS.map((preset) => (
              <Card key={preset.id} className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 text-purple-300 text-[10px]">
                      {preset.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold text-foreground mt-2">{preset.name}</CardTitle>
                  <CardDescription className="text-xs mt-1">{preset.description}</CardDescription>
                </CardHeader>

                <CardContent className="pt-0 space-y-3 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                    <p><span className="font-semibold text-foreground">🕌 Prayers:</span> {preset.prayersTarget}</p>
                    <p><span className="font-semibold text-foreground">📖 Tilawat:</span> {preset.dailyTilawat}</p>
                    <p><span className="font-semibold text-foreground">📿 Azkar:</span> {preset.dailyAzkar}</p>
                  </div>

                  <Button className="w-full bg-[#4B0A8F] hover:bg-[#3b0873] text-white text-xs h-8">
                    Adopt This Routine Level
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── TAB 5: PARK COMPLIANCE ANALYTICS ─── */}
        <TabsContent value="analytics" className="mt-4 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">پارک وائز معمولات کارگزاری — Park Compliance Analytics</h3>
            <p className="text-xs text-muted-foreground">Side-by-side spiritual routine compliance comparison across Lahore parks.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Gulberg Park", rate: 94, members: 60, leader: "Murabbi Ikram Meer" },
              { name: "Gulshan Iqbal Park", rate: 88, members: 50, leader: "Fahad bhai" },
              { name: "Griffin Park", rate: 85, members: 30, leader: "Hamza Tanveer" },
              { name: "Johar Town Park", rate: 82, members: 35, leader: "Usman Ghani" },
              { name: "Gulshan Ravi Park", rate: 79, members: 30, leader: "Ali Raza" },
              { name: "State Life Park", rate: 91, members: 20, leader: "Tariq Mahmood" },
            ].map((park) => (
              <Card key={park.name} className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground">{park.name}</h4>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-xs">
                    {park.rate}% Compliance
                  </Badge>
                </div>
                <div className="space-y-1">
                  <Progress value={park.rate} className="h-2" />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{park.members} Active Members</span>
                    <span>Lead: {park.leader}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── LOG DAILY MAMULAT MODAL ─── */}
      <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <CheckCircle2 className="size-5 text-[#4B0A8F]" />
              Quick Log Daily Mamulat
            </DialogTitle>
            <DialogDescription className="text-xs">
              Quickly submit your daily spiritual entries.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="font-semibold text-foreground">5 Jama'at Prayers Check:</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant={fajr ? "default" : "outline"} onClick={() => setFajr(!fajr)} className="h-7 text-[11px]">Fajr</Button>
              <Button size="sm" variant={dhuhr ? "default" : "outline"} onClick={() => setDhuhr(!dhuhr)} className="h-7 text-[11px]">Dhuhr</Button>
              <Button size="sm" variant={asr ? "default" : "outline"} onClick={() => setAsr(!asr)} className="h-7 text-[11px]">Asr</Button>
              <Button size="sm" variant={maghrib ? "default" : "outline"} onClick={() => setMaghrib(!maghrib)} className="h-7 text-[11px]">Maghrib</Button>
              <Button size="sm" variant={isha ? "default" : "outline"} onClick={() => setIsha(!isha)} className="h-7 text-[11px]">Isha</Button>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Tilawat Minutes</Label>
              <Input type="number" value={tilawatMins} onChange={(e) => setTilawatMins(Number(e.target.value))} className="text-xs h-8" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Notes / Reflections (Optional)</Label>
              <Textarea value={logNotes} onChange={(e) => setLogNotes(e.target.value)} className="text-xs h-16" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLogModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDailyLog} className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white">Save Log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
