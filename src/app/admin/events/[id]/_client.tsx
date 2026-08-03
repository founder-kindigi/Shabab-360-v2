"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { EventResponsibilityCard } from "@/components/events/EventResponsibilityCard";
import { EventTeamRoster } from "@/components/events/EventTeamRoster";

type EventDetail = {
  id: string;
  cityId: string;
  title: string;
  description: string | null;
  eventType: string;
  status: string;
  venue: string | null;
  venueNotes: string | null;
  startDate: string;
  endDate: string | null;
  capacity: number | null;
  requiresConsent: boolean;
  requiresMedical: boolean;
  teams: { id: string; title: string; _count?: { memberships: number } }[];
  responsibilities: { id: string; title: string; isActive: boolean; endDate: string }[];
  plannerItems: PlannerItem[];
};

type PlannerItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  priority: string;
  assignedToStaffMetaId: string | null;
  teamId: string | null;
};

type UiContext = { canManage: boolean; isHq: boolean };
type Registration = { id: string; status: string; consentStatus: string; feeStatus: string; fee: { required: number; paid: number; remaining: number } | null };
type EligibleParticipant = { id: string; name: string; groupName: string };

const STATUS_STYLES: Record<string, string> = {
  planned: "bg-muted text-muted-foreground",
  confirmed: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const queryClient = useQueryClient();

  const [showPlanner, setShowPlanner] = useState(false);
  const [plannerTitle, setPlannerTitle] = useState("");
  const [plannerPriority, setPlannerPriority] = useState("medium");
  const [plannerDue, setPlannerDue] = useState("");
  const [showRegistration, setShowRegistration] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");

  // ── Server-resolved capabilities ──────────────────────────────────────
  const { data: ctx, isError: ctxError, error: ctxErr } = useQuery<UiContext>({
    queryKey: ["events-ui-context"],
    queryFn: () =>
      fetch("/api/admin/events/ui-context").then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((json as { error?: string }).error || "Failed to load access permissions");
        return json as UiContext;
      }),
    staleTime: 60_000,
    retry: false,
  });

  const canManage = ctx?.canManage ?? false;
  const { data: eligibleParticipants = [] } = useQuery<EligibleParticipant[]>({
    queryKey: ["event-eligible-participants", eventId, participantSearch],
    queryFn: async () => {
      const response = await fetch(`/api/admin/events/${eventId}/eligible-participants?q=${encodeURIComponent(participantSearch)}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to search participants");
      return json.data;
    },
    enabled: canManage && participantSearch.trim().length >= 2,
  });
  const { data: registrations = [] } = useQuery<Registration[]>({
    queryKey: ["event-registrations", eventId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/events/${eventId}/registrations`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to load registrations");
      return json.data as Registration[];
    },
    enabled: Boolean(eventId) && Boolean(ctx) && !ctxError,
  });

  const { data, isLoading, error } = useQuery<EventDetail>({
    queryKey: ["event-detail", eventId],
    queryFn: () =>
      fetch(`/api/admin/events/${eventId}`).then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((json as { error?: string }).error || "Failed to load event");
        return json as EventDetail;
      }),
    enabled: Boolean(eventId) && Boolean(ctx) && !ctxError,
  });

  // DELETE /api/admin/events/[id] for cancellation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Failed to cancel event");
      }
      return json;
    },
    onSuccess: () => {
      toast.success("Event cancelled successfully");
      queryClient.invalidateQueries({ queryKey: ["event-detail", eventId] });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // PATCH /api/admin/events/[id] with status: "completed" for completion
  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Failed to complete event");
      }
      return json;
    },
    onSuccess: () => {
      toast.success("Event completed");
      queryClient.invalidateQueries({ queryKey: ["event-detail", eventId] });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const registerMutation = useMutation({
    mutationFn: async (participantId: string) => {
      const response = await fetch(`/api/admin/events/${eventId}/registrations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ participantId }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to register participant");
      return json;
    },
    onSuccess: () => { toast.success("Participant registered"); setShowRegistration(false); setParticipantSearch(""); queryClient.invalidateQueries({ queryKey: ["event-registrations", eventId] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  // POST /api/admin/events/[id]/planner-items
  const createPlannerMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        title: plannerTitle,
        priority: plannerPriority,
      };
      if (plannerDue) {
        payload.dueDate = new Date(plannerDue).toISOString();
      }

      const res = await fetch(`/api/admin/events/${eventId}/planner-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to create task");
      return json;
    },
    onSuccess: () => {
      toast.success("Task created");
      setShowPlanner(false);
      setPlannerTitle("");
      setPlannerDue("");
      queryClient.invalidateQueries({ queryKey: ["event-detail", eventId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // PATCH /api/admin/events/planner-items/[id]
  const updatePlannerMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/events/planner-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to update task");
      return json;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["event-detail", eventId] }),
    onError: (err: Error) => toast.error(err.message),
  });

  // Safe access state on context failure
  if (ctxError) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="size-4 mr-2" /> Back
        </Button>
        <div id="event-detail-context-error" role="alert" className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="size-5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Access Verification Failed</p>
            <p className="text-xs opacity-90">{(ctxErr as Error)?.message || "Failed to load access permissions"}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !ctx) {
    return (
      <div className="space-y-4 p-4 md:p-6" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="size-4 mr-2" /> Back
        </Button>
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertTriangle className="size-5 shrink-0" />
          <p className="text-sm font-medium">{(error as Error)?.message || "Event not found."}</p>
        </div>
      </div>
    );
  }

  const isTerminal = data.status === "completed" || data.status === "cancelled";

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Back + Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" onClick={() => window.history.back()}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">{data.title}</h1>
            <Badge className={STATUS_STYLES[data.status]}>{data.status.replace(/_/g, " ")}</Badge>
            <Badge variant="outline" className="text-[10px]">{data.eventType.replace(/_/g, " ")}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><Calendar className="size-3" />{new Date(data.startDate).toLocaleDateString()}</span>
            {data.venue && <span className="flex items-center gap-1"><MapPin className="size-3" />{data.venue}</span>}
            {data.capacity && <span className="flex items-center gap-1"><Users className="size-3" />Capacity: {data.capacity}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canManage && !isTerminal && (
            <Button
              id="event-cancel-btn"
              size="sm"
              variant="outline"
              className="text-red-500 border-red-200 hover:bg-red-50"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >

              {cancelMutation.isPending ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <XCircle className="size-3.5 mr-1" />} Cancel
            </Button>
          )}
          {canManage && data.status === "in_progress" && (
            <Button
              id="event-complete-btn"
              size="sm"
              disabled={completeMutation.isPending}
              onClick={() => completeMutation.mutate()}
            >
              {completeMutation.isPending ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="size-3.5 mr-1" />} Complete
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="teams">Teams ({data.teams?.length || 0})</TabsTrigger>
          <TabsTrigger value="responsibilities">Responsibilities ({data.responsibilities?.length || 0})</TabsTrigger>
          <TabsTrigger value="planner">Planner ({data.plannerItems?.length || 0})</TabsTrigger>
          <TabsTrigger value="registrations">Registrations ({registrations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          {data.description && (
            <Card>
              <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
              <CardContent><p className="text-sm">{data.description}</p></CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Type</span><p className="font-medium">{data.eventType}</p></div>
              <div><span className="text-muted-foreground">Status</span><p className="font-medium">{data.status}</p></div>
              <div><span className="text-muted-foreground">Start</span><p className="font-medium">{new Date(data.startDate).toLocaleDateString()}</p></div>
              {data.endDate && <div><span className="text-muted-foreground">End</span><p className="font-medium">{new Date(data.endDate).toLocaleDateString()}</p></div>}
              {data.venue && <div className="col-span-2"><span className="text-muted-foreground">Venue</span><p className="font-medium">{data.venue}</p></div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4 pt-4">
          {data.teams?.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No teams created yet.</p>}
          {data.teams?.map((team) => (
            <div key={team.id}>
              <Card className="mb-4">
                <CardHeader><CardTitle className="text-base">{team.title}</CardTitle></CardHeader>
              </Card>
              <EventTeamRoster teamId={team.id} eventId={eventId} canManage={canManage} />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="responsibilities" className="space-y-4 pt-4">
          <EventResponsibilityCard eventId={eventId} canManage={canManage} />
        </TabsContent>

        <TabsContent value="planner" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Tasks</h3>
            {canManage && (
              <Button size="sm" variant="outline" onClick={() => setShowPlanner(true)}>
                <Plus className="size-3.5 mr-1" /> Add Task
              </Button>
            )}
          </div>
          {data.plannerItems?.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No tasks yet.</p>}
          {data.plannerItems?.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{item.title}</p>
                  <Badge variant="outline" className={cn("text-[10px]", PRIORITY_STYLES[item.priority])}>{item.priority}</Badge>
                  <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
                </div>
                {item.dueDate && <p className="text-xs text-muted-foreground mt-0.5">Due: {new Date(item.dueDate).toLocaleDateString()}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {canManage && item.status === "pending" && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updatePlannerMutation.mutate({ id: item.id, status: "in_progress" })}>Start</Button>
                )}
                {canManage && item.status === "in_progress" && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-600" onClick={() => updatePlannerMutation.mutate({ id: item.id, status: "completed" })}>Done</Button>
                )}
                {canManage && !["completed", "cancelled"].includes(item.status) && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => updatePlannerMutation.mutate({ id: item.id, status: "cancelled" })}>Cancel</Button>
                )}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="registrations" className="space-y-3 pt-4">
          {canManage && <Button className="w-full sm:w-auto" size="sm" onClick={() => setShowRegistration(true)}><Plus className="mr-1 size-4" /> Register participant</Button>}
          {registrations.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No registrations yet.</p>}
          {registrations.map((registration) => (
            <Card key={registration.id} className="p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium">Registration</span>
                <div className="flex gap-1"><Badge variant="outline">{registration.status}</Badge><Badge variant="outline">Consent: {registration.consentStatus}</Badge><Badge variant="outline">Fee: {registration.feeStatus}</Badge></div>
              </div>
              {registration.fee && <p className="mt-2 text-xs text-muted-foreground">Remaining fee: {registration.fee.remaining}</p>}
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={showRegistration} onOpenChange={setShowRegistration}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Register participant</DialogTitle></DialogHeader>
          <Input value={participantSearch} onChange={(event) => setParticipantSearch(event.target.value)} placeholder="Search student name" autoFocus />
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {participantSearch.length >= 2 && eligibleParticipants.map((participant) => <Button key={participant.id} variant="outline" className="h-auto w-full justify-between p-3 text-left" disabled={registerMutation.isPending} onClick={() => registerMutation.mutate(participant.id)}><span>{participant.name}</span><span className="text-xs text-muted-foreground">{participant.groupName}</span></Button>)}
            {participantSearch.length >= 2 && eligibleParticipants.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No eligible participants found.</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Planner Item Dialog */}
      <Dialog open={showPlanner} onOpenChange={(v) => !v && setShowPlanner(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Task title" value={plannerTitle} onChange={(e) => setPlannerTitle(e.target.value)} />
            <Select value={plannerPriority} onValueChange={setPlannerPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={plannerDue} onChange={(e) => setPlannerDue(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanner(false)}>Cancel</Button>
            <Button id="planner-submit-btn" onClick={() => createPlannerMutation.mutate()} disabled={!plannerTitle || createPlannerMutation.isPending}>
              {createPlannerMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
