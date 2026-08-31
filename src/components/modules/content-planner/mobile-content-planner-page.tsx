"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BookOpen,
  ChevronDown,
  Dumbbell,
  Heart,
  Lightbulb,
  MapPin,
  RefreshCw,
  Sparkles,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  blocksForCategory,
  buildContentPlansUrl,
  choosePreferredPlan,
  choosePreferredSession,
} from "./content-planner-view-model";
import {
  SessionFormDialog,
  ConfirmActionDialog,
  BlockFormDialog,
  SessionFormData,
  BlockFormData,
  TeamOption,
} from "./mobile-planner-dialogs";

type UiContext = { canView: boolean; canManage?: boolean; isHq: boolean; actorCityId?: string | null };
type City = { id: string; name: string };
type Plan = {
  id: string;
  name: string;
  kind: "template" | "override";
  status: "draft" | "published" | "archived";
  city: { id: string; name: string };
  park?: { id: string; name: string } | null;
  _count: { sessions: number };
};
type Session = {
  id: string;
  sessionDate: string;
  weekLabel: string | null;
  dayLabel: string | null;
  isOffDay: boolean;
  status: string;
  focusArea: string | null;
  _count: { blocks: number };
};
type PlanDetail = Plan & { sessions: Session[] };
type Block = {
  id: string;
  category: string;
  title: string | null;
  content: string;
  sortOrder?: number;
  status?: string;
  team: { id: string; name: string; code: string };
  resources: { id: string; label: string; url: string; kind: string }[];
};

const pillars = [
  { id: "tadreeb", label: "Tadreeb", Icon: Heart, tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  { id: "skills", label: "Skills", Icon: Lightbulb, tone: "bg-amber-50 text-amber-700 ring-amber-200" },
  { id: "sports", label: "Sports", Icon: Dumbbell, tone: "bg-sky-50 text-sky-700 ring-sky-200" },
  { id: "exercises", label: "Exercise", Icon: Sparkles, tone: "bg-violet-50 text-violet-700 ring-violet-200" },
] as const;

const CATEGORY_TO_TEAM_CODE: Record<string, string> = {
  exercises: "sports",
  sports: "sports",
  skills: "skills",
  tadreeb: "tadreeb",
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof body.error === "string"
        ? body.error
        : typeof body.error === "object" && body.error !== null
        ? Object.values(body.error).flat().join(", ")
        : typeof body.message === "string"
        ? body.message
        : "Request failed";
    throw new Error(message);
  }
  return body as T;
}

function formatSessionDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

/** Native PWA planner with safe mobile management controls gated strictly by server-provided canManage capability. */
export function MobileContentPlannerPage() {
  const queryClient = useQueryClient();

  const [cityId, setCityId] = useState("");
  const [planId, setPlanId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activePillar, setActivePillar] = useState<(typeof pillars)[number]["id"]>("tadreeb");
  const [showPlans, setShowPlans] = useState(false);

  // Dialog & Form State
  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [editSessionOpen, setEditSessionOpen] = useState(false);
  const [cancelSessionOpen, setCancelSessionOpen] = useState(false);
  const [sessionError, setSessionError] = useState("");

  const [sessionForm, setSessionForm] = useState<SessionFormData>({
    sessionDate: "",
    weekLabel: "",
    dayLabel: "",
    focusArea: "",
    isOffDay: false,
    status: "published",
  });

  const [createBlockOpen, setCreateBlockOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);
  const [blockError, setBlockError] = useState("");

  const [blockForm, setBlockForm] = useState<BlockFormData>({
    teamId: "",
    title: "",
    content: "",
    sortOrder: 0,
  });

  // ── 1. UI Context & Capabilities ───────────────────────────────────────────
  const contextQuery = useQuery<UiContext>({
    queryKey: ["pwa-content-planner-context"],
    queryFn: () => request("/api/admin/content-planner/ui-context"),
    staleTime: 60_000,
    retry: false,
  });
  const context = contextQuery.data;
  const canManage = Boolean(context?.canManage);
  // Managers must be able to find and prepare drafts; read-only users only see released curriculum.
  const planStatus = canManage ? "all" : "published";

  // ── 2. Cities (HQ only) ───────────────────────────────────────────────────
  const citiesQuery = useQuery<{ data: City[] }>({
    queryKey: ["pwa-content-planner-cities"],
    queryFn: () => request("/api/admin/cities"),
    enabled: Boolean(context?.canView && context?.isHq),
    staleTime: 60_000,
  });

  // ── 3. Plans List ─────────────────────────────────────────────────────────
  const plansQuery = useQuery<{ plans: Plan[] }>({
    queryKey: ["pwa-content-planner-plans", context?.isHq ? cityId : "scoped", planStatus],
    queryFn: () => request(buildContentPlansUrl({ isHq: Boolean(context?.isHq), cityId, status: planStatus })),
    enabled: Boolean(context?.canView) && (!context?.isHq || Boolean(cityId)),
    staleTime: 30_000,
  });

  useEffect(() => {
    setPlanId(null);
    setSessionId(null);
  }, [cityId]);

  const plans = plansQuery.data?.plans ?? [];
  const selectedPlanId = useMemo(
    () => (planId && plans.some((plan) => plan.id === planId) ? planId : choosePreferredPlan(plans)?.id ?? null),
    [planId, plans]
  );

  // ── 4. Plan Detail ────────────────────────────────────────────────────────
  const planQuery = useQuery<PlanDetail>({
    queryKey: ["pwa-content-planner-plan", selectedPlanId],
    queryFn: () => request(`/api/admin/content-planner/plans/${selectedPlanId}`),
    enabled: Boolean(context?.canView && selectedPlanId),
    staleTime: 30_000,
  });
  const plan = planQuery.data;

  const selectedSessionId = useMemo(
    () =>
      sessionId && plan?.sessions.some((session) => session.id === sessionId)
        ? sessionId
        : choosePreferredSession(plan?.sessions ?? [])?.id ?? null,
    [plan?.sessions, sessionId]
  );
  const selectedSession = plan?.sessions.find((session) => session.id === selectedSessionId) ?? null;

  // ── 5. Session Blocks ─────────────────────────────────────────────────────
  const blocksQuery = useQuery<{ blocks: Block[] }>({
    queryKey: ["pwa-content-planner-blocks", selectedSessionId],
    queryFn: () => request(`/api/admin/content-planner/blocks?sessionId=${selectedSessionId}&pageSize=50`),
    enabled: Boolean(context?.canView && selectedSessionId && !selectedSession?.isOffDay),
    staleTime: 30_000,
  });
  const categoryBlocks = blocksForCategory(blocksQuery.data?.blocks ?? [], activePillar);

  // ── 6. Teams (for block creation when canManage is true) ───────────────────
  const teamsQuery = useQuery<TeamOption[]>({
    queryKey: ["pwa-content-planner-teams", plan?.city?.id],
    queryFn: async () => {
      if (!plan?.city?.id) return [];
      const res = await fetch(`/api/admin/teams?cityId=${plan.city.id}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data.data ?? [];
    },
    enabled: Boolean(canManage && plan?.city?.id),
    staleTime: 60_000,
  });

  const availableTeams = teamsQuery.data ?? [];
  const expectedTeamCode = CATEGORY_TO_TEAM_CODE[activePillar] || activePillar;

  // Exact canonical team mapping: normalize team code to lowercase, never fall back to all teams
  const filteredTeams = useMemo(() => {
    if (!availableTeams.length) return [];
    return availableTeams.filter(
      (t) => t.code.trim().toLowerCase() === expectedTeamCode.toLowerCase()
    );
  }, [availableTeams, expectedTeamCode]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createSessionMutation = useMutation({
    mutationFn: (payload: {
      planId: string;
      sessionDate: string;
      weekLabel?: string | null;
      dayLabel?: string | null;
      focusArea?: string | null;
      isOffDay: boolean;
    }) =>
      request<Session>("/api/admin/content-planner/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ["pwa-content-planner-plan", selectedPlanId] });
      setSessionId(newSession.id);
      setCreateSessionOpen(false);
      setSessionError("");
    },
    onError: (err: Error) => setSessionError(err.message),
  });

  const updateSessionMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      sessionDate?: string;
      weekLabel?: string | null;
      dayLabel?: string | null;
      focusArea?: string | null;
      status?: string;
    }) => {
      const { id, ...data } = payload;
      return request<Session>(`/api/admin/content-planner/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pwa-content-planner-plan", selectedPlanId] });
      setEditSessionOpen(false);
      setSessionError("");
    },
    onError: (err: Error) => setSessionError(err.message),
  });

  const cancelSessionMutation = useMutation({
    mutationFn: (idToCancel: string) =>
      request<{ status: string }>(`/api/admin/content-planner/sessions/${idToCancel}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled via mobile planner" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pwa-content-planner-plan", selectedPlanId] });
      setCancelSessionOpen(false);
      setSessionError("");
    },
    onError: (err: Error) => setSessionError(err.message),
  });

  const createBlockMutation = useMutation({
    mutationFn: (payload: {
      sessionId: string;
      teamId: string;
      category: string;
      title?: string | null;
      content: string;
      sortOrder?: number;
    }) =>
      request<Block>("/api/admin/content-planner/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pwa-content-planner-blocks", selectedSessionId] });
      setCreateBlockOpen(false);
      setBlockError("");
    },
    onError: (err: Error) => setBlockError(err.message),
  });

  const updateBlockMutation = useMutation({
    mutationFn: (payload: { id: string; title?: string | null; content?: string; sortOrder?: number; status?: string }) => {
      const { id, ...data } = payload;
      return request<Block>(`/api/admin/content-planner/blocks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pwa-content-planner-blocks", selectedSessionId] });
      setEditingBlock(null);
      setBlockError("");
    },
    onError: (err: Error) => setBlockError(err.message),
  });

  const deleteBlockMutation = useMutation({
    mutationFn: (idToDelete: string) =>
      request<{ message: string }>(`/api/admin/content-planner/blocks/${idToDelete}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pwa-content-planner-blocks", selectedSessionId] });
      setDeletingBlockId(null);
      setBlockError("");
    },
    onError: (err: Error) => setBlockError(err.message),
  });

  // ── Render States ─────────────────────────────────────────────────────────

  if (contextQuery.isLoading) return <PlannerLoading />;
  if (contextQuery.isError || !context?.canView) {
    return (
      <PlannerMessage
        title="Planner access unavailable"
        message="Your planner access could not be verified."
        onRetry={() => contextQuery.refetch()}
      />
    );
  }

  if (context.isHq && !cityId) {
    return (
      <main className="min-h-full space-y-5 px-4 pb-28 pt-5">
        <PlannerHeading />
        <section className="rounded-3xl border bg-card p-5 shadow-sm">
          <MapPin className="mb-3 size-8 text-primary" />
          <h2 className="text-lg font-bold">Choose a city</h2>
          <p className="mt-1 text-sm text-muted-foreground">Select a city before loading its curriculum plans.</p>
          <select
            aria-label="Select city"
            className="mt-5 h-12 w-full rounded-xl border bg-background px-3 text-sm font-medium"
            value={cityId}
            onChange={(event) => setCityId(event.target.value)}
          >
            <option value="">Select a city</option>
            {(citiesQuery.data?.data ?? []).map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </section>
      </main>
    );
  }

  if (plansQuery.isLoading) return <PlannerLoading />;
  if (plansQuery.isError) {
    return (
      <PlannerMessage
        title="Could not load plans"
        message="Please retry loading the curriculum plans."
        onRetry={() => plansQuery.refetch()}
      />
    );
  }
  if (!plans.length) {
    return (
      <PlannerMessage
        title={canManage ? "No curriculum plans" : "No published plan"}
        message={
          canManage
            ? "Create a curriculum plan for this scope to start preparing sessions."
            : "There are no published curriculum plans in this scope yet."
        }
      />
    );
  }

  const isSessionCancelled = selectedSession?.status === "cancelled";
  const isSessionDelivered = selectedSession?.status === "delivered";
  const isSessionTerminal = isSessionCancelled || isSessionDelivered;

  // Lifecycle action permissions: only active mutable states allowed
  const canMarkDelivered =
    selectedSession &&
    !isSessionTerminal &&
    ["draft", "published", "scheduled", "in_progress"].includes(selectedSession.status);

  const canManageSession = canManage && !isSessionTerminal;
  const canManageBlocks = canManage && !isSessionTerminal && !selectedSession?.isOffDay;

  return (
    <main className="min-h-full bg-background px-4 pb-28 pt-5">
      <PlannerHeading />

      {/* Plan Selector */}
      <section className="mt-4 rounded-3xl border bg-card p-4 shadow-sm">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setShowPlans((open) => !open)}
        >
          <span className="min-w-0">
            <span className="block truncate text-base font-bold">
              {plans.find((item) => item.id === selectedPlanId)?.name ?? "Select plan"}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {plans.length} plan{plans.length === 1 ? "" : "s"} available
            </span>
          </span>
          <ChevronDown
            className={`size-5 shrink-0 text-muted-foreground transition-transform ${showPlans ? "rotate-180" : ""}`}
          />
        </button>
        {showPlans && (
          <div className="mt-4 space-y-2 border-t pt-3">
            {plans.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setPlanId(item.id);
                  setSessionId(null);
                  setShowPlans(false);
                }}
                className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                  item.id === selectedPlanId ? "border-primary bg-primary/5 font-semibold" : "bg-background"
                }`}
              >
                <p className="truncate text-sm font-semibold">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.city.name}
                  {item.park ? ` · ${item.park.name}` : ""} · {item._count.sessions} sessions
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Plan Details & Sessions */}
      {planQuery.isLoading ? (
        <PlannerLoading compact />
      ) : planQuery.isError || !plan ? (
        <PlannerMessage
          title="Could not open plan"
          message="Please retry opening this curriculum plan."
          onRetry={() => planQuery.refetch()}
        />
      ) : (
        <>
          {/* Horizontal Session Strip */}
          <section className="mt-4 overflow-x-auto pb-1" aria-label="Curriculum sessions">
            <div className="flex min-w-max items-center gap-2">
              {plan.sessions.map((session, index) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSessionId(session.id)}
                  className={`w-24 rounded-2xl border px-3 py-3 text-left transition-colors ${
                    session.id === selectedSessionId
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "bg-card hover:bg-muted/40"
                  }`}
                >
                  <span className="block text-[11px] font-medium opacity-80">
                    {session.weekLabel ?? `Week ${index + 1}`}
                  </span>
                  <span className="mt-1 block truncate text-sm font-bold">
                    {session.dayLabel ?? formatSessionDate(session.sessionDate)}
                  </span>
                  <span className="mt-1 block text-[10px] opacity-75">
                    {session.status === "cancelled" ? "Cancelled" : session.status === "delivered" ? "Delivered" : session.isOffDay ? "Off day" : `${session._count.blocks} blocks`}
                  </span>
                </button>
              ))}

              {/* Add Session Control */}
              {canManage && (
                <button
                  type="button"
                  data-testid="add-session-button"
                  onClick={() => {
                    setSessionForm({
                      sessionDate: new Date().toISOString().slice(0, 10),
                      weekLabel: `Week ${(plan.sessions?.length || 0) + 1}`,
                      dayLabel: `Class ${(plan.sessions?.length || 0) + 1}`,
                      focusArea: "",
                      isOffDay: false,
                      status: "published",
                    });
                    setSessionError("");
                    setCreateSessionOpen(true);
                  }}
                  className="flex h-[76px] w-20 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 text-primary transition-all active:scale-95"
                >
                  <Plus className="size-5" />
                  <span className="mt-1 text-[11px] font-bold">Add</span>
                </button>
              )}
            </div>
          </section>

          {/* Active Session Content */}
          {!selectedSession ? (
            <PlannerMessage
              title="Choose a session"
              message="Tap a week above to open its activity plan."
            />
          ) : (
            <>
              {/* Session Hero Banner */}
              <section className="mt-4 rounded-3xl bg-gradient-to-br from-primary to-violet-700 p-5 text-primary-foreground shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">
                      {selectedSession.weekLabel ?? "Curriculum session"}
                    </p>
                    <h2 className="mt-1 text-2xl font-extrabold">
                      {selectedSession.dayLabel ?? formatSessionDate(selectedSession.sessionDate)}
                    </h2>
                    <p className="mt-2 text-sm text-primary-foreground/80">
                      {selectedSession.focusArea ||
                        (isSessionCancelled
                          ? "This session has been cancelled."
                          : isSessionDelivered
                          ? "This session has been delivered and recorded."
                          : selectedSession.isOffDay
                          ? "Operational off-day."
                          : "Live curriculum for this class.")}
                    </p>
                  </div>
                  <Badge
                    className={`border-white/20 text-white hover:bg-white/15 ${
                      isSessionCancelled
                        ? "bg-red-500/40"
                        : isSessionDelivered
                        ? "bg-emerald-500/40"
                        : "bg-white/15"
                    }`}
                  >
                    {selectedSession.status}
                  </Badge>
                </div>

                {/* Session Actions (Hidden when session is terminal: cancelled or delivered) */}
                {canManageSession && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/15 pt-3">
                    {canMarkDelivered && (
                      <button
                        type="button"
                        data-testid="mark-delivered-button"
                        disabled={updateSessionMutation.isPending}
                        onClick={() =>
                          updateSessionMutation.mutate({
                            id: selectedSession.id,
                            status: "delivered",
                          })
                        }
                        className="flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-white/30 active:scale-95 disabled:opacity-50"
                      >
                        <CheckCircle2 className="size-3.5" />
                        <span>Mark Delivered</span>
                      </button>
                    )}

                    <button
                      type="button"
                      data-testid="edit-session-button"
                      onClick={() => {
                        setSessionForm({
                          sessionDate: selectedSession.sessionDate ? selectedSession.sessionDate.slice(0, 10) : "",
                          weekLabel: selectedSession.weekLabel || "",
                          dayLabel: selectedSession.dayLabel || "",
                          focusArea: selectedSession.focusArea || "",
                          isOffDay: selectedSession.isOffDay,
                          status: selectedSession.status,
                        });
                        setSessionError("");
                        setEditSessionOpen(true);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-white/25 active:scale-95"
                    >
                      <Edit3 className="size-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      data-testid="cancel-session-button"
                      onClick={() => {
                        setSessionError("");
                        setCancelSessionOpen(true);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-red-500/30 px-3 py-1.5 text-xs font-bold text-red-100 transition-all hover:bg-red-500/40 active:scale-95"
                    >
                      <XCircle className="size-3.5" />
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </section>

              {/* Off-Day State vs Curriculum Pillars & Blocks */}
              {selectedSession.isOffDay ? (
                <section
                  data-testid="off-day-section"
                  className="mt-4 rounded-3xl border bg-card p-6 text-center shadow-sm"
                >
                  <Sparkles className="mx-auto size-8 text-primary" />
                  <h3 className="mt-3 text-lg font-bold">Operational off-day</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    No curriculum activities or content blocks are scheduled for this session.
                  </p>
                </section>
              ) : (
                <>
                  {/* Pillar Selector Tabs */}
                  <section className="mt-4" aria-label="Curriculum categories">
                    <div className="grid grid-cols-4 gap-2">
                      {pillars.map(({ id, label, Icon, tone }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setActivePillar(id)}
                          className={`flex min-h-20 flex-col items-center justify-center rounded-2xl border px-1 text-center text-[11px] font-bold transition-all ${
                            id === activePillar ? `${tone} ring-1` : "bg-card text-muted-foreground"
                          }`}
                        >
                          <Icon className="mb-1 size-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Pillar Header with Add Block Control */}
                  {canManageBlocks && (
                    <div className="mt-4 flex items-center justify-between px-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {pillars.find((p) => p.id === activePillar)?.label} Blocks ({categoryBlocks.length})
                      </span>
                      <button
                        type="button"
                        data-testid="add-block-button"
                        onClick={() => {
                          setBlockForm({
                            teamId: filteredTeams[0]?.id || "",
                            title: "",
                            content: "",
                            sortOrder: categoryBlocks.length,
                          });
                          setBlockError("");
                          setCreateBlockOpen(true);
                        }}
                        className="flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-all hover:bg-primary/20 active:scale-95"
                      >
                        <Plus className="size-3.5" />
                        <span>Add Block</span>
                      </button>
                    </div>
                  )}

                  {/* Category Blocks List */}
                  <section className="mt-3 space-y-3">
                    {blocksQuery.isLoading ? (
                      <PlannerLoading compact />
                    ) : blocksQuery.isError ? (
                      <PlannerMessage
                        title="Could not load session content"
                        message="Retry to load curriculum blocks."
                        onRetry={() => blocksQuery.refetch()}
                      />
                    ) : categoryBlocks.length === 0 ? (
                      <PlannerMessage
                        title="Nothing planned here yet"
                        message="This category has no active content block for the selected session."
                      />
                    ) : (
                      categoryBlocks.map((block) => (
                        <article key={block.id} className="rounded-3xl border bg-card p-5 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                                {block.team.name}
                              </p>
                              <h3 className="mt-1 text-lg font-bold">{block.title || "Session activity"}</h3>
                            </div>
                            <BookOpen className="size-5 shrink-0 text-primary" />
                          </div>

                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/85">
                            {block.content}
                          </p>

                          {block.resources.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {block.resources.map((resource) => (
                                <a
                                  key={resource.id}
                                  href={resource.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-full border px-3 py-1.5 text-xs font-semibold text-primary"
                                >
                                  {resource.label}
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Block Management Controls (Hidden on terminal sessions) */}
                          {canManageBlocks && (
                            <div className="mt-4 flex items-center justify-end gap-2 border-t pt-3">
                              <button
                                type="button"
                                data-testid={`edit-block-${block.id}`}
                                onClick={() => {
                                  setEditingBlock(block);
                                  setBlockForm({
                                    teamId: block.team.id,
                                    title: block.title || "",
                                    content: block.content,
                                    sortOrder: block.sortOrder || 0,
                                  });
                                  setBlockError("");
                                }}
                                className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                <Edit3 className="size-3" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                data-testid={`delete-block-${block.id}`}
                                onClick={() => {
                                  setDeletingBlockId(block.id);
                                  setBlockError("");
                                }}
                                className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:hover:bg-red-950/40"
                              >
                                <Trash2 className="size-3" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </article>
                      ))
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* ─── MODULAR DIALOGS (Gated strictly by canManage) ────────────────── */}
      {canManage && (
        <>
          <SessionFormDialog
            open={createSessionOpen}
            onOpenChange={setCreateSessionOpen}
            mode="create"
            form={sessionForm}
            onChange={setSessionForm}
            onSubmit={() => {
              if (!selectedPlanId) return;
              createSessionMutation.mutate({
                planId: selectedPlanId,
                sessionDate: sessionForm.sessionDate,
                weekLabel: sessionForm.weekLabel || null,
                dayLabel: sessionForm.dayLabel || null,
                focusArea: sessionForm.isOffDay ? null : sessionForm.focusArea || null,
                isOffDay: sessionForm.isOffDay,
              });
            }}
            isPending={createSessionMutation.isPending}
            errorMessage={sessionError}
          />

          <SessionFormDialog
            open={editSessionOpen}
            onOpenChange={setEditSessionOpen}
            mode="edit"
            form={sessionForm}
            onChange={setSessionForm}
            onSubmit={() => {
              if (!selectedSessionId) return;
              updateSessionMutation.mutate({
                id: selectedSessionId,
                sessionDate: sessionForm.sessionDate || undefined,
                weekLabel: sessionForm.weekLabel || null,
                dayLabel: sessionForm.dayLabel || null,
                focusArea: sessionForm.isOffDay ? null : sessionForm.focusArea || null,
                status: sessionForm.status,
              });
            }}
            isPending={updateSessionMutation.isPending}
            errorMessage={sessionError}
          />

          <ConfirmActionDialog
            open={cancelSessionOpen}
            onOpenChange={setCancelSessionOpen}
            title="Cancel Curriculum Session"
            description="Are you sure you want to cancel this session? It will be marked as cancelled."
            confirmLabel="Confirm Cancel"
            onConfirm={() => {
              if (selectedSessionId) cancelSessionMutation.mutate(selectedSessionId);
            }}
            isPending={cancelSessionMutation.isPending}
            errorMessage={sessionError}
          />

          <BlockFormDialog
            open={createBlockOpen}
            onOpenChange={setCreateBlockOpen}
            mode="create"
            categoryLabel={pillars.find((p) => p.id === activePillar)?.label || ""}
            expectedTeamCode={expectedTeamCode}
            form={blockForm}
            teams={filteredTeams}
            onChange={setBlockForm}
            onSubmit={() => {
              if (!selectedSessionId) return;
              createBlockMutation.mutate({
                sessionId: selectedSessionId,
                teamId: blockForm.teamId,
                category: activePillar,
                title: blockForm.title.trim() || null,
                content: blockForm.content.trim(),
                sortOrder: blockForm.sortOrder || 0,
              });
            }}
            isPending={createBlockMutation.isPending}
            errorMessage={blockError}
          />

          <BlockFormDialog
            open={Boolean(editingBlock)}
            onOpenChange={(open) => !open && setEditingBlock(null)}
            mode="edit"
            categoryLabel={pillars.find((p) => p.id === activePillar)?.label || ""}
            expectedTeamCode={expectedTeamCode}
            form={blockForm}
            teams={filteredTeams}
            onChange={setBlockForm}
            onSubmit={() => {
              if (!editingBlock) return;
              updateBlockMutation.mutate({
                id: editingBlock.id,
                title: blockForm.title.trim() || null,
                content: blockForm.content.trim(),
              });
            }}
            isPending={updateBlockMutation.isPending}
            errorMessage={blockError}
          />

          <ConfirmActionDialog
            open={Boolean(deletingBlockId)}
            onOpenChange={(open) => !open && setDeletingBlockId(null)}
            title="Delete Activity Block"
            description="Are you sure you want to delete this activity block? This action cannot be undone."
            confirmLabel="Delete Block"
            onConfirm={() => {
              if (deletingBlockId) deleteBlockMutation.mutate(deletingBlockId);
            }}
            isPending={deleteBlockMutation.isPending}
            errorMessage={blockError}
          />
        </>
      )}
    </main>
  );
}

function PlannerHeading() {
  return (
    <header>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Today&apos;s curriculum</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Content Planner</h1>
      <p className="mt-1 text-sm text-muted-foreground">Open the plan, choose a class, and lead it with confidence.</p>
    </header>
  );
}

function PlannerLoading({ compact = false }: { compact?: boolean }) {
  return (
    <main className="space-y-4 px-4 pb-28 pt-5">
      <PlannerHeading />
      <div className={`animate-pulse rounded-3xl bg-muted ${compact ? "h-32" : "h-64"}`} />
    </main>
  );
}

function PlannerMessage({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <main className="px-4 pb-28 pt-5">
      <section className="rounded-3xl border bg-card p-6 text-center shadow-sm">
        <AlertCircle className="mx-auto size-8 text-primary" />
        <h2 className="mt-3 text-lg font-bold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {onRetry && (
          <Button className="mt-5" variant="outline" onClick={onRetry}>
            <RefreshCw className="mr-2 size-4" />
            Try again
          </Button>
        )}
      </section>
    </main>
  );
}
