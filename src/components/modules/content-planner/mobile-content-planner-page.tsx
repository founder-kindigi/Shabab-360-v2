"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BookOpen, ChevronDown, Dumbbell, Heart, Lightbulb, MapPin, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { blocksForCategory, buildContentPlansUrl, choosePreferredPlan, choosePreferredSession } from "./content-planner-view-model";

type UiContext = { canView: boolean; isHq: boolean };
type City = { id: string; name: string };
type Plan = {
  id: string; name: string; kind: "template" | "override"; status: "draft" | "published" | "archived";
  city: { id: string; name: string }; park?: { id: string; name: string } | null; _count: { sessions: number };
};
type Session = {
  id: string; sessionDate: string; weekLabel: string | null; dayLabel: string | null; isOffDay: boolean;
  status: string; focusArea: string | null; _count: { blocks: number };
};
type PlanDetail = Plan & { sessions: Session[] };
type Block = {
  id: string; category: string; title: string | null; content: string;
  team: { id: string; name: string; code: string };
  resources: { id: string; label: string; url: string; kind: string }[];
};

const pillars = [
  { id: "tadreeb", label: "Tadreeb", Icon: Heart, tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  { id: "skills", label: "Skills", Icon: Lightbulb, tone: "bg-amber-50 text-amber-700 ring-amber-200" },
  { id: "sports", label: "Sports", Icon: Dumbbell, tone: "bg-sky-50 text-sky-700 ring-sky-200" },
  { id: "exercises", label: "Exercise", Icon: Sparkles, tone: "bg-violet-50 text-violet-700 ring-violet-200" },
] as const;

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Request failed");
  return body as T;
}

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(value));
}

/** Native PWA planner using the same server-scoped APIs as the admin workspace. */
export function MobileContentPlannerPage() {
  const [cityId, setCityId] = useState("");
  const [planId, setPlanId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activePillar, setActivePillar] = useState<(typeof pillars)[number]["id"]>("tadreeb");
  const [showPlans, setShowPlans] = useState(false);

  const contextQuery = useQuery<UiContext>({
    queryKey: ["pwa-content-planner-context"],
    queryFn: () => request("/api/admin/content-planner/ui-context"),
    staleTime: 60_000,
    retry: false,
  });
  const context = contextQuery.data;
  const citiesQuery = useQuery<{ data: City[] }>({
    queryKey: ["pwa-content-planner-cities"],
    queryFn: () => request("/api/admin/cities"),
    enabled: Boolean(context?.isHq),
    staleTime: 60_000,
  });
  const plansQuery = useQuery<{ plans: Plan[] }>({
    queryKey: ["pwa-content-planner-plans", context?.isHq ? cityId : "scoped"],
    queryFn: () => request(buildContentPlansUrl({ isHq: Boolean(context?.isHq), cityId, status: "published" })),
    enabled: Boolean(context?.canView) && (!context?.isHq || Boolean(cityId)),
    staleTime: 30_000,
  });

  useEffect(() => { setPlanId(null); setSessionId(null); }, [cityId]);
  const plans = plansQuery.data?.plans ?? [];
  const selectedPlanId = useMemo(() => planId && plans.some((plan) => plan.id === planId) ? planId : choosePreferredPlan(plans)?.id ?? null, [planId, plans]);
  const planQuery = useQuery<PlanDetail>({
    queryKey: ["pwa-content-planner-plan", selectedPlanId],
    queryFn: () => request(`/api/admin/content-planner/plans/${selectedPlanId}`),
    enabled: Boolean(context?.canView && selectedPlanId),
    staleTime: 30_000,
  });
  const plan = planQuery.data;
  const selectedSessionId = useMemo(() => sessionId && plan?.sessions.some((session) => session.id === sessionId) ? sessionId : choosePreferredSession(plan?.sessions ?? [])?.id ?? null, [plan?.sessions, sessionId]);
  const selectedSession = plan?.sessions.find((session) => session.id === selectedSessionId) ?? null;
  const blocksQuery = useQuery<{ blocks: Block[] }>({
    queryKey: ["pwa-content-planner-blocks", selectedSessionId],
    queryFn: () => request(`/api/admin/content-planner/blocks?sessionId=${selectedSessionId}&pageSize=50`),
    enabled: Boolean(context?.canView && selectedSessionId),
    staleTime: 30_000,
  });
  const categoryBlocks = blocksForCategory(blocksQuery.data?.blocks ?? [], activePillar);

  if (contextQuery.isLoading) return <PlannerLoading />;
  if (contextQuery.isError || !context?.canView) return <PlannerMessage title="Planner access unavailable" message="Your planner access could not be verified." onRetry={() => contextQuery.refetch()} />;
  if (context.isHq && !cityId) {
    return <main className="min-h-full space-y-5 px-4 pb-28 pt-5"><PlannerHeading /><section className="rounded-3xl border bg-card p-5 shadow-sm"><MapPin className="mb-3 size-8 text-primary" /><h2 className="text-lg font-bold">Choose a city</h2><p className="mt-1 text-sm text-muted-foreground">Select a city before loading its curriculum plans.</p><select aria-label="Select city" className="mt-5 h-12 w-full rounded-xl border bg-background px-3 text-sm font-medium" value={cityId} onChange={(event) => setCityId(event.target.value)}><option value="">Select a city</option>{(citiesQuery.data?.data ?? []).map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select></section></main>;
  }
  if (plansQuery.isLoading) return <PlannerLoading />;
  if (plansQuery.isError) return <PlannerMessage title="Could not load plans" message="Please retry loading the curriculum plans." onRetry={() => plansQuery.refetch()} />;
  if (!plans.length) return <PlannerMessage title="No published plan" message="There are no published curriculum plans in this scope yet." />;

  return <main className="min-h-full bg-background px-4 pb-28 pt-5"><PlannerHeading />
    <section className="mt-4 rounded-3xl border bg-card p-4 shadow-sm"><button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setShowPlans((open) => !open)}><span className="min-w-0"><span className="block truncate text-base font-bold">{plans.find((item) => item.id === selectedPlanId)?.name ?? "Select plan"}</span><span className="mt-1 block text-xs text-muted-foreground">{plans.length} published plan{plans.length === 1 ? "" : "s"} available</span></span><ChevronDown className={`size-5 shrink-0 text-muted-foreground transition-transform ${showPlans ? "rotate-180" : ""}`} /></button>{showPlans && <div className="mt-4 space-y-2 border-t pt-3">{plans.map((item) => <button key={item.id} type="button" onClick={() => { setPlanId(item.id); setSessionId(null); setShowPlans(false); }} className={`w-full rounded-2xl border p-3 text-left ${item.id === selectedPlanId ? "border-primary bg-primary/5" : "bg-background"}`}><p className="truncate text-sm font-semibold">{item.name}</p><p className="mt-1 text-xs text-muted-foreground">{item.city.name}{item.park ? ` · ${item.park.name}` : ""} · {item._count.sessions} sessions</p></button>)}</div>}</section>
    {planQuery.isLoading ? <PlannerLoading compact /> : planQuery.isError || !plan ? <PlannerMessage title="Could not open plan" message="Please retry opening this curriculum plan." onRetry={() => planQuery.refetch()} /> : <>
      <section className="mt-4 overflow-x-auto pb-1" aria-label="Curriculum sessions"><div className="flex min-w-max gap-2">{plan.sessions.map((session, index) => <button key={session.id} type="button" onClick={() => setSessionId(session.id)} className={`w-24 rounded-2xl border px-3 py-3 text-left transition-colors ${session.id === selectedSessionId ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card"}`}><span className="block text-[11px] font-medium opacity-80">{session.weekLabel ?? `Week ${index + 1}`}</span><span className="mt-1 block truncate text-sm font-bold">{session.dayLabel ?? formatSessionDate(session.sessionDate)}</span><span className="mt-1 block text-[10px] opacity-75">{session.isOffDay ? "Off day" : `${session._count.blocks} blocks`}</span></button>)}</div></section>
      {!selectedSession ? <PlannerMessage title="Choose a session" message="Tap a week above to open its activity plan." /> : <>
        <section className="mt-4 rounded-3xl bg-gradient-to-br from-primary to-violet-700 p-5 text-primary-foreground shadow-lg"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">{selectedSession.weekLabel ?? "Curriculum session"}</p><h2 className="mt-1 text-2xl font-extrabold">{selectedSession.dayLabel ?? formatSessionDate(selectedSession.sessionDate)}</h2><p className="mt-2 text-sm text-primary-foreground/80">{selectedSession.focusArea || "Live curriculum for this class."}</p></div><Badge className="border-white/20 bg-white/15 text-white hover:bg-white/15">{selectedSession.status}</Badge></div></section>
        <section className="mt-4" aria-label="Curriculum categories"><div className="grid grid-cols-4 gap-2">{pillars.map(({ id, label, Icon, tone }) => <button key={id} type="button" onClick={() => setActivePillar(id)} className={`flex min-h-20 flex-col items-center justify-center rounded-2xl border px-1 text-center text-[11px] font-bold transition-all ${id === activePillar ? `${tone} ring-1` : "bg-card text-muted-foreground"}`}><Icon className="mb-1 size-4" />{label}</button>)}</div></section>
        <section className="mt-4 space-y-3">{blocksQuery.isLoading ? <PlannerLoading compact /> : blocksQuery.isError ? <PlannerMessage title="Could not load session content" message="Retry to load curriculum blocks." onRetry={() => blocksQuery.refetch()} /> : categoryBlocks.length === 0 ? <PlannerMessage title="Nothing planned here yet" message="This category has no active content block for the selected session." /> : categoryBlocks.map((block) => <article key={block.id} className="rounded-3xl border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-primary">{block.team.name}</p><h3 className="mt-1 text-lg font-bold">{block.title || "Session activity"}</h3></div><BookOpen className="size-5 shrink-0 text-primary" /></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/85">{block.content}</p>{block.resources.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{block.resources.map((resource) => <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="rounded-full border px-3 py-1.5 text-xs font-semibold text-primary">{resource.label}</a>)}</div>}</article>)}</section>
      </>}
    </>}
  </main>;
}

function PlannerHeading() { return <header><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Today&apos;s curriculum</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight">Content Planner</h1><p className="mt-1 text-sm text-muted-foreground">Open the plan, choose a class, and lead it with confidence.</p></header>; }
function PlannerLoading({ compact = false }: { compact?: boolean }) { return <main className="space-y-4 px-4 pb-28 pt-5"><PlannerHeading /><div className={`animate-pulse rounded-3xl bg-muted ${compact ? "h-32" : "h-64"}`} /></main>; }
function PlannerMessage({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) { return <main className="px-4 pb-28 pt-5"><section className="rounded-3xl border bg-card p-6 text-center shadow-sm"><AlertCircle className="mx-auto size-8 text-primary" /><h2 className="mt-3 text-lg font-bold">{title}</h2><p className="mt-2 text-sm text-muted-foreground">{message}</p>{onRetry && <Button className="mt-5" variant="outline" onClick={onRetry}><RefreshCw className="mr-2 size-4" />Try again</Button>}</section></main>; }
