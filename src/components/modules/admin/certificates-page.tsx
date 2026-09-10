"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffectiveCapabilities } from "@/hooks/use-effective-capabilities";
async function read(url: string) { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error("Certificate preview could not be loaded"); return r.json(); }
export function CertificatesPage() {
  const { data: session } = useSession(); const access = useEffectiveCapabilities();
  const [selected, setSelected] = useState(""); const [search, setSearch] = useState(""); const [page, setPage] = useState(1);
  const people = useQuery<{ data: { id: string; name: string }[]; pagination: { totalPages: number } }>({ queryKey: ["certificate-people", session?.user?.id, search, page], queryFn: () => read('/api/admin/students?' + new URLSearchParams({ search, page: String(page), pageSize: "20" })), enabled: access.has("reports.view") && access.has("students.profile.view") });
  const preview = useQuery({ queryKey: ["certificate-preview", session?.user?.id, selected], queryFn: () => read('/api/admin/certificates/' + selected), enabled: Boolean(selected && access.has("reports.view")) });
  return <section className="space-y-4"><h1 className="text-xl font-bold">Certificate preview</h1><p>Preview participant details from the current records. Certificate issuance, verification numbers, and sharing are currently unavailable.</p>
    {!access.has("reports.view") ? <p>Certificate access is unavailable.</p> : <>
      <Input aria-label="Search participants" value={search} maxLength={100} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search participants" />
      {people.isError ? <p role="alert">The participant list could not be loaded. <button onClick={() => people.refetch()}>Retry</button></p> : people.isLoading ? <p>Loading participants…</p> : !people.data?.data.length ? <p>No matching participants.</p> : <div className="flex flex-wrap gap-2">{people.data.data.map(p => <Button key={p.id} variant="outline" onClick={() => setSelected(p.id)}>{p.name}</Button>)}</div>}
      <div className="flex gap-3"><Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button><span>Page {page}</span><Button variant="outline" disabled={page >= (people.data?.pagination.totalPages ?? 1)} onClick={() => setPage(p => p + 1)}>Next</Button></div>
      {selected && (preview.isLoading ? <p>Loading preview…</p> : preview.isError ? <p role="alert">Preview could not be loaded.</p> : preview.data && <article className="border rounded-xl p-6 space-y-2"><h2 className="font-bold text-lg">Draft — not issued</h2><p>{preview.data.participant}</p><p>{preview.data.group} · {preview.data.batch}</p><p>{preview.data.park} · {preview.data.city}</p><p>Attendance: {preview.data.attendanceRate}% across {preview.data.totalEvents} eligible sessions</p><p>Batch end date: {preview.data.batchEndDate ?? "Not recorded"}</p></article>)}
    </>}
  </section>;
}
