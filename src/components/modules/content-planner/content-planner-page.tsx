"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Plus,
  AlertCircle,
  RefreshCw,
  ShieldBan,
  MapPin,
  Layers,
  Calendar,
  Archive,
  Edit3,
  X,
  CheckCircle2,
  Clock,
  Trash2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────

type Permissions = { canView: boolean; canManage: boolean; isHq: boolean };
type CityItem = { id: string; name: string; code: string };

type PlanListItem = {
  id: string;
  name: string;
  kind: "template" | "override";
  status: "draft" | "published" | "archived";
  city: { id: string; name: string };
  batch?: { id: string; name: string } | null;
  park?: { id: string; name: string } | null;
  basePlan?: { id: string; name: string } | null;
  _count: { sessions: number; overrides: number };
};

type PlanListResponse = {
  plans: PlanListItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

type SessionItem = {
  id: string;
  sessionDate: string;
  weekLabel: string | null;
  dayLabel: string | null;
  isOffDay: boolean;
  status: string;
  _count: { blocks: number };
};

type BlockItem = {
  id: string;
  category: string;
  team: { id: string; name: string; code: string };
  title: string | null;
  content: string;
  sortOrder: number;
  status: string;
  resources: { id: string; label: string; url: string; kind: string }[];
  _count: { activities: number };
};

type PlanDetail = PlanListItem & {
  sessions: SessionItem[];
  overrides: { id: string; name: string; park?: { id: string; name: string } | null; status: string }[];
};

type SessionDetail = {
  id: string;
  sessionDate: string;
  weekLabel: string | null;
  dayLabel: string | null;
  isOffDay: boolean;
  status: string;
  focusArea: string | null;
  plan: { id: string; name: string; city: { name: string } };
  _count: { blocks: number };
};

type BlocksResponse = {
  blocks: BlockItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

type TeamsResponse = { data: { id: string; name: string; code: string }[] };

// ── API helpers ────────────────────────────────────────────────────────

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Request failed");
  return data;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    draft: { label: "Draft", variant: "secondary" },
    published: { label: "Published", variant: "default" },
    archived: { label: "Archived", variant: "outline" },
    cancelled: { label: "Cancelled", variant: "destructive" },
    delivered: { label: "Delivered", variant: "default" },
  };
  const m = map[status] || { label: status, variant: "outline" as const };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

function sessionStatusIcon(status: string) {
  if (status === "cancelled") return <X className="size-3.5 text-destructive" />;
  if (status === "delivered") return <CheckCircle2 className="size-3.5 text-green-600" />;
  return <Clock className="size-3.5 text-muted-foreground" />;
}

const CATEGORY_LABEL: Record<string, string> = {
  exercises: "Exercises",
  sports: "Sports",
  skills: "Skills",
  tadreeb: "Tadreeb",
};

// ── Main Component ─────────────────────────────────────────────────────

export function ContentPlannerPage() {
  const queryClient = useQueryClient();
  const [selectedCityId, setSelectedCityId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  // ── Permissions ────────────────────────────────────────────────────
  const permQuery = useQuery<Permissions>({
    queryKey: ["content-planner-permissions"],
    queryFn: () => request("/api/admin/content-planner/permissions"),
    staleTime: 60000,
  });
  const { canView, canManage, isHq } = permQuery.data ?? { canView: false, canManage: false, isHq: false };

  // ── Cities (HQ only) ───────────────────────────────────────────────
  const citiesQuery = useQuery<CityItem[]>({
    queryKey: ["content-planner-cities"],
    queryFn: () => request("/api/admin/cities"),
    staleTime: 60000,
    enabled: isHq && canView,
  });

  // ── Plans list ─────────────────────────────────────────────────────
  // Scoped users query without cityId — the server derives scope.
  // HQ must supply a cityId.
  const plansQueryKey = ["content-planner-plans", isHq ? selectedCityId : "scoped", statusFilter] as const;
  const plansQuery = useQuery<PlanListResponse>({
    queryKey: plansQueryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (isHq && selectedCityId) params.set("cityId", selectedCityId);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("pageSize", "50");
      return request(`/api/admin/content-planner/plans?${params.toString()}`);
    },
    enabled: canView && (isHq ? Boolean(selectedCityId) : true),
    staleTime: 30000,
  });

  // ── Plan detail ────────────────────────────────────────────────────
  const detailQuery = useQuery<PlanDetail>({
    queryKey: ["content-planner-plan", selectedPlanId],
    queryFn: () => request(`/api/admin/content-planner/plans/${selectedPlanId}`),
    enabled: canView && Boolean(selectedPlanId),
    staleTime: 15000,
  });

  // ── Blocks for selected session ────────────────────────────────────
  const blocksQuery = useQuery<BlocksResponse>({
    queryKey: ["content-planner-blocks", selectedSessionId],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("sessionId", selectedSessionId!);
      params.set("pageSize", "50");
      return request(`/api/admin/content-planner/blocks?${params.toString()}`);
    },
    enabled: canView && Boolean(selectedSessionId),
    staleTime: 15000,
  });

  // ── Teams for block create ─────────────────────────────────────────
  const teamsQuery = useQuery<TeamsResponse>({
    queryKey: ["content-planner-teams", selectedCityId],
    queryFn: () => {
      // Use the collaboration teams API — scoped users have cityId from their plan
      const plan = detailQuery.data;
      const cityId = plan?.city.id;
      if (!cityId) return { data: [] };
      return request(`/api/admin/teams?cityId=${cityId}`);
    },
    enabled: canManage && Boolean(detailQuery.data?.city.id),
    staleTime: 60000,
  });

  // ── Create plan ────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const createPlan = useMutation({
    mutationFn: () => {
      const body: any = { name: createName.trim(), kind: "template" };
      if (isHq) body.cityId = selectedCityId;
      return request("/api/admin/content-planner/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-planner-plans"] });
      setShowCreate(false);
      setCreateName("");
      toast.success("Plan created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Archive plan ───────────────────────────────────────────────────
  const [archiveTarget, setArchiveTarget] = useState<PlanListItem | null>(null);
  const archivePlan = useMutation({
    mutationFn: (planId: string) =>
      request(`/api/admin/content-planner/plans/${planId}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Archived from workspace" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-planner-plans"] });
      if (archiveTarget?.id === selectedPlanId) { setSelectedPlanId(null); setSelectedSessionId(null); }
      setArchiveTarget(null);
      toast.success("Plan archived");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Create session ─────────────────────────────────────────────────
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState("");
  const createSession = useMutation({
    mutationFn: () =>
      request("/api/admin/content-planner/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId: selectedPlanId, sessionDate: newSessionDate }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-planner-plan", selectedPlanId] });
      setShowCreateSession(false);
      setNewSessionDate("");
      toast.success("Session created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Cancel session ─────────────────────────────────────────────────
  const [cancelTarget, setCancelTarget] = useState<SessionItem | null>(null);
  const cancelSession = useMutation({
    mutationFn: (sessionId: string) =>
      request(`/api/admin/content-planner/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-planner-plan", selectedPlanId] });
      setCancelTarget(null);
      toast.success("Session cancelled");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Create block ───────────────────────────────────────────────────
  const [showCreateBlock, setShowCreateBlock] = useState(false);
  const [blockCategory, setBlockCategory] = useState("");
  const [blockTeamId, setBlockTeamId] = useState("");
  const [blockTitle, setBlockTitle] = useState("");
  const [blockContent, setBlockContent] = useState("");
  const createBlock = useMutation({
    mutationFn: () =>
      request("/api/admin/content-planner/blocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          category: blockCategory,
          teamId: blockTeamId,
          content: blockContent,
          title: blockTitle.trim() || undefined,
          sortOrder: (blocksQuery.data?.blocks.length ?? 0) + 1,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-planner-blocks", selectedSessionId] });
      queryClient.invalidateQueries({ queryKey: ["content-planner-plan", selectedPlanId] });
      setShowCreateBlock(false);
      setBlockCategory("");
      setBlockTeamId("");
      setBlockTitle("");
      setBlockContent("");
      toast.success("Block created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Delete block ───────────────────────────────────────────────────
  const [deleteBlockTarget, setDeleteBlockTarget] = useState<BlockItem | null>(null);
  const deleteBlock = useMutation({
    mutationFn: (blockId: string) =>
      request(`/api/admin/content-planner/blocks/${blockId}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-planner-blocks", selectedSessionId] });
      queryClient.invalidateQueries({ queryKey: ["content-planner-plan", selectedPlanId] });
      setDeleteBlockTarget(null);
      toast.success("Block deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Loading/error/denied early returns ─────────────────────────────
  if (permQuery.isLoading) return <LoadingSkeleton />;
  if (permQuery.isError) return <ErrorState message="Unable to load permissions." onRetry={() => permQuery.refetch()} />;
  if (!canView) return <DeniedState />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Planner</h1>
          <p className="text-sm text-muted-foreground">Manage curriculum plans, sessions, and activity blocks.</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 size-4" />New Plan</Button>
        )}
      </div>

      {/* City selector (HQ only) — scoped users never see this */}
      {isHq && (
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium shrink-0">City</Label>
          <Select value={selectedCityId} onValueChange={(v) => { setSelectedCityId(v); setSelectedPlanId(null); setSelectedSessionId(null); }}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select a city" /></SelectTrigger>
            <SelectContent>
              {(citiesQuery.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Status filter */}
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium shrink-0">Status</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* HQ with no city selected */}
      {isHq && !selectedCityId && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Select a city to view content plans.</CardContent></Card>
      )}

      {/* Main workspace */}
      {(selectedCityId || !isHq) && (
        <>
          {plansQuery.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-5 w-3/4 mb-2" /><Skeleton className="h-3 w-1/2 mb-3" /><Skeleton className="h-4 w-1/3" /></CardContent></Card>
              ))}
            </div>
          ) : plansQuery.isError ? (
            <ErrorState message="Unable to load plans." onRetry={() => plansQuery.refetch()} />
          ) : !plansQuery.data?.plans?.length ? (
            <Card><CardContent className="py-10 text-center">
              <BookOpen className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No content plans yet.</p>
              {canManage && <Button variant="outline" className="mt-4" onClick={() => setShowCreate(true)}><Plus className="mr-2 size-4" />Create first plan</Button>}
            </CardContent></Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              {/* Plan list */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Plans ({plansQuery.data.pagination.total})</h2>
                {plansQuery.data.plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => { setSelectedPlanId(plan.id); setSelectedSessionId(null); }}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${plan.id === selectedPlanId ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:bg-muted/50"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{plan.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant={plan.kind === "template" ? "outline" : "secondary"} className="text-[10px]">{plan.kind === "template" ? "Template" : "Override"}</Badge>
                          {statusBadge(plan.status)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="size-3" />{plan.city.name}</span>
                      {plan.batch && <span className="flex items-center gap-1"><Layers className="size-3" />{plan.batch.name}</span>}
                      {plan.park && <span className="flex items-center gap-1"><MapPin className="size-3" />{plan.park.name}</span>}
                      <span><Calendar className="inline size-3 mr-1" />{plan._count.sessions} sessions</span>
                      {plan.basePlan && <span className="text-muted-foreground/60">Based on: {plan.basePlan.name}</span>}
                    </div>
                    {canManage && plan.status !== "archived" && (
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setArchiveTarget(plan); }}>
                          <Archive className="mr-1 size-3" />Archive
                        </Button>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Detail panel */}
              <div>
                {!selectedPlanId ? (
                  <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Select a plan.</CardContent></Card>
                ) : detailQuery.isLoading ? (
                  <Card><CardContent className="p-4 space-y-3"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-20 w-full" /></CardContent></Card>
                ) : detailQuery.isError ? (
                  <Card><CardContent className="py-6 text-center text-sm text-destructive">Unable to load plan details.</CardContent></Card>
                ) : detailQuery.data ? (
                  <DetailView
                    plan={detailQuery.data}
                    canManage={canManage}
                    canView={canView}
                    selectedSessionId={selectedSessionId}
                    onSelectSession={setSelectedSessionId}
                    onCreateSession={() => setShowCreateSession(true)}
                    onCancelSession={(s) => setCancelTarget(s)}
                    blocksQuery={blocksQuery}
                    teamsQuery={teamsQuery}
                    onCreateBlock={() => setShowCreateBlock(true)}
                    onDeleteBlock={(b) => setDeleteBlockTarget(b)}
                  />
                ) : null}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Dialogs ────────────────────────────────────────────────────── */}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Content Plan</DialogTitle><DialogDescription>Create a curriculum plan.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Plan name</Label><Input value={createName} maxLength={200} placeholder="e.g. Q3 2026 Plan" onChange={(e) => setCreateName(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button disabled={!createName.trim() || createPlan.isPending} onClick={() => createPlan.mutate()}>{createPlan.isPending ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(archiveTarget)} onOpenChange={(o) => !o && setArchiveTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Archive this plan?</DialogTitle><DialogDescription>Archived plans are hidden by default but can be restored. Sessions and blocks are preserved.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={archivePlan.isPending} onClick={() => setArchiveTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={archivePlan.isPending} onClick={() => archiveTarget && archivePlan.mutate(archiveTarget.id)}>{archivePlan.isPending ? "Archiving..." : "Archive"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateSession} onOpenChange={setShowCreateSession}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Session</DialogTitle><DialogDescription>Add a new session date to this plan.</DialogDescription></DialogHeader>
          <div><Label>Session date</Label><Input type="date" value={newSessionDate} onChange={(e) => setNewSessionDate(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSession(false)}>Cancel</Button>
            <Button disabled={!newSessionDate || createSession.isPending} onClick={() => createSession.mutate()}>{createSession.isPending ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(cancelTarget)} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel this session?</DialogTitle><DialogDescription>Mark this session as cancelled. Existing blocks are preserved.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={cancelSession.isPending} onClick={() => setCancelTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={cancelSession.isPending} onClick={() => cancelTarget && cancelSession.mutate(cancelTarget.id)}>{cancelSession.isPending ? "Cancelling..." : "Cancel session"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateBlock} onOpenChange={setShowCreateBlock}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Block</DialogTitle><DialogDescription>Add a content block to this session.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Category</Label>
              <Select value={blockCategory} onValueChange={setBlockCategory}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="exercises">Exercises</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="skills">Skills</SelectItem>
                  <SelectItem value="tadreeb">Tadreeb</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Team</Label>
              <Select value={blockTeamId} onValueChange={setBlockTeamId}>
                <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent>
                  {(teamsQuery.data?.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Title (optional)</Label><Input value={blockTitle} maxLength={200} placeholder="e.g. Warm-up drill" onChange={(e) => setBlockTitle(e.target.value)} /></div>
            <div><Label>Content</Label><Textarea value={blockContent} maxLength={2000} rows={3} placeholder="Describe the block activity" onChange={(e) => setBlockContent(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateBlock(false)}>Cancel</Button>
            <Button disabled={!blockCategory || !blockTeamId || !blockContent.trim() || createBlock.isPending} onClick={() => createBlock.mutate()}>{createBlock.isPending ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteBlockTarget)} onOpenChange={(o) => !o && setDeleteBlockTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete this block?</DialogTitle><DialogDescription>{deleteBlockTarget?.title || "Untitled"} — This action cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={deleteBlock.isPending} onClick={() => setDeleteBlockTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteBlock.isPending} onClick={() => deleteBlockTarget && deleteBlock.mutate(deleteBlockTarget.id)}>{deleteBlock.isPending ? "Deleting..." : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Detail View ────────────────────────────────────────────────────────

function DetailView({
  plan, canManage, canView, selectedSessionId, onSelectSession,
  onCreateSession, onCancelSession, blocksQuery, teamsQuery,
  onCreateBlock, onDeleteBlock,
}: {
  plan: PlanDetail;
  canManage: boolean;
  canView: boolean;
  selectedSessionId: string | null;
  onSelectSession: (id: string | null) => void;
  onCreateSession: () => void;
  onCancelSession: (s: SessionItem) => void;
  blocksQuery: ReturnType<typeof useQuery<BlocksResponse>>;
  teamsQuery: ReturnType<typeof useQuery<TeamsResponse>>;
  onCreateBlock: () => void;
  onDeleteBlock: (b: BlockItem) => void;
}) {
  const selectedSession = plan.sessions.find((s) => s.id === selectedSessionId);

  return (
    <div className="space-y-4">
      {/* Plan header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <CardDescription>
                {plan.city.name}{plan.batch ? ` · ${plan.batch.name}` : ""}{plan.park ? ` · ${plan.park.name}` : ""}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant={plan.kind === "template" ? "outline" : "secondary"}>{plan.kind === "template" ? "Template" : "Override"}</Badge>
              {statusBadge(plan.status)}
            </div>
          </div>
          {plan.basePlan && <p className="mt-1 text-xs text-muted-foreground">Based on: {plan.basePlan.name}</p>}
          {plan.overrides?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Overrides ({plan.overrides.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {plan.overrides.map((ov) => (
                  <Badge key={ov.id} variant="outline" className="text-[10px]">{ov.name}{ov.park ? ` (${ov.park.name})` : ""}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Sessions */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">Sessions ({plan.sessions.length})</CardTitle>
          {canManage && <Button size="sm" variant="outline" onClick={onCreateSession}><Plus className="mr-1 size-3" />Add</Button>}
        </CardHeader>
        <CardContent>
          {plan.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions defined yet.</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {plan.sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelectSession(s.id === selectedSessionId ? null : s.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${s.id === selectedSessionId ? "border-primary bg-primary/5" : "hover:bg-muted/50"} ${s.isOffDay ? "bg-muted/30" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {sessionStatusIcon(s.status)}
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${s.isOffDay ? "text-muted-foreground" : ""}`}>
                          {new Date(s.sessionDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                          {s.dayLabel ? ` — ${s.dayLabel}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.isOffDay ? "Off day" : `${s._count.blocks} blocks`}
                          {s.weekLabel ? ` · ${s.weekLabel}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">{statusBadge(s.status)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected session: blocks */}
      {selectedSession && (
        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-base">
              Blocks — {new Date(selectedSession.sessionDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
            </CardTitle>
            {canManage && !selectedSession.isOffDay && selectedSession.status !== "cancelled" && (
              <Button size="sm" variant="outline" onClick={onCreateBlock}><Plus className="mr-1 size-3" />Add block</Button>
            )}
          </CardHeader>
          <CardContent>
            {selectedSession.isOffDay ? (
              <p className="text-sm text-muted-foreground">Off day — no blocks can be added.</p>
            ) : selectedSession.status === "cancelled" ? (
              <p className="text-sm text-muted-foreground">Session is cancelled.</p>
            ) : blocksQuery.isLoading ? (
              <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
            ) : blocksQuery.isError ? (
              <p className="text-sm text-destructive">Unable to load blocks.</p>
            ) : !blocksQuery.data?.blocks?.length ? (
              <p className="text-sm text-muted-foreground">No blocks yet.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {blocksQuery.data.blocks.map((b) => (
                  <div key={b.id} className="flex items-start justify-between gap-2 rounded-lg border p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className="text-[10px]">{CATEGORY_LABEL[b.category] || b.category}</Badge>
                        <span className="text-xs text-muted-foreground">· {b.team.name}</span>
                        <span className="text-xs text-muted-foreground">· #{b.sortOrder}</span>
                      </div>
                      <p className="text-sm font-medium mt-1">{b.title || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{b.content}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        {b.resources.length > 0 && <span>{b.resources.length} resource(s)</span>}
                        {b._count.activities > 0 && <span>{b._count.activities} activity/activities</span>}
                      </div>
                    </div>
                    {canManage && (
                      <Button size="sm" variant="ghost" className="shrink-0 h-7 text-xs text-destructive" onClick={() => onDeleteBlock(b)}>
                        <Trash2 className="size-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cancel session dialog rendered in parent */}
      {canManage && selectedSession && !selectedSession.isOffDay && selectedSession.status !== "cancelled" && (
        <Button size="sm" variant="outline" className="text-destructive" onClick={() => onCancelSession(selectedSession)}>
          <X className="mr-1 size-3" />Cancel session
        </Button>
      )}
    </div>
  );
}

// ── States ─────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-5 w-3/4 mb-2" /><Skeleton className="h-3 w-1/2 mb-3" /><Skeleton className="h-4 w-1/3" /></CardContent></Card>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-destructive/20">
      <CardContent className="flex flex-col items-center gap-3 py-10">
        <AlertCircle className="size-10 text-destructive" />
        <p className="text-sm text-destructive">{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}><RefreshCw className="mr-2 size-3" />Retry</Button>
      </CardContent>
    </Card>
  );
}

function DeniedState() {
  return (
    <Card className="border-muted">
      <CardContent className="flex flex-col items-center gap-3 py-10">
        <ShieldBan className="size-10 text-muted-foreground" />
        <p className="text-sm font-medium">Access denied</p>
        <p className="text-xs text-muted-foreground text-center max-w-sm">You do not have permission to view content planner data. Contact your administrator if you need access.</p>
      </CardContent>
    </Card>
  );
}
