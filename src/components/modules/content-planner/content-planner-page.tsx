"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  blocksForCategory,
  buildContentPlansUrl,
  choosePreferredPlan,
  choosePreferredSession,
} from "./content-planner-view-model";
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
  Heart,
  Brain,
  Dumbbell,
  Activity,
  Menu,
  ChevronDown,
  Save,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────

type Permissions = {
  canView: boolean;
  canManage: boolean;
  isHq: boolean;
  actorCityId: string | null;
};
type CityItem = { id: string; name: string; code: string };
type CitiesResponse = { data: CityItem[] };

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
    queryKey: ["content-planner-ui-context"],
    queryFn: () => request("/api/admin/content-planner/ui-context"),
    staleTime: 60000,
    retry: false,
  });
  const { canView, canManage, isHq, actorCityId } = permQuery.data ?? {
    canView: false,
    canManage: false,
    isHq: false,
    actorCityId: null,
  };

  // ── Cities (HQ only) ───────────────────────────────────────────────
  const citiesQuery = useQuery<CitiesResponse>({
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
    queryFn: () => request(buildContentPlansUrl({
      isHq,
      cityId: selectedCityId,
      status: statusFilter,
    })),
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
      body.cityId = isHq ? selectedCityId : actorCityId;
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

  useEffect(() => {
    if (selectedPlanId || !plansQuery.data?.plans.length) return;
    const preferredPlan = choosePreferredPlan(plansQuery.data.plans);
    if (!preferredPlan) return;
    setSelectedPlanId(preferredPlan.id);
  }, [plansQuery.data, selectedPlanId]);

  useEffect(() => {
    if (selectedSessionId || !detailQuery.data?.sessions.length) return;
    const preferredSession = choosePreferredSession(detailQuery.data.sessions);
    if (!preferredSession) return;
    setSelectedSessionId(preferredSession.id);
  }, [detailQuery.data, selectedSessionId]);

  const completeSession = useMutation({
    mutationFn: (sessionId: string) =>
      request(`/api/admin/content-planner/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "delivered" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-planner-plan", selectedPlanId] });
      toast.success("Session marked delivered");
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

  const [editBlockTarget, setEditBlockTarget] = useState<BlockItem | null>(null);
  const [editBlockTitle, setEditBlockTitle] = useState("");
  const [editBlockContent, setEditBlockContent] = useState("");

  const openBlockEditor = (block: BlockItem) => {
    setEditBlockTarget(block);
    setEditBlockTitle(block.title ?? "");
    setEditBlockContent(block.content);
  };

  const updateBlock = useMutation({
    mutationFn: () =>
      request(`/api/admin/content-planner/blocks/${editBlockTarget?.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: editBlockTitle.trim() || null,
          content: editBlockContent.trim(),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-planner-blocks", selectedSessionId] });
      setEditBlockTarget(null);
      toast.success("Pillar content updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Loading/error/denied early returns ─────────────────────────────
  if (permQuery.isLoading) return <LoadingSkeleton />;
  if (permQuery.isError) return <ErrorState message="Unable to load permissions." onRetry={() => permQuery.refetch()} />;
  if (!canView) return <DeniedState />;

  return (
    <div className="space-y-5 pb-24 sm:pb-8">
      <Card className="border-purple-200/70 bg-gradient-to-r from-purple-50/80 via-background to-amber-50/60 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {isHq && (
              <Select value={selectedCityId} onValueChange={(v) => { setSelectedCityId(v); setSelectedPlanId(null); setSelectedSessionId(null); }}>
                <SelectTrigger className="h-11 w-full bg-background sm:w-56"><SelectValue placeholder="Select a city" /></SelectTrigger>
                <SelectContent>
                  {(citiesQuery.data?.data ?? []).map((city) => (
                    <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setSelectedPlanId(null);
                setSelectedSessionId(null);
              }}
            >
              <SelectTrigger className="h-11 w-full bg-background sm:w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        {canManage && (
            <Button className="h-11" disabled={isHq && !selectedCityId} onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 size-4" />New plan
            </Button>
        )}
        </CardContent>
      </Card>

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
            <div className="space-y-6">
              {/* Plan list */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Plans ({plansQuery.data.pagination.total})</h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                    onCompleteSession={(s) => completeSession.mutate(s.id)}
                    isCompletingSession={completeSession.isPending}
                    blocksQuery={blocksQuery}
                    teamsQuery={teamsQuery}
                    onCreateBlock={() => setShowCreateBlock(true)}
                    onEditBlock={openBlockEditor}
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

      <Dialog open={Boolean(editBlockTarget)} onOpenChange={(open) => !open && setEditBlockTarget(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit pillar content</DialogTitle>
            <DialogDescription>
              Update the selected session block. Category and collaboration team remain server-controlled.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={editBlockTitle}
                maxLength={200}
                onChange={(event) => setEditBlockTitle(event.target.value)}
              />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea
                value={editBlockContent}
                maxLength={10_000}
                rows={8}
                onChange={(event) => setEditBlockContent(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBlockTarget(null)}>Cancel</Button>
            <Button
              disabled={!editBlockContent.trim() || updateBlock.isPending}
              onClick={() => updateBlock.mutate()}
            >
              <Save className="mr-2 size-4" />
              {updateBlock.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Detail View ────────────────────────────────────────────────────────

function DetailView({
  plan, canManage, canView, selectedSessionId, onSelectSession,
  onCreateSession, onCancelSession, onCompleteSession, isCompletingSession,
  blocksQuery, teamsQuery, onCreateBlock, onEditBlock, onDeleteBlock,
}: {
  plan: PlanDetail;
  canManage: boolean;
  canView: boolean;
  selectedSessionId: string | null;
  onSelectSession: (id: string | null) => void;
  onCreateSession: () => void;
  onCancelSession: (s: SessionItem) => void;
  onCompleteSession: (s: SessionItem) => void;
  isCompletingSession: boolean;
  blocksQuery: ReturnType<typeof useQuery<BlocksResponse>>;
  teamsQuery: ReturnType<typeof useQuery<TeamsResponse>>;
  onCreateBlock: () => void;
  onEditBlock: (b: BlockItem) => void;
  onDeleteBlock: (b: BlockItem) => void;
}) {
  const selectedSession = plan.sessions.find((s) => s.id === selectedSessionId);
  const [activeCategory, setActiveCategory] = useState("tadreeb");
  const [isMobileSessionsOpen, setIsMobileSessionsOpen] = useState(false);
  const blocks = blocksQuery.data?.blocks ?? [];

  const selectSession = (sessionId: string) => {
    onSelectSession(sessionId);
    setIsMobileSessionsOpen(false);
  };

  const pillars = [
    { value: "tadreeb", label: "Tadreeb", icon: Heart, accent: "emerald" },
    { value: "skills", label: "Skills", icon: Brain, accent: "purple" },
    { value: "sports", label: "Sports", icon: Dumbbell, accent: "blue" },
    { value: "exercises", label: "Exercises", icon: Activity, accent: "amber" },
  ] as const;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-purple-200/70 bg-gradient-to-r from-purple-50 via-background to-amber-50/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
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

      <Button
        type="button"
        variant="outline"
        className="h-12 w-full justify-between lg:hidden"
        onClick={() => setIsMobileSessionsOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Menu className="size-4 shrink-0" />
          <span className="truncate">
            {selectedSession
              ? `${selectedSession.weekLabel ?? "Session"} · ${selectedSession.dayLabel ?? new Date(selectedSession.sessionDate).toLocaleDateString("en-GB")}`
              : "Choose a session"}
          </span>
        </span>
        <ChevronDown className={`size-4 transition-transform ${isMobileSessionsOpen ? "rotate-180" : ""}`} />
      </Button>

      <div className="grid gap-4 lg:grid-cols-[minmax(250px,0.85fr)_minmax(0,2fr)]">
        <Card className={`${isMobileSessionsOpen ? "block" : "hidden"} overflow-hidden lg:block`}>
          <CardHeader className="flex-row items-center justify-between border-b pb-3">
            <CardTitle className="text-base">Sessions ({plan.sessions.length})</CardTitle>
            {canManage && (
              <Button size="sm" variant="outline" onClick={onCreateSession}>
                <Plus className="mr-1 size-3" />Add
              </Button>
            )}
          </CardHeader>
          <CardContent className="max-h-[620px] space-y-2 overflow-y-auto p-3">
            {plan.sessions.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No sessions defined yet.</p>
            ) : plan.sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => selectSession(session.id)}
                className={`w-full rounded-xl border p-3 text-left transition-all ${
                  session.id === selectedSessionId
                    ? "border-amber-300 bg-amber-50 shadow-sm"
                    : "border-transparent bg-muted/35 hover:border-purple-200 hover:bg-purple-50/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {session.weekLabel ?? "Session"}{session.dayLabel ? ` · ${session.dayLabel}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(session.sessionDate).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                      {session.isOffDay ? " · Off day" : ` · ${session._count.blocks} blocks`}
                    </p>
                  </div>
                  {sessionStatusIcon(session.status)}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {!selectedSession ? (
          <Card>
            <CardContent className="flex min-h-72 flex-col items-center justify-center gap-3 text-center">
              <BookOpen className="size-12 text-purple-300" />
              <p className="font-semibold">Choose a curriculum session</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Select a week and day to open its live Tadreeb, Skills, Sports and Exercises content.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{selectedSession.weekLabel ?? "Session"}</Badge>
                    {statusBadge(selectedSession.status)}
                  </div>
                  <CardTitle className="text-xl">
                    {selectedSession.dayLabel ?? new Date(selectedSession.sessionDate).toLocaleDateString("en-GB", { weekday: "long" })}
                  </CardTitle>
                  <CardDescription>
                    {new Date(selectedSession.sessionDate).toLocaleDateString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </CardDescription>
                </div>
                {canManage && !selectedSession.isOffDay && selectedSession.status !== "cancelled" && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={onCreateBlock}>
                      <Plus className="mr-1 size-3" />Add block
                    </Button>
                    {selectedSession.status !== "delivered" && (
                      <Button
                        size="sm"
                        disabled={isCompletingSession}
                        onClick={() => onCompleteSession(selectedSession)}
                      >
                        <CheckCircle2 className="mr-1 size-4" />
                        {isCompletingSession ? "Saving..." : "Mark delivered"}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => onCancelSession(selectedSession)}>
                      <X className="mr-1 size-3" />Cancel
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {selectedSession.isOffDay ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  This is a configured off day. Curriculum blocks are disabled.
                </div>
              ) : selectedSession.status === "cancelled" ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-muted-foreground">
                  This session is cancelled and remains read-only.
                </div>
              ) : blocksQuery.isLoading ? (
                <div className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-40 w-full" /></div>
              ) : blocksQuery.isError ? (
                <p className="text-sm text-destructive">Unable to load curriculum blocks.</p>
              ) : (
                <Tabs value={activeCategory} onValueChange={setActiveCategory} className="space-y-5">
                  <TabsList className="grid h-auto grid-cols-2 gap-1 rounded-2xl p-1.5 sm:grid-cols-4">
                    {pillars.map((pillar) => {
                      const Icon = pillar.icon;
                      return (
                        <TabsTrigger key={pillar.value} value={pillar.value} className="min-h-11 rounded-xl gap-2">
                          <Icon className="size-4" />{pillar.label}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                  {pillars.map((pillar) => {
                    const Icon = pillar.icon;
                    const categoryBlocks = blocksForCategory(blocks, pillar.value);
                    return (
                      <TabsContent key={pillar.value} value={pillar.value} className="space-y-3">
                        {categoryBlocks.length === 0 ? (
                          <div className="rounded-2xl border border-dashed p-8 text-center">
                            <Icon className="mx-auto mb-3 size-9 text-muted-foreground/50" />
                            <p className="text-sm font-medium">No {pillar.label} content yet</p>
                            <p className="mt-1 text-xs text-muted-foreground">Add a block to this session when content is ready.</p>
                          </div>
                        ) : categoryBlocks.map((block) => (
                          <div key={block.id} className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="secondary">{CATEGORY_LABEL[block.category] ?? block.category}</Badge>
                                  <span className="text-xs text-muted-foreground">{block.team.name}</span>
                                </div>
                                <h3 className="mt-3 font-semibold">{block.title || `${pillar.label} activity`}</h3>
                              </div>
                              {canManage && (
                                <div className="flex shrink-0 gap-1">
                                  <Button size="icon" variant="ghost" className="size-9" onClick={() => onEditBlock(block)} aria-label={`Edit ${block.title ?? pillar.label}`}>
                                    <Edit3 className="size-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="size-9 text-destructive" onClick={() => onDeleteBlock(block)} aria-label={`Delete ${block.title ?? pillar.label}`}>
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-foreground/85">{block.content}</p>
                            {block.resources.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {block.resources.map((resource) => (
                                  <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted">
                                    {resource.label}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </TabsContent>
                    );
                  })}
                </Tabs>
              )}
            </CardContent>
          </Card>
        )}
      </div>
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
