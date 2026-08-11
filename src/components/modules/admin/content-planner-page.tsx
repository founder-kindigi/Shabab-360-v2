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
  PlayCircle,
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

// --- Helper: Extract YouTube Video ID from any URL ---
const extractYoutubeId = (url?: string) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
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

  // YouTube Video ID Extractor
  const activeYoutubeId = useMemo(() => {
    return extractYoutubeId(activeSession.videoUrl);
  }, [activeSession]);

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
            Design 4-pillar activity syllabus, stream embedded YouTube lectures & drills, and manage session curriculum.
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

          {/* ─── RIGHT MAIN CONTENT PANE: EMBEDDED YOUTUBE VIDEO & SYLLABUS ─── */}
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

                {/* 🎥 EMBEDDED YOUTUBE VIDEO PLAYER / MEDIA WORKSPACE */}
                {activeYoutubeId ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Youtube className="size-4 text-red-600" />
                        Session Video Demonstration
                      </span>
                      <a
                        href={activeSession.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        Open on YouTube <ExternalLink className="size-3" />
                      </a>
                    </div>

                    <div className="relative rounded-2xl overflow-hidden shadow-md aspect-video bg-black border border-slate-800">
                      <iframe
                        className="w-full h-full"
                        src={`https://www.youtube.com/embed/${activeYoutubeId}?rel=0&modestbranding=1`}
                        title={activeSession.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video flex flex-col items-center justify-center text-white shadow-inner border border-slate-800 p-6 text-center">
                    <Video className="size-12 text-purple-400 mb-2" />
                    <h4 className="font-bold text-base">{activeSession.title}</h4>
                    <p className="text-xs text-slate-400 max-w-md mt-1">
                      On-site outdoor session module for {activeSession.date}. Complete the 4-pillar drills and tarbiyah circle below.
                    </p>
                  </div>
                )}

                {/* 4 CORE CURRICULUM PILLARS GRID */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Sparkles className="size-4 text-purple-600" />
                    4-Pillar Session Syllabus Breakdown
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Pillar 1: Sports & Agility */}
                    <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-xs">
                        <Dumbbell className="size-4" />
                        <span>Sports & Agility Drills</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed font-medium">
                        {activeSession.sportsDrill}
                      </p>
                    </div>

                    {/* Pillar 2: Life Skills */}
                    <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 space-y-2">
                      <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-bold text-xs">
                        <Brain className="size-4" />
                        <span>Life Skills Module</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed font-medium">
                        {activeSession.skillsModule}
                      </p>
                    </div>

                    {/* Pillar 3: Tadreeb & Tarbiyah Ethics */}
                    <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                        <Heart className="size-4" />
                        <span>Tadreeb & Tarbiyah Ethics</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed font-medium">
                        {activeSession.tadreebEthics}
                      </p>
                    </div>

                    {/* Pillar 4: Physical Exercises */}
                    <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
                        <Activity className="size-4" />
                        <span>Physical Warm-up & Exercises</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed font-medium">
                        {activeSession.exercises}
                      </p>
                    </div>
                  </div>
                </div>

                {/* GOOGLE DRIVE & LESSON ATTACHMENTS */}
                {activeSession.driveLinks && activeSession.driveLinks.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Download className="size-4 text-purple-600" />
                      Session Resource Links & Drive Documents
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeSession.driveLinks.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-purple-400 transition-colors text-xs group"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 text-purple-600 group-hover:scale-110 transition-transform" />
                            <span className="font-bold text-foreground">{link.name}</span>
                          </div>
                          <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-purple-600" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
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
                  <th className="py-3 px-4">Sports & Agility</th>
                  <th className="py-3 px-4">Life Skills</th>
                  <th className="py-3 px-4">Tadreeb Ethics</th>
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
                      <td className="py-3 px-4">{s.sportsDrill}</td>
                      <td className="py-3 px-4">{s.skillsModule}</td>
                      <td className="py-3 px-4">{s.tadreebEthics}</td>
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
