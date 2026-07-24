"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Phone,
  Users,
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  PhoneOff,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CampaignStatusBadge } from "@/components/calling/CampaignStatusBadge";
import { CallInteractionModal } from "@/components/calling/CallInteractionModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type CampaignDetail = {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  description: string | null;
  city?: { name: string };
};

type LeadItem = {
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

const OUTCOME_ICONS: Record<string, typeof Phone> = {
  reached: CheckCircle2,
  no_answer: XCircle,
  busy: Clock,
  wrong_number: PhoneOff,
  callback_requested: Clock,
};

const OUTCOME_STYLES: Record<string, string> = {
  reached: "text-emerald-600",
  no_answer: "text-red-500",
  busy: "text-amber-500",
  wrong_number: "text-muted-foreground",
  callback_requested: "text-blue-500",
};

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params.id;
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const canManage = ["super_admin", "program_admin", "city_head"].includes(userRole || "");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [logModal, setLogModal] = useState<{ open: boolean; assignmentId: string }>({ open: false, assignmentId: "" });
  const [assignModal, setAssignModal] = useState<{ open: boolean; leadId: string }>({ open: false, leadId: "" });
  const [callerId, setCallerId] = useState("");

  const { data: campaign, isLoading: campaignLoading } = useQuery<CampaignDetail>({
    queryKey: ["campaign", campaignId],
    queryFn: () => fetch(`/api/calling/campaigns/${campaignId}`).then((r) => r.json()),
  });

  const { data: leads, isLoading: leadsLoading } = useQuery<LeadItem[]>({
    queryKey: ["campaign-leads", campaignId, statusFilter],
    queryFn: () => {
      const p = new URLSearchParams();
      if (statusFilter) p.set("status", statusFilter);
      return fetch(`/api/calling/campaigns/${campaignId}/leads?${p}`).then((r) => r.json());
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const res = await fetch("/api/calling/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, applicationId, callerStaffMetaId: callerId || undefined }),
      });
      if (!res.ok) throw new Error("Failed to assign lead");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Lead assigned");
      setAssignModal({ open: false, leadId: "" });
      setCallerId("");
      queryClient.invalidateQueries({ queryKey: ["campaign-leads", campaignId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filteredLeads = leads?.filter((l) => {
    if (!search) return true;
    const name = l.application?.applicantName?.toLowerCase() || "";
    return name.includes(search.toLowerCase());
  });

  if (campaignLoading) return <div className="p-4 md:p-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  if (!campaign) return <div className="p-4 md:p-6 text-center text-muted-foreground">Campaign not found.</div>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{campaign.name}</h1>
            <CampaignStatusBadge status={campaign.status} />
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span><Calendar className="size-3 inline mr-1" />{new Date(campaign.startDate).toLocaleDateString()} – {new Date(campaign.endDate).toLocaleDateString()}</span>
            {campaign.city && <span>{campaign.city.name}</span>}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="size-4" /> Leads</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {leadsLoading && <p className="text-sm text-muted-foreground">Loading leads...</p>}
          {filteredLeads?.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No leads found.</p>}

          {filteredLeads?.map((lead) => {
            const OutcomeIcon = lead.outcome ? OUTCOME_ICONS[lead.outcome] : null;
            return (
              <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{lead.application?.applicantName || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{lead.application?.guardianPhone || "—"} &middot; {lead.status}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {lead.outcome && OutcomeIcon && <OutcomeIcon className={cn("size-4", OUTCOME_STYLES[lead.outcome])} />}
                  {canManage && !lead.callerStaffMetaId && !lead.callerExternalId && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAssignModal({ open: true, leadId: lead.applicationId })}>
                      Assign
                    </Button>
                  )}
                  {(lead.callerStaffMetaId || lead.callerExternalId) && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setLogModal({ open: true, assignmentId: lead.id })}>
                      <Phone className="size-3 mr-1" /> Log Call
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {logModal.open && (
        <CallInteractionModal
          open={logModal.open}
          onClose={() => setLogModal({ open: false, assignmentId: "" })}
          assignmentId={logModal.assignmentId}
          campaignId={campaignId}
        />
      )}

      <Dialog open={assignModal.open} onOpenChange={(v) => !v && setAssignModal({ open: false, leadId: "" })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Lead</DialogTitle></DialogHeader>
          <Input placeholder="Caller Staff Meta ID" value={callerId} onChange={(e) => setCallerId(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModal({ open: false, leadId: "" })}>Cancel</Button>
            <Button onClick={() => assignMutation.mutate(assignModal.leadId)} disabled={!callerId}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
