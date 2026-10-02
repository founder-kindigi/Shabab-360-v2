"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffectiveCapabilities } from "@/hooks/use-effective-capabilities";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Clock, Receipt, Percent, RefreshCw, CreditCard, ChevronRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuleFrame, ModuleMetric, ModuleEmpty, ModuleSearch, ModuleTabs, moduleCard, moduleInput, moduleAction } from "@/components/modules/shared/module-presentation";
import { toast } from "sonner";

type Fee = { id: string; title: string; amount: number; totalPaid: number; totalExpected: number };
type Balance = { id: string; name: string; remaining: number; totalPaid: number };
type Payment = { id: string; amount: number; receiptNo: string; method: string; participant: { name: string } };
async function read(url: string) { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error("Fee records could not be loaded"); return r.json(); }
export function FeesPage({ mobile = false, onBack }: { mobile?: boolean; onBack?: () => void } = {}) {
  const { data: session } = useSession();
  return <FeesWorkspace key={session?.user?.id ?? "signed-out"} mobile={mobile} onBack={onBack} />;
}
function FeesWorkspace({ mobile, onBack }: { mobile: boolean; onBack?: () => void }) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("balances");
  const { data: session } = useSession(); const access = useEffectiveCapabilities(); const online = useOnlineStatus(); const client = useQueryClient();
  const [page, setPage] = useState(1); const [feeId, setFeeId] = useState(""); const [participantId, setParticipantId] = useState(""); const [amount, setAmount] = useState(""); const [method, setMethod] = useState("cash"); const [receipt, setReceipt] = useState<Payment | null>(null);
  const owner = session?.user?.id ?? "";
  const [hasPending, setHasPending] = useState(false);
  const storageKey = "shabab-payment-attempt:" + owner;
  useEffect(() => {
    try { setHasPending(Boolean(localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey))); } catch { /* Recording reports storage errors before sending. */ }
  }, [storageKey]);
  const fees = useQuery<{ data: Fee[]; pagination: { totalPages: number } }>({ queryKey: ["fee-workspace", owner, page], queryFn: () => read('/api/admin/fees?pageSize=20&page=' + page), enabled: access.has("fees.manage") });
  const detail = useQuery<{ payments: Payment[]; unpaidParticipants: Balance[] }>({ queryKey: ["fee-workspace-payments", owner, feeId], queryFn: () => read('/api/admin/fees/' + feeId + '/payments'), enabled: Boolean(feeId && access.has("fees.manage")) });
  const payment = useMutation({
    mutationFn: async (retryPending: boolean) => {
      if (!online) throw new Error("Reconnect before recording a payment");
      if (!owner) throw new Error("Sign in before recording a payment");
      if (!navigator.locks) throw new Error("This browser cannot safely coordinate payments. Use a browser with Web Locks support.");
      return navigator.locks.request(storageKey, { ifAvailable: true }, async lock => {
      if (!lock) throw new Error("A payment is being confirmed in another tab. Wait for its receipt before continuing.");
      const raw = localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey);
      const pending = raw ? JSON.parse(raw) : null;
      const original = retryPending && pending ? JSON.parse(pending.fingerprint) : null;
      const targetFeeId = original?.[0] ?? feeId;
      const body = original?.[1] ?? { participantId, amount: Number(amount), method };
      if (!targetFeeId || !body.participantId || !Number.isFinite(body.amount) || body.amount <= 0) throw new Error("Select a participant and enter a valid amount");
      const fingerprint = JSON.stringify([targetFeeId, body]);
      if (pending && pending.fingerprint !== fingerprint) throw new Error("Confirm the pending payment before starting another payment.");
      const key = pending?.key ?? crypto.randomUUID();
      localStorage.setItem(storageKey, JSON.stringify({ fingerprint, key })); setHasPending(true);
      const r = await fetch('/api/admin/fees/' + targetFeeId + '/payments', { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(body) });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        if (r.status === 400) { localStorage.removeItem(storageKey); sessionStorage.removeItem(storageKey); setHasPending(false); }
        const error = typeof data?.error === "string" ? data.error : data?.error ? Object.values(data.error).flat().join("; ") : "Payment was not acknowledged. Retry the same details.";
        throw new Error(error);
      }
      if (!data?.id || !data.receiptNo) throw new Error("Payment acknowledgement incomplete; retry the same details");
      localStorage.removeItem(storageKey); sessionStorage.removeItem(storageKey); setHasPending(false); return data as Payment;
      });
    },
    onSuccess: data => { setReceipt(data); setAmount(""); setParticipantId(""); client.invalidateQueries({ queryKey: ["fee-workspace"] }); client.invalidateQueries({ queryKey: ["fee-workspace-payments"] }); toast.success("Payment recorded: " + data.receiptNo); },
    onError: (error: Error) => toast.error(error.message),
  });
  const selectedFee = fees.data?.data.find(f => f.id === feeId);
  const collected = selectedFee?.totalPaid;
  const expected = selectedFee?.totalExpected;
  const money = (n: number | undefined) => n === undefined ? "—" : "PKR " + Number(n).toLocaleString();
  const rate = expected && collected !== undefined ? Math.round(collected / expected * 100) + "%" : "—";
  return <ModuleFrame mobile={mobile} onBack={onBack} title="Fees Desk" subtitle="Cohort accounts • Payments & receipts" actions={<button aria-label="Refresh fees" className="rounded-full p-2 bg-slate-100 dark:bg-white/10" onClick={() => { void fees.refetch(); if (feeId) void detail.refetch(); }}><RefreshCw className={cn("size-4", fees.isFetching && "animate-spin")} /></button>}>
    <div className="grid grid-cols-3 gap-2"><ModuleMetric label="Collected" value={money(collected)} icon={Wallet} tone="emerald" /><ModuleMetric label="Pending" value={money(expected !== undefined && collected !== undefined ? Math.max(0, expected - collected) : undefined)} icon={Clock} tone="amber" /><ModuleMetric label="Collection rate" value={rate} icon={Percent} /></div>
    <p className="text-[10px] text-slate-500 px-1">{selectedFee ? `Totals for ${selectedFee.title}` : "Choose a fee event to view its recorded totals."}</p>
    {hasPending && access.has("fees.manage") && <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3"><p className="text-xs text-amber-900 dark:text-amber-200">A payment is awaiting confirmation. Retry its saved details to retrieve the receipt.</p><Button className={moduleAction} disabled={!online || payment.isPending} onClick={() => payment.mutate(true)}>Confirm pending payment</Button></div>}
    {receipt && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-4 flex gap-3"><CheckCircle2 className="size-5 text-emerald-600 shrink-0" /><p className="text-sm">Recorded receipt: <strong>{receipt.receiptNo}</strong> · {money(receipt.amount)}</p></div>}
    {access.isLoading ? <ModuleEmpty title="Loading permissions…" /> : !access.has("fees.manage") ? <ModuleEmpty title="Fee management is unavailable for this account." /> : <>
      <div className={cn(moduleCard, "p-4 space-y-3")}><label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Fee event</label>
        {fees.isError ? <p role="alert">Fee records could not be loaded. <button onClick={() => fees.refetch()}>Retry</button></p> : fees.isLoading ? <p>Loading fee events…</p> : !fees.data?.data.length ? <p className="text-sm text-muted-foreground">No fee events in your scope.</p> : <select aria-label="Fee event" className={moduleInput} value={feeId} onChange={e => { setFeeId(e.target.value); setParticipantId(""); setAmount(""); setReceipt(null); }}><option value="">Select a fee event</option>{fees.data.data.map(f => <option key={f.id} value={f.id}>{f.title} — Rs. {f.amount}</option>)}</select>}
        <div className="flex items-center justify-between text-xs"><Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button><span>Page {page}</span><Button size="sm" variant="ghost" disabled={page >= (fees.data?.pagination.totalPages ?? 1)} onClick={() => setPage(p => p + 1)}>Next</Button></div>
      </div>
      {!feeId && <ModuleEmpty title="Your fee events" icon={Receipt}>Select an event to review outstanding balances and recorded receipts.</ModuleEmpty>}
      {feeId && (detail.isLoading ? <ModuleEmpty title="Loading balances…" /> : detail.isError ? <p role="alert">Balances could not be loaded. <button onClick={() => detail.refetch()}>Retry</button></p> : <>
        <ModuleSearch label="Search fee records" placeholder="Search by student name or receipt…" value={search} onChange={setSearch} />
        <ModuleTabs tabs={[{ id: "balances", label: "Outstanding" }, { id: "receipts", label: "Paid & receipts" }, { id: "record", label: "Record payment" }]} value={tab} onChange={setTab} />
        {tab === "balances" && <div className="space-y-2.5">{detail.data?.unpaidParticipants.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => <button key={p.id} onClick={() => { setParticipantId(p.id); setAmount(""); setTab("record"); }} className={cn(moduleCard, "p-4 w-full flex items-center gap-3 text-left hover:border-purple-300")}><span className="size-10 shrink-0 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600"><Clock className="size-5" /></span><span className="min-w-0 flex-1"><strong className="text-sm block">{p.name}</strong><span className="text-[11px] text-slate-500">Paid {money(p.totalPaid)}</span></span><span className="text-right"><span className="block text-sm font-black text-[#4B0A8F] dark:text-purple-300">{money(p.remaining)}</span><span className="text-[10px] text-amber-600 font-bold">Outstanding</span></span><ChevronRight className="size-4 text-slate-400 shrink-0" /></button>)}{!detail.data?.unpaidParticipants.length && <ModuleEmpty title="No outstanding balances" icon={CheckCircle2}>All recorded balances for this event are settled.</ModuleEmpty>}</div>}
        {tab === "receipts" && <div className="space-y-2.5">{detail.data?.payments.filter(p => (p.participant.name + p.receiptNo).toLowerCase().includes(search.toLowerCase())).map(p => <article key={p.id} className={cn(moduleCard, "p-4 flex items-center gap-3")}><span className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 text-emerald-600"><Receipt className="size-5" /></span><div className="flex-1 min-w-0"><h2 className="font-bold text-sm">{p.participant.name}</h2><p className="text-[11px] text-slate-500 break-all">Receipt {p.receiptNo} · {p.method}</p></div><strong className="text-sm text-emerald-700 dark:text-emerald-400">{money(p.amount)}</strong></article>)}{!detail.data?.payments.length && <ModuleEmpty title="No payments recorded." icon={Receipt} />}</div>}
        <form className={cn(moduleCard, "p-5 space-y-4", tab !== "record" && "hidden")} onSubmit={e => { e.preventDefault(); if (!payment.isPending) payment.mutate(false); }}>
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/10 pb-3"><span className="p-2.5 bg-purple-50 dark:bg-white/5 text-[#4B0A8F] rounded-xl"><CreditCard className="size-5" /></span><div><h2 className="font-bold text-sm">Record a received payment</h2><p className="text-[11px] text-muted-foreground">A receipt is shown after the payment is confirmed.</p></div></div>
          <label className="block space-y-1 text-xs font-bold">Participant<select aria-label="Participant" className={moduleInput} value={participantId} onChange={e => { setParticipantId(e.target.value); setAmount(""); }} required><option value="">Select an outstanding balance</option>{detail.data?.unpaidParticipants.map(p => <option key={p.id} value={p.id}>{p.name} — remaining Rs. {p.remaining}</option>)}</select></label>
          <label className="block space-y-1 text-xs font-bold">Amount received<Input className="rounded-xl h-11" aria-label="Payment amount" type="number" min="0.01" max={detail.data?.unpaidParticipants.find(p => p.id === participantId)?.remaining} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required /></label>
          <label className="block space-y-1 text-xs font-bold">Payment method<select aria-label="Payment method" className={moduleInput} value={method} onChange={e => setMethod(e.target.value)}>{["cash", "bank", "online", "other"].map(m => <option key={m}>{m}</option>)}</select></label>
          <Button className={cn(moduleAction, "w-full h-11 gap-2")} type="submit" disabled={!online || payment.isPending || !participantId || hasPending}><Receipt className="size-4" />{payment.isPending ? "Recording…" : "Record payment"}</Button>{!online && <p className="text-xs text-amber-700">Payment recording requires a connection.</p>}
        </form>
      </>)}
    </>}
  </ModuleFrame>;
}
