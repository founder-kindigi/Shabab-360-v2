"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarCheck,
  Users,
  CheckSquare,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Search,
  MapPin,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Layers,
  Filter
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileMashwaraPageProps {
  onBack?: () => void;
}

const MOCK_MOBILE_MEETINGS = [
  {
    id: "m1",
    title: "Lahore Weekly Leadership Mashwara #14",
    scheduledAt: "2026-08-08T17:00:00.000Z",
    location: "Gulberg Central Office / Conference Hall",
    city: "Lahore",
    status: "scheduled",
    decisionsCount: 5,
    actionItemsCount: 8,
    karguzariSummary: "Discussion on Batch 4 attendance metrics, Murabbi team coordination, and upcoming Sports Gala.",
  },
  {
    id: "m2",
    title: "Gulshan Iqbal Park Lead Review #12",
    scheduledAt: "2026-08-01T16:00:00.000Z",
    location: "Gulshan Iqbal Park Desk",
    city: "Lahore",
    status: "completed",
    decisionsCount: 4,
    actionItemsCount: 6,
    karguzariSummary: "Reviewed sports equipment allocations and Tadreeb curriculum progress for Senior cohort.",
  },
  {
    id: "m3",
    title: "Johar Town & Griffin Executive Mashwara",
    scheduledAt: "2026-07-25T17:30:00.000Z",
    location: "Johar Town Main Desk",
    city: "Lahore",
    status: "completed",
    decisionsCount: 6,
    actionItemsCount: 7,
    karguzariSummary: "Evaluated admissions intake targets and calling workload dispatch for Round 2 follow-ups.",
  },
];

export function MobileMashwaraPage({ onBack }: MobileMashwaraPageProps) {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMeeting, setSelectedMeeting] = useState<any | null>(null);

  // ─── Real DB Queries ───────────────────────────────────────────────────
  const { data: mashwaraData, isLoading } = useQuery({
    queryKey: ["mashwara-list-mobile"],
    queryFn: async () => {
      const res = await fetch("/api/admin/mashwara");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000,
  });

  const apiMeetings: any[] = mashwaraData?.data ?? mashwaraData?.meetings ?? [];
  const displayMeetings = apiMeetings.length > 0 ? apiMeetings : MOCK_MOBILE_MEETINGS;

  const filteredMeetings = displayMeetings.filter((m) => {
    const matchSearch =
      !searchQuery ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.location && m.location.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchStatus = statusFilter === "all" || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-foreground pb-28 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-6 pb-8 px-5 rounded-b-[2.5rem] shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="size-9 rounded-2xl bg-white/10 active:scale-95 transition-transform flex items-center justify-center text-white backdrop-blur-md border border-white/15"
              >
                <ArrowLeft className="size-5" />
              </button>
            )}
            <div className="size-10 rounded-2xl bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] border border-white/20 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
              <img src="/shabab-logo.png" alt="Logo" className="size-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                هفتہ وار مشورہ
              </h1>
              <p className="text-[11px] text-purple-200 font-medium">Weekly Executive Consultation</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-bold bg-white/10 px-3 py-1.5 rounded-full border border-white/15 backdrop-blur-md">
            {isLoading ? (
              <RefreshCw className="size-3 animate-spin text-purple-300" />
            ) : (
              <CalendarCheck className="size-3 text-emerald-400" />
            )}
            <span>{apiMeetings.length > 0 ? "DB Live" : "Demo Mode"}</span>
          </div>
        </div>

        {/* Mini Stats Bar */}
        <div className="relative z-10 grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 text-center border border-white/10">
            <span className="text-[10px] uppercase tracking-wider text-purple-200 font-bold block">Meetings</span>
            <span className="text-base font-black text-white">{displayMeetings.length}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 text-center border border-white/10">
            <span className="text-[10px] uppercase tracking-wider text-purple-200 font-bold block">Decisions</span>
            <span className="text-base font-black text-emerald-300">
              {displayMeetings.reduce((acc, m) => acc + (m.decisionsCount || m._count?.decisions || 0), 0)}
            </span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 text-center border border-white/10">
            <span className="text-[10px] uppercase tracking-wider text-purple-200 font-bold block">Action Items</span>
            <span className="text-base font-black text-amber-300">
              {displayMeetings.reduce((acc, m) => acc + (m.actionItemsCount || m._count?.actionItems || 0), 0)}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Search & Status Filters ────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Mashwara meetings..."
            className="pl-10 h-11 rounded-2xl bg-card border-slate-200 dark:border-slate-800 shadow-sm font-medium text-xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "all", label: "All Sessions" },
            { id: "scheduled", label: "Scheduled" },
            { id: "completed", label: "Completed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                statusFilter === tab.id
                  ? "bg-[#4B0A8F] text-white border-[#4B0A8F] shadow-md"
                  : "bg-card text-muted-foreground border-slate-200 dark:border-slate-800 hover:border-purple-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Meetings Roster List ───────────────────────────────────────── */}
      <div className="px-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-xs text-muted-foreground bg-card rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
            <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-[#4B0A8F]" />
            Loading Mashwara roster…
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="text-center py-12 text-xs text-muted-foreground bg-card rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
            <CalendarCheck className="size-10 mx-auto mb-2 text-muted-foreground/40" />
            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">No Mashwara Sessions Found</p>
            <p className="mt-1 text-xs">No scheduled or completed meetings matching your filter.</p>
          </div>
        ) : (
          filteredMeetings.map((meeting: any) => {
            const decisionsCount = meeting.decisionsCount ?? meeting._count?.decisions ?? 0;
            const actionItemsCount = meeting.actionItemsCount ?? meeting._count?.actionItems ?? 0;
            const dateStr = meeting.scheduledAt
              ? new Date(meeting.scheduledAt).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : meeting.date ?? "Scheduled";

            return (
              <motion.div
                key={meeting.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedMeeting(meeting)}
                className="p-4 rounded-3xl bg-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 cursor-pointer hover:border-purple-300 dark:hover:border-purple-900 transition-all active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                        {meeting.title}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                      <Clock className="size-3 text-purple-600 shrink-0" />
                      {dateStr}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "capitalize text-[10px] font-extrabold shrink-0 border",
                      meeting.status === "completed"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200"
                        : "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200"
                    )}
                  >
                    {meeting.status}
                  </Badge>
                </div>

                {meeting.location && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <MapPin className="size-3 text-slate-400 shrink-0" />
                    {meeting.location}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-lg border border-purple-100 dark:border-purple-900/30 text-[11px]">
                      {decisionsCount} Decisions
                    </span>
                    <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-lg border border-amber-100 dark:border-amber-900/30 text-[11px]">
                      {actionItemsCount} Action Items
                    </span>
                  </div>
                  <ChevronRight className="size-4 text-slate-400" />
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ─── Detail Drawer / Modal for Mobile Selection ───────────────────── */}
      <AnimatePresence>
        {selectedMeeting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-lg bg-card rounded-t-[2.5rem] sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 font-bold">
                    {selectedMeeting.status.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-medium">
                    {selectedMeeting.city || "Lahore"} Scope
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {selectedMeeting.title}
                </h2>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3.5 text-purple-600" />
                  {new Date(selectedMeeting.scheduledAt || Date.now()).toLocaleString()}
                </p>
              </div>

              {selectedMeeting.karguzariSummary && (
                <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-2xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 tracking-wider">
                    Karguzari & Minutes Summary
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {selectedMeeting.karguzariSummary}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-xs font-bold text-muted-foreground block">Decisions Logged</span>
                  <span className="text-lg font-black text-purple-600">
                    {selectedMeeting.decisionsCount || selectedMeeting._count?.decisions || 0}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-xs font-bold text-muted-foreground block">Action Items</span>
                  <span className="text-lg font-black text-amber-600">
                    {selectedMeeting.actionItemsCount || selectedMeeting._count?.actionItems || 0}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedMeeting(null)}
                  className="flex-1 rounded-2xl font-bold h-12"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
