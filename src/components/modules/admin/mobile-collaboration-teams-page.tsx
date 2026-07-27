"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleUserRound, Plus, UsersRound, Building2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok)
    throw new Error(typeof data.error === "string" ? data.error : "Request failed");
  return data;
}

function roleLabel(role: string) {
  return role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function MobileCollaborationTeamsPage() {
  const queryClient = useQueryClient();
  const [selectedTeamId, setSelectedTeamId] = useState("");
  
  // Add Member form state
  const [addOpen, setAddOpen] = useState(false);
  const [staffMetaId, setStaffMetaId] = useState("");
  const [title, setTitle] = useState("");
  
  const [membershipToEnd, setMembershipToEnd] = useState<Membership | null>(null);

  const teams = useQuery<Team[]>({
    queryKey: ["collaboration-teams"],
    queryFn: () => request("/api/admin/collaboration-teams"),
    staleTime: 30000,
  });
  
  const staff = useQuery<{ data: StaffOption[] }>({
    queryKey: ["collaboration-team-staff"],
    queryFn: () => request("/api/admin/users?pageSize=100&status=active"),
    staleTime: 30000,
  });

  const selectedTeam = teams.data?.find((team) => team.id === selectedTeamId) ?? teams.data?.[0] ?? null;
  const activeTeamId = selectedTeam?.id ?? "";
  
  const memberships = useQuery<Membership[]>({
    queryKey: ["collaboration-team-members", activeTeamId],
    queryFn: () => request(`/api/admin/collaboration-teams/${activeTeamId}/members`),
    enabled: Boolean(activeTeamId),
    staleTime: 15000,
  });

  const addMember = useMutation({
    mutationFn: () =>
      request(`/api/admin/collaboration-teams/${activeTeamId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ staffMetaId, title: title.trim() || undefined }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaboration-teams"] });
      queryClient.invalidateQueries({ queryKey: ["collaboration-team-members", activeTeamId] });
      setStaffMetaId("");
      setTitle("");
      setAddOpen(false);
      toast.success("Team member added.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const endMembership = useMutation({
    mutationFn: (membership: Membership) =>
      request(`/api/admin/collaboration-teams/${activeTeamId}/members/${membership.id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaboration-teams"] });
      queryClient.invalidateQueries({ queryKey: ["collaboration-team-members", activeTeamId] });
      setMembershipToEnd(null);
      toast.success("Team membership ended.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const staffOptions = (staff.data?.data ?? []).filter((user) => user.isActive && user.staffMeta?.isActive);
  const assignedStaffIds = new Set((memberships.data ?? []).map((membership) => membership.staffMeta.id));

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pt-2 pb-3 border-b border-border/50 px-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate text-[#4B0A8F] dark:text-purple-300">Collab Teams</h1>
            <p className="text-xs text-muted-foreground truncate">
              Manage operational teams
            </p>
          </div>
          <Button
            onClick={() => setAddOpen(true)}
            className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white rounded-xl h-10 px-3"
            disabled={!selectedTeam}
          >
            <Plus className="size-4 mr-2" />
            <span className="text-sm font-semibold">Add</span>
          </Button>
        </div>

        {/* Team Selector on Mobile */}
        {teams.data && teams.data.length > 0 && (
          <div className="relative">
            <Select value={activeTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="w-full h-12 rounded-xl text-sm font-semibold bg-card">
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {teams.data.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    <div className="flex items-center justify-between w-full pr-4">
                      <span>{team.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 px-4 pt-4">
        {teams.isLoading ? (
          <p className="text-sm text-muted-foreground text-center">Loading teams...</p>
        ) : teams.isError ? (
          <p className="text-sm text-destructive text-center">Unable to load teams.</p>
        ) : teams.data?.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground rounded-2xl border bg-card">
            No collaboration teams available.
          </div>
        ) : selectedTeam ? (
          <>
            <div className="rounded-2xl border bg-primary/5 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Building2 className="size-5 text-[#4B0A8F] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">{selectedTeam.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedTeam.city.name}</p>
                </div>
              </div>
              {selectedTeam.description && (
                <p className="text-xs text-muted-foreground pl-7">{selectedTeam.description}</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-semibold text-sm">Active Members ({memberships.data?.length || 0})</h3>
              </div>

              {memberships.isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading members...</p>
              ) : memberships.isError ? (
                <p className="text-sm text-destructive text-center py-4">Unable to load members.</p>
              ) : memberships.data?.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground bg-card">
                  No active team members yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {memberships.data?.map((membership) => (
                    <div
                      key={membership.id}
                      className="flex flex-col gap-3 rounded-2xl border bg-card p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-[#F3ECF6] p-2.5 text-[#4B0A8F] shrink-0">
                          <CircleUserRound className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {membership.staffMeta.user.name || membership.staffMeta.user.email}
                          </p>
                          <p className="truncate text-xs text-muted-foreground mt-0.5">
                            {roleLabel(membership.staffMeta.role)}
                          </p>
                          {membership.title && (
                            <Badge variant="outline" className="mt-1.5 text-[10px] bg-muted/50 border-0 h-5 px-1.5 font-medium">
                              {membership.title}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 rounded-xl h-10 mt-1"
                        onClick={() => setMembershipToEnd(membership)}
                      >
                        End Membership
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
        
        <div className="h-6" />
      </div>

      {/* Add Member Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl p-6 sm:max-w-md mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Assign staff to {selectedTeam?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Staff member</Label>
              <Select value={staffMetaId} onValueChange={setStaffMetaId}>
                <SelectTrigger className="h-12 rounded-xl text-sm">
                  <SelectValue placeholder="Select active staff" />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-[250px]">
                  {staffOptions.map((user) => (
                    <SelectItem
                      key={user.staffMeta!.id}
                      value={user.staffMeta!.id}
                      disabled={assignedStaffIds.has(user.staffMeta!.id)}
                    >
                      {user.name || user.email} · {roleLabel(user.staffMeta!.role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-title" className="text-xs font-semibold">Responsibility title <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input
                id="team-title"
                value={title}
                maxLength={120}
                placeholder="e.g. Sports POC"
                onChange={(event) => setTitle(event.target.value)}
                className="h-12 rounded-xl text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-4 flex-row">
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
              className="h-12 rounded-xl flex-1 mt-0"
            >
              Cancel
            </Button>
            <Button
              className="bg-[#4B0A8F] text-white h-12 rounded-xl flex-1 mt-0"
              disabled={!staffMetaId || addMember.isPending}
              onClick={() => addMember.mutate()}
            >
              {addMember.isPending ? "Adding..." : "Add member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Membership Alert */}
      <AlertDialog open={Boolean(membershipToEnd)} onOpenChange={(open) => !open && setMembershipToEnd(null)}>
        <AlertDialogContent className="rounded-2xl p-6 sm:max-w-md mx-4 w-[calc(100%-2rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>End this team membership?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the active team assignment only. The historical assignment is retained.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 pt-2">
            <AlertDialogCancel disabled={endMembership.isPending} className="h-12 rounded-xl flex-1 mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={endMembership.isPending}
              onClick={(e) => { e.preventDefault(); membershipToEnd && endMembership.mutate(membershipToEnd); }}
              className="bg-red-600 text-white h-12 rounded-xl flex-1"
            >
              {endMembership.isPending ? "Ending..." : "End"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
