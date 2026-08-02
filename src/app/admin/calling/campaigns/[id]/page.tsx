"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
  status: string;
  outcome: string | null;
  canInteract: boolean;
  application?: {
    applicantName?: string;
    guardianPhone?: string;
    status: string;
  } | null;
};

type LeadListResponse = {
  data: LeadItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

type CallingUiContext = { canView: true; canManagePoc: boolean; canManageTemplates: boolean; isHq: boolean };

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

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [leadPage, setLeadPage] = useState(1);
  const [logModal, setLogModal] = useState<{ open: boolean; assignmentId: string }>({ open: false, assignmentId: "" });

  const { data: ctx, isError: ctxError, error: ctxErr } = useQuery<CallingUiContext>({
    queryKey: ["calling-ui-context"],
    queryFn: async () => {
      const response = await fetch("/api/calling/ui-context");
      if (!response.ok) throw new Error("Unable to verify Calling access");
      return response.json();
    },
    retry: false,
  });

  const { data: campaign, isLoading: campaignLoading } = useQuery<CampaignDetail>({
    queryKey: ["campaign", campaignId],
    queryFn: () => fetch(`/api/calling/campaigns/${campaignId}`).then((r) => r.json()),
    enabled: Boolean(campaignId) && Boolean(ctx) && !ctxError,
  });

  const { data: leads, isLoading: leadsLoading } = useQuery<LeadListResponse>({
    queryKey: ["campaign-leads", campaignId, statusFilter, leadPage],
    queryFn: () => {
      const p = new URLSearchParams();
      if (statusFilter !== "all") p.set("status", statusFilter);
      p.set("page", String(leadPage));
      p.set("pageSize", "50");
      const suffix = p.size > 0 ? `?${p}` : "";
      return fetch(`/api/calling/campaigns/${campaignId}/leads${suffix}`).then((r) => r.json());
    },
    enabled: Boolean(campaignId) && Boolean(ctx) && !ctxError,
  });

  const filteredLeads = leads?.data.filter((l) => {
    if (!search) return true;
    const name = l.application?.applicantName?.toLowerCase() || "";
    return name.includes(search.toLowerCase());
  });

  if (ctxError) {
    return (
      <div id="calling-context-error" role="alert" className="p-6 text-sm text-destructive">
        Access Verification Failed: {ctxErr instanceof Error ? ctxErr.message : "Unable to load Calling permissions."}
      </div>
    );
  }
  if (campaignLoading || !ctx) return <div className="p-4 md:p-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
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
            <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setLeadPage(1); }}>
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
                  <p className="text-sm font-medium">{lead.application?.applicantName || "—"}</p>
                  <p className="text-xs text-muted-foreground">{lead.application?.guardianPhone || "—"} &middot; {lead.status}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {lead.outcome && OutcomeIcon && <OutcomeIcon className={cn("size-4", OUTCOME_STYLES[lead.outcome])} />}
                  {lead.canInteract && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setLogModal({ open: true, assignmentId: lead.id })}>
                      <Phone className="size-3 mr-1" /> Log Call
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {leads && leads.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button variant="outline" size="sm" disabled={leadPage === 1} onClick={() => setLeadPage((page) => page - 1)}>
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {leads.pagination.page} of {leads.pagination.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={leadPage >= leads.pagination.totalPages} onClick={() => setLeadPage((page) => page + 1)}>
                Next
              </Button>
            </div>
          )}
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

    </div>
  );
}
