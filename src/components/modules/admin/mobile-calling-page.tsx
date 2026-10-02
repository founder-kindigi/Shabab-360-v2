"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffectiveCapabilities } from "@/hooks/use-effective-capabilities";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneCall, Phone, FileText, ChevronDown, ChevronUp, RefreshCw, User } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ModuleFrame, ModuleEmpty, ModuleSearch, ModuleTabs, moduleCard, moduleInput, moduleAction } from "@/components/modules/shared/module-presentation";
import { toast } from "sonner";

type Campaign = { id: string; name: string; cityId: string; status: string };
type Lead = { id: string; status: string; notes: string | null; application: { applicantName: string; guardianPhone: string | null }; callerName: string };
type Template = { id: string; title: string; body: string; status: string };
async function read(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Calling records could not be loaded");
  return response.json();
}
export function MobileCallingPage({ onBack }: { onBack?: () => void }) {
  const { data: session } = useSession();
  return <CallingWorkspace key={session?.user?.id ?? "signed-out"} onBack={onBack} />;
}
function CallingWorkspace({ onBack }: { onBack?: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: session } = useSession(); const access = useEffectiveCapabilities();
  const online = useOnlineStatus(); const cache = useQueryClient();
  const owner = session?.user?.id;
  const isHq = ["super_admin", "program_admin"].includes(session?.user?.role ?? "");
  const [cityId, setCityId] = useState(""); const [campaignId, setCampaignId] = useState("");
  const [status, setStatus] = useState("all"); const [page, setPage] = useState(1); const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null); const [outcome, setOutcome] = useState("reached");
  const [notes, setNotes] = useState(""); const [callback, setCallback] = useState("");
  const cities = useQuery<{ data: { id: string; name: string }[] }>({ queryKey: ["calling-cities", owner], queryFn: () => read("/api/admin/cities"), enabled: isHq && access.has("calling.view") });
  const campaigns = useQuery<Campaign[]>({ queryKey: ["calling-campaigns", owner, cityId], queryFn: () => read("/api/calling/campaigns?status=active" + (cityId ? "&cityId=" + encodeURIComponent(cityId) : "")), enabled: access.has("calling.view") && (!isHq || Boolean(cityId)) });
  const selectedCampaign = campaigns.data?.find(c => c.id === campaignId);
  const leads = useQuery<Lead[]>({ queryKey: ["calling-leads", owner, campaignId, status, page], queryFn: () => read(`/api/calling/campaigns/${encodeURIComponent(campaignId)}/leads?status=${status}&page=${page}&pageSize=20`), enabled: access.has("calling.view") && Boolean(selectedCampaign) });
  const templates = useQuery<Template[]>({ queryKey: ["calling-templates", owner, campaignId], queryFn: () => read(`/api/calling/templates?status=approved&cityId=${encodeURIComponent(selectedCampaign!.cityId)}&campaignId=${encodeURIComponent(campaignId)}`), enabled: access.has("calling.view") && Boolean(selectedCampaign) });
  const mutation = useMutation({
    mutationFn: async () => {
      if (!online || !selected) throw new Error("Reconnect and select a lead before saving");
      if (outcome === "callback_requested" && !callback) throw new Error("Choose the agreed callback date and time");
      const body = { assignmentId: selected.id, outcome, notes, ...(outcome === "callback_requested" ? { scheduledFor: new Date(callback).toISOString() } : {}) };
      const response = await fetch("/api/calling/interactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.id) throw new Error(result?.error || "Call outcome was not acknowledged. Check the lead history before retrying.");
      return result;
    },
    onSuccess: () => { toast.success("Call outcome recorded"); setSelected(null); setNotes(""); setCallback(""); cache.invalidateQueries({ queryKey: ["calling-leads"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const visible = (leads.data ?? []).filter(lead => [lead.application.applicantName, lead.application.guardianPhone, lead.callerName].some(value => value?.toLowerCase().includes(search.toLowerCase())));
  return <ModuleFrame mobile onBack={onBack} title="Calling Desk" subtitle="Outreach pipeline • Campaign leads" actions={<button aria-label="Refresh calling records" className="p-2 rounded-full bg-slate-100 dark:bg-white/10" onClick={() => { void campaigns.refetch(); if (campaignId) void leads.refetch(); }}><RefreshCw className={cn("size-4", leads.isFetching && "animate-spin")} /></button>}>
    {access.isLoading ? <ModuleEmpty title="Loading permissions…" /> : !access.has("calling.view") ? <ModuleEmpty title="Calling is unavailable for this account." icon={PhoneCall} /> : <>
      <div className={cn(moduleCard, "p-4 space-y-3")}>
        {isHq && <label className="block space-y-1 text-xs font-bold">City<select aria-label="Calling city" className={moduleInput} value={cityId} onChange={e => { setCityId(e.target.value); setCampaignId(""); setPage(1); setSelected(null); }}><option value="">Select city</option>{cities.data?.data.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
        {cities.isError && <p role="alert" className="text-xs text-rose-600">Cities could not be loaded. <button onClick={() => cities.refetch()}>Retry</button></p>}
        {campaigns.isError ? <p role="alert">Campaigns could not be loaded. <button onClick={() => campaigns.refetch()}>Retry</button></p> : campaigns.isLoading ? <p>Loading campaigns…</p> : !campaigns.data?.length ? <p className="text-xs text-muted-foreground">{isHq && !cityId ? "Select a city to view its campaigns." : "No active campaigns in your scope."}</p> : <label className="block space-y-1 text-xs font-bold">Campaign<select aria-label="Calling campaign" className={moduleInput} value={campaignId} onChange={e => { setCampaignId(e.target.value); setPage(1); setSelected(null); setExpandedId(null); }}><option value="">Select campaign</option>{campaigns.data.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
      </div>
      {!selectedCampaign && <ModuleEmpty title="Choose a campaign" icon={PhoneCall}>Your assigned leads and approved scripts will appear here.</ModuleEmpty>}
      {selectedCampaign && <>
        <ModuleSearch label="Search calling leads" placeholder="Search by student, phone, or caller…" value={search} onChange={setSearch} />
        <ModuleTabs tabs={[{ id: "all", label: "All Leads" }, { id: "pending", label: "Pending" }, { id: "in_progress", label: "In progress" }, { id: "completed", label: "Completed" }]} value={status} onChange={value => { setStatus(value); setPage(1); }} />
        <p className="text-[10px] text-slate-400 px-1">Search applies to this page of leads.</p>
        {leads.isError ? <p role="alert">Leads could not be loaded. <button onClick={() => leads.refetch()}>Retry</button></p> : leads.isLoading ? <ModuleEmpty title="Loading calling leads…" /> : !leads.data?.length ? <ModuleEmpty title="No leads match this status." icon={PhoneCall} /> : leads.data.filter(lead => (lead.application.applicantName + (lead.application.guardianPhone ?? "") + lead.callerName).toLowerCase().includes(search.toLowerCase())).map(lead => <article key={lead.id} className={cn(moduleCard, "overflow-hidden")}>
          <button className="p-4 w-full text-left flex items-start gap-3" aria-expanded={expandedId === lead.id} onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}><span className="size-10 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 font-black text-sm flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900">{lead.application.applicantName.slice(0, 2).toUpperCase()}</span><span className="flex-1 min-w-0"><strong className="text-sm font-black block">{lead.application.applicantName}</strong><span className="text-[11px] text-muted-foreground block mt-1">{lead.application.guardianPhone || "No phone recorded"}</span><span className="text-[10px] text-[#4B0A8F] dark:text-purple-300 font-semibold flex gap-1 items-center mt-1"><User className="size-3" />{lead.callerName || "Unassigned"}</span></span><span className="flex flex-col items-end gap-3"><span className="text-[9px] font-bold rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-2 py-1">{lead.status.replaceAll("_", " ")}</span>{expandedId === lead.id ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}</span></button>
          {expandedId === lead.id && <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-white/10 pt-3">{lead.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>}<div className="flex gap-2">{lead.application.guardianPhone && <a className="flex-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 font-bold text-xs p-2.5 flex items-center justify-center gap-2" href={`tel:${lead.application.guardianPhone.replace(/[^+0-9]/g, "")}`}><Phone className="size-4" />Call</a>}<Button className={cn(moduleAction, "flex-1 text-xs")} disabled={mutation.isPending} onClick={() => { setSelected(lead); setNotes(""); setCallback(""); setOutcome("reached"); }}><PhoneCall className="size-3.5" />Log result</Button></div></div>}
        </article>)}
        <div className="flex items-center justify-between text-xs"><Button variant="ghost" disabled={page <= 1 || leads.isFetching} onClick={() => setPage(p => p - 1)}>Previous</Button><span>Page {page}</span><Button variant="ghost" disabled={leads.isFetching || (leads.data?.length ?? 0) < 20} onClick={() => setPage(p => p + 1)}>Next</Button></div>
        <div className={cn(moduleCard, "p-4 space-y-3")}><h2 className="font-bold text-sm flex items-center gap-2 text-[#4B0A8F] dark:text-purple-300"><FileText className="size-4" />Approved campaign scripts</h2>{templates.isError ? <p role="alert">Scripts could not be loaded. <button onClick={() => templates.refetch()}>Retry</button></p> : templates.isLoading ? <p>Loading scripts…</p> : !templates.data?.length ? <p className="text-xs text-muted-foreground">No approved scripts recorded for this campaign.</p> : templates.data.filter(t => t.status === "approved").map(t => <article key={t.id} className="rounded-xl p-3 bg-purple-50/60 dark:bg-white/5"><h3 className="font-bold text-xs">{t.title}</h3><p className="whitespace-pre-wrap text-xs leading-relaxed mt-2 text-muted-foreground" dir="auto">{t.body}</p></article>)}</div>
      </>}
      <Sheet open={Boolean(selected)} onOpenChange={open => { if (!open && !mutation.isPending) setSelected(null); }}><SheetContent side="bottom" className="rounded-t-3xl max-w-[460px] mx-auto max-h-[85dvh] overflow-y-auto"><SheetHeader><SheetTitle className="text-[#1F0860] dark:text-purple-200">Log call outcome</SheetTitle><SheetDescription>{selected?.application.applicantName}</SheetDescription></SheetHeader><form className="p-5 space-y-4" onSubmit={e => { e.preventDefault(); if (!mutation.isPending) mutation.mutate(); }}><label className="block space-y-1 text-xs font-bold">Outcome<select aria-label="Call outcome" className={moduleInput} value={outcome} onChange={e => setOutcome(e.target.value)}>{["reached", "no_answer", "busy", "wrong_number", "not_interested", "callback_requested"].map(o => <option key={o} value={o}>{o.replaceAll("_", " ")}</option>)}</select></label>{outcome === "callback_requested" && <Input aria-label="Callback date and time" type="datetime-local" value={callback} onChange={e => setCallback(e.target.value)} required />}<label className="block space-y-1 text-xs font-bold">Notes<textarea aria-label="Interaction notes" className={cn(moduleInput, "min-h-24")} maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)} /></label><div className="flex gap-2"><Button className={cn(moduleAction, "flex-1")} type="submit" disabled={!online || mutation.isPending}>{mutation.isPending ? "Recording…" : "Save outcome"}</Button><Button type="button" variant="outline" className="rounded-xl" disabled={mutation.isPending} onClick={() => setSelected(null)}>Cancel</Button></div>{!online && <p className="text-xs text-amber-700">Call outcomes require a connection.</p>}</form></SheetContent></Sheet>
    </>}
  </ModuleFrame>;
}
