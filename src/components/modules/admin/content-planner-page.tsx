"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Plus,
  Search,
  BookOpen,
  CheckCircle2,
  Clock,
  ChevronRight,
  Brain,
  Dumbbell,
  Heart,
  BookMarked,
  Filter,
  FileCheck,
  Layers,
  Sparkles,
  Users,
  Target,
  PlayCircle,
  Download,
  FileText,
  Video,
  Check,
  ChevronDown,
  LayoutGrid,
  List,
  GraduationCap,
  Calendar as CalendarIcon,
  CheckCircle,
  Activity,
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
  videoDuration?: string;
  sportsDrill: string;
  skillsModule: string;
  tadreebEthics: string;
  exercises: string;
  focusArea: string;
  isCompleted: boolean;
  resources: { name: string; size: string; type: string }[];
  checklist: { id: string; text: string; done: boolean }[];
};

export type WeekGroup = {
  weekNumber: number;
  title: string;
  sessions: SyllabusSession[];
};

// --- Mock Lahore Batch 4 Curriculum Data ---
const LAHORE_BATCH_4_SYLLABUS: WeekGroup[] = [
  {
    weekNumber: 1,
    title: "Week 1 • Foundations & Orientation",
    sessions: [
      {
        id: "w1-d1",
        weekNumber: 1,
        dayNumber: 1,
        date: "15 May 2026",
        title: "Orientation, Physical Baseline & Ethical Foundations",
        videoDuration: "18:45",
        sportsDrill: "Sprint baseline 50m, Cone Shuttle Run, Agility Ladder Drills",
        skillsModule: "Orientation to Youth Leadership & Team Communication",
        tadreebEthics: "Intentions (Niyyah), Respect for Mentors & Peer Discipline",
        exercises: "Dynamic Warm-up, High Knees, Leg Swings, Core Plank 60s",
        focusArea: "Physical Readiness & Peer Trust",
        isCompleted: true,
        resources: [
          { name: "Week_1_Day_1_Session_Slides.pdf", size: "2.4 MB", type: "PDF" },
          { name: "Agility_Baseline_Assessment_Sheet.xlsx", size: "1.1 MB", type: "XLSX" },
        ],
        checklist: [
          { id: "c1", text: "Take physical agility baseline measurements", done: true },
          { id: "c2", text: "Distribute youth handbook and safety guidelines", done: true },
          { id: "c3", text: "Conduct initial 15-min Tadreeb circle", done: true },
        ],
      },
      {
        id: "w1-d2",
        weekNumber: 1,
        dayNumber: 2,
        date: "17 May 2026",
        title: "Football Passing Fundamentals & Public Speaking Intro",
        videoDuration: "22:10",
        sportsDrill: "Football Inside-Foot Passing, Receiving in Motion, 3v2 Keep-Away",
        skillsModule: "Public Speaking & Self-Introduction Confidence",
        tadreebEthics: "Honesty in Sportsmanship & Controlling Anger",
        exercises: "Cardio Jog 1km, Quad Stretches, Jumping Jacks 50x",
        focusArea: "Ball Control & Voice Clarity",
        isCompleted: true,
        resources: [
          { name: "Football_Drill_Diagrams.pdf", size: "3.8 MB", type: "PDF" },
        ],
        checklist: [
          { id: "c4", text: "Set up 4 passing cones grid", done: true },
          { id: "c5", text: "Have every student speak for 45 seconds", done: true },
        ],
      },
    ],
  },
  {
    weekNumber: 2,
    title: "Week 2 • Teamwork & Critical Thinking",
    sessions: [
      {
        id: "w2-d3",
        weekNumber: 2,
        dayNumber: 3,
        date: "22 May 2026",
        title: "Cricket Bowling Technique & Time Management Basics",
        videoDuration: "25:30",
        sportsDrill: "Cricket Pace & Spin Delivery Action, Target Bowling to Cones",
        skillsModule: "Time Management & Eisenhower Matrix for Students",
        tadreebEthics: "Punctuality (Waqt ki Pabandee) & Daily Prayer Routine",
        exercises: "Shoulder Rotations, Resistance Band Arm Warm-up",
        focusArea: "Accuracy & Daily Scheduling",
        isCompleted: true,
        resources: [
          { name: "Time_Management_Worksheet.pdf", size: "1.5 MB", type: "PDF" },
        ],
        checklist: [
          { id: "c6", text: "Conduct target bowling challenge", done: true },
          { id: "c7", text: "Review student daily schedule planner", done: true },
        ],
      },
      {
        id: "w2-d4",
        weekNumber: 2,
        dayNumber: 4,
        date: "24 May 2026",
        title: "Basketball Dribbling & Problem Solving Under Pressure",
        videoDuration: "20:15",
        sportsDrill: "Crossover Dribble, Speed Dribble through Obstacles, Layup Practice",
        skillsModule: "Critical Thinking & Group Problem Solving Challenge",
        tadreebEthics: "Consultation (Mashwara) & Respecting Differing Opinions",
        exercises: "Calf Raises, Lateral Shuffles, Burpees 20x",
        focusArea: "Hand-Eye Coordination & Decision Making",
        isCompleted: false,
        resources: [
          { name: "Problem_Solving_Case_Studies.pdf", size: "2.1 MB", type: "PDF" },
        ],
        checklist: [
          { id: "c8", text: "Assign group problem-solving scenario", done: false },
          { id: "c9", text: "Evaluate team consultation dynamics", done: false },
        ],
      },
    ],
  },
  {
    weekNumber: 3,
    title: "Week 3 • Leadership & First Aid Essentials",
    sessions: [
      {
        id: "w3-d5",
        weekNumber: 3,
        dayNumber: 5,
        date: "6 Jun 2026",
        title: "Traditional Automation vs Modern AI Automation & First Aid",
        videoUrl: "https://www.youtube.com/watch?v=demo",
        videoDuration: "28:01",
        sportsDrill: "Tactical Position Play, High-Speed Counterattack Passing, Small-Sided Match",
        skillsModule: "Emergency First Aid, Bandaging, CPR Steps & Safety Protocol",
        tadreebEthics: "Service to Humanity (Khidmat-e-Khalq) & Helping Injured Peers",
        exercises: "Core Endurance Plank 90s, Push-ups 30x, Mountain Climbers",
        focusArea: "Emergency Response & Tactical Discipline",
        isCompleted: false,
        resources: [
          { name: "First_Aid_Emergency_Guide.pdf", size: "4.2 MB", type: "PDF" },
          { name: "Automation_vs_AI_Framework.pdf", size: "1.8 MB", type: "PDF" },
          { name: "Session_5_Murabbi_Guide.docx", size: "850 KB", type: "DOCX" },
        ],
        checklist: [
          { id: "c10", text: "Demonstrate CPR chest compression technique", done: false },
          { id: "c11", text: "Practice Triangular Bandage application", done: false },
          { id: "c12", text: "Run 15-minute small-sided tactical match", done: false },
        ],
      },
      {
        id: "w3-d6",
        weekNumber: 3,
        dayNumber: 6,
        date: "8 Jun 2026",
        title: "Volleyball Spiking & Financial Literacy for Youth",
        videoDuration: "24:00",
        sportsDrill: "Volleyball Set & Spike Technique, Blocking at Net, Server Reception",
        skillsModule: "Personal Finance, Budgeting & Halal Earning Principles",
        tadreebEthics: "Honesty in Transactions & Avoiding Extravagance (Israaf)",
        exercises: "Vertical Jump Squats 25x, Ankle Mobility Warm-up",
        focusArea: "Jump Power & Financial Stewardship",
        isCompleted: false,
        resources: [
          { name: "Youth_Budgeting_Worksheet.pdf", size: "1.2 MB", type: "PDF" },
        ],
        checklist: [
          { id: "c13", text: "Distribute sample monthly budget sheet", done: false },
          { id: "c14", text: "Conduct net spiking drill for each cadet", done: false },
        ],
      },
    ],
  },
];

export function ContentPlannerPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  // Layout View Switcher: "classroom" (Skool-style LMS) vs "master" (Roster Table)
  const [viewOption, setViewOption] = useState<"classroom" | "master">("classroom");

  // Classroom Active Session Selection State
  const [syllabusData, setSyllabusData] = useState<WeekGroup[]>(LAHORE_BATCH_4_SYLLABUS);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("w3-d5");
  const [expandedWeeks, setExpandedWeeks] = useState<number[]>([1, 2, 3]);
  const [searchQuery, setSearchQuery] = useState("");

  // Find currently selected session object
  const activeSession = useMemo(() => {
    for (const week of syllabusData) {
      const found = week.sessions.find((s) => s.id === selectedSessionId);
      if (found) return found;
    }
    return syllabusData[2].sessions[0];
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
    toast.success("Updated session completion status!");
  };

  // Toggle Checklist Item
  const toggleChecklistItem = (sessionId: string, checkId: string) => {
    setSyllabusData((prev) =>
      prev.map((w) => ({
        ...w,
        sessions: w.sessions.map((s) => {
          if (s.id !== sessionId) return s;
          return {
            ...s,
            checklist: s.checklist.map((c) =>
              c.id === checkId ? { ...c, done: !c.done } : c
            ),
          };
        }),
      }))
    );
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
            Design 4-pillar activity syllabus, manage weekly video lectures & drills, and track Murabbi session completion.
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
                {/* Completion Progress Header */}
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

                {/* Search Box */}
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
                <div className="space-y-3 pt-1 max-h-[600px] overflow-y-auto pr-1">
                  {syllabusData.map((week) => (
                    <div key={week.weekNumber} className="space-y-1">
                      {/* Week Header Toggle */}
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

                      {/* Session Items inside Week */}
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
                                    ? "bg-amber-100/80 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 font-semibold shadow-sm"
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

          {/* ─── RIGHT MAIN CONTENT PANE: SESSION WORKSPACE & MEDIA ─── */}
          <div className="lg:col-span-8 space-y-4">
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
              <CardContent className="p-6 space-y-6">
                {/* Session Header Bar */}
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
                    <span>{activeSession.isCompleted ? "Session Completed ✓" : "Mark Completed"}</span>
                  </Button>
                </div>

                {/* Video / Presentation Media Player Embed Placeholder */}
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video flex flex-col items-center justify-center text-white shadow-inner group border border-slate-800">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-80" />
                  <div className="relative z-10 flex flex-col items-center gap-3 text-center px-4">
                    <div className="size-16 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform cursor-pointer">
                      <PlayCircle className="size-10 fill-white/20" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{activeSession.title}</h4>
                      <p className="text-xs text-purple-200 mt-0.5">
                        Interactive Video & Slide Deck ({activeSession.videoDuration || "25:00"})
                      </p>
                    </div>
                  </div>

                  {/* Video Duration Badge */}
                  <div className="absolute bottom-3 right-3 z-10 bg-slate-900/90 text-white text-[10px] font-mono px-2 py-1 rounded-md border border-slate-700">
                    {activeSession.videoDuration || "25:00"}
                  </div>
                </div>

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

                {/* MURABBI ACTION CHECKLIST & RESOURCES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {/* Murabbi Session Checklist */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      Murabbi Teaching Checklist
                    </h4>

                    <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      {activeSession.checklist.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer hover:text-purple-600 transition-colors"
                        >
                          <Checkbox
                            checked={item.done}
                            onCheckedChange={() => toggleChecklistItem(activeSession.id, item.id)}
                          />
                          <span className={cn(item.done && "line-through text-muted-foreground")}>
                            {item.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Resource Downloads */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Download className="size-4 text-purple-600" />
                      Downloadable Session Attachments
                    </h4>

                    <div className="space-y-2">
                      {activeSession.resources.map((res, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-300 transition-colors text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 text-purple-600" />
                            <div>
                              <p className="font-bold text-foreground text-xs">{res.name}</p>
                              <span className="text-[10px] text-muted-foreground">{res.size} • {res.type}</span>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toast.success(`Downloading ${res.name}...`)}
                            className="h-7 text-purple-600"
                          >
                            <Download className="size-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
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
