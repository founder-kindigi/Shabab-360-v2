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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
  Play,
  Check,
  Pencil,
  Save,
  CheckSquare
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

export default function MashwaraDetailClient() {
  const params = useParams<{ id?: string }>();
  const storeEventId = useAppStore((s) => s.selectedEventId);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const meetingId = params?.id || storeEventId || "";

  const queryClient = useQueryClient();
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Minutes editor state
  const [isEditingMinutes, setIsEditingMinutes] = useState(false);
  const [minutesContent, setMinutesContent] = useState("");

  const { data, isLoading, error } = useQuery<MashwaraDetailResponse>({
    queryKey: ["mashwara-detail", meetingId],
    queryFn: () =>
      fetch(`/api/admin/mashwara/${meetingId}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load meeting details");
        return r.json();
      }),
    enabled: !!meetingId,
  });

  const revokeShareMutation = useMutation({
    mutationFn: async (shareId: string) => {
      const res = await fetch(`/api/admin/mashwara/${meetingId}/shares/${shareId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to revoke share" }));
        throw new Error(err.error || "Failed to revoke share");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Meeting share revoked");
      queryClient.invalidateQueries({ queryKey: ["mashwara-detail", meetingId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: "in_progress" | "completed") => {
      const res = await fetch(`/api/admin/mashwara/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update meeting status");
      return res.json();
    },
    onSuccess: (_, newStatus) => {
      toast.success("Meeting marked as " + newStatus.replace("_", " "));
      queryClient.invalidateQueries({ queryKey: ["mashwara-detail", meetingId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMinutesMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/admin/mashwara/${meetingId}/minutes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutesSummary: content }),
      });
      if (!res.ok) throw new Error("Failed to save minutes");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Minutes saved successfully");
      setIsEditingMinutes(false);
      queryClient.invalidateQueries({ queryKey: ["mashwara-detail", meetingId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleBack = () => {
    window.history.pushState({}, "", "/admin/mashwara");
    navigateTo("admin-mashwara");
  };

  const startEditingMinutes = () => {
    setMinutesContent(data?.minutesSummary || "");
    setIsEditingMinutes(true);
  };

  const handleSaveMinutes = () => {
    updateMinutesMutation.mutate(minutesContent);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 md:p-6 text-center space-y-4">
        <AlertTriangle className="size-12 mx-auto text-amber-500" />
        <h2 className="text-lg font-semibold">Meeting Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The requested Mashwara meeting could not be loaded or you do not have permission to view it.
        </p>
        <Button onClick={handleBack}>Return to Mashwara Dashboard</Button>
      </div>
    );
  }

  const activeShares = data.shares?.filter((s) => !s.isRevoked) || [];
  const revokedShares = data.shares?.filter((s) => s.isRevoked) || [];

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header & Meeting Status Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Button variant="outline" size="icon" className="shrink-0 mt-1" onClick={handleBack}>
            <ArrowLeft className="size-4" />
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight truncate">{data.title}</h1>
              <Badge className={cn("px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider", STATUS_STYLES[data.status] || "bg-secondary text-secondary-foreground")}>
                {data.status.replace(/_/g, " ")}
              </Badge>
            </div>

            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                <Calendar className="size-4 text-primary" />
                {format(new Date(data.scheduledAt || Date.now()), "EEEE, MMM d, yyyy • h:mm a")}
              </span>
              {data.location && (
                <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                  <MapPin className="size-4 text-primary" />
                  {data.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0 w-full lg:w-auto">
          {data.status === "scheduled" && (
            <Button 
              variant="default" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => updateStatusMutation.mutate("in_progress")}
              disabled={updateStatusMutation.isPending}
            >
              <Play className="size-4 mr-2" /> Start Session
            </Button>
          )}
          {data.status === "in_progress" && (
            <Button 
              variant="default" 
              onClick={() => updateStatusMutation.mutate("completed")}
              disabled={updateStatusMutation.isPending}
            >
              <Check className="size-4 mr-2" /> Complete Session
            </Button>
          )}
          
          <div className="h-6 w-px bg-border hidden lg:block mx-1" />

          <Button variant="secondary" onClick={() => setShowDecisionModal(true)}>
            <Plus className="size-4 mr-1.5" /> Log Decision
          </Button>
          <Button variant="outline" onClick={() => setShowShareModal(true)}>
            <Share2 className="size-4 mr-1.5" /> Share Meeting
          </Button>
        </div>
      </div>

      {/* 5 Rich Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6 overflow-x-auto">
          <TabsTrigger 
            value="overview" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 shadow-none"
          >
            Overview & Karguzari
          </TabsTrigger>
          <TabsTrigger 
            value="attendees"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 shadow-none"
          >
            Murabbi Attendance <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">{data.attendees?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="decisions"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 shadow-none"
          >
            Decisions Log <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">{data.decisions?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="tasks"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 shadow-none"
          >
            Action Items <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">{data.actionItems?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="shares"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 shadow-none"
          >
            Secure Shares <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">{activeShares.length}</Badge>
          </TabsTrigger>
        </TabsList>

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
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Session Metadata Card */}
              <Card className="shadow-sm border-muted/60 h-fit sticky top-6">
                <CardHeader className="border-b bg-muted/20 pb-4">
                  <CardTitle className="text-base font-semibold">Session Overview</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <dl className="divide-y divide-border/50 text-sm">
                    <div className="px-5 py-4 flex flex-col gap-1">
                      <dt className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Organized By</dt>
                      <dd className="font-medium flex items-center gap-2">
                        <UserCheck className="size-4 text-primary/70" />
                        {data.createdBy?.name || "Unknown"}
                      </dd>
                    </div>
                    <div className="px-5 py-4 flex flex-col gap-1">
                      <dt className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Scheduled For</dt>
                      <dd className="font-medium flex items-center gap-2">
                        <Clock className="size-4 text-primary/70" />
                        {format(new Date(data.scheduledAt || Date.now()), "MMM d, yyyy h:mm a")}
                      </dd>
                    </div>
                    <div className="px-5 py-4 flex flex-col gap-1">
                      <dt className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Location</dt>
                      <dd className="font-medium flex items-center gap-2">
                        <MapPin className="size-4 text-primary/70" />
                        {data.location || "Not specified"}
                      </dd>
                    </div>
                    <div className="px-5 py-4 flex flex-col gap-1">
                      <dt className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Metrics</dt>
                      <dd className="grid grid-cols-2 gap-4 mt-2">
                        <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                          <div className="text-2xl font-bold text-primary">{data.attendees?.length || 0}</div>
                          <div className="text-xs text-muted-foreground mt-1">Attendees</div>
                        </div>
                        <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                          <div className="text-2xl font-bold text-primary">{data.decisions?.length || 0}</div>
                          <div className="text-xs text-muted-foreground mt-1">Decisions</div>
                        </div>
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 2: Murabbi Attendance */}
          <TabsContent value="attendees" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <Card className="shadow-sm border-muted/60">
              <CardHeader className="border-b bg-muted/20 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Users className="size-5 text-primary" /> Murabbi Attendance
                    </CardTitle>
                    <CardDescription>Presence records for staff and collaboration team members.</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-background">Total: {data.attendees?.length || 0}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {!data.attendees?.length ? (
                  <div className="text-center py-16 text-muted-foreground text-sm flex flex-col items-center">
                    <Users className="size-12 mb-4 opacity-20" />
                    <p>No attendees marked yet for this meeting.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {data.attendees.map((att) => (
                      <div key={att.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-primary font-semibold text-sm">
                              {att.staffMeta?.user?.name?.charAt(0) || "?"}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">
                                {att.staffMeta?.user?.name || "Staff Member"}
                              </span>
                              <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                                {att.staffMeta?.role?.replace(/_/g, " ")}
                              </Badge>
                            </div>
                            {att.notes ? (
                              <p className="text-sm text-muted-foreground mt-1 italic">"{att.notes}"</p>
                            ) : (
                              <p className="text-sm text-muted-foreground/50 mt-1">No notes provided</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 sm:gap-2 border-t sm:border-t-0 pt-3 sm:pt-0">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "capitalize font-medium shadow-sm",
                              att.attendanceStatus === "present" && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
                              att.attendanceStatus === "absent" && "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
                              att.attendanceStatus === "excused" && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                            )}
                          >
                            {att.attendanceStatus}
                          </Badge>
                          {att.checkedInAt && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Clock className="size-3" />
                              {format(new Date(att.checkedInAt), "h:mm a")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Decisions Log */}
          <TabsContent value="decisions" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <Card className="shadow-sm border-muted/60">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 pb-4">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-primary" /> Decisions Log
                  </CardTitle>
                  <CardDescription>Strategic decisions and policies formulated during the Mashwara.</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowDecisionModal(true)} className="shadow-sm">
                  <Plus className="size-4 mr-1.5" /> Log New Decision
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                {!data.decisions?.length ? (
                  <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                    <p>No decisions logged yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.decisions.map((dec) => (
                      <div key={dec.id} className="relative p-5 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            {dec.category ? (
                              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-semibold uppercase tracking-wider">
                                {dec.category}
                              </Badge>
                            ) : (
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Uncategorized</span>
                            )}
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px] uppercase font-bold",
                                dec.status === "approved" ? "text-emerald-600 border-emerald-200" :
                                dec.status === "implemented" ? "text-blue-600 border-blue-200" :
                                "text-amber-600 border-amber-200"
                              )}
                            >
                              {dec.status}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-foreground leading-snug">
                            {dec.decision}
                          </p>
                        </div>
                        <div className="pt-4 mt-4 border-t border-border/50 text-[11px] text-muted-foreground flex justify-between items-center">
                          <span>Recorded on {format(new Date(dec.createdAt || Date.now()), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Action Items & Task Assignment */}
          <TabsContent value="tasks" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <Card className="shadow-sm border-muted/60">
              <CardHeader className="border-b bg-muted/20 pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CheckSquare className="size-5 text-primary" /> Action Items & Task Assignment
                </CardTitle>
                <CardDescription>Track tasks assigned to individuals and collaboration teams.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {!data.actionItems?.length ? (
                  <div className="text-center py-16 text-muted-foreground text-sm flex flex-col items-center">
                    <CheckSquare className="size-12 mb-4 opacity-20" />
                    <p>No action items assigned from this meeting.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {data.actionItems.map((item) => (
                      <div key={item.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={cn(
                            "mt-0.5 rounded-full border p-1 shrink-0",
                            item.status === "completed" ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950" : "border-muted-foreground/30 text-muted-foreground"
                          )}>
                            <Check className="size-3" />
                          </div>
                          <div>
                            <p className={cn(
                              "font-medium text-sm leading-snug",
                              item.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"
                            )}>
                              {item.description}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              {item.dueDate && (
                                <span className={cn(
                                  "text-[11px] flex items-center gap-1 font-medium",
                                  new Date(item.dueDate) < new Date() && item.status !== "completed" ? "text-red-500" : "text-muted-foreground"
                                )}>
                                  <Calendar className="size-3" />
                                  Due: {format(new Date(item.dueDate), "MMM d, yyyy")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pl-7 sm:pl-0">
                          <Badge variant="secondary" className="capitalize text-[11px] shadow-sm">
                            {item.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Secure Meeting Shares */}
          <TabsContent value="shares" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <Card className="shadow-sm border-muted/60">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <ShieldCheck className="size-5 text-primary" /> Secure Meeting Shares
                  </CardTitle>
                  <CardDescription>
                    Manage restricted read-only access granted to specific staff members.
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowShareModal(true)} className="shadow-sm">
                  <Share2 className="size-4 mr-1.5" /> Grant Access
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {activeShares.length === 0 && revokedShares.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground text-sm flex flex-col items-center">
                    <ShieldCheck className="size-12 mb-4 opacity-20" />
                    <p>No access shares have been created for this meeting.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {activeShares.map((share) => (
                      <div key={share.id} className="p-4 sm:px-6 flex items-center justify-between gap-4 bg-card hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <UserCheck className="size-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-foreground">
                              Granted Share #{share.id.slice(-6)}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Authorized by <span className="font-medium text-foreground/80">{share.grantedBy?.user?.name || "Admin"}</span> • {format(new Date(share.grantedAt), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                          disabled={revokeShareMutation.isPending}
                          onClick={() => {
                            if (confirm("Are you sure you want to revoke this share?")) {
                              revokeShareMutation.mutate(share.id);
                            }
                          }}
                        >
                          <Trash2 className="size-4 mr-1.5" /> Revoke Access
                        </Button>
                      </div>
                    ))}
                    
                    {revokedShares.map((share) => (
                      <div key={share.id} className="p-4 sm:px-6 flex items-center justify-between gap-4 bg-muted/30">
                        <div className="flex items-center gap-3 opacity-60">
                          <div className="size-8 rounded-full bg-muted border flex items-center justify-center shrink-0">
                            <XCircle className="size-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-muted-foreground line-through">
                              Revoked Share #{share.id.slice(-6)}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Revoked {share.revokedAt ? format(new Date(share.revokedAt), "MMM d, yyyy h:mm a") : ""}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-muted-foreground bg-background">Revoked</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Modals */}
      <MashwaraDecisionModal
        open={showDecisionModal}
        onClose={() => setShowDecisionModal(false)}
        meetingId={meetingId}
        cityId={data.cityId}
      />

      <MashwaraShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        meetingId={meetingId}
        cityId={data.cityId}
      />
    </div>
  );
}
