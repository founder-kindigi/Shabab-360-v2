"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffectiveCapabilities } from "@/hooks/use-effective-capabilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
type Stock = { id: string; parkId: string; itemId: string; quantity: number; minThreshold: number; park: { name: string }; item: { name: string; unit: string } };
type StockRequest = { id: string; quantity: number; reason: string; status: string; park: { name: string }; item: { name: string } };
type Order = { id: string; poNumber: string; quantity: number; status: string; supplierName: string; item: { name: string } };
async function read<T>(path: string): Promise<T> { const response = await fetch(path, { cache: "no-store" }); if (!response.ok) throw new Error("Procurement records could not be loaded"); return response.json(); }
export function ProcurementPage() {
  const { data: session } = useSession(); return <ProcurementWorkspace key={session?.user?.id ?? "signed-out"} />;
}
function ProcurementWorkspace() {
  const { data: session } = useSession(); const access = useEffectiveCapabilities(); const client = useQueryClient();
  const owner = session?.user?.id; const canView = access.has("organisation.view"); const canManage = access.has("organisation.manage");
  const [stockId, setStockId] = useState(""); const [quantity, setQuantity] = useState(""); const [reason, setReason] = useState(""); const [search, setSearch] = useState(""); const [page, setPage] = useState(1);
  const stocks = useQuery({ queryKey: ["procurement-stock", owner], queryFn: () => read<Stock[]>("/api/admin/procurement/stock"), enabled: canView });
  const requests = useQuery({ queryKey: ["procurement-requests", owner], queryFn: () => read<StockRequest[]>("/api/admin/procurement/requests"), enabled: canView });
  const orders = useQuery({ queryKey: ["procurement-orders", owner], queryFn: () => read<Order[]>("/api/admin/procurement/orders"), enabled: canView });
  const mutation = useMutation({ mutationFn: async (operation: { path: string; method: string; body: unknown }) => {
    const response = await fetch(operation.path, { method: operation.method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(operation.body) });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Request was not acknowledged. Refresh records before retrying.");
    if (!data?.id) throw new Error("Request acknowledgement was incomplete. Refresh records before retrying."); return data;
  }, onSuccess: () => { toast.success("Saved to procurement records"); setQuantity(""); setReason(""); client.invalidateQueries({ queryKey: ["procurement-requests"] }); }, onError: (error: Error) => toast.error(error.message) });
  if (access.isLoading) return <p>Loading permissions…</p>;
  if (!canView) return <p>Procurement is unavailable for this account.</p>;
  const filtered = (stocks.data ?? []).filter(stock => (stock.item.name + " " + stock.park.name).toLowerCase().includes(search.toLowerCase()));
  const selected = stocks.data?.find(stock => stock.id === stockId);
  return <section className="space-y-5 p-4 pb-28 max-w-4xl mx-auto"><h1 className="text-2xl font-bold">Procurement and stock</h1>
    <p>Order issuance and request approval do not increase stock. Receiving and fulfillment remain unavailable until the receipt workflow is approved.</p>
    <h2 className="text-lg font-semibold">Persisted stock balances</h2>
    <Input aria-label="Search stock" placeholder="Search item or park" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
    {stocks.isError ? <p role="alert">Stock could not be loaded. <Button onClick={() => stocks.refetch()}>Retry</Button></p> : stocks.isLoading ? <p>Loading stock…</p> : !filtered.length ? <p>No stock records in your scope.</p> : <>
      {filtered.slice((page - 1) * 20, page * 20).map(stock => <div key={stock.id} className="border rounded p-3"><strong>{stock.item.name}</strong><p>{stock.park.name} · {stock.quantity} {stock.item.unit} · minimum {stock.minThreshold}</p></div>)}
      <div className="flex gap-3 items-center"><Button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button><span>Page {page}</span><Button disabled={page * 20 >= filtered.length} onClick={() => setPage(p => p + 1)}>Next</Button></div>
    </>}
    {canManage && <form className="border rounded p-4 space-y-3" onSubmit={event => { event.preventDefault(); if (selected && !mutation.isPending) mutation.mutate({ path: "/api/admin/procurement/requests", method: "POST", body: { parkId: selected.parkId, itemId: selected.itemId, quantity: Number(quantity), reason } }); }}>
      <h2 className="font-semibold">Request stock replenishment</h2>
      <select aria-label="Item and park" className="w-full border rounded p-2" value={stockId} onChange={event => setStockId(event.target.value)} required><option value="">Select an existing stock item</option>{stocks.data?.map(stock => <option key={stock.id} value={stock.id}>{stock.park.name} — {stock.item.name}</option>)}</select>
      <Input aria-label="Requested quantity" type="number" min={1} max={1000000} step={1} value={quantity} onChange={event => setQuantity(event.target.value)} required />
      <Input aria-label="Request reason" minLength={5} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} required />
      <Button disabled={!selected || mutation.isPending}>Submit request</Button>
    </form>}
    <h2 className="text-lg font-semibold">Latest 100 requests</h2>
    {requests.isError ? <p role="alert">Requests could not be loaded. <Button onClick={() => requests.refetch()}>Retry</Button></p> : requests.isLoading ? <p>Loading requests…</p> : !requests.data?.length ? <p>No requests in your scope.</p> : requests.data.map(request => <div key={request.id} className="border rounded p-3 space-y-2"><strong>{request.item.name}</strong><p>{request.park.name} · {request.quantity} · {request.status}</p><p>{request.reason}</p>{canManage && request.status === "pending" && <div className="flex gap-2">{["approved", "rejected"].map(status => <Button key={status} variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ path: "/api/admin/procurement/requests/" + request.id, method: "PATCH", body: { status } })}>{status === "approved" ? "Approve" : "Reject"}</Button>)}</div>}</div>)}
    <h2 className="text-lg font-semibold">Latest 100 purchase orders</h2>
    {orders.isError ? <p role="alert">Orders could not be loaded. <Button onClick={() => orders.refetch()}>Retry</Button></p> : orders.isLoading ? <p>Loading orders…</p> : !orders.data?.length ? <p>No orders in your scope.</p> : orders.data.map(order => <div key={order.id} className="border rounded p-3"><strong>{order.poNumber}</strong><p>{order.item.name} · {order.quantity} · {order.supplierName} · {order.status}</p></div>)}
  </section>;
}
