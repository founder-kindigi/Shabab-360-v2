"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useEffectiveCapabilities } from "@/hooks/use-effective-capabilities";
import { StudentProfilePage as ExtendedProfilePage } from "@/components/modules/student-profile/profile-page";
import { StudentProfilePage as SelfProfilePage } from "@/components/modules/student/student-profile-page";
import { Button } from "@/components/ui/button";
import { Users, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuleFrame, ModuleEmpty, ModuleSearch, ModuleTabs, moduleCard, moduleInput } from "@/components/modules/shared/module-presentation";

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
  return <ModuleFrame mobile title={context.data?.name ?? participantName ?? "Shabab profiles"} subtitle={targetId ? "Participant overview & extended profile" : "Select a Shabab to view their profile"} onBack={() => selectedId && !participantId && !isSelf ? setSelectedId("") : onBack()}>
    {access.isLoading ? <p>Loading permissions…</p> : !capabilities.canView ? <p role="alert">Profile access is unavailable.</p> : targetId ? <>
      <ModuleTabs tabs={[{ id: "overview", label: "Overview" }, { id: "extended", label: "Extended profile" }]} value={view} onChange={setView} />
      {context.isError ? <p role="alert">Profile could not be loaded. <button onClick={() => context.refetch()}>Retry</button></p> : !context.data ? <p>Loading profile…</p> : view === "extended" ? <ExtendedProfilePage key={session?.user?.id + targetId} participantId={targetId} cityId={context.data.cityId} capabilities={capabilities} /> : <SelfProfilePage participantId={targetId} isSelf={isSelf} />}
    </> : isSelf ? <p>{self.isError ? "Your linked profile could not be loaded." : self.isLoading ? "Loading your profile…" : "No participant profile is linked to this account."}</p> : !isStaff ? <p>Select a linked child from your dashboard.</p> : <>
      <ModuleSearch label="Search profiles" value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="Search Shabab by name or phone…" />
      <select aria-label="Filter by park" className={moduleInput} value={parkId} onChange={e => { setParkId(e.target.value); setPage(1); }}><option value="">All authorized parks</option>{parks.data?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      {directory.isLoading ? <p>Loading profiles…</p> : directory.isError ? <p role="alert">Profiles could not be loaded. <button onClick={() => directory.refetch()}>Retry</button></p> : !directory.data?.data.length ? <ModuleEmpty title="No profiles match this search." icon={Users} /> : directory.data.data.map(p => <button key={p.id} className={cn(moduleCard, "p-3 w-full text-left flex items-center gap-3 hover:border-purple-300 active:scale-[0.99] transition-all")} onClick={() => { setSelectedId(p.id); onSelectParticipant?.(p.id, p.name); }}><span className="size-10 rounded-full border border-purple-100 dark:border-white/10 bg-purple-100 dark:bg-purple-950/60 text-[#4B0A8F] dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">{p.name.slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><strong className="block text-sm">{p.name}</strong><span className="block text-[11px] text-slate-400 mt-1">{p.group.name} · {p.group.batch.park.name}</span></span><ChevronRight className="size-4 text-purple-500 shrink-0" /></button>)}
      <div className="flex justify-between items-center"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button><span>Page {page} of {Math.max(1, directory.data?.pagination.totalPages ?? 1)}</span><Button variant="outline" disabled={page >= (directory.data?.pagination.totalPages ?? 1)} onClick={() => setPage(p => p + 1)}>Next</Button></div>
    </>}
  </ModuleFrame>;
}
