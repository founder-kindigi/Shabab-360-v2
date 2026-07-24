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

export default function CallingPageView() {
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
  const [showInteraction, setShowInteraction] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: cities } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["cities"],
    queryFn: () => fetch("/api/admin/cities").then(r => r.json()).then(d => d.data || d),
    enabled: isHq,
  });

  const { data: campaigns, isLoading, error } = useQuery<Campaign[]>({
    queryKey: ["calling-campaigns", cityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (cityFilter) params.set("cityId", cityFilter);
      const res = await fetch(`/api/admin/calling/campaigns?${params}`);
      if (!res.ok) throw new Error("Failed to load campaigns");
      return res.json();
    },
  });

  const { data: leads } = useQuery<Lead[]>({
    queryKey: ["calling-leads", cityFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (cityFilter) params.set("cityId", cityFilter);
      if (searchQuery) params.set("q", searchQuery);
      const res = await fetch(`/api/admin/calling/assignments?${params}`);
      if (!res.ok) throw new Error("Failed to load leads");
      return res.json();
    },
    enabled: !!cityFilter,
  });

  const createCampaign = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/calling/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: campaignName,
          description: campaignDesc || null,
          cityId: cityFilter,
          startDate: campaignStart,
          endDate: campaignEnd || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create campaign");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calling-campaigns"] });
      setShowCreate(false);
      setCampaignName("");
      setCampaignDesc("");
      setCampaignStart("");
      setCampaignEnd("");
      toast.success("Campaign created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load calling data. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calling System</h1>
          <p className="text-sm text-muted-foreground">Manage calling campaigns and outreach assignments</p>
        </div>
        <div className="flex gap-2">
          {isHq && (
            <div className="w-48">
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All cities</SelectItem>
                  {cities?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Campaign
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {campaigns?.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{campaign.name}</CardTitle>
                <CampaignStatusBadge status={campaign.status} />
              </div>
            </CardHeader>
            <CardContent>
              {campaign.description && (
                <p className="mb-2 text-sm text-muted-foreground">{campaign.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {campaign._count?.assignments ?? 0} leads
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {campaign._count?.pocAssignments ?? 0} POCs
                </span>
              </div>
              {campaign.city && (
                <p className="mt-2 text-xs text-muted-foreground">{campaign.city.name}</p>
              )}
            </CardContent>
          </Card>
        ))}
        {(!campaigns || campaigns.length === 0) && !isLoading && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center gap-2 py-12">
              <Phone className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No campaigns yet. Create your first campaign to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Calling Campaign</DialogTitle>
            <DialogDescription>Create a new outreach campaign</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Campaign Name</label>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Enter campaign name" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input value={campaignDesc} onChange={(e) => setCampaignDesc(e.target.value)} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input type="date" value={campaignStart} onChange={(e) => setCampaignStart(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input type="date" value={campaignEnd} onChange={(e) => setCampaignEnd(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createCampaign.mutate()} disabled={!campaignName || !campaignStart || createCampaign.isPending}>
              {createCampaign.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
