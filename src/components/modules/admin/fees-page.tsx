"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffectiveCapabilities } from "@/hooks/use-effective-capabilities";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Fee = { id: string; title: string; amount: number; totalPaid: number; totalExpected: number };
type Balance = { id: string; name: string; remaining: number; totalPaid: number };
type Payment = { id: string; amount: number; receiptNo: string; method: string; participant: { name: string } };
async function read(url: string) { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error("Fee records could not be loaded"); return r.json(); }
export function FeesPage() {
  const { data: session } = useSession();
  return <FeesWorkspace key={session?.user?.id ?? "signed-out"} />;
}
function FeesWorkspace() {
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
  return <section className="space-y-4"><h1 className="text-xl font-bold">Fees and receipts</h1>
    {hasPending && access.has("fees.manage") && <div role="alert" className="border rounded p-3 space-y-2"><p>A payment is awaiting confirmation. Retry its saved details to retrieve the receipt.</p><Button disabled={!online || payment.isPending} onClick={() => payment.mutate(true)}>Confirm pending payment</Button></div>}
    {receipt && <p role="status">Recorded receipt: <strong>{receipt.receiptNo}</strong> · Rs. {receipt.amount}</p>}
    {access.isLoading ? <p>Loading permissions…</p> : !access.has("fees.manage") ? <p>Fee management is unavailable for this account.</p> : <>
      {fees.isError ? <p role="alert">Fee records could not be loaded. <button onClick={() => fees.refetch()}>Retry</button></p> : fees.isLoading ? <p>Loading fee events…</p> : !fees.data?.data.length ? <p>No fee events in your scope.</p> : <select aria-label="Fee event" className="w-full p-2 border rounded" value={feeId} onChange={e => { setFeeId(e.target.value); setParticipantId(""); setAmount(""); setReceipt(null); }}><option value="">Select a fee event</option>{fees.data.data.map(f => <option key={f.id} value={f.id}>{f.title} — Rs. {f.amount}</option>)}</select>}
      <div className="flex gap-3"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button><span>Page {page}</span><Button variant="outline" disabled={page >= (fees.data?.pagination.totalPages ?? 1)} onClick={() => setPage(p => p + 1)}>Next</Button></div>
      {feeId && (detail.isLoading ? <p>Loading balances…</p> : detail.isError ? <p role="alert">Balances could not be loaded. <button onClick={() => detail.refetch()}>Retry</button></p> : <>
        <form className="border rounded-xl p-4 space-y-3" onSubmit={e => { e.preventDefault(); if (!payment.isPending) payment.mutate(false); }}><h2 className="font-semibold">Record a received payment</h2>
          <select aria-label="Participant" className="w-full border rounded p-2" value={participantId} onChange={e => { setParticipantId(e.target.value); setAmount(""); }} required><option value="">Select an outstanding balance</option>{detail.data?.unpaidParticipants.map(p => <option key={p.id} value={p.id}>{p.name} — remaining Rs. {p.remaining}</option>)}</select>
          <Input aria-label="Payment amount" type="number" min="0.01" max={detail.data?.unpaidParticipants.find(p => p.id === participantId)?.remaining} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
          <select aria-label="Payment method" className="w-full border rounded p-2" value={method} onChange={e => setMethod(e.target.value)}>{["cash", "bank", "online", "other"].map(m => <option key={m}>{m}</option>)}</select>
          <Button type="submit" disabled={!online || payment.isPending || !participantId || hasPending}>{payment.isPending ? "Recording…" : "Record payment"}</Button>{!online && <p>Payment recording requires a connection.</p>}
        </form>
        {receipt && <div role="status" className="border rounded p-4">Recorded receipt: <strong>{receipt.receiptNo}</strong> · Rs. {receipt.amount}</div>}
        <h2 className="font-semibold">Persisted payments</h2>{!detail.data?.payments.length ? <p>No payments recorded.</p> : detail.data.payments.map(p => <div key={p.id} className="border rounded p-3"><strong>{p.participant.name}</strong><p>Rs. {p.amount} · {p.method} · Receipt {p.receiptNo}</p></div>)}
      </>)}
    </>}
  </section>;
}
