"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  PhoneCall,
  Phone,
  MessageSquare,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  Send,
  FileText,
  Building,
  Check,
  PhoneForwarded,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface MobileCallingPageProps {
  onBack?: () => void;
}

const TABS = [
  { id: "all", label: "All Leads" },
  { id: "pending", label: "Pending" },
  { id: "contacted", label: "Contacted" },
  { id: "interested", label: "Interested" },
  { id: "completed", label: "Completed" },
];

export function MobileCallingPage({ onBack }: MobileCallingPageProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const user = session?.user as any;

  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sheet states
  const [isLogOutcomeOpen, setIsLogOutcomeOpen] = useState(false);
  const [selectedLeadForLog, setSelectedLeadForLog] = useState<any>(null);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

  // Outcome Form State
  const [callOutcome, setCallOutcome] = useState<string>("reached");
  const [callNotes, setCallNotes] = useState("");
  const [callbackDate, setCallbackDate] = useState("");

  // ─── Query Leads ───────────────────────────────────────────────────────
  const { data: leadsData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["calling-leads", activeTab],
    queryFn: async () => {
      const url = new URL("/api/calling/campaigns/default/leads", window.location.origin);
      if (activeTab !== "all") {
        url.searchParams.set("status", activeTab);
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to load calling leads");
      return res.json();
    },
    staleTime: 15000,
  });

  // Query Templates
  const { data: templatesData } = useQuery({
    queryKey: ["calling-templates"],
    queryFn: async () => {
      const res = await fetch("/api/calling/templates");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const leads: any[] = Array.isArray(leadsData) ? leadsData : [];

  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = lead.application?.applicantName?.toLowerCase() || "";
    const phone = lead.application?.guardianPhone || "";
    const caller = lead.callerName?.toLowerCase() || "";
    const code = lead.id?.toLowerCase() || "";
    return name.includes(q) || phone.includes(q) || caller.includes(q) || code.includes(q);
  });

  // ─── Log Interaction Mutation ──────────────────────────────────────────
  const logInteractionMutation = useMutation({
    mutationFn: async ({
      assignmentId,
      outcome,
      notes,
      scheduledFor,
    }: {
      assignmentId: string;
      outcome: string;
      notes: string;
      scheduledFor?: string;
    }) => {
      const body: any = {
        assignmentId,
        outcome,
        notes: notes || "Call completed",
      };
      if (outcome === "callback_requested" && scheduledFor) {
        body.scheduledFor = new Date(scheduledFor).toISOString();
      } else if (outcome === "callback_requested") {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        body.scheduledFor = tomorrow.toISOString();
      }

      const res = await fetch("/api/calling/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to log interaction");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Call outcome recorded successfully!");
      setIsLogOutcomeOpen(false);
      setSelectedLeadForLog(null);
      setCallNotes("");
      setCallbackDate("");
      queryClient.invalidateQueries({ queryKey: ["calling-leads"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to log call outcome");
    },
  });

  const handleOpenLogOutcome = (lead: any) => {
    setSelectedLeadForLog(lead);
    setCallOutcome(lead.outcome || "reached");
    setCallNotes(lead.notes || "");
    setIsLogOutcomeOpen(true);
  };

  const handleSaveOutcome = () => {
    if (!selectedLeadForLog) return;
    logInteractionMutation.mutate({
      assignmentId: selectedLeadForLog.id,
      outcome: callOutcome,
      notes: callNotes,
      scheduledFor: callbackDate || undefined,
    });
  };

  const handleOpenWhatsApp = (lead: any) => {
    const rawPhone = lead.application?.guardianPhone || "";
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? `92${cleanPhone.slice(1)}` : cleanPhone;
    const applicantName = lead.application?.applicantName || "محترم";
    const text = `السلام علیکم ورحمۃ اللہ، شباب ۳۶۰ پروگرام سے رابطہ کر رہے ہیں۔ امید ہے آپ خیریت سے ہوں گے۔ ${applicantName} کی کلاسز اور تربیتی سیشن کے حوالے سے بات کرنی تھی۔`;
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: CheckCircle2,
          label: "Completed",
        };
      case "interested":
        return {
          bg: "bg-purple-50 text-[#4B0A8F] border-purple-200",
          icon: Check,
          label: "Interested",
        };
      case "contacted":
        return {
          bg: "bg-sky-50 text-sky-700 border-sky-200",
          icon: PhoneForwarded,
          label: "Contacted",
        };
      default:
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          icon: Clock,
          label: "Pending",
        };
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50 text-slate-900 pb-28 select-none">
      {/* ─── Header matching docs/pwa screens style ───────────────────────── */}
      <div className="px-5 pt-6 pb-4 bg-white border-b border-slate-100 shadow-sm sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-black text-[#1F0860] tracking-tight">Calling Desk</h1>
              <p className="text-[11px] text-slate-500 font-medium">
                {filteredLeads.length} leads in active campaigns
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin text-[#4B0A8F]")} />
            </button>
            <Button
              onClick={() => setIsTemplatesOpen(true)}
              size="sm"
              variant="outline"
              className="h-8 text-xs font-bold px-3 rounded-xl border-purple-200 text-[#4B0A8F] hover:bg-purple-50 flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Scripts</span>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mt-3.5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student, phone, or caller..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-100/90 border border-slate-200/80 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4B0A8F] focus:bg-white transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar pb-0.5">
          {TABS.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold capitalize whitespace-nowrap transition-all",
                  isActive
                    ? "bg-[#1F0860] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Leads List ───────────────────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-16 text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#4B0A8F]" />
            Loading calling leads pipeline…
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12 px-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
            <PhoneCall className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-900 text-sm">No calling leads found</p>
            <p className="text-xs text-slate-500 mt-1">
              No leads currently match the selected status filter or search term.
            </p>
          </div>
        ) : (
          filteredLeads.map((lead: any) => {
            const isExpanded = expandedId === lead.id;
            const badge = getStatusBadge(lead.status);
            const StatusIcon = badge.icon;
            const phone = lead.application?.guardianPhone || "0300-0000000";

            return (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden transition-all"
              >
                {/* Clickable Header Row */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpand(lead.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand(lead.id);
                    }
                  }}
                  className="p-4 cursor-pointer hover:bg-slate-50/70 transition-colors focus:outline-none"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-800 font-black text-sm flex items-center justify-center shrink-0 border border-amber-100">
                        {lead.application?.applicantName?.slice(0, 2)?.toUpperCase() || "LD"}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          {lead.application?.applicantName}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1.5">
                          <span>{phone}</span>
                          <span>•</span>
                          <span className="text-[#4B0A8F] font-semibold">
                            {lead.callerName || "Unassigned"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 border",
                        badge.bg
                      )}
                    >
                      <StatusIcon className="w-3 h-3 mr-1 inline" />
                      {badge.label}
                    </Badge>
                  </div>

                  {/* Sub-row */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
                    <span className="truncate max-w-[200px]">
                      {lead.outcome ? `Outcome: ${lead.outcome.replace("_", " ")}` : "Awaiting initial call"}
                    </span>
                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details & Actions */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/50 space-y-3 text-xs"
                    >
                      {lead.notes && (
                        <div className="p-2.5 rounded-xl bg-white border border-slate-100 space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <FileText className="w-3 h-3 text-[#4B0A8F]" />
                            Caller Notes
                          </span>
                          <p className="text-slate-700 text-[11px] font-medium">{lead.notes}</p>
                          {lead.calledAt && (
                            <p className="text-[9px] text-slate-400 pt-0.5">
                              Last contacted: {new Date(lead.calledAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Quick Communication & Outcome Buttons */}
                      <div className="pt-1 grid grid-cols-3 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="h-9 border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1"
                        >
                          <a href={`tel:${phone}`}>
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Call</span>
                          </a>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenWhatsApp(lead)}
                          className="h-9 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleOpenLogOutcome(lead)}
                          className="h-9 bg-[#4B0A8F] hover:bg-[#3d0875] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Log Result</span>
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ─── Log Outcome Bottom Sheet ─────────────────────────────────────── */}
      <Sheet open={isLogOutcomeOpen} onOpenChange={setIsLogOutcomeOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-w-[460px] mx-auto p-6 max-h-[90vh] overflow-y-auto">
          <SheetHeader className="text-left pb-4 border-b border-slate-100">
            <SheetTitle className="text-lg font-black text-[#1F0860]">
              Log Call Outcome
            </SheetTitle>
            <p className="text-xs text-slate-500 font-medium">
              Lead: {selectedLeadForLog?.application?.applicantName} ({selectedLeadForLog?.application?.guardianPhone})
            </p>
          </SheetHeader>

          <div className="space-y-4 py-4 text-xs">
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Call Result *</Label>
              <Select value={callOutcome} onValueChange={setCallOutcome}>
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reached">Reached - Spoke with Guardian</SelectItem>
                  <SelectItem value="callback_requested">Callback Requested</SelectItem>
                  <SelectItem value="busy">Busy / Engaged</SelectItem>
                  <SelectItem value="no_answer">No Answer</SelectItem>
                  <SelectItem value="wrong_number">Wrong Number</SelectItem>
                  <SelectItem value="not_interested">Not Interested / Dropped Out</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {callOutcome === "callback_requested" && (
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Follow-up Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={callbackDate}
                  onChange={(e) => setCallbackDate(e.target.value)}
                  className="rounded-xl h-10 text-xs"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Interaction Notes</Label>
              <Textarea
                placeholder="e.g. Guardian confirmed boy was sick this week, will attend next Saturday morning class..."
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                className="rounded-xl text-xs resize-none"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLogOutcomeOpen(false)}
                className="flex-1 rounded-xl h-11 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveOutcome}
                disabled={logInteractionMutation.isPending}
                className="flex-1 bg-[#4B0A8F] hover:bg-[#3d0875] text-white rounded-xl h-11 text-xs font-bold"
              >
                {logInteractionMutation.isPending ? "Recording..." : "Save Outcome"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Communication Templates Sheet ─────────────────────────────────── */}
      <Sheet open={isTemplatesOpen} onOpenChange={setIsTemplatesOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-w-[460px] mx-auto p-6 max-h-[85vh] overflow-y-auto">
          <SheetHeader className="text-left pb-4 border-b border-slate-100">
            <SheetTitle className="text-lg font-black text-[#1F0860]">
              Calling Scripts & Templates
            </SheetTitle>
            <p className="text-xs text-slate-500 font-medium">
              Standardized Urdu & English scripts for retention callers
            </p>
          </SheetHeader>

          <div className="space-y-3 py-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Urdu Attendance Retention Script</span>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px]">Approved</Badge>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed font-sans" dir="rtl">
                السلام علیکم ورحمۃ اللہ، میں شباب ۳۶۰ تربیتی پروگرام کی طرف سے بات کر رہا ہوں۔ امید ہے آپ خیریت سے ہوں گے۔ ہم نے نوٹ کیا کہ آپ کے بیٹے نے پچھلے ہفتے کلاس میں شرکت نہیں کی۔ کیا سب خیریت ہے؟ کوئی مسئلہ یا دشواری تو پیش نہیں آئی؟
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">English Follow-Up Script</span>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px]">Approved</Badge>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                &quot;Assalamu Alaikum, this is Shabab 360 Youth Program following up regarding your son&apos;s attendance in our weekend leadership session. We missed him last week and wanted to check in on his well-being.&quot;
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Health / Absence Check-in</span>
                <Badge className="bg-purple-50 text-[#4B0A8F] border-purple-200 text-[9px]">Approved</Badge>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed font-sans" dir="rtl">
                اگر طبیعت ناساز تھی تو دعا ہے کہ اللہ تعالیٰ مکمل شفائے کاملہ عطا فرمائیں۔ براہ کرم ہمیں بتائیں تاکہ ہم ان کے اسباق کا اعادہ کرا سکیں۔
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
