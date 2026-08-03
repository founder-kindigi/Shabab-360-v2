"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ImagePlus, Images, Plus, RefreshCw, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type City = { id: string; name: string };
type Context = { canView: boolean; canCreate: boolean; canManage: boolean; isHq: boolean; cityId: string | null; cities: City[]; mediaTeam: { id: string; name: string } | null };
type Brief = { id: string; title: string; description: string | null; status: string; mediaType: string; priority: string; dueAt: string | null; version: number; team: { name: string }; assignedToStaffMetaId?: string | null };
type BriefList = { data: Brief[]; total: number };
type Assignee = { id: string; name: string };
type Assignees = { data: Assignee[] };

const transitions: Record<string, string[]> = {
  draft: ["open", "cancelled"],
  open: ["in_progress", "cancelled"],
  in_progress: ["ready_for_review"],
  ready_for_review: ["approved", "revision_requested"],
  revision_requested: ["in_progress"],
  approved: ["delivered", "archived"],
  delivered: ["archived"],
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Request failed");
  return body as T;
}

function statusVariant(status: string) {
  if (status === "cancelled") return "destructive" as const;
  if (["approved", "delivered"].includes(status)) return "default" as const;
  return "secondary" as const;
}

function titleize(value: string) { return value.replaceAll("_", " "); }

export function MediaBriefsPage() {
  const queryClient = useQueryClient();
  const [cityId, setCityId] = useState("");
  const [status, setStatus] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState("graphic");
  const [priority, setPriority] = useState("medium");

  const contextQuery = useQuery<Context>({
    queryKey: ["media-ui-context", cityId],
    queryFn: () => api(`/api/admin/media/ui-context${cityId ? `?cityId=${encodeURIComponent(cityId)}` : ""}`),
    retry: false,
    staleTime: 60_000,
  });
  const context = contextQuery.data;
  const effectiveCityId = context?.cityId ?? "";
  const canFetch = Boolean(context?.canView && effectiveCityId);
  const listQuery = useQuery<BriefList>({
    queryKey: ["media-briefs", effectiveCityId, status],
    queryFn: () => {
      const params = new URLSearchParams({ cityId: effectiveCityId, pageSize: "50" });
      if (status !== "all") params.set("status", status);
      return api(`/api/admin/media/briefs?${params.toString()}`);
    },
    enabled: canFetch,
    staleTime: 15_000,
  });
  const detailQuery = useQuery<Brief>({
    queryKey: ["media-brief", selectedBriefId],
    queryFn: () => api(`/api/admin/media/briefs/${selectedBriefId}`),
    enabled: Boolean(selectedBriefId && canFetch),
    staleTime: 10_000,
  });
  const assigneesQuery = useQuery<Assignees>({
    queryKey: ["media-assignees", effectiveCityId],
    queryFn: () => api(`/api/admin/media/assignees${context?.isHq ? `?cityId=${encodeURIComponent(effectiveCityId)}` : ""}`),
    enabled: Boolean(selectedBriefId && context?.canManage && canFetch),
    staleTime: 60_000,
  });
  const createMutation = useMutation({
    mutationFn: () => api<Brief>("/api/admin/media/briefs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cityId: effectiveCityId, teamId: context?.mediaTeam?.id, title: title.trim(), description: description.trim() || undefined, mediaType, priority }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-briefs"] });
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      toast.success("Media brief created");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api<Brief>(`/api/admin/media/briefs/${selectedBriefId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...data, version: detailQuery.data?.version }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-briefs"] });
      queryClient.invalidateQueries({ queryKey: ["media-brief", selectedBriefId] });
      toast.success("Media brief updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (contextQuery.isLoading) return <LoadingState />;
  if (contextQuery.isError) return <AccessState title="Media access unavailable" detail={(contextQuery.error as Error).message} />;
  if (context?.isHq && !cityId) return <CityGate cities={context.cities} onSelect={setCityId} />;
  if (!context?.canView) return <AccessState title="Media access unavailable" detail="You do not have access to this city’s Media workspace." />;

  return <section className="space-y-5 p-4 sm:p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Header /><div className="flex gap-2"><Button variant="outline" size="icon" onClick={() => listQuery.refetch()} aria-label="Refresh briefs"><RefreshCw className="size-4" /></Button>{context.canCreate && context.mediaTeam && <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 size-4" />New brief</Button>}</div></div>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All statuses" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{Object.keys(transitions).concat(["archived"]).map((value) => <SelectItem key={value} value={value}>{titleize(value)}</SelectItem>)}</SelectContent></Select><p className="text-sm text-muted-foreground">{listQuery.data?.total ?? 0} brief(s)</p></div>
    {listQuery.isLoading ? <LoadingCards /> : listQuery.isError ? <AccessState title="Could not load briefs" detail={(listQuery.error as Error).message} /> : listQuery.data?.data.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{listQuery.data.data.map((brief) => <button key={brief.id} type="button" className="text-left" onClick={() => setSelectedBriefId(brief.id)}><Card className="h-full transition-colors hover:border-primary"><CardHeader className="space-y-2"><div className="flex items-start justify-between gap-2"><CardTitle className="text-base">{brief.title}</CardTitle><Badge variant={statusVariant(brief.status)}>{titleize(brief.status)}</Badge></div><CardDescription>{brief.team.name} · {brief.mediaType} · {brief.priority} priority</CardDescription></CardHeader>{brief.description && <CardContent><p className="line-clamp-3 text-sm text-muted-foreground">{brief.description}</p></CardContent>}</Card></button>)}</div> : <EmptyState />}
    <CreateDialog open={createOpen} onOpenChange={setCreateOpen} title={title} description={description} mediaType={mediaType} priority={priority} setTitle={setTitle} setDescription={setDescription} setMediaType={setMediaType} setPriority={setPriority} submit={() => createMutation.mutate()} disabled={!title.trim() || createMutation.isPending || !context.mediaTeam} />
    <DetailDialog open={Boolean(selectedBriefId)} onOpenChange={(open) => !open && setSelectedBriefId(null)} brief={detailQuery.data} loading={detailQuery.isLoading} canManage={context.canManage} assignees={assigneesQuery.data?.data ?? []} updating={updateMutation.isPending} update={(data) => updateMutation.mutate(data)} />
  </section>;
}

function Header() { return <div><h1 className="text-2xl font-semibold tracking-tight">Media Workspace</h1><p className="text-sm text-muted-foreground">Create and track city-scoped Media briefs.</p></div>; }
function LoadingState() { return <div className="space-y-4 p-4 sm:p-6"><div className="h-8 w-44 animate-pulse rounded bg-muted" /><div className="h-40 animate-pulse rounded-xl bg-muted" /></div>; }
function LoadingCards() { return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-xl bg-muted" />)}</div>; }
function EmptyState() { return <Card><CardContent className="flex flex-col items-center gap-3 py-14 text-center"><Images className="size-10 text-muted-foreground" /><div><p className="font-medium">No Media briefs found</p><p className="text-sm text-muted-foreground">Create a brief to begin the city’s Media workflow.</p></div></CardContent></Card>; }
function AccessState({ title, detail }: { title: string; detail: string }) { return <section className="mx-auto max-w-xl p-4 sm:p-6"><Card><CardContent className="flex flex-col items-center gap-3 py-14 text-center"><AlertCircle className="size-10 text-destructive" /><div><p className="font-medium">{title}</p><p className="text-sm text-muted-foreground">{detail}</p></div></CardContent></Card></section>; }
function CityGate({ cities, onSelect }: { cities: City[]; onSelect: (id: string) => void }) { return <section className="mx-auto max-w-xl space-y-5 p-4 sm:p-6"><Header /><Card><CardHeader><CardTitle>Select a city</CardTitle><CardDescription>Choose a city before viewing or creating Media briefs.</CardDescription></CardHeader><CardContent><Select onValueChange={onSelect}><SelectTrigger><SelectValue placeholder="Select a city" /></SelectTrigger><SelectContent>{cities.map((city) => <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>)}</SelectContent></Select></CardContent></Card></section>; }

function CreateDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; mediaType: string; priority: string; setTitle: (value: string) => void; setDescription: (value: string) => void; setMediaType: (value: string) => void; setPriority: (value: string) => void; submit: () => void; disabled: boolean }) {
  return <Dialog open={props.open} onOpenChange={props.onOpenChange}><DialogContent><DialogHeader><DialogTitle>New Media brief</DialogTitle><DialogDescription>Creates a draft for the server-approved Media team. External URLs are intentionally not accepted.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label htmlFor="media-title">Title</Label><Input id="media-title" value={props.title} onChange={(event) => props.setTitle(event.target.value)} maxLength={200} /></div><div className="space-y-2"><Label htmlFor="media-description">Description</Label><Textarea id="media-description" value={props.description} onChange={(event) => props.setDescription(event.target.value)} maxLength={5000} /></div><BriefSelects mediaType={props.mediaType} priority={props.priority} setMediaType={props.setMediaType} setPriority={props.setPriority} /></div><DialogFooter><Button variant="outline" onClick={() => props.onOpenChange(false)}>Cancel</Button><Button disabled={props.disabled} onClick={props.submit}><ImagePlus className="mr-2 size-4" />Create brief</Button></DialogFooter></DialogContent></Dialog>;
}
function BriefSelects({ mediaType, priority, setMediaType, setPriority }: { mediaType: string; priority: string; setMediaType: (value: string) => void; setPriority: (value: string) => void }) { return <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Type</Label><Select value={mediaType} onValueChange={setMediaType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["graphic", "video", "audio", "document", "photography", "other"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Priority</Label><Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["low", "medium", "high", "urgent"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div></div>; }

function DetailDialog({ open, onOpenChange, brief, loading, canManage, assignees, updating, update }: { open: boolean; onOpenChange: (open: boolean) => void; brief?: Brief; loading: boolean; canManage: boolean; assignees: Assignee[]; updating: boolean; update: (data: Record<string, unknown>) => void }) {
  const allowed = brief ? transitions[brief.status] ?? [] : [];
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{brief?.title ?? "Media brief"}</DialogTitle><DialogDescription>{brief ? `${brief.team.name} · ${brief.mediaType} · ${brief.priority} priority` : "Loading brief details"}</DialogDescription></DialogHeader>{loading ? <LoadingState /> : brief ? <div className="space-y-5"><div className="flex flex-wrap items-center gap-2"><Badge variant={statusVariant(brief.status)}>{titleize(brief.status)}</Badge>{brief.dueAt && <span className="text-sm text-muted-foreground">Due {new Date(brief.dueAt).toLocaleDateString()}</span>}</div>{brief.description && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{brief.description}</p>}{canManage && <div className="space-y-2"><Label htmlFor="media-assignee">Assignee</Label><Select value={brief.assignedToStaffMetaId ?? "unassigned"} onValueChange={(value) => update({ assignedToStaffMetaId: value === "unassigned" ? null : value })} disabled={updating}><SelectTrigger id="media-assignee"><SelectValue placeholder="Unassigned" /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{assignees.map((assignee) => <SelectItem key={assignee.id} value={assignee.id}>{assignee.name}</SelectItem>)}</SelectContent></Select></div>}{canManage && allowed.length > 0 && <div className="space-y-2"><Label>Lifecycle</Label><div className="flex flex-wrap gap-2">{allowed.map((next) => <Button key={next} variant={next === "cancelled" ? "destructive" : "outline"} size="sm" disabled={updating} onClick={() => update({ status: next })}>{titleize(next)}</Button>)}</div></div>}{canManage && !assignees.length && <p className="flex items-center gap-2 text-sm text-muted-foreground"><UserRound className="size-4" />No active Media team members are available to assign.</p>}</div> : <AccessState title="Brief unavailable" detail="This brief could not be loaded." />}<DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter></DialogContent></Dialog>;
}
