"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Loader2,
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

// MOCK_TEAMS removed

interface MobileCollaborationTeamsPageProps {
  onBack?: () => void;
}

export function MobileCollaborationTeamsPage({ onBack }: MobileCollaborationTeamsPageProps) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<{ data: CollaborationTeam[]; pagination: any }>({
    queryKey: ["collab-teams", user?.assignedCityId],
    queryFn: async () => {
      const url = new URL("/api/admin/collaboration-teams", window.location.origin);
      if (user?.assignedCityId) {
        url.searchParams.set("cityId", user.assignedCityId);
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch teams");
      return res.json();
    },
  });

  const teams = data?.data || [];

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
    toast.success(`Scheduled activity for ${currentTeam?.name}!`);
    setIsAddActivityOpen(false);
    setActTitle("");
    setActDate("");
  };

  const addMemberMutation = useMutation({
    mutationFn: async (vars: { teamId: string; userId: string; role: string }) => {
      const res = await fetch(`/api/admin/collaboration-teams/${vars.teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: vars.userId, role: vars.role }),
      });
      if (!res.ok) throw new Error("Failed to add member");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collab-teams"] });
      toast.success(`Assigned ${memName} to ${currentTeam?.name}!`);
      setIsAddMemberOpen(false);
      setMemName("");
      setMemRole("");
    },
    onError: () => {
      toast.error("Failed to add member");
    }
  });

  const handleAddMember = () => {
    if (!memName || !memRole || !currentTeam) {
      toast.error("Please provide member name and role");
      return;
    }
    addMemberMutation.mutate({ teamId: currentTeam.id, userId: memName, role: memRole });
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

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="text-center p-4 text-sm text-destructive">Failed to load collaboration teams</div>
      ) : !currentTeam ? (
        <div className="text-center p-4 text-sm text-muted-foreground">No collaboration teams found</div>
      ) : (
        <>
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
        </>
      )}

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
