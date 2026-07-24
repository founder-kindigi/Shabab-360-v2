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
  CheckCircle2,
  XCircle,
  Clock,
  PhoneOff,
  Calendar,
} from "lucide-react";
import { CampaignStatusBadge } from "@/components/calling/CampaignStatusBadge";
import { CallInteractionModal } from "@/components/calling/CallInteractionModal";

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

type Lead = {
  id: string;
  applicationId: string;
  callerStaffMetaId: string | null;
  callerExternalId: string | null;
  status: string;
  outcome: string | null;
  application?: {
    applicantName: string;
    guardianPhone: string;
    status: string;
  };
};

export default function CallingPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const isHq = userRole === "super_admin" || userRole === "program_admin";
  const queryClient = useQueryClient();

  const [cityFilter, setCityFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignDesc, setCampaignDesc] = useState("");
  const [campaignStart, setCampaignStart] = useState("");
  const [campaignEnd, setCampaignEnd] = useState("");

  const canManage = ["super_admin", "program_admin", "city_head"].includes(userRole || "");

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

  const createMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        name: campaignName,
        description: campaignDesc || undefined,
        startDate: new Date(campaignStart).toISOString(),
        endDate: new Date(campaignEnd).toISOString(),
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
      toast.success("Campaign created");
      setShowCreate(false);
      setCampaignName("");
      setCampaignDesc("");
      setCampaignStart("");
      setCampaignEnd("");
      queryClient.invalidateQueries({ queryKey: ["calling-campaigns"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calling System</h1>
          <p className="text-sm text-muted-foreground">Manage calling campaigns, leads, and templates</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="size-4 mr-1.5" /> New Campaign
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {isHq && cities && (
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All cities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cities</SelectItem>
              {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading && <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>}

      {campaigns?.length === 0 && !isLoading && (
        <div className="py-16 text-center">
          <Phone className="size-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No campaigns found.</p>
        </div>
      )}

      {campaigns?.map((camp) => (
        <Card key={camp.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => window.location.href = `/admin/calling/campaigns/${camp.id}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{camp.name}</p>
                  <CampaignStatusBadge status={camp.status} />
                </div>
                {camp.description && <p className="text-xs text-muted-foreground mt-0.5">{camp.description}</p>}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="size-3" />{new Date(camp.startDate).toLocaleDateString()} – {new Date(camp.endDate).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Users className="size-3" />{camp._count?.assignments ?? 0} leads</span>
                  <span className="flex items-center gap-1"><FileText className="size-3" />{camp._count?.templates ?? 0} templates</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={showCreate} onOpenChange={(v) => !v && setShowCreate(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Campaign</DialogTitle><DialogDescription>Create a new calling campaign.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Campaign name" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
            <Input placeholder="Description (optional)" value={campaignDesc} onChange={(e) => setCampaignDesc(e.target.value)} />
            <Input type="date" placeholder="Start date" value={campaignStart} onChange={(e) => setCampaignStart(e.target.value)} />
            <Input type="date" placeholder="End date" value={campaignEnd} onChange={(e) => setCampaignEnd(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!campaignName || !campaignStart || !campaignEnd || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
