"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffectiveCapabilities } from "@/hooks/use-effective-capabilities";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  return <section className="space-y-4 p-4 pb-28 max-w-3xl mx-auto">
    {onBack && <Button variant="outline" onClick={onBack}>Back</Button>}<h1 className="text-2xl font-bold">Calling Desk</h1>
    {access.isLoading ? <p>Loading permissions…</p> : !access.has("calling.view") ? <p>Calling is unavailable for this account.</p> : <>
      {isHq && <div>{cities.isError ? <p role="alert">Cities could not be loaded. <button onClick={() => cities.refetch()}>Retry</button></p> : <select aria-label="Calling city" className="w-full border rounded p-2" value={cityId} onChange={e => { setCityId(e.target.value); setCampaignId(""); setSelected(null); setPage(1); }}><option value="">Select a city</option>{cities.data?.data?.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}</select>}</div>}
      {(!isHq || cityId) && (campaigns.isError ? <p role="alert">Campaigns could not be loaded. <button onClick={() => campaigns.refetch()}>Retry</button></p> : campaigns.isLoading ? <p>Loading campaigns…</p> : !campaigns.data?.length ? <p>No active campaigns in your scope.</p> : <div><select aria-label="Calling campaign" className="w-full border rounded p-2" value={campaignId} onChange={e => { setCampaignId(e.target.value); setSelected(null); setPage(1); }}><option value="">Select a campaign</option>{campaigns.data.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><p className="text-xs">Showing up to 100 recent active campaigns.</p></div>)}
      {selectedCampaign && <>
        <div className="flex gap-2"><select aria-label="Lead status" className="border rounded p-2" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>{["all", "pending", "in_progress", "completed"].map(s => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select><Input aria-label="Search this lead page" placeholder="Search this page" value={search} onChange={e => setSearch(e.target.value)} /></div>
        {leads.isError ? <p role="alert">Leads could not be loaded. <button onClick={() => leads.refetch()}>Retry</button></p> : leads.isLoading ? <p>Loading leads…</p> : !visible.length ? <p>No leads match on this page.</p> : visible.map(lead => <article key={lead.id} className="border rounded-xl p-4 space-y-2"><h2 className="font-semibold">{lead.application.applicantName}</h2><p>{lead.status.replaceAll("_", " ")} · {lead.callerName}</p>{lead.notes && <p>{lead.notes}</p>}<div className="flex gap-3">{lead.application.guardianPhone ? <a href={`tel:${lead.application.guardianPhone.replace(/[^+0-9]/g, "")}`}>Call {lead.application.guardianPhone}</a> : <span>No phone recorded</span>}<Button disabled={mutation.isPending} onClick={() => { setSelected(lead); setNotes(""); setCallback(""); setOutcome("reached"); }}>Log result</Button></div></article>)}
        <div className="flex items-center gap-3"><Button variant="outline" disabled={page <= 1 || leads.isFetching} onClick={() => setPage(p => p - 1)}>Previous</Button><span>Page {page}</span><Button variant="outline" disabled={leads.isFetching || (leads.data?.length ?? 0) < 20} onClick={() => setPage(p => p + 1)}>Next</Button></div>
        {selected && <form className="border rounded-xl p-4 space-y-3" onSubmit={e => { e.preventDefault(); if (!mutation.isPending) mutation.mutate(); }}><h2 className="font-bold">Log outcome for {selected.application.applicantName}</h2><select aria-label="Call outcome" className="w-full p-2 border rounded" value={outcome} onChange={e => setOutcome(e.target.value)}>{["reached", "no_answer", "busy", "wrong_number", "not_interested", "callback_requested"].map(o => <option key={o} value={o}>{o.replaceAll("_", " ")}</option>)}</select>{outcome === "callback_requested" && <Input aria-label="Callback date and time" type="datetime-local" value={callback} onChange={e => setCallback(e.target.value)} required />}<textarea aria-label="Interaction notes" className="w-full border rounded p-2" maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)} /><div className="flex gap-2"><Button type="submit" disabled={!online || mutation.isPending}>{mutation.isPending ? "Recording…" : "Save outcome"}</Button><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => setSelected(null)}>Cancel</Button></div>{!online && <p>Call outcomes require a connection.</p>}</form>}
        <h2 className="font-bold">Approved campaign scripts</h2>{templates.isError ? <p role="alert">Scripts could not be loaded. <button onClick={() => templates.refetch()}>Retry</button></p> : templates.isLoading ? <p>Loading scripts…</p> : !templates.data?.length ? <p>No approved scripts recorded for this campaign.</p> : templates.data.filter(t => t.status === "approved").map(t => <article key={t.id} className="border rounded p-3"><h3 className="font-semibold">{t.title}</h3><p className="whitespace-pre-wrap" dir="auto">{t.body}</p></article>)}
      </>}
    </>}
  </section>;
}
