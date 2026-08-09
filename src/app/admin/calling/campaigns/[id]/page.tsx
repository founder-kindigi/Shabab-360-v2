"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Sparkles,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Layers,
  Filter,
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
  description: string | null;
  status: string;
  startDate: string;
  endDate: string;
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

const STAFF_CALLER_OPTIONS = [
  { id: "c1", name: "Ikram Meer (Gulberg Lead)" },
  { id: "c2", name: "Hanzala Tauseef (Gulberg Murabbi)" },
  { id: "c3", name: "Hasnain Zafar (Tadreeb Lead)" },
  { id: "c4", name: "Imran Amin (Johar Town Lead)" },
  { id: "c5", name: "Basit Ahsan (Gulshan Ravi Lead)" },
  { id: "c6", name: "Abdul Kabeer (State Life Lead)" },
  { id: "c7", name: "Hammad Raza (Sports Lead)" },
  { id: "c8", name: "Haseeb Ahmad (Sports Officer)" },
];

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params.id;
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const canManage = ["super_admin", "program_admin", "city_head"].includes(userRole || "");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [selectedLeadAppIds, setSelectedLeadAppIds] = useState<string[]>([]);
  const [bulkCallerId, setBulkCallerId] = useState("");

  const [logModal, setLogModal] = useState<{ open: boolean; assignmentId: string }>({ open: false, assignmentId: "" });
  const [assignModal, setAssignModal] = useState<{ open: boolean; leadId: string }>({ open: false, leadId: "" });
  const [callerId, setCallerId] = useState("");
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [isAutoDistributing, setIsAutoDistributing] = useState(false);

  const { data: campaign, isLoading: campaignLoading } = useQuery<CampaignDetail>({
    queryKey: ["campaign", campaignId],
    queryFn: () => fetch(`/api/calling/campaigns/${campaignId}`).then((r) => r.json()),
  });

  const { data: leads, isLoading: leadsLoading } = useQuery<LeadItem[]>({
    queryKey: ["campaign-leads", campaignId, statusFilter],
    queryFn: () => {
      const p = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") p.set("status", statusFilter);
      return fetch(`/api/calling/campaigns/${campaignId}/leads?${p}`).then((r) => r.json());
    },
  });

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter((l) => {
      if (!search) return true;
      const name = l.application?.applicantName?.toLowerCase() || "";
      const phone = l.application?.guardianPhone || "";
      return name.includes(search.toLowerCase()) || phone.includes(search);
    });
  }, [leads, search]);

  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, page, pageSize]);

  // Handle Multi-Select Checkboxes
  const isAllSelected = paginatedLeads.length > 0 && paginatedLeads.every((l) => selectedLeadAppIds.includes(l.applicationId));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedLeadAppIds([]);
    } else {
      const currentPageIds = paginatedLeads.map((l) => l.applicationId);
      setSelectedLeadAppIds(Array.from(new Set([...selectedLeadAppIds, ...currentPageIds])));
    }
  };

  const handleToggleLead = (appId: string) => {
    if (selectedLeadAppIds.includes(appId)) {
      setSelectedLeadAppIds(selectedLeadAppIds.filter((id) => id !== appId));
    } else {
      setSelectedLeadAppIds([...selectedLeadAppIds, appId]);
    }
  };

  // Single & Bulk Assignment API Call
  const assignMutation = useMutation({
    mutationFn: async ({ appIds, targetCallerId }: { appIds: string[]; targetCallerId: string }) => {
      const res = await fetch("/api/calling/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          applicationIds: appIds,
          callerStaffMetaId: targetCallerId || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to assign leads");
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast.success(`Successfully assigned ${variables.appIds.length} lead(s) to staff caller!`);
      setSelectedLeadAppIds([]);
      setAssignModal({ open: false, leadId: "" });
      setCallerId("");
      setBulkCallerId("");
      queryClient.invalidateQueries({ queryKey: ["campaign-leads", campaignId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Auto-Distribute 1,000+ Leads Evenly
  const handleAutoDistributeEvenly = async () => {
    if (!filteredLeads || filteredLeads.length === 0) return;
    setIsAutoDistributing(true);

    try {
      const unassignedLeads = filteredLeads.filter((l) => !l.callerStaffMetaId);
      const leadsPerCaller = Math.ceil(unassignedLeads.length / STAFF_CALLER_OPTIONS.length);

      for (let idx = 0; idx < STAFF_CALLER_OPTIONS.length; idx++) {
        const caller = STAFF_CALLER_OPTIONS[idx];
        const chunk = unassignedLeads.slice(idx * leadsPerCaller, (idx + 1) * leadsPerCaller);
        if (chunk.length > 0) {
          const appIds = chunk.map((c) => c.applicationId);
          await fetch("/api/calling/assignments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaignId,
              applicationIds: appIds,
              callerStaffMetaId: caller.id,
            }),
          });
        }
      }

      toast.success(`Auto-Distributed ${unassignedLeads.length} leads evenly across ${STAFF_CALLER_OPTIONS.length} Murabbis (~${leadsPerCaller} leads each)!`);
      queryClient.invalidateQueries({ queryKey: ["campaign-leads", campaignId] });
    } catch (err) {
      toast.error("Failed to auto-distribute leads");
    } finally {
      setIsAutoDistributing(false);
    }
  };

  if (campaignLoading) return <div className="p-4 md:p-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  if (!campaign) return <div className="p-4 md:p-6 text-center text-muted-foreground">Campaign not found.</div>;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto pb-24">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="rounded-xl">
            <ArrowLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">{campaign.name}</h1>
              <CampaignStatusBadge status={campaign.status} />
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-medium">
              <span><Calendar className="size-3 inline mr-1" />{new Date(campaign.startDate).toLocaleDateString()} – {new Date(campaign.endDate).toLocaleDateString()}</span>
              {campaign.city && <span className="font-bold text-slate-700 dark:text-slate-300">• {campaign.city.name}</span>}
            </div>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAutoDistributeEvenly}
              disabled={isAutoDistributing}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl h-10 px-4 text-xs shadow-md gap-2"
            >
              {isAutoDistributing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-amber-300" />}
              Auto-Distribute 1,000+ Leads Evenly
            </Button>
          </div>
        )}
      </div>

      {/* ─── Floating Bulk Assignment Bar ───────────────────────────────────── */}
      {selectedLeadAppIds.length > 0 && (
        <Card className="border-2 border-purple-400 bg-purple-50/90 dark:bg-purple-950/40 backdrop-blur-md p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-600 text-white font-bold text-xs px-2.5 py-1 rounded-lg">
              {selectedLeadAppIds.length} Selected
            </Badge>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Bulk assign selected applicant leads to a Murabbi or Staff Caller
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={bulkCallerId} onValueChange={setBulkCallerId}>
              <SelectTrigger className="w-full sm:w-56 h-10 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold">
                <SelectValue placeholder="Choose Staff Caller..." />
              </SelectTrigger>
              <SelectContent>
                {STAFF_CALLER_OPTIONS.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={() => assignMutation.mutate({ appIds: selectedLeadAppIds, targetCallerId: bulkCallerId })}
              disabled={!bulkCallerId || assignMutation.isPending}
              className="bg-[#4B0A8F] hover:bg-[#380668] text-white font-bold text-xs h-10 px-4 rounded-xl shadow-md shrink-0"
            >
              {assignMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Apply Bulk Assignment"}
            </Button>
          </div>
        </Card>
      )}

      {/* ─── Leads Main Roster ────────────────────────────────────────────── */}
      <Card className="border-0 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 rounded-2xl overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-base font-extrabold flex items-center gap-2">
            <Users className="size-4 text-purple-600" /> Campaign Applicants & Leads
            <Badge variant="outline" className="font-mono text-xs font-bold ml-2">
              {filteredLeads.length} leads
            </Badge>
          </CardTitle>

          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9 h-10 rounded-xl text-xs font-medium"
                placeholder="Search applicant or phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36 h-10 rounded-xl text-xs font-bold">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="interested">Interested</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Header Action Row */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-3">
              <Checkbox checked={isAllSelected} onCheckedChange={handleToggleSelectAll} className="rounded-md" />
              <span>Select All Visible ({paginatedLeads.length})</span>
            </div>
            <span>Page {page} of {totalPages}</span>
          </div>

          {leadsLoading && <p className="text-sm text-muted-foreground p-8 text-center">Loading campaign leads...</p>}
          {filteredLeads.length === 0 && !leadsLoading && (
            <p className="text-sm text-muted-foreground text-center py-12">No leads match your search criteria.</p>
          )}

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedLeads.map((lead) => {
              const OutcomeIcon = lead.outcome ? OUTCOME_ICONS[lead.outcome] : null;
              const isChecked = selectedLeadAppIds.includes(lead.applicationId);

              return (
                <div
                  key={lead.id}
                  className={cn(
                    "flex items-center justify-between p-4 transition-colors hover:bg-purple-50/20 dark:hover:bg-purple-950/10",
                    isChecked && "bg-purple-50/50 dark:bg-purple-950/20"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => handleToggleLead(lead.applicationId)}
                      className="rounded-md shrink-0"
                    />

                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {lead.application?.applicantName || "Applicant Lead"}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono font-medium">
                        {lead.application?.guardianPhone || "—"} &middot; <span className="capitalize">{lead.status}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {lead.outcome && OutcomeIcon && <OutcomeIcon className={cn("size-4", OUTCOME_STYLES[lead.outcome])} />}

                    {canManage && !lead.callerStaffMetaId && !lead.callerExternalId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAssignModal({ open: true, leadId: lead.applicationId })}
                        className="h-8 text-xs font-bold rounded-xl text-purple-600 hover:bg-purple-50"
                      >
                        <UserCheck className="size-3.5 mr-1" /> Assign
                      </Button>
                    )}

                    {(lead.callerStaffMetaId || lead.callerExternalId) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLogModal({ open: true, assignmentId: lead.id })}
                        className="h-8 text-xs font-bold rounded-xl"
                      >
                        <Phone className="size-3.5 mr-1 text-emerald-600" /> Log Call
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              Showing {paginatedLeads.length} of {filteredLeads.length} leads
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 text-xs font-bold rounded-lg"
              >
                <ChevronLeft className="size-4 mr-1" /> Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 text-xs font-bold rounded-lg"
              >
                Next <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Call Modal */}
      {logModal.open && (
        <CallInteractionModal
          open={logModal.open}
          onClose={() => setLogModal({ open: false, assignmentId: "" })}
          assignmentId={logModal.assignmentId}
          campaignId={campaignId}
        />
      )}

      {/* Single Assign Modal */}
      <Dialog open={assignModal.open} onOpenChange={(v) => !v && setAssignModal({ open: false, leadId: "" })}>
        <DialogContent className="rounded-2xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Assign Lead to Staff Caller</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Murabbi / Caller</label>
            <Select value={callerId} onValueChange={setCallerId}>
              <SelectTrigger className="w-full h-11 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold">
                <SelectValue placeholder="Choose a Murabbi or Staff Caller..." />
              </SelectTrigger>
              <SelectContent>
                {STAFF_CALLER_OPTIONS.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-3 flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setAssignModal({ open: false, leadId: "" })} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button
              onClick={() => assignMutation.mutate({ appIds: [assignModal.leadId], targetCallerId: callerId })}
              disabled={!callerId || assignMutation.isPending}
              className="bg-[#4B0A8F] hover:bg-[#380668] text-white rounded-xl font-bold px-5 shadow-sm"
            >
              {assignMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Assign Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
