"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleUserRound, ExternalLink, FileText, Plus, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TeamActivityPlanner } from "@/components/modules/admin/team-activity-planner";

type Team = {
  id: string;
  cityId: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  city: { id: string; name: string };
  _count: { memberships: number };
};

type Membership = {
  id: string;
  title: string | null;
  startedAt: string;
  staffMeta: {
    id: string;
    role: string;
    user: { id: string; name: string | null; email: string; isActive: boolean };
  };
};

type StaffOption = {
  id: string;
  name: string | null;
  email: string;
  isActive: boolean;
  staffMeta: { id: string; role: string; isActive: boolean } | null;
};

type CityItem = { id: string; name: string };
type TeamDocument = { id: string; label: string; url: string; createdAt: string };
type TeamDocumentsResponse = { data: TeamDocument[]; requireInterstitialWarning: boolean };

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Request failed");
  return data;
}

function roleLabel(role: string) {
  return role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function CollaborationTeamsPage() {
  const queryClient = useQueryClient();
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [staffMetaId, setStaffMetaId] = useState("");
  const [title, setTitle] = useState("");
  const [membershipToEnd, setMembershipToEnd] = useState<Membership | null>(null);
  const [cityId, setCityId] = useState("");
  const [documentLabel, setDocumentLabel] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [pendingExternalDocument, setPendingExternalDocument] = useState<TeamDocument | null>(null);

  const context = useQuery<{ canView: boolean; canManage: boolean; isHq: boolean }>({
    queryKey: ["teams-ui-context"],
    queryFn: () => request("/api/admin/teams/ui-context"),
    staleTime: 60000,
    retry: false,
  });
  const isHq = context.data?.isHq ?? false;
  const canManage = context.data?.canManage ?? false;

  // Cities (HQ only: pick a city; scoped: derive automatically)
  const cities = useQuery<{ data: CityItem[] }>({
    queryKey: ["collaboration-team-cities"],
    queryFn: () => request("/api/admin/cities"),
    staleTime: 60000,
    enabled: Boolean(context.data) && isHq,
  });

  // HQ must select the city explicitly; scoped users do not send cityId.
  const effectiveCityId = isHq ? cityId : "";

  // ── Teams ─────────────────────────────────────────────────────────────────
  const teamsQueryKey = ["collaboration-teams", effectiveCityId] as const;
  const teams = useQuery<Team[]>({
    queryKey: teamsQueryKey,
    queryFn: () => {
      const params = effectiveCityId ? `?cityId=${effectiveCityId}` : "";
      return request(`/api/admin/teams${params}`);
    },
    staleTime: 30000,
    enabled: Boolean(context.data) && (Boolean(effectiveCityId) || !isHq),
  });

  const staff = useQuery<{ data: StaffOption[] }>({
    queryKey: ["collaboration-team-staff"],
    queryFn: () => request("/api/admin/users?pageSize=100&status=active"),
    staleTime: 30000,
    enabled: canManage,
  });

  const selectedTeam = teams.data?.find((team) => team.id === selectedTeamId)
    ?? teams.data?.[0]
    ?? null;
  const activeTeamId = selectedTeam?.id ?? "";
  const memberships = useQuery<Membership[]>({
    queryKey: ["collaboration-team-members", activeTeamId],
    queryFn: () => request(`/api/admin/teams/${activeTeamId}/members`),
    enabled: Boolean(context.data) && Boolean(activeTeamId),
    staleTime: 15000,
  });
  const documents = useQuery<TeamDocumentsResponse>({
    queryKey: ["team-documents", activeTeamId],
    queryFn: () => request(`/api/admin/teams/${activeTeamId}/documents`),
    enabled: Boolean(context.data) && Boolean(activeTeamId),
    staleTime: 15000,
  });

  const addMember = useMutation({
    mutationFn: () => request(`/api/admin/teams/${activeTeamId}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ staffMetaId, title: title.trim() || undefined }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaboration-teams"] });
      queryClient.invalidateQueries({ queryKey: ["collaboration-team-members", activeTeamId] });
      setStaffMetaId("");
      setTitle("");
      toast.success("Team member added. Their role and hierarchy scope are unchanged.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const endMembership = useMutation({
    mutationFn: (membership: Membership) => request(
      `/api/admin/teams/${activeTeamId}/members/${membership.id}`,
      { method: "DELETE" }
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaboration-teams"] });
      queryClient.invalidateQueries({ queryKey: ["collaboration-team-members", activeTeamId] });
      setMembershipToEnd(null);
      toast.success("Team membership ended. The historical assignment is retained.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const addDocument = useMutation({
    mutationFn: () => request(`/api/admin/teams/${activeTeamId}/documents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: documentLabel.trim(), url: documentUrl.trim() }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-documents", activeTeamId] });
      setDocumentDialogOpen(false);
      setDocumentLabel("");
      setDocumentUrl("");
      toast.success("Document link added.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const staffOptions = (staff.data?.data ?? []).filter((user) => user.isActive && user.staffMeta?.isActive);
  const assignedStaffIds = new Set((memberships.data ?? []).map((membership) => membership.staffMeta.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-1 pb-6 space-y-6">
      <PageHeader
        title="Collaboration Teams"
        description="Manage operational team memberships. Teams never change login roles or city, park, and group scope."
      />

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex gap-3 p-4 text-sm">
          <UsersRound className="mt-0.5 size-5 shrink-0 text-primary" />
          <p>Only active staff in the team&apos;s city can be assigned. The server verifies city membership and records every add or end action in the audit log.</p>
        </CardContent>
      </Card>

      {isHq && (
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium shrink-0">City</Label>
          <Select value={effectiveCityId} onValueChange={(v) => { setCityId(v); setSelectedTeamId(""); }}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a city" />
            </SelectTrigger>
            <SelectContent>
              {(cities.data?.data ?? []).map((city) => (
                <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {context.isLoading ? <p className="text-sm text-muted-foreground">Verifying Teams access...</p> : context.isError ? <Card><CardContent className="py-10 text-center text-sm text-destructive">Teams access is unavailable.</CardContent></Card> : isHq && !effectiveCityId ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Select a city to view its collaboration teams.</CardContent></Card> : teams.isLoading ? <p className="text-sm text-muted-foreground">Loading collaboration teams...</p> : teams.isError ? <p className="text-sm text-destructive">Unable to load collaboration teams.</p> : !teams.data?.length ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No collaboration teams are available for this workspace.</CardContent></Card> : <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {teams.data?.map((team) => (
            <button
              key={team.id}
              onClick={() => setSelectedTeamId(team.id)}
              className={`rounded-xl border p-4 text-left transition-colors ${team.id === activeTeamId ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:bg-muted/50"}`}
            >
              <p className="text-sm font-semibold">{team.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{team.city.name}</p>
              <Badge variant="outline" className="mt-3">{team._count.memberships} active</Badge>
            </button>
          ))}
        </div>

        {selectedTeam && <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>{selectedTeam.name}</CardTitle>
              <CardDescription>{selectedTeam.description || `Operational team for ${selectedTeam.city.name}.`}</CardDescription>
            </CardHeader>
            <CardContent>
              {memberships.isLoading ? <p className="text-sm text-muted-foreground">Loading active members...</p> : memberships.isError ? <p className="text-sm text-destructive">Unable to load team members.</p> : !memberships.data?.length ? <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No active team members yet.</div> : <div className="space-y-3">
                {memberships.data?.map((membership) => <div key={membership.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                  <div className="flex min-w-0 items-center gap-3"><div className="rounded-full bg-muted p-2"><CircleUserRound className="size-4" /></div><div className="min-w-0"><p className="truncate text-sm font-medium">{membership.staffMeta.user.name || membership.staffMeta.user.email}</p><p className="truncate text-xs text-muted-foreground">{roleLabel(membership.staffMeta.role)}{membership.title ? ` · ${membership.title}` : ""}</p></div></div>
                  {canManage && <Button size="sm" variant="outline" onClick={() => setMembershipToEnd(membership)}>End membership</Button>}
                </div>)}
              </div>}
            </CardContent>
          </Card>

          {canManage && <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Team Member</CardTitle>
              <CardDescription>Only same-city active staff can be added.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Staff member</Label><Select value={staffMetaId} onValueChange={setStaffMetaId}><SelectTrigger className="mt-1"><SelectValue placeholder="Select active staff" /></SelectTrigger><SelectContent>{staffOptions.map((user) => <SelectItem key={user.staffMeta!.id} value={user.staffMeta!.id} disabled={assignedStaffIds.has(user.staffMeta!.id)}>{user.name || user.email} · {roleLabel(user.staffMeta!.role)}</SelectItem>)}</SelectContent></Select></div>
              <div><Label htmlFor="team-title">Responsibility title (optional)</Label><Input id="team-title" value={title} maxLength={120} placeholder="e.g. Sports POC" onChange={(event) => setTitle(event.target.value)} /></div>
              <Button className="w-full" disabled={!staffMetaId || addMember.isPending} onClick={() => addMember.mutate()}><Plus className="mr-2 size-4" />{addMember.isPending ? "Adding..." : "Add member"}</Button>
            </CardContent>
          </Card>}
        </div>}

        {selectedTeam && (
          <TeamActivityPlanner
            teamId={activeTeamId}
            members={(memberships.data ?? []).map((membership) => ({
              id: membership.id,
              title: membership.title,
              staffMeta: membership.staffMeta,
            }))}
          />
        )}

        {selectedTeam && <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div><CardTitle className="text-base">Team Documents</CardTitle><CardDescription>Approved external links for this team. Uploads are intentionally not enabled.</CardDescription></div>
            {canManage && <Button size="sm" onClick={() => setDocumentDialogOpen(true)}><Plus className="size-4" />Add link</Button>}
          </CardHeader>
          <CardContent>
            {documents.isLoading ? <p className="text-sm text-muted-foreground">Loading document links...</p> : documents.isError ? <p className="text-sm text-destructive">Unable to load team documents.</p> : !documents.data?.data.length ? <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">No approved document links yet.</p> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{documents.data.data.map((document) => <button key={document.id} type="button" onClick={() => documents.data?.requireInterstitialWarning ? setPendingExternalDocument(document) : window.open(document.url, "_blank", "noopener,noreferrer")} className="flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted/50"><FileText className="size-5 shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{document.label}</span><span className="block truncate text-xs text-muted-foreground">{new URL(document.url).hostname}</span></span><ExternalLink className="size-4 shrink-0 text-muted-foreground" /></button>)}</div>}
          </CardContent>
        </Card>}
      </>}

      <AlertDialog open={Boolean(membershipToEnd)} onOpenChange={(open) => !open && setMembershipToEnd(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>End this team membership?</AlertDialogTitle><AlertDialogDescription>This removes the active team assignment only. It does not change the staff member&apos;s role or hierarchy scope, and the membership history remains available for audit.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={endMembership.isPending}>Cancel</AlertDialogCancel><AlertDialogAction disabled={endMembership.isPending} onClick={() => membershipToEnd && endMembership.mutate(membershipToEnd)}>{endMembership.isPending ? "Ending..." : "End membership"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Add document link</DialogTitle><DialogDescription>Only approved HTTPS domains can be saved. Team members will see a warning before leaving Shabab 360 when that setting is enabled.</DialogDescription></DialogHeader><div className="space-y-4"><div><Label htmlFor="document-label">Label</Label><Input id="document-label" value={documentLabel} maxLength={120} onChange={(event) => setDocumentLabel(event.target.value)} placeholder="e.g. Week 1 training guide" /></div><div><Label htmlFor="document-url">HTTPS URL</Label><Input id="document-url" value={documentUrl} type="url" maxLength={2048} onChange={(event) => setDocumentUrl(event.target.value)} placeholder="https://drive.google.com/..." /></div></div><DialogFooter><Button variant="outline" onClick={() => setDocumentDialogOpen(false)}>Cancel</Button><Button disabled={!documentLabel.trim() || !documentUrl.trim() || addDocument.isPending} onClick={() => addDocument.mutate()}>{addDocument.isPending ? "Adding..." : "Add link"}</Button></DialogFooter></DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingExternalDocument)} onOpenChange={(open) => !open && setPendingExternalDocument(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Open external document?</AlertDialogTitle><AlertDialogDescription>This will open {pendingExternalDocument ? new URL(pendingExternalDocument.url).hostname : "an external website"} in a new tab. Only proceed if you trust the document.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (pendingExternalDocument) window.open(pendingExternalDocument.url, "_blank", "noopener,noreferrer"); setPendingExternalDocument(null); }}>Open document</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
