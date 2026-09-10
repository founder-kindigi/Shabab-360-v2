"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useEffectiveCapabilities } from "@/hooks/use-effective-capabilities";
import { StudentProfilePage as ExtendedProfilePage } from "@/components/modules/student-profile/profile-page";
import { StudentProfilePage as SelfProfilePage } from "@/components/modules/student/student-profile-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props { participantId?: string | null; participantName?: string | null; effectiveRole: string; onBack: () => void; onSelectParticipant?: (id: string, name: string) => void }
type Entry = { id: string; name: string; group: { name: string; batch: { park: { id: string; name: string; city: { id: string } } } } };
async function readJson(url: string) { const response = await fetch(url, { cache: "no-store" }); if (!response.ok) throw new Error("Could not load profiles in your scope"); return response.json(); }

export function MobileStudentProfileView({ participantId, participantName, effectiveRole, onBack, onSelectParticipant }: Props) {
  const { data: session } = useSession();
  const access = useEffectiveCapabilities();
  const [selectedId, setSelectedId] = useState(participantId ?? "");
  const [view, setView] = useState<"overview" | "extended">("overview");
  const [search, setSearch] = useState("");
  const [parkId, setParkId] = useState("");
  const [page, setPage] = useState(1);
  const isSelf = effectiveRole === "student";
  const isStaff = ["super_admin", "program_admin", "city_head", "park_lead", "park_admin", "murabbi"].includes(effectiveRole);
  const self = useQuery({ queryKey: ["profile-self-identity", session?.user?.id], queryFn: () => readJson("/api/user/profile"), enabled: isSelf && Boolean(session?.user?.id) });
  const targetId = isSelf ? self.data?.participant?.id ?? "" : selectedId;
  const context = useQuery<{ id: string; name: string; cityId: string }>({ queryKey: ["profile-context", session?.user?.id, targetId], queryFn: () => readJson('/api/admin/students/' + targetId + '/profile-context'), enabled: Boolean(targetId && access.has("students.profile.view")) });
  const parks = useQuery<Array<{ id: string; name: string }>>({ queryKey: ["profile-parks", session?.user?.id], queryFn: () => readJson("/api/park/attendance/parks"), enabled: isStaff && !targetId && access.has("students.profile.view") });
  const directory = useQuery<{ data: Entry[]; pagination: { totalItems: number; totalPages: number } }>({
    queryKey: ["profile-directory", session?.user?.id, search, parkId, page],
    queryFn: () => readJson('/api/admin/students?' + new URLSearchParams({ search, parkId, page: String(page), pageSize: "20" })),
    enabled: isStaff && !targetId && access.has("students.profile.view"),
  });
  const capabilities = { canView: access.has("students.profile.view"), canManage: access.has("students.profile.manage"), canViewSensitive: access.has("students.profile.sensitive.view"), canManageSensitive: access.has("students.profile.sensitive.manage") };
  return <section className="max-w-xl mx-auto min-h-screen p-4 pb-28 space-y-4">
    <div className="flex items-center gap-3"><Button variant="ghost" onClick={() => selectedId && !participantId && !isSelf ? setSelectedId("") : onBack()}>Back</Button><h1 className="text-xl font-bold">{context.data?.name ?? participantName ?? "Shabab profiles"}</h1></div>
    {access.isLoading ? <p>Loading permissions…</p> : !capabilities.canView ? <p role="alert">Profile access is unavailable.</p> : targetId ? <>
      <div className="flex gap-2"><Button variant={view === "overview" ? "default" : "outline"} onClick={() => setView("overview")}>Overview</Button><Button variant={view === "extended" ? "default" : "outline"} onClick={() => setView("extended")}>Extended profile</Button></div>
      {context.isError ? <p role="alert">Profile could not be loaded. <button onClick={() => context.refetch()}>Retry</button></p> : !context.data ? <p>Loading profile…</p> : view === "extended" ? <ExtendedProfilePage key={session?.user?.id + targetId} participantId={targetId} cityId={context.data.cityId} capabilities={capabilities} /> : <SelfProfilePage participantId={targetId} isSelf={isSelf} />}
    </> : isSelf ? <p>{self.isError ? "Your linked profile could not be loaded." : self.isLoading ? "Loading your profile…" : "No participant profile is linked to this account."}</p> : !isStaff ? <p>Select a linked child from your dashboard.</p> : <>
      <Input aria-label="Search profiles" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or phone" maxLength={100} />
      <select aria-label="Filter by park" className="w-full border rounded p-2" value={parkId} onChange={e => { setParkId(e.target.value); setPage(1); }}><option value="">All authorized parks</option>{parks.data?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      {directory.isLoading ? <p>Loading profiles…</p> : directory.isError ? <p role="alert">Profiles could not be loaded. <button onClick={() => directory.refetch()}>Retry</button></p> : !directory.data?.data.length ? <p>No profiles match this search.</p> : directory.data.data.map(p => <button key={p.id} className="block w-full text-left border rounded-xl p-3" onClick={() => { setSelectedId(p.id); onSelectParticipant?.(p.id, p.name); }}><strong>{p.name}</strong><span className="block text-sm text-muted-foreground">{p.group.name} · {p.group.batch.park.name}</span></button>)}
      <div className="flex justify-between items-center"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button><span>Page {page} of {Math.max(1, directory.data?.pagination.totalPages ?? 1)}</span><Button variant="outline" disabled={page >= (directory.data?.pagination.totalPages ?? 1)} onClick={() => setPage(p => p + 1)}>Next</Button></div>
    </>}
  </section>;
}
