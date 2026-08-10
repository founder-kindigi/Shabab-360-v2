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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  PhoneCall,
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
  UserX,
  ChevronLeft,
  ChevronRight,
  Layers,
  MessageSquare,
  BarChart3,
  User,
  FileText,
  TrendingUp,
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
  callerName?: string;
  callerExternalId: string | null;
  status: string;
  outcome: string | null;
  notes?: string;
  calledAt?: string;
  application?: {
    applicantName: string;
    guardianPhone: string;
    status: string;
  };
};

type CallerWorkload = {
  callerId: string;
  callerName: string;
  callerType: string;
  totalAssigned: number;
  pending: number;
  contacted: number;
  interested: number;
  callbackRequested: number;
};

const OUTCOME_ICONS: Record<string, typeof Phone> = {
  reached: CheckCircle2,
  no_answer: XCircle,
  busy: Clock,
  wrong_number: PhoneOff,
  callback_requested: Clock,
};

const OUTCOME_STYLES: Record<string, string> = {
  reached: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400",
  no_answer: "text-red-500 bg-red-50 border-red-200 dark:bg-red-950/50 dark:text-red-400",
  busy: "text-amber-500 bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400",
  wrong_number: "text-slate-500 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-400",
  callback_requested: "text-blue-500 bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400",
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

  const [activeTab, setActiveTab] = useState<"leads" | "workloads">("leads");

  // Tab 1 state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [selectedLeadAppIds, setSelectedLeadAppIds] = useState<string[]>([]);
  const [bulkCallerId, setBulkCallerId] = useState("");

  // Tab 2 filter state
  const [selectedCallerFilter, setSelectedCallerFilter] = useState("all");
  const [remarksSearch, setRemarksSearch] = useState("");

  const [logModal, setLogModal] = useState<{ open: boolean; assignmentId: string }>({ open: false, assignmentId: "" });
  const [assignModal, setAssignModal] = useState<{ open: boolean; leadId: string }>({ open: false, leadId: "" });
  const [callerId, setCallerId] = useState("");
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

  const { data: workloadsData, isLoading: workloadsLoading } = useQuery<{ workloads: CallerWorkload[] }>({
    queryKey: ["calling-workloads", campaignId],
    queryFn: () => fetch(`/api/calling/workloads?campaignId=${campaignId}`).then((r) => r.json()),
  });

  // Filtered Leads (Tab 1)
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

  // Caller Remarks Filtered List (Tab 2)
  const callerRemarksList = useMemo(() => {
    if (!leads) return [];
    return leads.filter((l) => {
      if (selectedCallerFilter !== "all" && l.callerStaffMetaId !== selectedCallerFilter) {
        return false;
      }
      if (!remarksSearch) return true;
      const q = remarksSearch.toLowerCase();
      const name = l.application?.applicantName?.toLowerCase() || "";
      const caller = l.callerName?.toLowerCase() || "";
      const note = l.notes?.toLowerCase() || "";
      return name.includes(q) || caller.includes(q) || note.includes(q);
    });
  }, [leads, selectedCallerFilter, remarksSearch]);

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
      queryClient.invalidateQueries({ queryKey: ["calling-workloads", campaignId] });
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
      queryClient.invalidateQueries({ queryKey: ["calling-workloads", campaignId] });
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

      {/* ─── View Tabs ─────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl h-12 w-full sm:w-auto grid grid-cols-2">
          <TabsTrigger value="leads" className="rounded-xl font-bold text-xs gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 shadow-sm">
            <Users className="size-4 text-purple-600" />
            All Campaign Leads ({leads?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="workloads" className="rounded-xl font-bold text-xs gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 shadow-sm">
            <BarChart3 className="size-4 text-emerald-600" />
            Callers Workload & Remarks ({workloadsData?.workloads?.length || 6})
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: All Campaign Leads (Bulk Assignment Desk) ─────────────── */}
        <TabsContent value="leads" className="space-y-6">
          {/* Floating Bulk Assignment Bar */}
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

          {/* Leads Main Roster */}
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
                    <SelectItem value="all">All Leads</SelectItem>
                    <SelectItem value="unassigned">Unassigned Leads</SelectItem>
                    <SelectItem value="assigned">Assigned Leads</SelectItem>
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

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                              {lead.application?.applicantName || "Applicant Lead"}
                            </p>
                            {!lead.callerStaffMetaId && !lead.callerExternalId && (
                              <Badge variant="outline" className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-300">
                                <UserX className="size-3 mr-1" /> Unassigned
                              </Badge>
                            )}
                            {(lead.callerStaffMetaId || lead.callerExternalId) && lead.status === "pending" && (
                              <Badge variant="outline" className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border-purple-200">
                                <UserCheck className="size-3 mr-1" /> Assigned to {lead.callerName || "Murabbi"}
                              </Badge>
                            )}
                            {(lead.callerStaffMetaId || lead.callerExternalId) && lead.status !== "pending" && (
                              <Badge variant="outline" className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200">
                                <PhoneCall className="size-3 mr-1" /> Called by {lead.callerName || "Murabbi"}
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground font-mono font-medium mt-0.5">
                            {lead.application?.guardianPhone || "—"} &middot; <span className="capitalize">{lead.status}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {lead.outcome && OutcomeIcon && (
                          <Badge variant="outline" className={cn("text-[11px] font-bold capitalize flex items-center gap-1", OUTCOME_STYLES[lead.outcome])}>
                            <OutcomeIcon className="size-3" /> {lead.outcome.replace(/_/g, " ")}
                          </Badge>
                        )}

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
        </TabsContent>

        {/* ─── Tab 2: Callers Workload, Call Logs & Remarks Breakdown ──────── */}
        <TabsContent value="workloads" className="space-y-6">
          {/* Workload Cards per Caller */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workloadsLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 w-full rounded-2xl" />)}

            {workloadsData?.workloads?.map((w) => {
              const contactedPct = Math.round((w.contacted / (w.totalAssigned || 1)) * 100);
              return (
                <Card key={w.callerId} className="border-0 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 rounded-2xl p-5 space-y-4 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-extrabold flex items-center justify-center text-sm">
                        {w.callerName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-snug">{w.callerName}</h3>
                        <Badge variant="outline" className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                          {w.callerType.toUpperCase()} CALLER
                        </Badge>
                      </div>
                    </div>
                    <Badge className="bg-purple-600 text-white font-black text-xs px-2.5 py-1 rounded-lg">
                      {w.totalAssigned} Calls
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-600 dark:text-slate-400">Outreach Progress</span>
                      <span className="text-purple-700 dark:text-purple-400">{contactedPct}% Contacted</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                      <div style={{ width: `${contactedPct}%` }} className="bg-emerald-500 h-full" />
                      <div style={{ width: `${Math.round((w.pending / (w.totalAssigned || 1)) * 100)}%` }} className="bg-amber-400 h-full" />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Pending</p>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">{w.pending}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Contacted</p>
                      <p className="text-xs font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{w.contacted}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40">
                      <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">Interested</p>
                      <p className="text-xs font-black text-purple-700 dark:text-purple-300 mt-0.5">{w.interested}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
                      <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Callback</p>
                      <p className="text-xs font-black text-blue-700 dark:text-blue-300 mt-0.5">{w.callbackRequested}</p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedCallerFilter(w.callerId);
                    }}
                    className="w-full h-8 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 border-slate-200"
                  >
                    <MessageSquare className="size-3.5 mr-1.5 text-purple-600" /> View Remarks Log
                  </Button>
                </Card>
              );
            })}
          </div>

          {/* Detailed Caller Remarks Roster Table */}
          <Card className="border-0 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 rounded-2xl overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <MessageSquare className="size-4 text-purple-600" /> Caller Remarks & Call Outcome Logs
                </CardTitle>
                <CardDescription className="text-xs font-medium mt-0.5">
                  View individual caller notes, status updates, and call interaction history
                </CardDescription>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    className="pl-9 h-10 rounded-xl text-xs font-medium"
                    placeholder="Search applicant or remarks..."
                    value={remarksSearch}
                    onChange={(e) => setRemarksSearch(e.target.value)}
                  />
                </div>

                <Select value={selectedCallerFilter} onValueChange={setSelectedCallerFilter}>
                  <SelectTrigger className="w-52 h-10 rounded-xl text-xs font-bold">
                    <SelectValue placeholder="All Callers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Callers & Murabbis</SelectItem>
                    {STAFF_CALLER_OPTIONS.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {callerRemarksList.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground text-sm">
                  No caller remarks log found for the selected filter.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {callerRemarksList.slice(0, 30).map((item) => {
                    const OutcomeIcon = item.outcome ? OUTCOME_ICONS[item.outcome] : null;
                    return (
                      <div key={item.id} className="p-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-xs">
                              {item.application?.applicantName?.charAt(0) || "A"}
                            </div>
                            <div>
                              <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                                {item.application?.applicantName || "Applicant"}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono font-medium">
                                {item.application?.guardianPhone || "—"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <Badge variant="outline" className="text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border-purple-200">
                              <User className="size-3 mr-1" /> {item.callerName || "Assigned Caller"}
                            </Badge>

                            {item.outcome && OutcomeIcon && (
                              <Badge variant="outline" className={cn("text-[11px] font-bold capitalize flex items-center gap-1", OUTCOME_STYLES[item.outcome])}>
                                <OutcomeIcon className="size-3" /> {item.outcome.replace(/_/g, " ")}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Caller Remarks Text */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 flex items-start gap-2">
                          <MessageSquare className="size-3.5 text-purple-500 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p>{item.notes || "Call initiated. Remarks logged by caller."}</p>
                            {item.calledAt && (
                              <p className="text-[10px] text-muted-foreground font-mono mt-1">
                                Logged on {new Date(item.calledAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
