"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Users, Plus, X, Loader2 } from "lucide-react";

type Member = {
  id: string;
  staffMetaId: string;
  title: string | null;
  isActive: boolean;
  assignedUntil: string | null;
  staffMeta?: { user?: { name?: string } };
};

export function EventTeamRoster({
  teamId,
  eventId,
  canManage,
}: {
  teamId: string;
  eventId: string;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [staffMetaId, setStaffMetaId] = useState("");

  const { data, isLoading } = useQuery<{ data: Member[] }>({
    queryKey: ["event-team-members", teamId],
    queryFn: () => fetch(`/api/admin/events/${eventId}/teams`).then((r) => r.json()),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/events/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffMetaId }),
      });
      if (!res.ok) throw new Error("Failed to add member");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Member added");
      setShowAdd(false);
      setStaffMetaId("");
      queryClient.invalidateQueries({ queryKey: ["event-team-members", teamId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch(`/api/admin/events/teams/${teamId}/members/${memberId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove member");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Member removed");
      queryClient.invalidateQueries({ queryKey: ["event-team-members", teamId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="size-4" /> Team Roster
        </CardTitle>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
            <Plus className="size-3.5 mr-1" /> Add Member
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading members...</p>}
        {data?.data?.length === 0 && <p className="text-sm text-muted-foreground">No members assigned.</p>}
        {data?.data?.map((m) => (
          <div key={m.id} className="flex items-center justify-between p-2 rounded-lg border">
            <div>
              <p className="text-sm font-medium">{m.staffMeta?.user?.name || m.staffMetaId.slice(0, 12)}</p>
              {m.title && <p className="text-xs text-muted-foreground">{m.title}</p>}
              {m.assignedUntil && new Date(m.assignedUntil) < new Date() && (
                <Badge variant="outline" className="text-[10px] text-red-500 border-red-200">Expired</Badge>
              )}
            </div>
            {canManage && (
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeMutation.mutate(m.id)}>
                <X className="size-3.5" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
      <Dialog open={showAdd} onOpenChange={(v) => !v && setShowAdd(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
          <Input placeholder="Staff Meta ID" value={staffMetaId} onChange={(e) => setStaffMetaId(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!staffMetaId || addMutation.isPending}>
              {addMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
