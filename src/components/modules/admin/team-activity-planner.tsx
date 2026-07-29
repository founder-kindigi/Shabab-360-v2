"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardList, LoaderCircle, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Member = {
  id: string;
  title: string | null;
  staffMeta: {
    id: string;
    user: { name: string | null; email: string; isActive: boolean };
  };
};

type Activity = {
  id: string;
  title: string;
  description: string | null;
  status: "planned" | "in_progress" | "completed" | "cancelled";
  scheduledFor: string | null;
  assignedStaffMetaId: string | null;
  assignedStaff: { id: string; user: { name: string | null; isActive: boolean } } | null;
};

type ActivityResponse = {
  data: Activity[];
  total: number;
  meta: { canManage: boolean; currentStaffMetaId: string };
};

async function activityRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Unable to update activity planner");
  }
  return body;
}

function statusLabel(status: Activity["status"]) {
  return status.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusVariant(status: Activity["status"]): "default" | "secondary" | "outline" | "destructive" {
  if (status === "completed") return "default";
  if (status === "cancelled") return "destructive";
  if (status === "in_progress") return "secondary";
  return "outline";
}

function scheduledLabel(value: string | null) {
  if (!value) return "No date set";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "No date set"
    : new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function TeamActivityPlanner({ teamId, members }: { teamId: string; members: Member[] }) {
  const queryClient = useQueryClient();
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [assignedStaffMetaId, setAssignedStaffMetaId] = useState("unassigned");

  const queryKey = ["team-activities", teamId] as const;
  const activities = useQuery<ActivityResponse>({
    queryKey,
    queryFn: () => activityRequest(`/api/admin/teams/${teamId}/activities?pageSize=50`),
    enabled: Boolean(teamId),
    staleTime: 15_000,
  });

  const createActivity = useMutation({
    mutationFn: () => activityRequest(`/api/admin/teams/${teamId}/activities`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledFor: scheduledFor || undefined,
        assignedStaffMetaId: assignedStaffMetaId === "unassigned" ? undefined : assignedStaffMetaId,
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setTitle("");
      setDescription("");
      setScheduledFor("");
      setAssignedStaffMetaId("unassigned");
      setShowComposer(false);
      toast.success("Activity created and recorded in the audit log.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateStatus = useMutation({
    mutationFn: ({ activityId, status }: { activityId: string; status: Activity["status"] }) =>
      activityRequest(`/api/admin/teams/${teamId}/activities/${activityId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (error: Error) => toast.error(error.message),
  });

  const canManage = activities.data?.meta.canManage ?? false;
  const currentStaffMetaId = activities.data?.meta.currentStaffMetaId;

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="size-4" /> Activity Planner</CardTitle>
          <CardDescription className="mt-1">Active team members can start only their own assigned work. Managers can complete or cancel in-progress work.</CardDescription>
        </div>
        {canManage && (
          <Button className="w-full sm:w-auto" onClick={() => setShowComposer((value) => !value)}>
            <Plus className="mr-2 size-4" /> {showComposer ? "Close" : "Create activity"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showComposer && canManage && (
          <form
            className="grid gap-4 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (title.trim()) createActivity.mutate();
            }}
          >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`activity-title-${teamId}`}>Activity title</Label>
              <Input id={`activity-title-${teamId}`} value={title} maxLength={200} required onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Prepare Friday poster" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`activity-description-${teamId}`}>Notes (optional)</Label>
              <Textarea id={`activity-description-${teamId}`} value={description} maxLength={2000} onChange={(event) => setDescription(event.target.value)} placeholder="Add a concise operational note" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`activity-date-${teamId}`}>Scheduled for (optional)</Label>
              <Input id={`activity-date-${teamId}`} type="date" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Assign to (optional)</Label>
              <Select value={assignedStaffMetaId} onValueChange={setAssignedStaffMetaId}>
                <SelectTrigger><SelectValue placeholder="Choose a team member" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.staffMeta.id} value={member.staffMeta.id}>
                      {member.staffMeta.user.name || member.staffMeta.user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setShowComposer(false)}>Cancel</Button>
              <Button type="submit" disabled={!title.trim() || createActivity.isPending}>
                {createActivity.isPending && <LoaderCircle className="mr-2 size-4 animate-spin" />} Create activity
              </Button>
            </div>
          </form>
        )}

        {activities.isLoading && <p className="text-sm text-muted-foreground">Loading team activities...</p>}
        {activities.isError && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">You do not have access to this team activity planner, or it is temporarily unavailable.</p>}
        {!activities.isLoading && !activities.isError && activities.data?.data.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No activities have been planned for this team.</div>
        )}
        <div className="space-y-3">
          {activities.data?.data.map((activity) => {
            const isOwnAssignment = activity.assignedStaffMetaId === currentStaffMetaId;
            const canStart = activity.status === "planned" && (canManage || isOwnAssignment);
            const canFinish = canManage && activity.status === "in_progress";
            return (
              <div key={activity.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{activity.title}</p>
                      <Badge variant={statusVariant(activity.status)}>{statusLabel(activity.status)}</Badge>
                    </div>
                    {activity.description && <p className="mt-2 text-sm text-muted-foreground">{activity.description}</p>}
                    <p className="mt-3 text-xs text-muted-foreground">
                      {scheduledLabel(activity.scheduledFor)} · {activity.assignedStaff?.user.name || (activity.assignedStaffMetaId ? "Assigned team member" : "Unassigned")}
                    </p>
                  </div>
                  {(canStart || canFinish) && <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
                    {canStart && <Button size="sm" onClick={() => updateStatus.mutate({ activityId: activity.id, status: "in_progress" })} disabled={updateStatus.isPending}><LoaderCircle className={updateStatus.isPending ? "mr-2 size-4 animate-spin" : "hidden"} />Start</Button>}
                    {canFinish && <Button size="sm" onClick={() => updateStatus.mutate({ activityId: activity.id, status: "completed" })} disabled={updateStatus.isPending}><Check className="mr-2 size-4" />Complete</Button>}
                    {canFinish && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ activityId: activity.id, status: "cancelled" })} disabled={updateStatus.isPending}><X className="mr-2 size-4" />Cancel</Button>}
                  </div>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
