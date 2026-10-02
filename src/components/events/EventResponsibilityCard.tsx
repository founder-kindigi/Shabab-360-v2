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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, Plus, Loader2, RotateCcw, Clock, Ban } from "lucide-react";

type Responsibility = {
  id: string;
  title: string;
  description: string | null;
  assignedToStaffMetaId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  revokedAt: string | null;
};

export function EventResponsibilityCard({
  eventId,
  canManage,
  cityId,
}: {
  eventId: string;
  canManage: boolean;
  cityId?: string;
}) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("Calling POC");
  const [staffMetaId, setStaffMetaId] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading } = useQuery<{ data: Responsibility[] }>({
    queryKey: ["event-responsibilities", eventId],
    queryFn: () => fetch(`/api/admin/events/${eventId}/responsibilities`).then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/events/${eventId}/responsibilities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, assignedToStaffMetaId: staffMetaId, startDate: new Date().toISOString(), endDate: new Date(endDate).toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to create responsibility");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Responsibility assigned");
      setShowCreate(false);
      setStaffMetaId("");
      setEndDate("");
      queryClient.invalidateQueries({ queryKey: ["event-responsibilities", eventId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeMutation = useMutation({
    mutationFn: async (respId: string) => {
      const res = await fetch(`/api/admin/events/responsibilities/${respId}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Revoked by manager" }),
      });
      if (!res.ok) throw new Error("Failed to revoke");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Responsibility revoked");
      queryClient.invalidateQueries({ queryKey: ["event-responsibilities", eventId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const now = new Date();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="size-4" /> Responsibilities
        </CardTitle>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
            <Plus className="size-3.5 mr-1" /> Assign
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {data?.data?.length === 0 && <p className="text-sm text-muted-foreground">No responsibilities assigned.</p>}
        {data?.data?.map((r) => {
          const isExpired = new Date(r.endDate) < now;
          const isRevoked = !!r.revokedAt;
          const isActive = r.isActive && !isExpired && !isRevoked;
          return (
            <div key={r.id} className={`flex items-center justify-between p-3 rounded-lg border ${isActive ? "bg-card" : "bg-muted/30 opacity-70"}`}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{r.title}</p>
                  {isActive && <Badge className="text-[10px] bg-emerald-100 text-emerald-700">Active</Badge>}
                  {isExpired && <Badge variant="outline" className="text-[10px]"><Clock className="size-3 mr-1" />Expired</Badge>}
                  {isRevoked && <Badge variant="outline" className="text-[10px] text-red-500"><Ban className="size-3 mr-1" />Revoked</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Until {format(new Date(r.endDate), "MMM d")} &middot; {r.assignedToStaffMetaId.slice(0, 12)}
                </p>
              </div>
              {canManage && isActive && (
                <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => revokeMutation.mutate(r.id)}>
                  <RotateCcw className="size-3 mr-1" /> Revoke
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
      <Dialog open={showCreate} onOpenChange={(v) => !v && setShowCreate(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Responsibility</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={title} onValueChange={setTitle}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Calling POC">Calling POC</SelectItem>
                <SelectItem value="Event Lead">Event Lead</SelectItem>
                <SelectItem value="Transport Lead">Transport Lead</SelectItem>
                <SelectItem value="Security Lead">Security Lead</SelectItem>
                <SelectItem value="Registration Lead">Registration Lead</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Staff Meta ID" value={staffMetaId} onChange={(e) => setStaffMetaId(e.target.value)} />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="End date" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!staffMetaId || !endDate || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function format(date: Date, fmt: string) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}
