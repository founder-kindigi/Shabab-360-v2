"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Shield,
  Dumbbell,
  Lightbulb,
  Heart,
  Video,
  FileText,
  Plus,
  Search,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Clock,
  UserPlus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  park: string;
}

interface TeamActivity {
  id: string;
  title: string;
  pillar: string;
  targetDate: string;
  status: "draft" | "planned" | "executed";
  leadName: string;
}

interface CollaborationTeam {
  id: string;
  code: "sports" | "skills" | "tadreeb" | "media" | "muawin";
  name: string;
  description: string;
  leadName: string;
  leadRole: string;
  members: TeamMember[];
  documents: { id: string; label: string; url: string }[];
  activities: TeamActivity[];
}

const MOCK_TEAMS: CollaborationTeam[] = [
  {
    id: "team-sports",
    code: "sports",
    name: "Sports & Physical Fitness Team",
    description: "Designing sprint drills, agility courses, football leagues, and fitness testing rubrics.",
    leadName: "Coach Danial",
    leadRole: "Lead Physical Instructor",
    members: [
      { id: "m1", name: "Danish Qureshi", role: "Football Specialist", email: "danish@shabab360.org", park: "Gulberg Park" },
      { id: "m2", name: "Saad Sheikh", role: "Athletics Coach", email: "saad@shabab360.org", park: "Model Town" },
    ],
    documents: [
      { id: "d1", label: "Sports Safety & Warm-up Protocols", url: "/docs/sports-safety.pdf" },
      { id: "d2", label: "Batch 4 Football Tournament Bracket", url: "/docs/tournament-bracket.pdf" },
    ],
    activities: [
      { id: "a1", title: "Inter-Park Tug-of-War Championship", pillar: "Sports", targetDate: "2026-09-22", status: "planned", leadName: "Coach Danial" },
      { id: "a2", title: "Quarterly Beep Test Fitness Assessment", pillar: "Sports", targetDate: "2026-09-29", status: "draft", leadName: "Danish Qureshi" },
    ],
  },
  {
    id: "team-skills",
    code: "skills",
    name: "Life Skills & Vocational Team",
    description: "Equipping cadets with first aid, public speaking, woodworking, digital tools, and financial literacy.",
    leadName: "Engr. Salman",
    leadRole: "Vocational Program Lead",
    members: [
      { id: "m3", name: "Usman Ghani", role: "Design & Media Trainer", email: "usman@shabab360.org", park: "Gulberg Park" },
      { id: "m4", name: "Zubair Hashmi", role: "First Aid & Survival", email: "zubair@shabab360.org", park: "Iqbal Park" },
    ],
    documents: [
      { id: "d3", label: "Emergency CPR & First Aid Handbook", url: "/docs/cpr-handbook.pdf" },
    ],
    activities: [
      { id: "a3", title: "Field Survival Kit Workshop", pillar: "Skills", targetDate: "2026-09-18", status: "executed", leadName: "Zubair Hashmi" },
    ],
  },
  {
    id: "team-tadreeb",
    code: "tadreeb",
    name: "Tadreeb & Spiritual Formation Team",
    description: "Curating daily Hadith reflections, Seerah circles, 40-day Islah tracking, and Salah compliance.",
    leadName: "Maulana Ikram Meer",
    leadRole: "Head of Tarbiyah",
    members: [
      { id: "m5", name: "Hafiz Bilal", role: "Seerah Lecturer", email: "bilal@shabab360.org", park: "Racecourse Park" },
      { id: "m6", name: "Basit Ahsan", role: "Islah Supervisor", email: "basit@shabab360.org", park: "Gulberg Park" },
    ],
    documents: [
      { id: "d4", label: "40-Day Mamulat Framework", url: "/docs/islah-framework.pdf" },
    ],
    activities: [
      { id: "a4", title: "Tahajjud & Fajr Spiritual Qiyam Night", pillar: "Tadreeb", targetDate: "2026-09-24", status: "planned", leadName: "Maulana Ikram" },
    ],
  },
  {
    id: "team-media",
    code: "media",
    name: "Media & Documentation Team",
    description: "Video coverage, weekly karguzari recap videos, photography, and social newsletters.",
    leadName: "Ahmed Farooq",
    leadRole: "Lead Creative Producer",
    members: [
      { id: "m7", name: "Hamza Tariq", role: "Cinematographer", email: "hamza@shabab360.org", park: "Central" },
    ],
    documents: [
      { id: "d5", label: "Brand Video Guidelines", url: "/docs/media-guidelines.pdf" },
    ],
    activities: [
      { id: "a5", title: "Batch 4 Month 1 Highlight Video", pillar: "Media", targetDate: "2026-09-30", status: "draft", leadName: "Ahmed Farooq" },
    ],
  },
];

interface MobileCollaborationTeamsPageProps {
  onBack?: () => void;
}

export function MobileCollaborationTeamsPage({ onBack }: MobileCollaborationTeamsPageProps) {
  const { data: session } = useSession();
  const [teams, setTeams] = useState<CollaborationTeam[]>(MOCK_TEAMS);
  const [activeCode, setActiveCode] = useState<string>("sports");
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // Form states
  const [actTitle, setActTitle] = useState("");
  const [actDate, setActDate] = useState("");
  const [memName, setMemName] = useState("");
  const [memRole, setMemRole] = useState("");
  const [memPark, setMemPark] = useState("Gulberg Park");

  const currentTeam = useMemo(() => {
    return teams.find((t) => t.code === activeCode) || teams[0];
  }, [teams, activeCode]);

  const teamPillars = [
    { code: "sports", label: "Sports", icon: Dumbbell, color: "text-sky-600 bg-sky-50 border-sky-200" },
    { code: "skills", label: "Skills", icon: Lightbulb, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { code: "tadreeb", label: "Tadreeb", icon: Heart, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    { code: "media", label: "Media", icon: Video, color: "text-purple-600 bg-purple-50 border-purple-200" },
  ];

  const handleAddActivity = () => {
    if (!actTitle || !actDate) {
      toast.error("Please provide activity title and target date");
      return;
    }
    const newAct: TeamActivity = {
      id: `act-${Date.now()}`,
      title: actTitle,
      pillar: currentTeam.name.split(" ")[0],
      targetDate: actDate,
      status: "planned",
      leadName: currentTeam.leadName,
    };
    setTeams((prev) =>
      prev.map((t) => (t.code === currentTeam.code ? { ...t, activities: [newAct, ...t.activities] } : t))
    );
    toast.success(`Scheduled activity for ${currentTeam.name}!`);
    setIsAddActivityOpen(false);
    setActTitle("");
    setActDate("");
  };

  const handleAddMember = () => {
    if (!memName || !memRole) {
      toast.error("Please provide member name and role");
      return;
    }
    const newMember: TeamMember = {
      id: `m-${Date.now()}`,
      name: memName,
      role: memRole,
      email: `${memName.toLowerCase().replace(/\s+/g, ".")}@shabab360.org`,
      park: memPark,
    };
    setTeams((prev) =>
      prev.map((t) => (t.code === currentTeam.code ? { ...t, members: [...t.members, newMember] } : t))
    );
    toast.success(`Assigned ${memName} to ${currentTeam.name}!`);
    setIsAddMemberOpen(false);
    setMemName("");
    setMemRole("");
  };

  return (
    <div className="w-full max-w-[460px] mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground pb-28 space-y-4 px-4 pt-4 select-none">
      {/* ─── PWA Top Bar ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              onClick={onBack}
              className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black text-[#1F0860] dark:text-purple-200 tracking-tight">
                Collaboration Teams
              </h1>
              <Badge className="bg-[#4B0A8F] text-white text-[10px] px-1.5 py-0 h-4 font-bold">
                Cross-Functional
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              Sports, Skills, Tadreeb, Media & Muawin workspaces
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setIsAddActivityOpen(true)}
          className="h-8 gap-1 text-xs font-bold bg-[#4B0A8F] hover:bg-[#3b0873] text-white rounded-xl shadow"
        >
          <Plus className="size-3.5" />
          <span>Plan</span>
        </Button>
      </div>

      {/* ─── Team Horizontal Switcher ─── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {teamPillars.map((p) => {
          const Icon = p.icon;
          const isActive = activeCode === p.code;
          return (
            <button
              key={p.code}
              type="button"
              onClick={() => setActiveCode(p.code)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-sm",
                isActive
                  ? "bg-[#4B0A8F] text-white shadow-[#4B0A8F]/20"
                  : "bg-white dark:bg-slate-900 text-muted-foreground border border-slate-200 dark:border-slate-800"
              )}
            >
              <Icon className="size-3.5" />
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Active Team Leadership Card ─── */}
      <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <CardContent className="p-4 space-y-2.5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-black text-[#1F0860] dark:text-purple-200">
                {currentTeam.name}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">{currentTeam.description}</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60 text-xs">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-[#4B0A8F] text-white flex items-center justify-center font-bold text-xs">
                {currentTeam.leadName.charAt(0)}
              </div>
              <div>
                <span className="font-bold text-foreground block text-xs">{currentTeam.leadName}</span>
                <span className="text-[10px] text-muted-foreground">{currentTeam.leadRole}</span>
              </div>
            </div>
            <Badge className="bg-[#4B0A8F] text-white text-[9px] font-bold">Team Lead</Badge>
          </div>
        </CardContent>
      </Card>

      {/* ─── Team Members Section ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Staff Members ({currentTeam.members.length})
          </h3>
          <button
            onClick={() => setIsAddMemberOpen(true)}
            className="text-xs font-bold text-[#4B0A8F] hover:underline flex items-center gap-1"
          >
            <UserPlus className="size-3" />
            <span>Add Member</span>
          </button>
        </div>

        <div className="space-y-2">
          {currentTeam.members.map((mem) => (
            <div
              key={mem.id}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-foreground block">{mem.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {mem.role} • {mem.park}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] border-slate-300">
                Active
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Planned Activities Section ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Upcoming Activities ({currentTeam.activities.length})
          </h3>
          <button
            onClick={() => setIsAddActivityOpen(true)}
            className="text-xs font-bold text-[#4B0A8F] hover:underline flex items-center gap-1"
          >
            <Plus className="size-3" />
            <span>Schedule Activity</span>
          </button>
        </div>

        <div className="space-y-2">
          {currentTeam.activities.map((act) => (
            <div
              key={act.id}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-xs">{act.title}</span>
                <span
                  className={cn(
                    "text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border",
                    act.status === "executed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : act.status === "planned"
                      ? "bg-sky-50 text-sky-700 border-sky-200"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  )}
                >
                  {act.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3 text-purple-600" />
                  {act.targetDate}
                </span>
                <span>Lead: {act.leadName}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Add Activity Dialog ─── */}
      <Dialog open={isAddActivityOpen} onOpenChange={setIsAddActivityOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="size-5 text-[#4B0A8F]" />
              Schedule Team Activity
            </DialogTitle>
            <DialogDescription className="text-xs">
              Plan curriculum tasks for {currentTeam.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Activity Title</Label>
              <Input
                placeholder="e.g. Inter-Park Agility Competition..."
                value={actTitle}
                onChange={(e) => setActTitle(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Target Date</Label>
              <Input
                type="date"
                value={actDate}
                onChange={(e) => setActDate(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddActivityOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddActivity} className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white font-bold">
              Save Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Member Dialog ─── */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="size-5 text-[#4B0A8F]" />
              Assign Staff to {currentTeam.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a nominated murabbi or coach to this collaboration team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Staff Member Name</Label>
              <Input
                placeholder="e.g. Tariq Mehmood"
                value={memName}
                onChange={(e) => setMemName(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Team Role / Specialization</Label>
              <Input
                placeholder="e.g. Agility Trainer / Seerah Lead"
                value={memRole}
                onChange={(e) => setMemRole(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Park Base</Label>
              <Input
                placeholder="e.g. Model Town Park"
                value={memPark}
                onChange={(e) => setMemPark(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddMemberOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddMember} className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white font-bold">
              Assign Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
