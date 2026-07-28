"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen,
  Plus,
  FileText,
  AlertCircle,
  RefreshCw,
  ShieldBan,
  MapPin,
  Layers,
  Calendar,
  ChevronRight,
  Archive,
  Edit3,
  X,
  CheckCircle2,
  Clock,
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
type PlanListResponse = { plans: PlanListItem[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };
type SessionItem = { id: string; sessionDate: string; weekLabel: string | null; dayLabel: string | null; isOffDay: boolean; status: string; _count: { blocks: number } };
type PlanDetail = PlanListItem & { sessions: SessionItem[]; overrides: { id: string; name: string; park?: { id: string; name: string } | null; status: string }[] };

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

function planKindLabel(kind: string) {
  return kind === "template" ? "Template" : "Override";
}

// ── Main Component ─────────────────────────────────────────────────────

export function ContentPlannerPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [selectedCityId, setSelectedCityId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

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
  const plansQueryKey = ["content-planner-plans", selectedCityId, statusFilter] as const;
  const plansQuery = useQuery<PlanListResponse>({
    queryKey: plansQueryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedCityId) params.set("cityId", selectedCityId);
      if (statusFilter) params.set("status", statusFilter);
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

  // ── Create plan mutation ───────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const createPlan = useMutation({
    mutationFn: () => request("/api/admin/content-planner/plans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cityId: selectedCityId, name: createName.trim(), kind: "override" }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-planner-plans"] });
      setShowCreate(false);
      setCreateName("");
      toast.success("Plan created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Archive plan mutation ──────────────────────────────────────────
  const [archiveTarget, setArchiveTarget] = useState<PlanListItem | null>(null);
  const archivePlan = useMutation({
    mutationFn: (planId: string) => request(`/api/admin/content-planner/plans/${planId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-planner-plans"] });
      if (archiveTarget?.id === selectedPlanId) setSelectedPlanId(null);
      setArchiveTarget(null);
      toast.success("Plan archived");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Loading/error/denied early returns ─────────────────────────────
  if (permQuery.isLoading) return <LoadingSkeleton />;
  if (permQuery.isError) return <ErrorState message="Unable to load permissions." onRetry={() => permQuery.refetch()} />;
  if (!canView) return <DeniedState />;

  // ── Scoped: derive city from session ───────────────────────────────
  const sessionUser = session?.user as { assignedCityId?: string | null; role?: string } | undefined;
  const effectiveCityId = isHq ? selectedCityId : (sessionUser?.assignedCityId ?? "");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Planner</h1>
          <p className="text-sm text-muted-foreground">Manage curriculum plans, sessions, and activity blocks.</p>
        </div>
        {canManage && isHq && effectiveCityId && (
          <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 size-4" />New Plan</Button>
        )}
      </div>

      {/* City selector (HQ only) */}
      {isHq && (
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium shrink-0">City</Label>
          <Select
            value={effectiveCityId}
            onValueChange={(v) => { setSelectedCityId(v); setSelectedPlanId(null); }}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a city" />
            </SelectTrigger>
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
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* No city selected (HQ) */}
      {isHq && !effectiveCityId && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Select a city to view content plans.</CardContent></Card>
      )}

      {/* Scoped user without city */}
      {!isHq && !effectiveCityId && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">City scope could not be resolved. Contact your administrator.</CardContent></Card>
      )}

      {/* Main workspace */}
      {effectiveCityId && (
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
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${plan.id === selectedPlanId ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:bg-muted/50"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{plan.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant={plan.kind === "template" ? "outline" : "secondary"} className="text-[10px]">{planKindLabel(plan.kind)}</Badge>
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
                  <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Select a plan to view its details.</CardContent></Card>
                ) : detailQuery.isLoading ? (
                  <Card><CardContent className="p-4 space-y-3"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-20 w-full" /></CardContent></Card>
                ) : detailQuery.isError ? (
                  <Card><CardContent className="py-6 text-center text-sm text-destructive">Unable to load plan details.</CardContent></Card>
                ) : detailQuery.data ? (
                  <DetailView plan={detailQuery.data} canManage={canManage} />
                ) : null}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create plan dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Content Plan</DialogTitle><DialogDescription>Create an override plan for the selected city.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Plan name</Label><Input value={createName} maxLength={200} placeholder="e.g. Summer 2026 - Park A" onChange={(e) => setCreateName(e.target.value)} /></div>
            {canManage && <p className="text-xs text-muted-foreground">The plan will be created as an override in {citiesQuery.data?.find(c => c.id === effectiveCityId)?.name || "the selected city"}.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button disabled={!createName.trim() || createPlan.isPending} onClick={() => createPlan.mutate()}>{createPlan.isPending ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive confirmation */}
      <Dialog open={Boolean(archiveTarget)} onOpenChange={(o) => !o && setArchiveTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Archive this plan?</DialogTitle><DialogDescription>Archived plans are hidden by default but can be restored. Sessions and blocks are preserved.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={archivePlan.isPending} onClick={() => setArchiveTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={archivePlan.isPending} onClick={() => archiveTarget && archivePlan.mutate(archiveTarget.id)}>{archivePlan.isPending ? "Archiving..." : "Archive"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Detail View ────────────────────────────────────────────────────────

function DetailView({ plan, canManage }: { plan: PlanDetail; canManage: boolean }) {
  return (
    <div className="space-y-4">
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
              <Badge variant={plan.kind === "template" ? "outline" : "secondary"}>{planKindLabel(plan.kind)}</Badge>
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sessions ({plan.sessions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {plan.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions defined yet.</p>
          ) : (
            <div className="space-y-2">
              {plan.sessions.map((s) => (
                <div key={s.id} className={`flex items-center justify-between rounded-lg border p-3 ${s.isOffDay ? "bg-muted/30" : ""}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    {sessionStatusIcon(s.status)}
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${s.isOffDay ? "text-muted-foreground" : ""}`}>
                        {new Date(s.sessionDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                        {s.dayLabel ? ` — ${s.dayLabel}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.isOffDay ? "Off day / Cancelled" : `${s._count.blocks} blocks`}
                        {s.weekLabel ? ` · ${s.weekLabel}` : ""}
                      </p>
                    </div>
                  </div>
                  {statusBadge(s.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
