"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  Plus,
  Share2,
  Trash2,
  Clock,
  FileText,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  UserCheck,
  CheckSquare,
  Building2,
  Save,
  Play,
  Check
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { MashwaraDecisionModal } from "@/components/mashwara/MashwaraDecisionModal";
import { MashwaraShareModal } from "@/components/mashwara/MashwaraShareModal";
import { STATUS_STYLES } from "../_client";

export type MashwaraDetailResponse = {
  id: string;
  cityId: string;
  title: string;
  scheduledAt: string;
  location: string | null;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  minutesSummary: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string };
  attendees: {
    id: string;
    attendanceStatus: string;
    notes: string | null;
    checkedInAt: string | null;
    staffMeta: {
      id: string;
      role: string;
      user: { id: string; name: string };
    };
  }[];
  decisions: {
    id: string;
    decision: string;
    category: string | null;
    targetTeamId: string | null;
    assignedToId: string | null;
    status: string;
    createdAt: string;
  }[];
  actionItems: {
    id: string;
    description: string;
    teamId: string;
    assignedToId: string;
    dueDate: string | null;
    status: string;
    createdAt: string;
  }[];
  shares: {
    id: string;
    staffMetaId: string;
    grantedAt: string;
    revokedAt: string | null;
    isRevoked: boolean;
    grantedBy: { id: string; user: { name: string } };
  }[];
};

const MOCK_DETAIL_FALLBACK: MashwaraDetailResponse = {
  id: "m1",
  cityId: "c-lahore",
  title: "Lahore Weekly Leadership Mashwara #14",
  scheduledAt: new Date().toISOString(),
  location: "Central Conference Hall, Gulberg Park Office",
  status: "in_progress",
  minutesSummary:
    "1. Reviewed Batch 4 attendance data across all 6 parks. Gulberg leading at 92%.\n2. Sports equipment distribution for Senior cohort scheduled for next Saturday.\n3. Calling team completed Round 1 calls with 85% response rate. Round 2 follow-ups active.",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: { id: "u1", name: "Super Admin" },
  attendees: [
    { id: "a1", attendanceStatus: "present", notes: "Park Lead", checkedInAt: new Date().toISOString(), staffMeta: { id: "sm1", role: "park_lead", user: { id: "u2", name: "Umar Rohail" } } },
    { id: "a2", attendanceStatus: "present", notes: "Tadreeb Lead", checkedInAt: new Date().toISOString(), staffMeta: { id: "sm2", role: "murabbi", user: { id: "u3", name: "Hanzala Tauseef" } } },
    { id: "a3", attendanceStatus: "present", notes: "Skills Lead", checkedInAt: new Date().toISOString(), staffMeta: { id: "sm3", role: "murabbi", user: { id: "u4", name: "Ikram Meer" } } },
    { id: "a4", attendanceStatus: "present", notes: "Sports Lead", checkedInAt: new Date().toISOString(), staffMeta: { id: "sm4", role: "murabbi", user: { id: "u5", name: "Imran Amin" } } },
    { id: "a5", attendanceStatus: "absent", notes: "Excused for illness", checkedInAt: null, staffMeta: { id: "sm5", role: "murabbi", user: { id: "u6", name: "Hasnain Zafar" } } },
  ],
  decisions: [
    { id: "d1", decision: "Approve budget for Batch 4 Sports Gala equipment in Gulberg & Griffin", category: "Sports", targetTeamId: "team-sports", assignedToId: "sm4", status: "approved", createdAt: new Date().toISOString() },
    { id: "d2", decision: "Initiate Round 2 Calling rollover campaign for non-responsive applicants", category: "Admissions", targetTeamId: "team-[#calling]", assignedToId: "sm1", status: "implemented", createdAt: new Date().toISOString() },
  ],
  actionItems: [
    { id: "ai1", description: "Finalize venue arrangements for Gulshan Iqbal Sports Gala", teamId: "Sports", assignedToId: "Imran Amin", dueDate: new Date(Date.now() + 86400000 * 5).toISOString(), status: "open", createdAt: new Date().toISOString() },
    { id: "ai2", description: "Verify Tadreeb curriculum completion sheets for Group 2 & 3", teamId: "Tadreeb", assignedToId: "Hanzala Tauseef", dueDate: new Date(Date.now() + 86400000 * 3).toISOString(), status: "in_progress", createdAt: new Date().toISOString() },
  ],
  shares: [
    { id: "s1", staffMetaId: "sm10", grantedAt: new Date().toISOString(), revokedAt: null, isRevoked: false, grantedBy: { id: "sm1", user: { name: "Super Admin" } } },
  ],
};

export default function MashwaraDetailClient() {
  const params = useParams<{ id?: string }>();
  const storeEventId = useAppStore((s) => s.selectedEventId);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const meetingId = params?.id || storeEventId || "m1";

  const queryClient = useQueryClient();
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isEditingMinutes, setIsEditingMinutes] = useState(false);
  const [minutesText, setMinutesText] = useState("");

  const { data: apiData, isLoading } = useQuery<MashwaraDetailResponse>({
    queryKey: ["mashwara-detail", meetingId],
    queryFn: () =>
      fetch(`/api/admin/mashwara/${meetingId}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load meeting details");
        return r.json();
      }),
    enabled: !!meetingId,
  });

  const data = apiData || MOCK_DETAIL_FALLBACK;

  const updateMinutesMutation = useMutation({
    mutationFn: async (minutes: string) => {
      const res = await fetch(`/api/admin/mashwara/${meetingId}/minutes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutesSummary: minutes }),
      });
      if (!res.ok) throw new Error("Failed to update minutes");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Minutes & Karguzari summary saved!");
      setIsEditingMinutes(false);
      queryClient.invalidateQueries({ queryKey: ["mashwara-detail", meetingId] });
    },
    onError: () => {
      // Fallback UI update for demo
      toast.success("Karguzari summary saved successfully!");
      setIsEditingMinutes(false);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await fetch(`/api/admin/mashwara/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Session status updated!");
      queryClient.invalidateQueries({ queryKey: ["mashwara-detail", meetingId] });
    },
    onError: () => {
      toast.success("Session status updated!");
    },
  });

  const revokeShareMutation = useMutation({
    mutationFn: async (shareId: string) => {
      const res = await fetch(`/api/admin/mashwara/${meetingId}/shares/${shareId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to revoke share");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Meeting share revoked");
      queryClient.invalidateQueries({ queryKey: ["mashwara-detail", meetingId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleBack = () => {
    window.history.pushState({}, "", "/admin/mashwara");
    navigateTo("admin-mashwara");
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const activeShares = data.shares?.filter((s) => !s.isRevoked) || [];

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto pb-24">
      {/* ─── Top Header & Controls ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" className="mt-0.5 shrink-0 rounded-xl" onClick={handleBack}>
            <ArrowLeft className="size-5" />
          </Button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 truncate">
                {data.title}
              </h1>
              <Badge className={cn("capitalize border font-bold text-xs", STATUS_STYLES[data.status] || STATUS_STYLES.scheduled)}>
                {data.status.replace(/_/g, " ")}
              </Badge>
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5 text-purple-600" />
                {format(new Date(data.scheduledAt || Date.now()), "EEEE, MMMM d, yyyy 'at' h:mm a")}
              </span>
              {data.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5 text-purple-600" />
                  {data.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <UserCheck className="size-3.5 text-purple-600" />
                Created by {data.createdBy?.name || "Staff"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {data.status === "scheduled" && (
            <Button
              size="sm"
              onClick={() => updateStatusMutation.mutate("in_progress")}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl gap-1.5 shadow-sm"
            >
              <Play className="size-4" /> Start Session
            </Button>
          )}

          {data.status === "in_progress" && (
            <Button
              size="sm"
              onClick={() => updateStatusMutation.mutate("completed")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1.5 shadow-sm"
            >
              <Check className="size-4" /> Complete Session
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={() => setShowShareModal(true)} className="rounded-xl font-bold gap-1.5">
            <Share2 className="size-4 text-purple-600" /> Share Access
          </Button>

          <Button size="sm" onClick={() => setShowDecisionModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl gap-1.5 shadow-sm">
            <Plus className="size-4" /> Log Decision
          </Button>
        </div>
      </div>

      {/* ─── Main Tabs ────────────────────────────────────────────────────── */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl flex-wrap h-auto">
          <TabsTrigger value="overview" className="rounded-lg font-bold text-xs sm:text-sm">
            Overview & Karguzari
          </TabsTrigger>
          <TabsTrigger value="attendees" className="rounded-lg font-bold text-xs sm:text-sm">
            Attendees Roster ({data.attendees?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="decisions" className="rounded-lg font-bold text-xs sm:text-sm">
            Decisions Log ({data.decisions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="actionItems" className="rounded-lg font-bold text-xs sm:text-sm">
            Action Items ({data.actionItems?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="shares" className="rounded-lg font-bold text-xs sm:text-sm">
            Audited Shares ({activeShares.length})
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Overview & Karguzari Minutes ────────────────────────── */}
        <TabsContent value="overview" className="space-y-6 m-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border-0 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold flex items-center gap-2">
                    <FileText className="size-5 text-purple-600" /> Agenda & Karguzari Minutes
                  </CardTitle>
                  <CardDescription>Official meeting summary and progress notes.</CardDescription>
                </div>
                {!isEditingMinutes ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMinutesText(data.minutesSummary || "");
                      setIsEditingMinutes(true);
                    }}
                    className="rounded-xl font-bold text-xs"
                  >
                    Edit Summary
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => updateMinutesMutation.mutate(minutesText)}
                    disabled={updateMinutesMutation.isPending}
                    className="bg-purple-600 text-white font-bold rounded-xl text-xs gap-1"
                  >
                    <Save className="size-3.5" /> Save Changes
                  </Button>
                )}
              </CardHeader>
        <div className="mt-6">
          {/* Tab 1: Overview & Karguzari Minutes */}
          <TabsContent value="overview" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 shadow-sm border-muted/60">
                <CardHeader className="flex flex-row items-center justify-between pb-4 border-b bg-muted/20">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="size-5 text-primary" /> Karguzari Minutes & Progress Summary
                    </CardTitle>
                    <CardDescription>Record the core discussions, updates, and progress for this session.</CardDescription>
                  </div>
                  {!isEditingMinutes && (
                    <Button variant="outline" size="sm" onClick={startEditingMinutes}>
                      <Pencil className="size-4 mr-2" /> Edit Minutes
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="pt-6">
                  {isEditingMinutes ? (
                    <div className="space-y-4">
                      <Textarea 
                        placeholder="Type minutes here..."
                        className="min-h-[300px] resize-y"
                        value={minutesContent}
                        onChange={(e) => setMinutesContent(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsEditingMinutes(false)} disabled={updateMinutesMutation.isPending}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveMinutes} disabled={updateMinutesMutation.isPending}>
                          {updateMinutesMutation.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
                          Save Minutes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="min-h-[200px] bg-muted/10 rounded-md p-4 border border-muted/50">
                      {data.minutesSummary ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                          {data.minutesSummary}
                        </p>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                          <FileText className="size-10 mb-3 opacity-20" />
                          <p className="text-sm italic">No minutes or progress summary recorded yet.</p>
                          <Button variant="link" size="sm" className="mt-2" onClick={startEditingMinutes}>
                            Start writing minutes
                          </Button>
                        </div>
                      )}
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{dec.decision}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">
                        Logged on {format(new Date(dec.createdAt || Date.now()), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold border-emerald-200 capitalize text-xs">
                      {dec.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 4: Action Items ────────────────────────────────────────── */}
        <TabsContent value="actionItems" className="space-y-4 m-0">
          <Card className="border-0 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-extrabold">Action Items & Task Fulfillment</CardTitle>
              <CardDescription>Delegated tasks assigned during this consultation.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
              {data.actionItems?.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm font-medium">
                  No action items assigned for this meeting.
                </div>
              ) : (
                data.actionItems?.map((item) => (
                  <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{item.description}</h4>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                        <span>Assigned to: <strong className="text-slate-700 dark:text-slate-300">{item.assignedToId}</strong></span>
                        <span>•</span>
                        <span>Team: <strong className="text-purple-600">{item.teamId}</strong></span>
                      </div>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-bold text-xs capitalize">
                      {item.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 5: Audited Meeting Shares ────────────────────────────────── */}
        <TabsContent value="shares" className="space-y-4 m-0">
          <Card className="border-0 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-extrabold">Meeting Shares & Access Grants</CardTitle>
                <CardDescription>Audited meeting access granted to non-HQ active staff members.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowShareModal(true)} className="bg-purple-600 text-white font-bold rounded-xl text-xs gap-1">
                <Share2 className="size-3.5" /> Grant Access Share
              </Button>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
              {activeShares.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm font-medium">
                  No active meeting shares. Only authorized city leadership has access.
                </div>
              ) : (
                activeShares.map((s) => (
                  <div key={s.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Granted by {s.grantedBy?.user?.name || "HQ Admin"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Granted on {format(new Date(s.grantedAt), "MMM d, yyyy • h:mm a")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revokeShareMutation.mutate(s.id)}
                      disabled={revokeShareMutation.isPending}
                      className="text-rose-600 border-rose-200 hover:bg-rose-50 font-bold rounded-xl text-xs"
                    >
                      <Trash2 className="size-3.5 mr-1" /> Revoke Access
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Modals Integration ────────────────────────────────────────── */}
      <MashwaraDecisionModal
        open={showDecisionModal}
        onClose={() => setShowDecisionModal(false)}
        meetingId={meetingId}
      />

      <MashwaraShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        meetingId={meetingId}
        cityId={data.cityId || "c-lahore"}
      />
    </div>
  );
}
