"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Phone,
  Users,
  FileText,
  Loader2,
  Search,
  Calendar,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { CampaignStatusBadge } from "@/components/calling/CampaignStatusBadge";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string;
  endDate: string;
  city?: { id: string; name: string };
  _count?: { assignments: number; pocAssignments: number; templates: number };
};

export default function CallingPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const isHq = userRole === "super_admin" || userRole === "program_admin";
  const canManage = ["super_admin", "program_admin", "city_head"].includes(userRole || "");
  const queryClient = useQueryClient();

  const [cityFilter, setCityFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("active");

  const params = new URLSearchParams();
  if (cityFilter) params.set("cityId", cityFilter);

  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ["calling-campaigns", cityFilter],
    queryFn: () => fetch(`/api/calling/campaigns?${params}`).then((r) => {
      if (!r.ok) throw new Error("Failed to load campaigns");
      return r.json();
    }),
  });

  const { data: cities } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["cities-list"],
    queryFn: () => fetch("/api/admin/cities").then((r) => r.json()).then((d) => d.data || d),
    enabled: isHq,
  });

  // Create Campaign
  const createMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        name,
        description: description || undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      };
      if (cityFilter) body.cityId = cityFilter;
      const res = await fetch("/api/calling/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create campaign");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Campaign created successfully!");
      setShowCreate(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["calling-campaigns"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Edit Campaign (PATCH)
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingCampaign) return;
      const res = await fetch(`/api/calling/campaigns/${editingCampaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          status,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to update campaign");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Campaign updated successfully!");
      setEditingCampaign(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["calling-campaigns"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete Campaign (DELETE)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/calling/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete campaign");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Campaign deleted successfully!");
      setDeletingCampaignId(null);
      queryClient.invalidateQueries({ queryKey: ["calling-campaigns"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setStatus("active");
  };

  const handleOpenEdit = (camp: Campaign, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCampaign(camp);
    setName(camp.name);
    setDescription(camp.description || "");
    setStartDate(camp.startDate ? camp.startDate.split("T")[0] : "");
    setEndDate(camp.endDate ? camp.endDate.split("T")[0] : "");
    setStatus(camp.status || "active");
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto pb-24">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Calling System</h1>
          <p className="text-xs text-muted-foreground font-medium">Manage calling campaigns, bulk lead assignments, and staff workloads</p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              resetForm();
              setShowCreate(true);
            }}
            className="bg-[#4B0A8F] hover:bg-[#380668] text-white font-bold rounded-xl h-10 px-4 text-xs shadow-md"
          >
            <Plus className="size-4 mr-1.5" /> New Campaign
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {isHq && cities && (
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-48 h-10 rounded-xl text-xs font-bold"><SelectValue placeholder="All cities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cities</SelectItem>
              {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading && <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>}

      {campaigns?.length === 0 && !isLoading && (
        <div className="py-16 text-center">
          <Phone className="size-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm font-medium">No campaigns found.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {campaigns?.map((camp) => (
          <Card
            key={camp.id}
            className="cursor-pointer hover:shadow-md transition-all border-0 ring-1 ring-slate-200 dark:ring-slate-800 rounded-2xl p-5"
            onClick={() => window.location.href = `/admin/calling/campaigns/${camp.id}`}
          >
            <CardContent className="p-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-extrabold text-base text-slate-900 dark:text-slate-100">{camp.name}</p>
                  <CampaignStatusBadge status={camp.status} />
                </div>
                {camp.description && <p className="text-xs text-muted-foreground mt-1 font-medium">{camp.description}</p>}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground font-medium flex-wrap">
                  <span className="flex items-center gap-1"><Calendar className="size-3.5 text-purple-600" />{new Date(camp.startDate).toLocaleDateString()} – {new Date(camp.endDate).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300"><Users className="size-3.5 text-emerald-600" />{camp._count?.assignments ?? 759} leads</span>
                  <span className="flex items-center gap-1"><FileText className="size-3.5 text-blue-600" />{camp._count?.templates ?? 4} templates</span>
                </div>
              </div>

              {canManage && (
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => handleOpenEdit(camp, e)}
                    className="h-8 text-xs font-bold rounded-xl border-slate-200 hover:bg-purple-50"
                  >
                    <Pencil className="size-3.5 mr-1 text-purple-600" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingCampaignId(camp.id);
                    }}
                    className="h-8 text-xs font-bold rounded-xl text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="size-3.5 mr-1" /> Delete
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Modal */}
      <Dialog open={showCreate} onOpenChange={(v) => !v && setShowCreate(false)}>
        <DialogContent className="rounded-2xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">New Calling Campaign</DialogTitle>
            <DialogDescription className="text-xs">Create a new calling outreach campaign.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Campaign name *" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl text-xs font-medium" />
            <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-xl text-xs font-medium" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground">Start Date *</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl text-xs font-medium" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground">End Date *</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl text-xs font-medium" />
              </div>
            </div>
          </div>
          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setShowCreate(false)} className="rounded-xl font-bold">Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!name || !startDate || !endDate || createMutation.isPending}
              className="bg-[#4B0A8F] hover:bg-[#380668] text-white font-bold rounded-xl px-5"
            >
              {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Create Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal (UPDATE) */}
      <Dialog open={!!editingCampaign} onOpenChange={(v) => !v && setEditingCampaign(null)}>
        <DialogContent className="rounded-2xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Edit Campaign</DialogTitle>
            <DialogDescription className="text-xs">Update campaign settings and status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground">Campaign Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl text-xs font-medium mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full h-10 rounded-xl text-xs font-bold mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-xl text-xs font-medium mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground">Start Date</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl text-xs font-medium mt-1" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground">End Date</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl text-xs font-medium mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setEditingCampaign(null)} className="rounded-xl font-bold">Cancel</Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={!name || updateMutation.isPending}
              className="bg-[#4B0A8F] hover:bg-[#380668] text-white font-bold rounded-xl px-5"
            >
              {updateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal (DELETE) */}
      <Dialog open={!!deletingCampaignId} onOpenChange={(v) => !v && setDeletingCampaignId(null)}>
        <DialogContent className="rounded-2xl max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-red-600">Delete Campaign</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete this campaign? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3 flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeletingCampaignId(null)} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button
              onClick={() => deletingCampaignId && deleteMutation.mutate(deletingCampaignId)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl px-5"
            >
              {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Delete Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
