"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Search,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Brain,
  Dumbbell,
  Heart,
  Sparkles,
  Download,
  FileText,
  Video,
  ChevronDown,
  List,
  GraduationCap,
  Calendar as CalendarIcon,
  CheckCircle,
  Activity,
  ExternalLink,
  Youtube,
  Shield,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---
export type SyllabusSession = {
  id: string;
  weekNumber: number;
  dayNumber: number;
  date: string;
  title: string;
  videoUrl?: string;
  sportsDrill: string;
  skillsModule: string;
  tadreebEthics: string;
  exercises: string;
  focusArea: string;
  isCompleted: boolean;
  driveLinks?: { name: string; url: string }[];
};

export type WeekGroup = {
  weekNumber: number;
  title: string;
  sessions: SyllabusSession[];
};

// --- AUTHENTIC SHABAB BATCH 4 RUNNING DATASET (V1 MATCHER) ---
const AUTHENTIC_BATCH4_SYLLABUS: WeekGroup[] = [
  {
    weekNumber: 1,
    title: "Week 1 • Orientation & Introduction",
    sessions: [
      {
        id: "w1-d1",
        weekNumber: 1,
        dayNumber: 1,
        date: "23 May 2026",
        title: "Orientation, Self-Introduction & Qasas Ul Anbiya #1",
        videoUrl: "https://www.youtube.com/watch?v=uvYYqNGemJs",
        sportsDrill: "Frisbee Throw & Catching Drills (40 mins)",
        skillsModule: "Topic: Introduce Yourself & How to Introduce Yourself Activity for Shabab Cadets",
        tadreebEthics: "Qasas Ul Anbiya # 1: Hazrat Adam A.S & Hazrat Nuh A.S (Summary & Detailed Lessons)",
        exercises: "Warmup: Light Jumps, Step Jumps, Cross Jumps, Side Jumps, Push-ups. Joints: Wrist & Foot joints.",
        focusArea: "Youth Orientation & Peer Trust",
        isCompleted: true,
        driveLinks: [
          { name: "Profiling_Format.pdf", url: "https://drive.google.com/file/d/15_v_gb-ibLduy9lbrLfQbOIh_2VeGqNP/view" },
          { name: "Hazrat_Adam_Hazrat_Nuh_Summary.pdf", url: "https://drive.google.com/file/d/1-XP6cQ9lYpdJ9qttX1j0pDKkHIWCIEQ1/view" },
        ],
      },
      {
        id: "w1-d2",
        weekNumber: 1,
        dayNumber: 2,
        date: "24 May 2026",
        title: "Football Passing, Human Knot Activity & Qasas Ul Anbiya #2",
        videoUrl: "https://www.youtube.com/watch?v=uvYYqNGemJs",
        sportsDrill: "Football Inside-Foot Passing, Ball Control & Keep-Away (40 mins)",
        skillsModule: "Why Skills Matter, Relating Skills with Anbiya A.S & Human Knot Team Activity",
        tadreebEthics: "Qasas Ul Anbiya # 2: Hazrat Hud A.S & Hazrat Saleh A.S",
        exercises: "Warmup Complete. Joints: Wrist, Foot, Knee & Back joints.",
        focusArea: "Team Coordination & Honesty",
        isCompleted: true,
        driveLinks: [
          { name: "Human_Knot_Activity_Guide.pdf", url: "https://drive.google.com/file/d/1HYsBrVZiDeq4Kmq0LXUJ6sTDrHSOXJd6/view" },
        ],
      },
    ],
  },
  {
    weekNumber: 2,
    title: "Week 2 • Impromptu Speaking & Confidence",
    sessions: [
      {
        id: "w2-d4",
        weekNumber: 2,
        dayNumber: 4,
        date: "31 May 2026",
        title: "Football Drills & Extempore Impromptu Speaking Exercise",
        videoUrl: "https://www.youtube.com/watch?v=YG1Z-vINXdo",
        sportsDrill: "Football Tactical Dribbling & Small Match (40 mins)",
        skillsModule: "Extempore / Impromptu Speaking Exercise. Essential Skills: Self Confidence, Dawah Capability, Creativity, Body Language",
        tadreebEthics: "Revision & Tarbiyah Discussion",
        exercises: "Warmup Complete. Joints: Wrist, Foot, Knee, Back, Elbow Bend & Shoulder.",
        focusArea: "Public Speaking & Creative Expression",
        isCompleted: true,
        driveLinks: [
          { name: "Impromptu_Speaking_Guide.pdf", url: "https://drive.google.com/file/d/1zC59H5C3x5iHk6TebxABmOE9Q1XvmG8Y/view" },
        ],
      },
    ],
  },
  {
    weekNumber: 3,
    title: "Week 3 • Active Listening & Qasas Ul Anbiya",
    sessions: [
      {
        id: "w3-d5",
        weekNumber: 3,
        dayNumber: 5,
        date: "6 Jun 2026",
        title: "AgReady Active Listening & Qasas Ul Anbiya #3 (Hazrat Ibrahim A.S)",
        videoUrl: "https://www.youtube.com/watch?v=YG1Z-vINXdo",
        sportsDrill: "Races (Rally / Three-Leg / Snail Races)",
        skillsModule: "Activity: AgReady / Focus on Active Listening. Competitive listening exercises.",
        tadreebEthics: "Qasas Ul Anbiya # 3: Hazrat Ibrahim A.S & Hazrat Ismail A.S",
        exercises: "Caution & Discipline Practice: Whistle, Get Up, Pushup position, Lineup, Line check. Martial Arts: Single hand.",
        focusArea: "Active Listening & Prophetic Sacrifice",
        isCompleted: false,
        driveLinks: [
          { name: "Active_Listening_AgReady.pdf", url: "https://drive.google.com/file/d/10XkeeQb7i6-u-OonWL3782ISGsX7hYZY/view" },
          { name: "Need_of_Skills_Document.pdf", url: "https://drive.google.com/file/d/1RTykjFCunf0eWe9mONEGyNUjPnTR2X9c/view" },
        ],
      },
      {
        id: "w3-d6",
        weekNumber: 3,
        dayNumber: 6,
        date: "7 Jun 2026",
        title: "Dodgeball, Broken Telephone Activity & Qasas Ul Anbiya #4",
        videoUrl: "https://www.youtube.com/watch?v=uvYYqNGemJs",
        sportsDrill: "Dodge the Ball (40 mins)",
        skillsModule: "Tips for Murabbi to develop Communication in Shabab. Activity: Broken Telephone (Chinese Whispers)",
        tadreebEthics: "Qasas Ul Anbiya # 4: Hazrat Lut A.S & Hazrat Yusuf A.S",
        exercises: "Warmup Complete, Joints Complete. Martial Arts: Single & Double hand techniques.",
        focusArea: "Communication Clarity & Integrity",
        isCompleted: false,
        driveLinks: [
          { name: "Chinese_Whispers_Activity.pdf", url: "https://drive.google.com/file/d/1jK74QZazXtjn1VLAWVBUrtqLDqiWGE5B/view" },
        ],
      },
    ],
  },
  {
    weekNumber: 4,
    title: "Week 4 • Mushawarat Process & Leadership",
    sessions: [
      {
        id: "w4-d7",
        weekNumber: 4,
        dayNumber: 7,
        date: "13 Jun 2026",
        title: "Martial Arts Neck Lock, Mushawarat Process & Qasas Ul Anbiya #5",
        videoUrl: "https://www.youtube.com/watch?v=YG1Z-vINXdo",
        sportsDrill: "Martial Arts: Single/Double Hand & Front Neck Lock (1st Variation)",
        skillsModule: "Mushawarat / Meeting Process & Consultation Skills. Prep for Tallest Building Challenge",
        tadreebEthics: "Qasas Ul Anbiya # 5: Hazrat Musa A.S (Part 1 & 2)",
        exercises: "Warmup Complete, Joints Complete, Sideways Body Stretch.",
        focusArea: "Consultation (Mashwara) & Self Defense",
        isCompleted: false,
        driveLinks: [
          { name: "Mushawarat_Meeting_Process.pdf", url: "https://drive.google.com/file/d/14CaOTDmbMsEJPuf1QYdsCM2dpEmC-x_n/view" },
        ],
      },
      {
        id: "w4-d8",
        weekNumber: 4,
        dayNumber: 8,
        date: "14 Jun 2026",
        title: "Tallest Building Team Challenge & Ameer Ki Itaat",
        videoUrl: "https://www.youtube.com/watch?v=uvYYqNGemJs",
        sportsDrill: "Football Match & Blind Sound Tracking Drill",
        skillsModule: "Activity: Tallest Building Challenge. Essential Skills: Problem Solving, Brainstorming, Strategy & Ameer Ki Itaat",
        tadreebEthics: "Qasas Ul Anbiya # 6: Hazrat Dawud A.S, Hazrat Sulaiman A.S & Hazrat Isa A.S",
        exercises: "Warmup, Joints, Fighting Stance & Front Roll.",
        focusArea: "Leadership & Ameer Obedience",
        isCompleted: false,
        driveLinks: [
          { name: "Tallest_Building_Activity_Guide.pdf", url: "https://drive.google.com/file/d/1uWIG9EyFDZDQKu_LZIboUVNDLsvkhul2/view" },
        ],
      },
    ],
  },
  {
    weekNumber: 5,
    title: "Week 5 • Gratitude (Shukr) & Ashab-e-Kahaf",
    sessions: [
      {
        id: "w5-d9",
        weekNumber: 5,
        dayNumber: 9,
        date: "20 Jun 2026",
        title: "Frisbee, Gratitude (Shukr) & Mindfulness Level 1",
        videoUrl: "https://www.youtube.com/watch?v=YG1Z-vINXdo",
        sportsDrill: "Frisbee Accuracy Drills (40 mins)",
        skillsModule: "Activity: Gratitude (Shukr), Mindfulness, Focus & Self Reflection Level 1",
        tadreebEthics: "Topic: Ashab-e-Kahaf (People of the Cave) - Faith & Steadfastness",
        exercises: "Warmup, Joints, Touch Toe Stretches & Martial Arts Front Rolls.",
        focusArea: "Gratitude & Spiritual Steadfastness",
        isCompleted: false,
        driveLinks: [
          { name: "Gratitude_Self_Reflection_Guide.pdf", url: "https://drive.google.com/file/d/1p_NYKgLhTyZg-VBEaoW7X5wiGl0tDcGp/view" },
        ],
      },
      {
        id: "w5-d10",
        weekNumber: 5,
        dayNumber: 10,
        date: "21 Jun 2026",
        title: "Kabaddi & Survival Challenge Roleplay Scenario",
        videoUrl: "https://www.youtube.com/watch?v=uvYYqNGemJs",
        sportsDrill: "Kabaddi Match & Raider Drills",
        skillsModule: "Activity: Role Playing Survival Challenge Scenario. Skills: Strategy & Problem Solving Level 1",
        tadreebEthics: "Quiz & Evaluation of Module 1",
        exercises: "Warmup Complete, Joints Complete, Bridge Stretches.",
        focusArea: "Survival Strategy & Group Cohesion",
        isCompleted: false,
        driveLinks: [
          { name: "Survival_Challenge_Scenario.pdf", url: "https://drive.google.com/file/d/17HsKBJ8kw30dJlt4A3LLYC4FulpFCuMn/view" },
        ],
      },
    ],
  },
  {
    weekNumber: 6,
    title: "Week 6 • Active Listening Level 2 & Swimming Event",
    sessions: [
      {
        id: "w6-d11",
        weekNumber: 6,
        dayNumber: 11,
        date: "27 Jun 2026",
        title: "Dodgeball & Speed Networking Activity (Husn al-Khulq)",
        videoUrl: "https://www.youtube.com/watch?v=YG1Z-vINXdo",
        sportsDrill: "Dodge the Ball (40 mins)",
        skillsModule: "Active Listening Level 2 + Speed Networking Activity. Islamic Traits: Respect (Ihtiram), Patience (Sabr), Good Manners (Husn al-Khulq)",
        tadreebEthics: "Tarbiyah Circle & Manners in Interaction",
        exercises: "Stretching, Boxing Stance & Dive Roll.",
        focusArea: "Islamic Manners & Respect",
        isCompleted: false,
        driveLinks: [
          { name: "Speed_Networking_Husn_Khulq.pdf", url: "https://drive.google.com/file/d/1jK74QZazXtjn1VLAWVBUrtqLDqiWGE5B/view" },
        ],
      },
      {
        id: "w6-d12",
        weekNumber: 6,
        dayNumber: 12,
        date: "28 Jun 2026",
        title: "Special Event: Swimming & Halal Nashta Social",
        videoUrl: "https://www.youtube.com/watch?v=uvYYqNGemJs",
        sportsDrill: "Swimming & Water Safety Drills",
        skillsModule: "Social Bonding, Peer Ukhuwwah & Fellowship",
        tadreebEthics: "Etiquettes of Eating (Aadaab-e-Ta'am) & Brotherhood",
        exercises: "Water Aerobics & Swimming Laps.",
        focusArea: "Brotherhood & Physical Fitness",
        isCompleted: false,
      },
    ],
  },
  {
    weekNumber: 7,
    title: "Week 7 • Purpose of Life & Scavenger Hunt",
    sessions: [
      {
        id: "w7-d13",
        weekNumber: 7,
        dayNumber: 13,
        date: "4 Jul 2026",
        title: "Wheelbarrow Races & Purpose of Life Discovery",
        videoUrl: "https://www.youtube.com/watch?v=YG1Z-vINXdo",
        sportsDrill: "Races: Three-Leg / Carry Partner / Wheelbarrow Races",
        skillsModule: "Activity: Purpose of Life. Critical Thinking & Self Awareness",
        tadreebEthics: "Revision & Deep Tarbiyah Discussion",
        exercises: "Warmup, Joints, Boxing Stance & Dive Rolls.",
        focusArea: "Purpose of Life & Self Awareness",
        isCompleted: false,
        driveLinks: [
          { name: "Purpose_of_Life_Lesson.pdf", url: "https://drive.google.com/file/d/1sQtYtkPgmADTEm9nLYOpvbmLfq9CTBoW/view" },
        ],
      },
      {
        id: "w7-d14",
        weekNumber: 7,
        dayNumber: 14,
        date: "5 Jul 2026",
        title: "Football & Landmark Scavenger Hunt in Park",
        videoUrl: "https://www.youtube.com/watch?v=uvYYqNGemJs",
        sportsDrill: "Football Match & Team Tactics",
        skillsModule: "The Landmark Quest: Collaborative Scavenger Hunt. Islamic Traits: Ukhuwwah, Tafakkur & Imamah",
        tadreebEthics: "Module Quiz & Leadership Evaluation",
        exercises: "Opposite Foot Stretches & Martial Arts Rolls.",
        focusArea: "Strategic Thinking & Ukhuwwah",
        isCompleted: false,
        driveLinks: [
          { name: "Landmark_Scavenger_Hunt.pdf", url: "https://drive.google.com/file/d/1JLnzh93r8Zu4MrfS-8xJxmNwl6nmEhFH/view" },
        ],
      },
    ],
  },
];

export function ContentPlannerPage() {
  const { data: session } = useSession();

  // Layout View Option: "classroom" (Skool-style LMS) vs "master" (Roster Table)
  const [viewOption, setViewOption] = useState<"classroom" | "master">("classroom");

  // Active Category Tab: "tadreeb" | "skills" | "sports" | "exercises"
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("tadreeb");

  // State
  const [syllabusData, setSyllabusData] = useState<WeekGroup[]>(AUTHENTIC_BATCH4_SYLLABUS);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("w1-d1");
  const [expandedWeeks, setExpandedWeeks] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [searchQuery, setSearchQuery] = useState("");

  // Find currently selected session
  const activeSession = useMemo(() => {
    for (const week of syllabusData) {
      const found = week.sessions.find((s) => s.id === selectedSessionId);
      if (found) return found;
    }
    return syllabusData[0].sessions[0];
  }, [syllabusData, selectedSessionId]);

  // Overall Completion Progress
  const totalSessionsCount = useMemo(() => {
    return syllabusData.reduce((acc, w) => acc + w.sessions.length, 0);
  }, [syllabusData]);

  const completedSessionsCount = useMemo(() => {
    return syllabusData.reduce(
      (acc, w) => acc + w.sessions.filter((s) => s.isCompleted).length,
      0
    );
  }, [syllabusData]);

  const completionPercentage = useMemo(() => {
    return totalSessionsCount > 0
      ? Math.round((completedSessionsCount / totalSessionsCount) * 100)
      : 0;
  }, [completedSessionsCount, totalSessionsCount]);

  // Toggle Session Completion
  const toggleSessionCompletion = (id: string) => {
    setSyllabusData((prev) =>
      prev.map((w) => ({
        ...w,
        sessions: w.sessions.map((s) =>
          s.id === id ? { ...s, isCompleted: !s.isCompleted } : s
        ),
      }))
    );
    toast.success("Updated session completion!");
  };

  const toggleWeekExpand = (weekNum: number) => {
    setExpandedWeeks((prev) =>
      prev.includes(weekNum) ? prev.filter((w) => w !== weekNum) : [...prev, weekNum]
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-1 pb-12 space-y-6">
      {/* ─── PAGE HEADER & VIEW OPTION SWITCHER ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-[#4B0A8F]/10 via-purple-500/5 to-transparent p-5 rounded-2xl border border-purple-200/60 dark:border-purple-900/40">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Content & Curriculum Activity Planner
            </h1>
            <Badge className="bg-[#4B0A8F] text-white font-bold">Lahore Batch 4</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            4-Pillar activity syllabus (Tadreeb, Skills, Sports, Exercises & Martial Arts) with session curriculum.
          </p>
        </div>

        {/* View Option Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setViewOption("classroom")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm",
              viewOption === "classroom"
                ? "bg-[#4B0A8F] text-white shadow-purple-500/20"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <GraduationCap className="size-4" />
            <span>Classroom Workspace (Skool View)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewOption("master")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all",
              viewOption === "master"
                ? "bg-white dark:bg-slate-900 text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="size-4" />
            <span>Master Roster Table</span>
          </button>
        </div>
      </div>

      {/* ─── OPTION 2: CLASSROOM & COURSE WORKSPACE VIEW (SKOOL STYLE) ─── */}
      {viewOption === "classroom" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ─── LEFT SIDEBAR: WEEKS & SESSION DAYS OUTLINE ─── */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
              <CardContent className="p-4 space-y-4">
                {/* Completion Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <BookOpen className="size-4 text-purple-600" />
                      Curriculum Progress
                    </span>
                    <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
                      {completionPercentage}%
                    </Badge>
                  </div>
                  <Progress value={completionPercentage} className="h-2" />
                  <p className="text-[11px] text-muted-foreground">
                    {completedSessionsCount} of {totalSessionsCount} sessions completed
                  </p>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search session title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-8 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                {/* Week Accordion Outline Tree */}
                <div className="space-y-3 pt-1 max-h-[620px] overflow-y-auto pr-1">
                  {syllabusData.map((week) => (
                    <div key={week.weekNumber} className="space-y-1">
                      {/* Week Header */}
                      <button
                        type="button"
                        onClick={() => toggleWeekExpand(week.weekNumber)}
                        className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <span className="font-bold text-xs text-foreground">{week.title}</span>
                        {expandedWeeks.includes(week.weekNumber) ? (
                          <ChevronDown className="size-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-3.5 text-muted-foreground" />
                        )}
                      </button>

                      {/* Sessions List */}
                      {expandedWeeks.includes(week.weekNumber) && (
                        <div className="pl-2 space-y-1">
                          {week.sessions.map((s) => {
                            const isSelected = s.id === selectedSessionId;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setSelectedSessionId(s.id)}
                                className={cn(
                                  "w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-start justify-between gap-2 border",
                                  isSelected
                                    ? "bg-amber-100/90 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 font-semibold shadow-sm"
                                    : "bg-white dark:bg-slate-900 border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                )}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                      Week {s.weekNumber} • Day {s.dayNumber}
                                    </span>
                                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                                      ({s.date})
                                    </span>
                                  </div>
                                  <p className="line-clamp-2 leading-snug">{s.title}</p>
                                </div>

                                {s.isCompleted && (
                                  <CheckCircle className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 fill-emerald-100 dark:fill-emerald-950" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── RIGHT MAIN CONTENT PANE: SESSION HEADER & 4 CATEGORY TABS ─── */}
          <div className="lg:col-span-8 space-y-4">
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
              <CardContent className="p-6 space-y-6">
                {/* Session Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-xs font-bold">
                        Week {activeSession.weekNumber} • Day {activeSession.dayNumber}
                      </Badge>
                      <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                        <CalendarIcon className="size-3.5" /> {activeSession.date}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                      {activeSession.title}
                    </h2>
                  </div>

                  <Button
                    size="sm"
                    variant={activeSession.isCompleted ? "outline" : "default"}
                    onClick={() => toggleSessionCompletion(activeSession.id)}
                    className={cn(
                      "gap-2 text-xs font-bold shadow-sm h-9",
                      activeSession.isCompleted
                        ? "border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    )}
                  >
                    <CheckCircle2 className="size-4" />
                    <span>{activeSession.isCompleted ? "Completed ✓" : "Mark Completed"}</span>
                  </Button>
                </div>

                {/* ─── 4 CATEGORY TABS UNDER HEADING ─── */}
                <Tabs value={activeCategoryTab} onValueChange={setActiveCategoryTab} className="w-full space-y-5">
                  <TabsList className="grid grid-cols-2 sm:grid-cols-4 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl h-auto gap-1 border border-slate-200 dark:border-slate-700">
                    {/* Tab 1: Tadreeb */}
                    <TabsTrigger
                      value="tadreeb"
                      className="rounded-xl text-xs font-bold py-2.5 flex items-center justify-center gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white shadow-none transition-all"
                    >
                      <Heart className="size-4 shrink-0" />
                      <span>Tadreeb</span>
                    </TabsTrigger>

                    {/* Tab 2: Skills */}
                    <TabsTrigger
                      value="skills"
                      className="rounded-xl text-xs font-bold py-2.5 flex items-center justify-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white shadow-none transition-all"
                    >
                      <Brain className="size-4 shrink-0" />
                      <span>Skills</span>
                    </TabsTrigger>

                    {/* Tab 3: Sports */}
                    <TabsTrigger
                      value="sports"
                      className="rounded-xl text-xs font-bold py-2.5 flex items-center justify-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white shadow-none transition-all"
                    >
                      <Dumbbell className="size-4 shrink-0" />
                      <span>Sports</span>
                    </TabsTrigger>

                    {/* Tab 4: Exercises & Martial Arts */}
                    <TabsTrigger
                      value="exercises"
                      className="rounded-xl text-xs font-bold py-2.5 flex items-center justify-center gap-2 data-[state=active]:bg-amber-600 data-[state=active]:text-white shadow-none transition-all"
                    >
                      <Activity className="size-4 shrink-0" />
                      <span>Exercises & Martial Arts</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* ─── TAB 1: TADREEB CONTENT ─── */}
                  <TabsContent value="tadreeb" className="space-y-4 focus-visible:outline-none">
                    <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                        <Heart className="size-5 text-emerald-600" />
                        <span>Tadreeb & Tarbiyah Ethics Study</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed font-medium whitespace-pre-line">
                        {activeSession.tadreebEthics}
                      </p>
                    </div>

                    {/* Drive links for Tadreeb */}
                    {activeSession.driveLinks && activeSession.driveLinks.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Download className="size-3.5 text-emerald-600" />
                          Tadreeb Study Guide Documents
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeSession.driveLinks.map((link, idx) => (
                            <a
                              key={idx}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-slate-900 hover:border-emerald-400 transition-colors text-xs font-medium"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="size-4 text-emerald-600" />
                                <span>{link.name}</span>
                              </div>
                              <ExternalLink className="size-3 text-muted-foreground" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* ─── TAB 2: SKILLS CONTENT ─── */}
                  <TabsContent value="skills" className="space-y-4 focus-visible:outline-none">
                    <div className="p-5 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 space-y-3">
                      <div className="flex items-center gap-2 text-purple-800 dark:text-purple-300 font-bold text-sm">
                        <Brain className="size-5 text-purple-600" />
                        <span>Life Skills Module & Group Activity</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed font-medium whitespace-pre-line">
                        {activeSession.skillsModule}
                      </p>
                    </div>

                    {/* YouTube Video Direct Link Banner */}
                    {activeSession.videoUrl && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-red-500/10 via-rose-500/5 to-transparent border border-red-200 dark:border-red-900/40 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                            <Youtube className="size-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                              Skill Activity YouTube Reference
                              <Badge className="bg-red-600 text-white text-[9px] px-1.5 font-bold">YouTube</Badge>
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-sm sm:max-w-md font-mono">
                              {activeSession.videoUrl}
                            </p>
                          </div>
                        </div>

                        <a
                          href={activeSession.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow transition-all shrink-0"
                        >
                          <Youtube className="size-4" />
                          <span>Watch Video on YouTube</span>
                          <ExternalLink className="size-3.5 ml-0.5" />
                        </a>
                      </div>
                    )}
                  </TabsContent>

                  {/* ─── TAB 3: SPORTS CONTENT ─── */}
                  <TabsContent value="sports" className="space-y-4 focus-visible:outline-none">
                    <div className="p-5 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                      <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold text-sm">
                        <Dumbbell className="size-5 text-blue-600" />
                        <span>Sports & Agility Field Drills</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed font-medium whitespace-pre-line">
                        {activeSession.sportsDrill}
                      </p>
                    </div>
                  </TabsContent>

                  {/* ─── TAB 4: EXERCISES & MARTIAL ARTS CONTENT ─── */}
                  <TabsContent value="exercises" className="space-y-4 focus-visible:outline-none">
                    <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                        <Activity className="size-5 text-amber-600" />
                        <span>Physical Warm-up, Exercises & Martial Arts</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed font-medium whitespace-pre-line">
                        {activeSession.exercises}
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* ─── OPTION 1: MASTER ROSTER TABLE VIEW (PREVIOUS VIEW) ─── */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden p-6 space-y-4">
          <h3 className="text-lg font-bold text-foreground">Lahore Batch 4 — Master Curriculum Matrix</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-muted-foreground font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Week & Day</th>
                  <th className="py-3 px-4">Session Date</th>
                  <th className="py-3 px-4">Session Title</th>
                  <th className="py-3 px-4">Tadreeb</th>
                  <th className="py-3 px-4">Skills</th>
                  <th className="py-3 px-4">Sports</th>
                  <th className="py-3 px-4">Exercises & Martial Arts</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {syllabusData.flatMap((w) =>
                  w.sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-bold text-purple-600">Week {s.weekNumber} • Day {s.dayNumber}</td>
                      <td className="py-3 px-4 font-mono">{s.date}</td>
                      <td className="py-3 px-4 font-bold">{s.title}</td>
                      <td className="py-3 px-4">{s.tadreebEthics}</td>
                      <td className="py-3 px-4">{s.skillsModule}</td>
                      <td className="py-3 px-4">{s.sportsDrill}</td>
                      <td className="py-3 px-4">{s.exercises}</td>
                      <td className="py-3 px-4 text-center">
                        {s.isCompleted ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">Completed</Badge>
                        ) : (
                          <Badge variant="outline">Scheduled</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
