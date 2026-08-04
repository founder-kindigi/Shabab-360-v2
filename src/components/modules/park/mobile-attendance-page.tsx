"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  CheckSquare,
  Users,
  Filter,
  Save,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StudentRosterItem {
  id: string;
  name: string;
  code: string;
  group: string;
  status: "present" | "absent" | "late" | "excused" | "unmarked";
}

interface MobileAttendancePageProps {
  onBack?: () => void;
}

export function MobileAttendancePage({ onBack }: MobileAttendancePageProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "unmarked" | "present" | "absent" | "late" | "excused">("all");

  // Initial demo/fallback roster
  const [rosterState, setRosterState] = useState<StudentRosterItem[]>([
    { id: "s-1", name: "Muhammad Ali Raza", code: "LHR-SLP-001", group: "Group 01 (Senior)", status: "present" },
    { id: "s-2", name: "Hassan Ahmed", code: "LHR-SLP-002", group: "Group 01 (Senior)", status: "present" },
    { id: "s-[#3]", name: "Usman Ghani", code: "LHR-SLP-003", group: "Group 01 (Senior)", status: "absent" },
    { id: "s-4", name: "Zaid Omar", code: "LHR-SLP-004", group: "Group 01 (Senior)", status: "late" },
    { id: "s-5", name: "Bilal Farooq", code: "LHR-SLP-005", group: "Group 01 (Senior)", status: "unmarked" },
    { id: "s-6", name: "Hamza Tariq", code: "LHR-SLP-006", group: "Group 01 (Senior)", status: "unmarked" },
    { id: "s-7", name: "Abdullah Zubair", code: "LHR-SLP-007", group: "Group 01 (Senior)", status: "unmarked" },
    { id: "s-8", name: "Saad Mahmood", code: "LHR-SLP-008", group: "Group 01 (Senior)", status: "unmarked" },
  ]);

  // ─── Real DB Query ─────────────────────────────────────────────────────
  const { data: dbParticipantsData, isLoading: isDbLoading } = useQuery({
    queryKey: ["mobile-attendance-participants"],
    queryFn: async () => {
      const res = await fetch("/api/park/participants");
      if (!res.ok) return null;
      return res.json();
    },
    retry: 1,
    staleTime: 30000,
  });

  // ─── Real DB Mutation ──────────────────────────────────────────────────
  const syncAttendanceMutation = useMutation({
    mutationFn: async (records: { participantId: string; status: string }[]) => {
      const res = await fetch("/api/park/attendance/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });
      if (!res.ok) throw new Error("Sync failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Attendance synced with server database successfully!");
      queryClient.invalidateQueries({ queryKey: ["mobile-attendance-participants"] });
    },
    onError: () => {
      toast.error("Failed to sync attendance. Check network connection.");
    },
  });

  // Toggle or set student attendance status
  const handleMarkStatus = (studentId: string, status: StudentRosterItem["status"]) => {
    setRosterState((prev) =>
      prev.map((item) => (item.id === studentId ? { ...item, status } : item))
    );
  };

  // Filtered roster based on search and tab filter
  const filteredRoster = useMemo(() => {
    return rosterState.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || student.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [rosterState, searchQuery, filterStatus]);

  // Calculate statistics
  const totalStudents = rosterState.length;
  const markedCount = rosterState.filter((s) => s.status !== "unmarked").length;
  const presentCount = rosterState.filter((s) => s.status === "present").length;
  const absentCount = rosterState.filter((s) => s.status === "absent").length;
  const lateCount = rosterState.filter((s) => s.status === "late").length;
  const excusedCount = rosterState.filter((s) => s.status === "excused").length;
  const unmarkedCount = rosterState.filter((s) => s.status === "unmarked").length;
  const progressPercent = Math.round((markedCount / totalStudents) * 100);

  const handleSaveSync = () => {
    const payload = rosterState.map((s) => ({
      participantId: s.id,
      status: s.status,
    }));
    syncAttendanceMutation.mutate(payload);
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-28 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] text-white pt-6 pb-12 px-5 rounded-b-[2rem] shadow-xl overflow-hidden">
        {/* Glow Rings */}
        <div className="absolute top-[-20%] right-[-10%] size-60 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="size-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/25 active:scale-95 transition-all"
              >
                <ArrowLeft className="size-5" />
              </button>
            )}
            <div className="size-10 rounded-2xl bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] border border-white/30 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
              <img src="/shabab-logo.png" alt="Shabab Logo" className="size-full object-contain" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-extrabold text-white tracking-tight">Attendance Roster</h1>
              <p className="text-xs text-purple-200 font-medium">State Life Park • Sunday Halqa</p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] md:text-xs font-semibold bg-white/15 px-3 py-1 rounded-full border border-white/20 backdrop-blur-md">
            {isDbLoading ? (
              <RefreshCw className="size-3.5 animate-spin text-purple-200" />
            ) : (
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
            <span>DB Connected</span>
          </div>
        </div>

        {/* ─── Search & Filter Bar inside Header Card ──────────────────────── */}
        <div className="mt-4 relative z-10 space-y-3">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-purple-200" />
            <input
              type="text"
              placeholder="Search student by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white/15 text-white placeholder:text-purple-200/70 text-xs md:text-sm font-medium border border-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400/50 backdrop-blur-md transition-all"
            />
          </div>

          {/* Filter Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: "all", label: `All (${totalStudents})` },
              { id: "unmarked", label: `Unmarked (${unmarkedCount})` },
              { id: "present", label: `Present (${presentCount})` },
              { id: "absent", label: `Absent (${absentCount})` },
              { id: "late", label: `Late (${lateCount})` },
              { id: "excused", label: `Excused (${excusedCount})` },
            ].map((tab) => {
              const isActive = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95",
                    isActive
                      ? "bg-amber-400 text-slate-950 shadow-md font-extrabold"
                      : "bg-white/10 text-purple-100 hover:bg-white/20 backdrop-blur-sm"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Roster Progress Bar Card ────────────────────────────────────── */}
      <div className="-mt-5 px-4 z-20 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-3xl bg-card border border-border/80 shadow-md space-y-2"
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-muted-foreground uppercase tracking-wider">Attendance Progress</span>
            <span className="text-[#4B0A8F] dark:text-purple-300 font-extrabold">
              {markedCount} / {totalStudents} Marked ({progressPercent}%)
            </span>
          </div>
          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border/40">
            <div
              className="h-full bg-gradient-to-r from-[#D90429] via-[#4B0A8F] to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </motion.div>

        {/* ─── Student Roster Grid ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3">
          {filteredRoster.map((student) => {
            const isPresent = student.status === "present";
            const isAbsent = student.status === "absent";
            const isLate = student.status === "late";
            const isExcused = student.status === "excused";

            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-4 rounded-3xl bg-card border transition-all shadow-sm space-y-3",
                  isPresent && "border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20",
                  isAbsent && "border-rose-500/40 bg-rose-50/30 dark:bg-rose-950/20",
                  isLate && "border-amber-500/40 bg-amber-50/30 dark:bg-amber-950/20",
                  isExcused && "border-sky-500/40 bg-sky-50/30 dark:bg-sky-950/20",
                  student.status === "unmarked" && "border-border/80"
                )}
              >
                {/* Student Info Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-2xl bg-[#4B0A8F]/10 text-[#4B0A8F] dark:text-purple-300 font-extrabold text-xs flex items-center justify-center border border-[#4B0A8F]/20 shrink-0">
                      {student.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-foreground">{student.name}</h4>
                      <p className="text-xs text-muted-foreground font-medium">{student.code} • {student.group}</p>
                    </div>
                  </div>

                  {/* Active Status Badge */}
                  <span
                    className={cn(
                      "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border",
                      isPresent && "bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/30",
                      isAbsent && "bg-rose-500 text-white border-rose-600 shadow-sm shadow-rose-500/30",
                      isLate && "bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/30",
                      isExcused && "bg-sky-500 text-white border-sky-600 shadow-sm shadow-sky-500/30",
                      student.status === "unmarked" && "bg-muted text-muted-foreground border-border"
                    )}
                  >
                    {student.status}
                  </span>
                </div>

                {/* ─── 44px Touch Action Mark Buttons ────────────────────────── */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {/* Present (P) */}
                  <button
                    onClick={() => handleMarkStatus(student.id, "present")}
                    className={cn(
                      "h-11 rounded-2xl font-black text-xs flex items-center justify-center gap-1 transition-all active:scale-95 border",
                      isPresent
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/50"
                        : "bg-muted/60 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600 border-border/60"
                    )}
                  >
                    <CheckCircle2 className="size-4" />
                    <span>P</span>
                  </button>

                  {/* Absent (A) */}
                  <button
                    onClick={() => handleMarkStatus(student.id, "absent")}
                    className={cn(
                      "h-11 rounded-2xl font-black text-xs flex items-center justify-center gap-1 transition-all active:scale-95 border",
                      isAbsent
                        ? "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-500/30 ring-2 ring-rose-400/50"
                        : "bg-muted/60 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 border-border/60"
                    )}
                  >
                    <XCircle className="size-4" />
                    <span>A</span>
                  </button>

                  {/* Late (L) */}
                  <button
                    onClick={() => handleMarkStatus(student.id, "late")}
                    className={cn(
                      "h-11 rounded-2xl font-black text-xs flex items-center justify-center gap-1 transition-all active:scale-95 border",
                      isLate
                        ? "bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-500/30 ring-2 ring-amber-400/50"
                        : "bg-muted/60 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600 border-border/60"
                    )}
                  >
                    <Clock className="size-4" />
                    <span>L</span>
                  </button>

                  {/* Excused (E) */}
                  <button
                    onClick={() => handleMarkStatus(student.id, "excused")}
                    className={cn(
                      "h-11 rounded-2xl font-black text-xs flex items-center justify-center gap-1 transition-all active:scale-95 border",
                      isExcused
                        ? "bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-500/30 ring-2 ring-sky-400/50"
                        : "bg-muted/60 text-muted-foreground hover:bg-sky-500/10 hover:text-sky-600 border-border/60"
                    )}
                  >
                    <HelpCircle className="size-4" />
                    <span>E</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ─── Floating Save & Sync Button ──────────────────────────────── */}
        <div className="fixed bottom-4 left-4 right-4 z-40">
          <button
            onClick={handleSaveSync}
            disabled={syncAttendanceMutation.isPending}
            className="w-full h-14 rounded-2xl bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white font-extrabold text-sm shadow-2xl shadow-[#4B0A8F]/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-purple-400/30"
          >
            {syncAttendanceMutation.isPending ? (
              <>
                <RefreshCw className="size-5 animate-spin text-purple-200" />
                <span>Syncing Database...</span>
              </>
            ) : (
              <>
                <Save className="size-5 text-amber-300" />
                <span>Submit & Sync Attendance ({markedCount}/{totalStudents})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
