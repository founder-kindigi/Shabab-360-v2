"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  UserPlus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Phone,
  BookOpen,
  UserCheck,
  Award,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  GraduationCap,
  ShieldCheck,
  FileText,
  AlertCircle,
  Check,
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
import { recommendCohort } from "@/lib/admissions/cohort-engine";

interface MobileAdmissionsPageProps {
  onBack?: () => void;
}

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "submitted", label: "Submitted" },
  { id: "screening", label: "Screening" },
  { id: "interview_scheduled", label: "Interview" },
  { id: "accepted", label: "Accepted" },
  { id: "enrolled", label: "Enrolled" },
  { id: "rejected", label: "Rejected" },
];

export function MobileAdmissionsPage({ onBack }: MobileAdmissionsPageProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const user = session?.user as any;
  const role = user?.role || "super_admin";

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sheets state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isInterviewOpen, setIsInterviewOpen] = useState(false);
  const [selectedAppForInterview, setSelectedAppForInterview] = useState<any>(null);

  // New Application Form State
  const [newApplicantName, setNewApplicantName] = useState("");
  const [newGuardianName, setNewGuardianName] = useState("");
  const [newGuardianPhone, setNewGuardianPhone] = useState("");
  const [newGender, setNewGender] = useState("Male");
  const [newDob, setNewDob] = useState("2011-01-01");
  const [newParkId, setNewParkId] = useState("");
  const [newEmergencyContact, setNewEmergencyContact] = useState("");
  const [newEmergencyPhone, setNewEmergencyPhone] = useState("");
  const [newPreviousEducation, setNewPreviousEducation] = useState("");
  const [newReference, setNewReference] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // Interview Form State
  const [scoreCharacter, setScoreCharacter] = useState(85);
  const [scoreAcademic, setScoreAcademic] = useState(80);
  const [scoreLeadership, setScoreLeadership] = useState(85);
  const [interviewNotes, setInterviewNotes] = useState("");
  const [interviewCohort, setInterviewCohort] = useState("Cohort A - Leadership");

  // ─── Query Admissions Data ─────────────────────────────────────────────
  const { data: admissionsData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admissions-list", statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      params.set("pageSize", "100");
      const res = await fetch(`/api/admin/admissions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load admissions");
      return res.json();
    },
    staleTime: 15000,
  });

  // Query Parks for dropdown
  const { data: parksData } = useQuery({
    queryKey: ["admin-parks-list"],
    queryFn: async () => {
      const res = await fetch("/api/admin/home-analytics");
      if (!res.ok) return [];
      const data = await res.json();
      return data.parkAttendance || [];
    },
  });

  const applications: any[] = admissionsData?.data ?? [];
  const totalCount = admissionsData?.pagination?.total ?? applications.length;

  // ─── Update Status Mutation ────────────────────────────────────────────
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const res = await fetch(`/api/admin/admissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast.success(`Application updated to ${variables.status.replace("_", " ")}`);
      queryClient.invalidateQueries({ queryKey: ["admissions-list"] });
    },
    onError: () => {
      toast.error("Could not update application status");
    },
  });

  // ─── Record Interview Mutation ─────────────────────────────────────────
  const recordInterviewMutation = useMutation({
    mutationFn: async ({
      id,
      score1,
      score2,
      score3,
      notes,
    }: {
      id: string;
      score1: number;
      score2: number;
      score3: number;
      notes: string;
    }) => {
      const totalScore = score1 + score2 + score3;
      const res = await fetch(`/api/admin/admissions/${id}/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score1,
          score2,
          score3,
          totalScore,
          notes,
          conductedBy: session?.user?.name || "Murabbi Lead",
          status: "completed",
        }),
      });
      if (!res.ok) throw new Error("Failed to record interview");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Interview scores recorded successfully!");
      setIsInterviewOpen(false);
      setSelectedAppForInterview(null);
      queryClient.invalidateQueries({ queryKey: ["admissions-list"] });
    },
    onError: () => {
      toast.error("Failed to record interview evaluation");
    },
  });

  // ─── Create Application Mutation ───────────────────────────────────────
  const createApplicationMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create application");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("New admission application registered!");
      setIsAddOpen(false);
      resetAddForm();
      queryClient.invalidateQueries({ queryKey: ["admissions-list"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to register application");
    },
  });

  const resetAddForm = () => {
    setNewApplicantName("");
    setNewGuardianName("");
    setNewGuardianPhone("");
    setNewEmergencyContact("");
    setNewEmergencyPhone("");
    setNewPreviousEducation("");
    setNewReference("");
    setNewNotes("");
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApplicantName || !newGuardianName || !newGuardianPhone) {
      toast.error("Please fill in applicant name, guardian name and phone");
      return;
    }
    createApplicationMutation.mutate({
      applicantName: newApplicantName,
      guardianName: newGuardianName,
      guardianPhone: newGuardianPhone,
      gender: newGender,
      applicantDOB: newDob,
      preferredParkId: newParkId || undefined,
      emergencyContact: newEmergencyContact || undefined,
      emergencyPhone: newEmergencyPhone || undefined,
      previousEducation: newPreviousEducation || undefined,
      reference: newReference || undefined,
      notes: newNotes || undefined,
    });
  };

  const handleOpenInterview = (app: any) => {
    setSelectedAppForInterview(app);
    const existing = app.interviews?.[0];
    if (existing) {
      setScoreCharacter(existing.score1 ?? 85);
      setScoreAcademic(existing.score2 ?? 80);
      setScoreLeadership(existing.score3 ?? 85);
      setInterviewNotes(existing.notes ?? "");
    } else {
      setScoreCharacter(85);
      setScoreAcademic(80);
      setScoreLeadership(85);
      setInterviewNotes("");
    }
    setIsInterviewOpen(true);
  };

  const handleSaveInterview = () => {
    if (!selectedAppForInterview) return;
    recordInterviewMutation.mutate({
      id: selectedAppForInterview.id,
      score1: scoreCharacter,
      score2: scoreAcademic,
      score3: scoreLeadership,
      notes: interviewNotes,
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "enrolled":
      case "accepted":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: CheckCircle2,
        };
      case "screening":
      case "interview_scheduled":
      case "interviewed":
        return {
          bg: "bg-purple-50 text-[#4B0A8F] border-purple-200",
          icon: Clock,
        };
      case "rejected":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          icon: XCircle,
        };
      default:
        return {
          bg: "bg-sky-50 text-sky-700 border-sky-200",
          icon: Clock,
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
              <h1 className="text-2xl font-black text-[#1F0860] tracking-tight">Admissions</h1>
              <p className="text-[11px] text-slate-500 font-medium">
                {totalCount} applicants in cohort
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
              onClick={() => setIsAddOpen(true)}
              size="sm"
              className="h-8 bg-[#4B0A8F] hover:bg-[#3d0875] text-white text-xs font-bold px-3 rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add</span>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mt-3.5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by applicant name, code, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-100/90 border border-slate-200/80 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4B0A8F] focus:bg-white transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar pb-0.5">
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold capitalize whitespace-nowrap transition-all",
                  isActive
                    ? "bg-[#1F0860] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Applications List ────────────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-16 text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#4B0A8F]" />
            Loading admissions roster…
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12 px-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
            <UserPlus className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-900 text-sm">No applications found</p>
            <p className="text-xs text-slate-500 mt-1">
              No applicant records match the current filter or search criteria.
            </p>
          </div>
        ) : (
          applications.map((app: any) => {
            const isExpanded = expandedId === app.id;
            const badge = getStatusBadge(app.status);
            const StatusIcon = badge.icon;
            const rec = recommendCohort(app.age || 15, app.previousEducation);
            const latestInterview = app.interviews?.[0];

            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden transition-all"
              >
                {/* Clickable Header Row */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpand(app.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand(app.id);
                    }
                  }}
                  className="p-4 cursor-pointer hover:bg-slate-50/70 transition-colors focus:outline-none"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-50 text-[#4B0A8F] font-black text-sm flex items-center justify-center shrink-0 border border-purple-100">
                        {app.applicantName?.slice(0, 2)?.toUpperCase() || "SH"}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded">
                            {app.trackingCode}
                          </span>
                          <h3 className="text-sm font-black text-slate-900">
                            {app.applicantName}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
                          Father: {app.guardianName} • {app.guardianPhone}
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
                      {app.status.replace("_", " ")}
                    </Badge>
                  </div>

                  {/* Sub-row */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {app.preferredPark?.name || "Gulberg Park"}
                    </span>
                    <span className="flex items-center gap-1 text-[#4B0A8F] font-semibold">
                      <Award className="w-3 h-3" />
                      {rec.cohortName}
                    </span>
                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Section */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/50 space-y-3 text-xs"
                    >
                      {/* 4 Fields Confirmation Grid */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="p-2.5 rounded-xl bg-white border border-slate-100 space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#4B0A8F]" />
                            Emergency Contact
                          </span>
                          <p className="font-bold text-slate-900 truncate">
                            {app.emergencyContact || app.guardianName}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {app.emergencyPhone || app.guardianPhone}
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white border border-slate-100 space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-[#4B0A8F]" />
                            Education
                          </span>
                          <p className="font-bold text-slate-900 truncate">
                            {app.previousEducation || "Grade 9 / O-Level"}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Age: {app.age || 15} yrs
                          </p>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white border border-slate-100 space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-[#4B0A8F]" />
                          Referral Source
                        </span>
                        <p className="font-semibold text-slate-800">
                          {app.reference || "Social Media / Community Outreach"}
                        </p>
                      </div>

                      {/* Cohort Recommendation Card */}
                      <div className="p-3 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100/80 flex items-center justify-between">
                        <div className="space-y-0.5 pr-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#4B0A8F] flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            Cohort Recommendation
                          </span>
                          <p className="text-xs font-black text-slate-900">
                            {rec.cohortName}
                          </p>
                          <p className="text-[10px] text-slate-600">{rec.reasoning}</p>
                        </div>
                        <Badge className="bg-[#4B0A8F] text-white font-black text-[9px] uppercase px-2 py-0.5 rounded-full shrink-0">
                          {rec.confidence} Match
                        </Badge>
                      </div>

                      {/* Interview Evaluation Rubric Card */}
                      <div className="p-3 rounded-xl bg-white border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <GraduationCap className="w-3 h-3 text-[#4B0A8F]" />
                            Interview Evaluation Rubric
                          </span>
                          {latestInterview?.totalScore !== undefined ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                              Score: {latestInterview.totalScore} / 300
                            </Badge>
                          ) : (
                            <button
                              onClick={() => handleOpenInterview(app)}
                              className="text-[10px] font-bold text-[#4B0A8F] hover:underline"
                            >
                              + Record Score
                            </button>
                          )}
                        </div>

                        {latestInterview ? (
                          <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
                            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="text-[9px] text-slate-400 block font-medium">Character</span>
                              <span className="text-xs font-bold text-slate-900">{latestInterview.score1 ?? "—"}/100</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="text-[9px] text-slate-400 block font-medium">Academic</span>
                              <span className="text-xs font-bold text-slate-900">{latestInterview.score2 ?? "—"}/100</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="text-[9px] text-slate-400 block font-medium">Leadership</span>
                              <span className="text-xs font-bold text-slate-900">{latestInterview.score3 ?? "—"}/100</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">No interview rubric recorded yet.</p>
                        )}
                      </div>

                      {/* Notes if any */}
                      {app.notes && (
                        <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <FileText className="w-3 h-3 text-slate-400" />
                            Internal Notes
                          </span>
                          <p className="text-slate-600 text-[11px] mt-0.5 italic">{app.notes}</p>
                        </div>
                      )}

                      {/* Quick Status Action Row */}
                      <div className="pt-2 flex items-center gap-2 flex-wrap">
                        {app.status === "submitted" && (
                          <Button
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: app.id, status: "screening" })}
                            className="h-8 flex-1 bg-[#1F0860] hover:bg-[#18064a] text-white text-xs font-bold rounded-xl"
                          >
                            Move to Screening
                          </Button>
                        )}

                        {(app.status === "screening" || app.status === "submitted") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: app.id, status: "interview_scheduled" })}
                            className="h-8 flex-1 border-purple-200 text-[#4B0A8F] hover:bg-purple-50 text-xs font-bold rounded-xl"
                          >
                            Schedule Interview
                          </Button>
                        )}

                        {app.status === "interview_scheduled" && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenInterview(app)}
                            className="h-8 flex-1 bg-[#4B0A8F] hover:bg-[#3d0875] text-white text-xs font-bold rounded-xl"
                          >
                            Evaluate & Score
                          </Button>
                        )}

                        {app.status !== "accepted" && app.status !== "enrolled" && (
                          <Button
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: app.id, status: "accepted" })}
                            className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                          >
                            Accept
                          </Button>
                        )}

                        {app.status !== "rejected" && app.status !== "enrolled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: app.id, status: "rejected" })}
                            className="h-8 px-3 border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl"
                          >
                            Reject
                          </Button>
                        )}

                        {app.status === "accepted" && (
                          <div className="w-full p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center text-xs font-bold flex items-center justify-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Accepted • Ready for Participant Enrollment</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ─── Add Application Bottom Sheet ─────────────────────────────────── */}
      <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-w-[460px] mx-auto p-6 max-h-[90vh] overflow-y-auto">
          <SheetHeader className="text-left pb-4 border-b border-slate-100">
            <SheetTitle className="text-lg font-black text-[#1F0860]">
              New Admission Application
            </SheetTitle>
            <p className="text-xs text-slate-500 font-medium">
              Register a student for intake review and cohort placement
            </p>
          </SheetHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-4 text-xs">
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Applicant Full Name *</Label>
              <Input
                placeholder="e.g. Muhammad Bilal"
                value={newApplicantName}
                onChange={(e) => setNewApplicantName(e.target.value)}
                className="rounded-xl h-10 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Guardian Name *</Label>
                <Input
                  placeholder="e.g. Tariq Mehmood"
                  value={newGuardianName}
                  onChange={(e) => setNewGuardianName(e.target.value)}
                  className="rounded-xl h-10 text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Guardian Phone *</Label>
                <Input
                  placeholder="0300-1234567"
                  value={newGuardianPhone}
                  onChange={(e) => setNewGuardianPhone(e.target.value)}
                  className="rounded-xl h-10 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Gender</Label>
                <Select value={newGender} onValueChange={setNewGender}>
                  <SelectTrigger className="rounded-xl h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Date of Birth</Label>
                <Input
                  type="date"
                  value={newDob}
                  onChange={(e) => setNewDob(e.target.value)}
                  className="rounded-xl h-10 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Preferred Park</Label>
              <Select value={newParkId} onValueChange={setNewParkId}>
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue placeholder="Select Preferred Park" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="park-umme-hani">Umme Hani Park</SelectItem>
                  <SelectItem value="park-nazimabad">Nazimabad Park</SelectItem>
                  <SelectItem value="park-bufferzone">Bufferzone Park</SelectItem>
                  <SelectItem value="park-gulshan">Gulshan Park</SelectItem>
                  <SelectItem value="park-johar">Johar Park</SelectItem>
                  <SelectItem value="park-saddar">Saddar Park</SelectItem>
                  {parksData?.map((p: any) => (
                    <SelectItem key={p.parkId} value={p.parkId}>
                      {p.parkName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4 Confirmed Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Emergency Contact</Label>
                <Input
                  placeholder="Relative or Mother"
                  value={newEmergencyContact}
                  onChange={(e) => setNewEmergencyContact(e.target.value)}
                  className="rounded-xl h-10 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Emergency Phone</Label>
                <Input
                  placeholder="0321-7654321"
                  value={newEmergencyPhone}
                  onChange={(e) => setNewEmergencyPhone(e.target.value)}
                  className="rounded-xl h-10 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Previous Education</Label>
                <Input
                  placeholder="e.g. Matric / Grade 9"
                  value={newPreviousEducation}
                  onChange={(e) => setNewPreviousEducation(e.target.value)}
                  className="rounded-xl h-10 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Referral / Reference</Label>
                <Input
                  placeholder="e.g. Mosque, Friend, Banner"
                  value={newReference}
                  onChange={(e) => setNewReference(e.target.value)}
                  className="rounded-xl h-10 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Notes (Optional)</Label>
              <Textarea
                placeholder="Any special remarks, sports experience or health considerations..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="rounded-xl text-xs resize-none"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                className="flex-1 rounded-xl h-11 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createApplicationMutation.isPending}
                className="flex-1 bg-[#4B0A8F] hover:bg-[#3d0875] text-white rounded-xl h-11 text-xs font-bold"
              >
                {createApplicationMutation.isPending ? "Submitting..." : "Save Application"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* ─── Interview Rubric Bottom Sheet ─────────────────────────────────── */}
      <Sheet open={isInterviewOpen} onOpenChange={setIsInterviewOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-w-[460px] mx-auto p-6 max-h-[90vh] overflow-y-auto">
          <SheetHeader className="text-left pb-4 border-b border-slate-100">
            <SheetTitle className="text-lg font-black text-[#1F0860]">
              Interview Scoring Rubric
            </SheetTitle>
            <p className="text-xs text-slate-500 font-medium">
              Candidate: {selectedAppForInterview?.applicantName} ({selectedAppForInterview?.trackingCode})
            </p>
          </SheetHeader>

          <div className="space-y-5 py-4 text-xs">
            {/* 3 Rubric Sliders (0-100) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">1. Character & Akhlaq</span>
                <span className="font-black text-[#4B0A8F] text-sm">{scoreCharacter} / 100</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={scoreCharacter}
                onChange={(e) => setScoreCharacter(Number(e.target.value))}
                className="w-full accent-[#4B0A8F] cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">Respect, manners, responsiveness, and discipline</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">2. Academic & Islamic Literacy</span>
                <span className="font-black text-[#4B0A8F] text-sm">{scoreAcademic} / 100</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={scoreAcademic}
                onChange={(e) => setScoreAcademic(Number(e.target.value))}
                className="w-full accent-[#4B0A8F] cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">Basic Quranic reading, school standing, and learning curiosity</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">3. Physical & Leadership Potential</span>
                <span className="font-black text-[#4B0A8F] text-sm">{scoreLeadership} / 100</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={scoreLeadership}
                onChange={(e) => setScoreLeadership(Number(e.target.value))}
                className="w-full accent-[#4B0A8F] cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">Team participation, athletic aptitude, and stamina</p>
            </div>

            {/* Total Rubric Badge */}
            <div className="p-3 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-between">
              <span className="font-bold text-[#1F0860]">Total Rubric Score</span>
              <span className="text-base font-black text-[#4B0A8F]">
                {scoreCharacter + scoreAcademic + scoreLeadership} / 300
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Interview Remarks & Observations</Label>
              <Textarea
                placeholder="Summarize candidate strengths, areas needing tarbiyah, and cohort fit..."
                value={interviewNotes}
                onChange={(e) => setInterviewNotes(e.target.value)}
                className="rounded-xl text-xs resize-none"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInterviewOpen(false)}
                className="flex-1 rounded-xl h-11 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveInterview}
                disabled={recordInterviewMutation.isPending}
                className="flex-1 bg-[#4B0A8F] hover:bg-[#3d0875] text-white rounded-xl h-11 text-xs font-bold"
              >
                {recordInterviewMutation.isPending ? "Saving..." : "Save Evaluation"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
