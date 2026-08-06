"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Trophy,
  Users,
  TreePine,
  GraduationCap,
  Award,
  BookOpen,
  Dumbbell,
  CheckCircle2,
  Calendar,
  MapPin,
  Heart,
  MessageSquare,
  ShieldCheck,
  Search,
  ArrowRight,
  Flame,
  Star,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const LAHORE_PARKS = [
  {
    name: "Gulberg Park",
    groups: "3 Groups",
    students: "60+ Students",
    staff: "13 Murabbis & Staff",
    lead: "Umar Rohail (Park Lead)",
    location: "Main Boulevard, Gulberg III, Lahore",
  },
  {
    name: "Gulshan Iqbal Park",
    groups: "3 Groups",
    students: "50+ Students",
    staff: "11 Murabbis & Staff",
    lead: "Park Lead Gulshan",
    location: "Allama Iqbal Town, Lahore",
  },
  {
    name: "Griffin Park",
    groups: "2 Groups",
    students: "30+ Students",
    staff: "6 Murabbis & Staff",
    lead: "Park Lead Griffin",
    location: "Canal Bank, Lahore",
  },
  {
    name: "Johar Town Park",
    groups: "2 Groups",
    students: "35+ Students",
    staff: "10 Murabbis & Staff",
    lead: "Park Lead Johar",
    location: "Block G3, Johar Town, Lahore",
  },
  {
    name: "Gulshan Ravi Park",
    groups: "2 Groups",
    students: "30+ Students",
    staff: "11 Murabbis & Staff",
    lead: "Park Lead Ravi",
    location: "Main Boulevard, Gulshan Ravi, Lahore",
  },
  {
    name: "State Life Park",
    groups: "1 Group",
    students: "20+ Students",
    staff: "6 Murabbis & Staff",
    lead: "Park Lead State Life",
    location: "State Life Society, Lahore",
  },
];

const WEEKLY_SYLLABUS = [
  {
    week: "Week 1",
    title: "Orientation & Team Discipline",
    sports: "Warm-up Drills & Agility Obstacle Course",
    skills: "Public Speaking 101: Overcoming Stage Fear",
    tadreeb: "Character Building & Respect for Parents",
    focus: "Team Discipline & Punctuality",
  },
  {
    week: "Week 2",
    title: "Leadership & Football Tactics",
    sports: "Football Passing & Positional Drills",
    skills: "Time Management & Session Planning",
    tadreeb: "Ethical Conduct & Peer Respect",
    focus: "Personal Responsibility",
  },
  {
    week: "Week 3",
    title: "Cricket & Financial Literacy",
    sports: "Cricket Bowling & Batting Technique",
    skills: "Basic Financial Literacy & Budgeting",
    tadreeb: "Honesty in Transactions & Truthfulness",
    focus: "Integrity & Trust",
  },
  {
    week: "Week 4",
    title: "Volleyball & First Aid Safety",
    sports: "Volleyball Spiking & Team Serve Drills",
    skills: "First Aid & Emergency Response Training",
    tadreeb: "Helping Others & Community Service",
    focus: "Compassion & Action",
  },
  {
    week: "Week 5",
    title: "Physical Endurance & Fitness Test",
    sports: "Interval Running & Circuit Conditioning",
    skills: "Problem Solving & Critical Thinking",
    tadreeb: "Self-Discipline & Moral Courage",
    focus: "Resilience",
  },
  {
    week: "Week 6",
    title: "Public Speaking Championship",
    sports: "Sports Gala Practice & Inter-Group Matches",
    skills: "Prepared Speech & Debating Workshop",
    tadreeb: "Leadership in Action",
    focus: "Confidence & Articulation",
  },
  {
    week: "Week 7",
    title: "Sports Gala & Team Championship",
    sports: "Annual Shabab 360 Sports Tournament",
    skills: "Team Collaboration & Crisis Handling",
    tadreeb: "Sportsmanship & Ethical Competition",
    focus: "Fair Play",
  },
  {
    week: "Week 8",
    title: "Batch Graduation & Awards Ceremony",
    sports: "Exhibition Match & Fitness Benchmarks",
    skills: "Personal Development Plan Presentation",
    tadreeb: "Life Commitment & Mentorship Oath",
    focus: "Graduation Honor",
  },
];

export function PublicProgramPage() {
  const [activeWeek, setActiveWeek] = useState<number>(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "Who is eligible to join the Shabab 360 program?",
      a: "Male youth aged 13 to 18 residing in Lahore are eligible to apply for Shabab 360 Batch 4.",
    },
    {
      q: "Is there any membership or participation fee?",
      a: "A nominal monthly contribution of PKR 1,500 covers sports gear, workshop materials, and graduation certificates. Fee waivers and scholarships are available for deserving students.",
    },
    {
      q: "What days and times are sessions conducted?",
      a: "Weekly sessions take place every weekend (Saturday or Sunday mornings) across our 6 active Lahore park locations.",
    },
    {
      q: "How are graduation certificates verified?",
      a: "Every certificate issued contains a unique serial number (e.g. CERT-2026-LHR-0041) and QR code that can be verified online anytime on our Serial Verification Portal.",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 select-none overflow-x-hidden font-sans">
      {/* ─── Top Navigation Header ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full bg-slate-950/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] border border-white/20 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
            <img src="/shabab-logo.png" alt="Logo" className="size-full object-contain" />
          </div>
          <div>
            <h1 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              شباب 360 <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-400/30">Lahore Batch 4</span>
            </h1>
            <p className="text-[10px] text-purple-200 font-medium">Youth Leadership & Character Development Program</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/"
            className="hidden sm:inline-flex px-4 py-2 rounded-xl text-xs font-extrabold bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all"
          >
            Portal Login
          </a>
          <a
            href="/prototype"
            className="px-4 py-2 rounded-xl text-xs font-black bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white shadow-lg transition-all"
          >
            Online Admission
          </a>
        </div>
      </header>

      {/* ─── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative pt-16 pb-24 px-6 max-w-7xl mx-auto text-center space-y-8 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold backdrop-blur-md">
          <Sparkles className="size-4 text-amber-400 animate-pulse" />
          <span>Empowering Youth Across 6 Lahore Parks</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Empirical Youth Leadership, <br />
          <span className="bg-gradient-to-r from-purple-400 via-amber-300 to-emerald-400 bg-clip-text text-transparent">
            Sports Agility & Tarbiyah Ethics
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed">
          Shabab 360 Lahore Batch 4 is an 8-week holistic development program combining physical agility sports, public speaking workshops, ethical Tarbiyah, and community leadership across 6 Lahore parks.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <a
            href="/prototype"
            className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#4B0A8F] to-[#1F0860] hover:from-[#380668] hover:to-[#120438] text-white font-black text-sm shadow-xl flex items-center gap-2 transition-all"
          >
            Apply for Admission <ArrowRight className="size-4" />
          </a>
          <a
            href="#syllabus"
            className="px-7 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm backdrop-blur-md transition-all"
          >
            View 8-Week Syllabus
          </a>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-10 text-left">
          <Card className="bg-slate-900/60 border-white/10 backdrop-blur-xl p-5 rounded-2xl space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-amber-400">6 Parks</div>
            <p className="text-xs text-slate-400 font-bold">Active Lahore Locations</p>
          </Card>

          <Card className="bg-slate-900/60 border-white/10 backdrop-blur-xl p-5 rounded-2xl space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-purple-400">13 Groups</div>
            <p className="text-xs text-slate-400 font-bold">Small Student Groups</p>
          </Card>

          <Card className="bg-slate-900/60 border-white/10 backdrop-blur-xl p-5 rounded-2xl space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">220+</div>
            <p className="text-xs text-slate-400 font-bold">Shabab Students Enrolled</p>
          </Card>

          <Card className="bg-slate-900/60 border-white/10 backdrop-blur-xl p-5 rounded-2xl space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-indigo-400">8 Weeks</div>
            <p className="text-xs text-slate-400 font-bold">Structured Curriculum</p>
          </Card>
        </div>
      </section>

      {/* ─── 4 Core Pillars Section ───────────────────────────────────────── */}
      <section className="py-20 bg-slate-900/40 border-y border-white/10 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <Badge className="bg-purple-500/20 text-purple-300 font-bold text-xs uppercase px-3 py-1">
              Holistic Development Framework
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-black text-white">4 Core Pillars of Shabab 360</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto font-medium">
              Designed by youth mentors and physical fitness leads to cultivate balanced, resilient, and ethical leaders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1 */}
            <Card className="bg-slate-950/80 border-purple-500/20 p-6 rounded-3xl space-y-4 hover:border-purple-500/50 transition-all">
              <div className="p-3.5 bg-purple-500/20 text-purple-400 rounded-2xl w-fit">
                <Dumbbell className="size-7" />
              </div>
              <h3 className="text-lg font-black text-white">1. Sports & Agility Fitness</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Football, Cricket, Volleyball, and physical conditioning drills designed to build stamina, teamwork, and athletic discipline.
              </p>
            </Card>

            {/* Pillar 2 */}
            <Card className="bg-slate-950/80 border-amber-500/20 p-6 rounded-3xl space-y-4 hover:border-amber-500/50 transition-all">
              <div className="p-3.5 bg-amber-500/20 text-amber-400 rounded-2xl w-fit">
                <BookOpen className="size-7" />
              </div>
              <h3 className="text-lg font-black text-white">2. Life Skills & Speaking</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Public speaking workshops, time management, basic financial literacy, problem-solving, and first-aid safety.
              </p>
            </Card>

            {/* Pillar 3 */}
            <Card className="bg-slate-950/80 border-emerald-500/20 p-6 rounded-3xl space-y-4 hover:border-emerald-500/50 transition-all">
              <div className="p-3.5 bg-emerald-500/20 text-emerald-400 rounded-2xl w-fit">
                <Heart className="size-7" />
              </div>
              <h3 className="text-lg font-black text-white">3. Tadreeb & Ethics</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Character building, ethical leadership, respect for elders, Islamic values, and active community service projects.
              </p>
            </Card>

            {/* Pillar 4 */}
            <Card className="bg-slate-950/80 border-indigo-500/20 p-6 rounded-3xl space-y-4 hover:border-indigo-500/50 transition-all">
              <div className="p-3.5 bg-indigo-500/20 text-indigo-400 rounded-2xl w-fit">
                <Trophy className="size-7" />
              </div>
              <h3 className="text-lg font-black text-white">4. Awards & Badges</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Automated attendance streak rewards, Tarbiyah badges, points leaderboards, and serial-verified graduation certificates.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── Active Lahore Parks Network ──────────────────────────────────── */}
      <section className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <Badge className="bg-emerald-500/20 text-emerald-300 font-bold text-xs uppercase px-3 py-1">
            Lahore Park Locations
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-black text-white">Our 6 Active Lahore Parks</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto font-medium">
            Sessions are held in designated, safe park areas managed by certified Park Leads and dedicated Murabbis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {LAHORE_PARKS.map((park, idx) => (
            <Card key={idx} className="bg-slate-900/60 border-white/10 p-6 rounded-3xl space-y-4 hover:border-purple-500/40 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                  <MapPin className="size-4" /> {park.name}
                </div>
                <Badge variant="outline" className="text-[10px] font-bold border-purple-500/40 text-purple-300">
                  {park.groups}
                </Badge>
              </div>

              <div className="space-y-1 text-xs text-slate-300">
                <div><strong>Location:</strong> {park.location}</div>
                <div><strong>Enrolled:</strong> {park.students}</div>
                <div><strong>Staff:</strong> {park.staff}</div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── 8-Week Session Syllabus Matrix ───────────────────────────────── */}
      <section id="syllabus" className="py-20 bg-slate-900/40 border-y border-white/10 px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <Badge className="bg-amber-500/20 text-amber-300 font-bold text-xs uppercase px-3 py-1">
              Curriculum Matrix
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-black text-white">8-Week Session Syllabus</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto font-medium">
              Explore the week-by-week curriculum matrix executed across all 6 Lahore parks.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Week Selector Pills */}
            <div className="space-y-2">
              {WEEKLY_SYLLABUS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveWeek(idx)}
                  className={cn(
                    "w-full p-4 rounded-2xl text-left transition-all flex items-center justify-between border",
                    activeWeek === idx
                      ? "bg-[#4B0A8F] text-white border-[#4B0A8F] shadow-lg font-bold"
                      : "bg-slate-900/60 text-slate-300 border-white/10 hover:bg-slate-800/60"
                  )}
                >
                  <div>
                    <div className="text-xs font-black text-amber-400">{item.week}</div>
                    <div className="text-sm font-bold truncate">{item.title}</div>
                  </div>
                  <ChevronRight className="size-4 shrink-0" />
                </button>
              ))}
            </div>

            {/* Week Detail Card */}
            <div className="lg:col-span-2">
              <Card className="bg-slate-950 border-purple-500/30 p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl h-full flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-amber-500/20 text-amber-300 font-black text-xs px-3 py-1">
                      {WEEKLY_SYLLABUS[activeWeek].week}
                    </Badge>
                    <span className="text-xs text-purple-300 font-bold">Focus: {WEEKLY_SYLLABUS[activeWeek].focus}</span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    {WEEKLY_SYLLABUS[activeWeek].title}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                    <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                      <div className="text-xs font-extrabold text-purple-300 flex items-center gap-1.5">
                        <Dumbbell className="size-4" /> Sports / Fitness
                      </div>
                      <p className="text-xs text-slate-300 font-medium">
                        {WEEKLY_SYLLABUS[activeWeek].sports}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                      <div className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                        <BookOpen className="size-4" /> Life Skills
                      </div>
                      <p className="text-xs text-slate-300 font-medium">
                        {WEEKLY_SYLLABUS[activeWeek].skills}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                      <div className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5">
                        <Heart className="size-4" /> Tadreeb Ethics
                      </div>
                      <p className="text-xs text-slate-300 font-medium">
                        {WEEKLY_SYLLABUS[activeWeek].tadreeb}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>Executed in all 6 Lahore Parks</span>
                  <a href="/prototype" className="text-purple-400 font-bold hover:underline">Apply for Batch 4 →</a>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Frequently Asked Questions (FAQ) ─────────────────────────────── */}
      <section className="py-20 px-6 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <Badge className="bg-indigo-500/20 text-indigo-300 font-bold text-xs uppercase px-3 py-1">
            Questions & Information
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-black text-white">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <Card
              key={idx}
              onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              className="bg-slate-900/60 border-white/10 p-5 rounded-2xl cursor-pointer hover:border-purple-500/30 transition-all space-y-2"
            >
              <div className="flex items-center justify-between font-bold text-sm text-white">
                <span>{faq.q}</span>
                {openFaq === idx ? <ChevronUp className="size-4 text-purple-400" /> : <ChevronDown className="size-4 text-slate-400" />}
              </div>
              {openFaq === idx && (
                <p className="text-xs text-slate-300 font-medium pt-2 border-t border-white/10 leading-relaxed">
                  {faq.a}
                </p>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* ─── Footer Section ───────────────────────────────────────────────── */}
      <footer className="py-12 border-t border-white/10 bg-slate-950 px-6 text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="size-8 rounded-xl bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] border border-white/20 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
            <img src="/shabab-logo.png" alt="Logo" className="size-full object-contain" />
          </div>
          <span className="text-base font-black text-white">شباب 360 - Shabab 360 Lahore</span>
        </div>

        <p className="text-xs text-slate-500 font-medium">
          Empowering youth leadership through agility sports, Tarbiyah ethics, and life skills.
        </p>

        <div className="text-[11px] text-slate-600 font-medium">
          © 2026 Shabab 360. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
