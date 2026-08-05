"use client";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Phone,
  BookOpen,
  UserCheck,
  Building2,
  FileText,
  Sparkles,
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";
import { recommendCohort } from "@/lib/admissions/cohort-engine";

interface MobileAdmissionsPageProps {
  onBack?: () => void;
}

export function MobileAdmissionsPage({ onBack }: MobileAdmissionsPageProps) {
  const { data: session } = useSession();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ─── Real DB Query ─────────────────────────────────────────────────────
  const { data: admissionsData, isLoading, refetch } = useQuery({
    queryKey: ["admissions-list-real", statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      const res = await fetch(`/api/admin/admissions?${params.toString()}`);
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 15000
  });

  const applications: any[] = admissionsData?.data ?? [];
  const totalCount = admissionsData?.pagination?.total ?? applications.length;

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-6 pb-6 px-5 rounded-b-[2rem] shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="size-8 rounded-xl bg-white/10 flex items-center justify-center text-white active:scale-95"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <div className="size-9 rounded-xl bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] border border-white/20 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
              <img src="/shabab-logo.png" alt="Logo" className="size-full object-contain" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white">Admissions Desk</h1>
              <p className="text-[11px] text-purple-200">Total: {totalCount} Applications</p>
            </div>
          </div>

          <button
            onClick={() => refetch()}
            className="flex items-center gap-1 text-[10px] font-bold bg-white/10 px-2.5 py-1 rounded-full border border-white/15 active:scale-95"
          >
            {isLoading ? <RefreshCw className="size-3 animate-spin text-purple-300" /> : <UserPlus className="size-3 text-emerald-400" />}
            <span>Sync</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full mt-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-purple-300" />
          <input
            type="text"
            placeholder="Search by name, code, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-purple-200/60 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar pb-1">
          {["all", "submitted", "screening", "interview_scheduled", "accepted", "enrolled", "rejected"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-bold capitalize whitespace-nowrap transition-all",
                statusFilter === st
                  ? "bg-white text-[#4B0A8F] shadow-sm"
                  : "bg-white/10 text-purple-100 border border-white/10 hover:bg-white/20"
              )}
            >
              {st === "all" ? "All" : st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Applicants List ──────────────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-xs text-muted-foreground">
            <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-[#4B0A8F]" />
            Loading admissions roster…
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12 text-xs text-muted-foreground bg-card rounded-3xl border border-border/80 p-6">
            <UserPlus className="size-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="font-semibold text-foreground">No applications found</p>
            <p className="mt-1 text-[11px]">No records match the current status filter or search parameters.</p>
          </div>
        ) : (
          applications.map((app: any) => {
            const isExpanded = expandedId === app.id;
            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl bg-card border border-border/80 shadow-sm overflow-hidden"
              >
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
                  className="p-4 cursor-pointer hover:bg-muted/30 transition-all space-y-2 focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                          {app.trackingCode}
                        </span>
                        <h3 className="text-sm font-extrabold text-foreground">{app.applicantName}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Guardian: {app.guardianName} ({app.guardianPhone})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize",
                        app.status === "enrolled" || app.status === "accepted"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300"
                          : app.status === "rejected"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300"
                      )}>
                        {app.status.replace("_", " ")}
                      </span>
                      {isExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span>Park: {app.preferredPark?.name || "Unassigned"}</span>
                    <span>City: {app.city?.name || "Lahore"}</span>
                  </div>
                </div>

                {/* Expanded Details Section — includes all 4 confirmed fields */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-4 pt-2 border-t border-border/60 bg-muted/20 space-y-2.5 text-xs"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-xl bg-card border border-border/60 space-y-0.5">
                          <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Phone className="size-3 text-[#4B0A8F]" />
                            Emergency Contact
                          </span>
                          <p className="font-bold text-foreground truncate">
                            {app.emergencyContact || "Not specified"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {app.emergencyPhone || "—"}
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-card border border-border/60 space-y-0.5">
                          <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                            <BookOpen className="size-3 text-[#4B0A8F]" />
                            Previous Education
                          </span>
                          <p className="font-bold text-foreground truncate">
                            {app.previousEducation || "Not specified"}
                          </p>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-card border border-border/60 space-y-0.5">
                        <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                          <UserCheck className="size-3 text-[#4B0A8F]" />
                          Reference / Referral Source
                        </span>
                        <p className="font-bold text-foreground">
                          {app.reference || "None listed"}
                        </p>
                      </div>

                      {/* ─── Cohort Placement Recommendation ─────────────── */}
                      {(() => {
                        const rec = recommendCohort(app.age, app.previousEducation);
                        return (
                          <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 flex items-center justify-between">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 flex items-center gap-1">
                                <Award className="size-3" />
                                Recommended Cohort
                              </span>
                              <p className="text-xs font-extrabold text-sky-900 dark:text-sky-100">
                                {rec.cohortName} Cohort
                              </p>
                              <p className="text-[10px] text-sky-600 dark:text-sky-400">{rec.reasoning}</p>
                            </div>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase bg-sky-200 text-sky-800 dark:bg-sky-900 dark:text-sky-200">
                              {rec.confidence} Match
                            </span>
                          </div>
                        );
                      })()}

                      {/* ─── Interview Scoring Rubric Section ────────────────── */}
                      <div className="p-3 rounded-xl bg-[#4B0A8F]/5 border border-[#4B0A8F]/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B0A8F] dark:text-purple-300 flex items-center gap-1">
                            <Sparkles className="size-3" />
                            Interview Evaluation Rubric
                          </span>
                          {app.interviews?.[0]?.totalScore !== undefined && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-[#4B0A8F] dark:bg-purple-950/60 dark:text-purple-300">
                              Score: {app.interviews[0].totalScore} / 300
                            </span>
                          )}
                        </div>

                        {app.interviews && app.interviews.length > 0 ? (
                          <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
                            <div className="p-1.5 rounded-lg bg-card border border-border/60">
                              <span className="text-[9px] text-muted-foreground block">Character</span>
                              <span className="text-xs font-bold text-foreground">{app.interviews[0].score1 ?? "—"}/100</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-card border border-border/60">
                              <span className="text-[9px] text-muted-foreground block">Academic</span>
                              <span className="text-xs font-bold text-foreground">{app.interviews[0].score2 ?? "—"}/100</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-card border border-border/60">
                              <span className="text-[9px] text-muted-foreground block">Leadership</span>
                              <span className="text-xs font-bold text-foreground">{app.interviews[0].score3 ?? "—"}/100</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground italic">No interview evaluation recorded yet.</p>
                        )}
                      </div>

                      {app.notes && (
                        <div className="p-2.5 rounded-xl bg-card border border-border/60 space-y-0.5">
                          <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                            <FileText className="size-3 text-[#4B0A8F]" />
                            Internal Notes
                          </span>
                          <p className="text-muted-foreground italic">{app.notes}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
