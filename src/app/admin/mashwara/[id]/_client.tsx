"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { MashwaraDecisionModal } from "@/components/mashwara/MashwaraDecisionModal";
import { MashwaraShareModal } from "@/components/mashwara/MashwaraShareModal";
import { STATUS_STYLES, type MashwaraUiContext } from "../_client";

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
    teamId: string | null;
    assignedToId: string | null;
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
  // All capability and scope flags come from the server-backed ui-context
  // endpoint. No client-side role or session checks are permitted.
  const { data: ctx } = useQuery<MashwaraUiContext>({
    queryKey: ["mashwara-ui-context"],
    queryFn: () =>
      fetch("/api/admin/mashwara/ui-context").then((r) => {
        if (!r.ok) throw new Error("Failed to load Mashwara context");
        return r.json();
      }),
    staleTime: 60_000,
  });

  const canManage = ctx?.canManage ?? false;

  const storeEventId = useAppStore((s) => s.selectedEventId);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const params = useParams<{ id?: string }>();
  const id = params?.id || storeEventId || "";

  const queryClient = useQueryClient();
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const { data, isLoading, error } = useQuery<MashwaraDetailResponse>({
    queryKey: ["mashwara-detail", id],
    queryFn: () =>
      fetch(`/api/admin/mashwara/${id}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load meeting details");
        return r.json();
      }),
    enabled: !!id,
  });

  const revokeShareMutation = useMutation({
    mutationFn: async (shareId: string) => {
      const res = await fetch(`/api/admin/mashwara/${id}/shares/${shareId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Failed to revoke share" }));
        throw new Error(err.error || "Failed to revoke share");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Meeting share revoked");
      queryClient.invalidateQueries({ queryKey: ["mashwara-detail", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleBack = () => {
    window.history.pushState({}, "", "/admin/mashwara");
    navigateTo("admin-mashwara");
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 md:p-6 text-center space-y-4">
        <AlertTriangle className="size-12 mx-auto text-amber-500" />
        <h2 className="text-lg font-semibold">Meeting Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The requested Mashwara meeting could not be loaded or you do not have
          permission to view it.
        </p>
        <Button onClick={handleBack}>Return to Mashwara Dashboard</Button>
      </div>
    );
  }

  const activeShares = data.shares.filter((s) => !s.isRevoked);
  const revokedShares = data.shares.filter((s) => s.isRevoked);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Back button & Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="mt-0.5 shrink-0"
          onClick={handleBack}
        >
          <ArrowLeft className="size-5" />
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{data.title}</h1>
            <Badge className={STATUS_STYLES[data.status]}>
              {data.status.replace(/_/g, " ")}
            </Badge>
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5 text-primary" />
              {format(
                new Date(data.scheduledAt),
                "EEEE, MMMM d, yyyy 'at' h:mm a",
              )}
            </span>
            {data.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5 text-primary" />
                {data.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <UserCheck className="size-3.5 text-primary" />
              Created by {data.createdBy?.name || "Staff"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShareModal(true)}
            >
              <Share2 className="size-4 mr-1.5" /> Grant Share
            </Button>
          )}
          {canManage && (
            <Button size="sm" onClick={() => setShowDecisionModal(true)}>
              <Plus className="size-4 mr-1.5" /> Add Decision
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendees">
            Attendees ({data.attendees.length})
          </TabsTrigger>
          <TabsTrigger value="decisions">
            Decisions ({data.decisions.length}) & Action Items (
            {data.actionItems.length})
          </TabsTrigger>
          <TabsTrigger value="shares">
            Shares ({activeShares.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="size-4 text-primary" /> Agenda & Minutes
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.minutesSummary ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {data.minutesSummary}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No summary or minutes recorded yet for this session.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Session Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">
                    Status
                  </span>
                  <Badge
                    className={cn(
                      "mt-0.5 capitalize",
                      STATUS_STYLES[data.status],
                    )}
                  >
                    {data.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">
                    Scheduled Time
                  </span>
                  <span className="font-medium">
                    {format(new Date(data.scheduledAt), "PPpp")}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">
                    Location
                  </span>
                  <span className="font-medium">{data.location || "N/A"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">
                    Organized By
                  </span>
                  <span className="font-medium">{data.createdBy?.name}</span>
                </div>
                <div className="pt-2 border-t flex justify-between text-xs">
                  <span className="text-muted-foreground">Total Attendees</span>
                  <span className="font-semibold">{data.attendees.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    Decisions Logged
                  </span>
                  <span className="font-semibold">{data.decisions.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Attendees & Check-in */}
        <TabsContent value="attendees" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Attendees Roster
                </CardTitle>
                <CardDescription>
                  Staff members present and check-in records.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {data.attendees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No attendees marked yet for this meeting.
                </div>
              ) : (
                <div className="divide-y">
                  {data.attendees.map((att) => (
                    <div
                      key={att.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
                    >
                      <div>
                        <span className="font-medium text-foreground">
                          {att.staffMeta?.user?.name || "Staff Member"}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2 capitalize">
                          ({att.staffMeta?.role?.replace(/_/g, " ")})
                        </span>
                        {att.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {att.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <Badge variant="outline" className="capitalize">
                          {att.attendanceStatus}
                        </Badge>
                        {att.checkedInAt && (
                          <span className="text-muted-foreground">
                            Checked in:{" "}
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

        {/* Tab 3: Decisions & Action Items */}
        <TabsContent value="decisions" className="space-y-6">
          {/* Decisions Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Decisions Log
                </CardTitle>
                <CardDescription>
                  Decisions formally recorded during this meeting.
                </CardDescription>
              </div>
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDecisionModal(true)}
                >
                  <Plus className="size-4 mr-1.5" /> Add Decision / Action Item
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {data.decisions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  No decisions logged yet for this meeting.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.decisions.map((dec) => (
                    <div
                      key={dec.id}
                      className="p-3 rounded-lg border bg-card space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {dec.decision}
                        </p>
                        {dec.category && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] shrink-0"
                          >
                            {dec.category}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          Status:{" "}
                          <strong className="capitalize text-foreground">
                            {dec.status}
                          </strong>
                        </span>
                        <span>
                          Logged:{" "}
                          {format(new Date(dec.createdAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Items Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Action Items
              </CardTitle>
              <CardDescription>
                Tasks assigned to collaboration teams and staff.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.actionItems.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  No action items created for this meeting.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.actionItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {item.description}
                        </p>
                        {item.dueDate && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Due date:{" "}
                            {format(new Date(item.dueDate), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] capitalize shrink-0 self-start sm:self-center"
                      >
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Shares */}
        <TabsContent value="shares" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Meeting Access Shares
                </CardTitle>
                <CardDescription>
                  Restricted, meeting-specific view access granted to same-city
                  team members.
                </CardDescription>
              </div>
              {canManage && (
                <Button size="sm" onClick={() => setShowShareModal(true)}>
                  <Share2 className="size-4 mr-1" /> Grant Share
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {activeShares.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  No active shares granted for this meeting.
                </p>
              ) : (
                <div className="divide-y">
                  {activeShares.map((s) => (
                    <div
                      key={s.id}
                      className="py-3 flex items-center justify-between gap-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          Granted Share #{s.id.slice(-6)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Granted by {s.grantedBy?.user?.name || "HQ/City Head"}{" "}
                          on {format(new Date(s.grantedAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      {canManage && !s.isRevoked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => revokeShareMutation.mutate(s.id)}
                          disabled={revokeShareMutation.isPending}
                        >
                          <XCircle className="size-4 mr-1.5" /> Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {revokedShares.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Revoked Shares History
                  </h4>
                  <div className="space-y-2">
                    {revokedShares.map((share) => (
                      <div
                        key={share.id}
                        className="p-2 rounded bg-muted/40 text-xs text-muted-foreground flex justify-between"
                      >
                        <span>Share #{share.id.slice(-6)}</span>
                        <span>
                          Revoked{" "}
                          {share.revokedAt
                            ? format(new Date(share.revokedAt), "MMM d")
                            : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {canManage && (
        <>
          <MashwaraDecisionModal
            open={showDecisionModal}
            onClose={() => setShowDecisionModal(false)}
            meetingId={id}
            cityId={data.cityId}
          />
          <MashwaraShareModal
            open={showShareModal}
            onClose={() => setShowShareModal(false)}
            meetingId={id}
            cityId={data.cityId}
          />
        </>
      )}
    </div>
  );
}
