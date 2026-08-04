"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  Save,
  Users,
  WifiOff,
  Filter,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";

type AttendanceStatus = "present" | "absent" | "late" | "excused" | null;

interface StudentItem {
  id: string;
  name: string;
  code: string;
  group: string;
  status: AttendanceStatus;
}

const INITIAL_ROSTER: StudentItem[] = [
  { id: "s1", name: "Muhammad Ali Raza", code: "LHR-SLP-001", group: "Group 01 (Senior)", status: "present" },
  { id: "s2", name: "Hassan Ahmed", code: "LHR-SLP-002", group: "Group 01 (Senior)", status: "present" },
  { id: "s3", name: "Usman Tariq", code: "LHR-SLP-003", group: "Group 01 (Senior)", status: "absent" },
  { id: "s4", name: "Zubair Khan", code: "LHR-SLP-004", group: "Group 01 (Senior)", status: "late" },
  { id: "s5", name: "Bilal Hussain", code: "LHR-SLP-005", group: "Group 01 (Senior)", status: "present" },
  { id: "s6", name: "Hamza Farooq", code: "LHR-SLP-006", group: "Group 01 (Senior)", status: "present" },
  { id: "s7", name: "Omer Saeed", code: "LHR-SLP-007", group: "Group 01 (Senior)", status: null },
  { id: "s8", name: "Saad Malik", code: "LHR-SLP-008", group: "Group 01 (Senior)", status: null },
  { id: "s9", name: "Abdullah Noman", code: "LHR-SLP-009", group: "Group 01 (Senior)", status: "present" },
  { id: "s10", name: "Taimoor Shah", code: "LHR-SLP-010", group: "Group 01 (Senior)", status: "present" },
  { id: "s11", name: "Danial Akbar", code: "LHR-SLP-011", group: "Group 01 (Senior)", status: null },
  { id: "s12", name: "Waqas Mahmood", code: "LHR-SLP-012", group: "Group 01 (Senior)", status: null },
];

export function MobileAttendancePage({ onBack }: { onBack?: () => void }) {
  const [roster, setRoster] = useState<StudentItem[]>(INITIAL_ROSTER);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Quick mark handler
  function setStudentStatus(id: string, status: AttendanceStatus) {
    setRoster((prev) =>
      prev.map((student) =>
        student.id === id ? { ...student, status: student.status === status ? null : status } : student
      )
    );
    setIsSaved(false);
  }

  // Filter & Search logic
  const filteredRoster = roster.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.code.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterStatus === "all") return matchesSearch;
    if (filterStatus === "unmarked") return matchesSearch && student.status === null;
    return matchesSearch && student.status === filterStatus;
  });

  // Summary counts
  const totalCount = roster.length;
  const presentCount = roster.filter((r) => r.status === "present").length;
  const absentCount = roster.filter((r) => r.status === "absent").length;
  const lateCount = roster.filter((r) => r.status === "late").length;
  const excusedCount = roster.filter((r) => r.status === "excused").length;
  const unmarkedCount = roster.filter((r) => r.status === null).length;

  const presentPercentage = Math.round((presentCount / totalCount) * 100);

  function handleSave() {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setIsSaved(true);
    }, 600);
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-28 select-none">
      {/* ─── Sticky Brand Header ────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pt-3 pb-3 px-4 border-b border-border/60 space-y-3">
        {/* Row 1: Back, Title, Park Badge */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="size-10 rounded-2xl bg-muted/60 hover:bg-muted flex items-center justify-center text-foreground transition-all active:scale-95 shrink-0"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold truncate">State Life Park</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4B0A8F] text-white shrink-0">
                Group 01
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">Batch 4 • Sunday Attendance</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name or ID..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/60 border border-border/80 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#4B0A8F] focus:border-transparent transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {[
            { id: "all", label: "All", count: totalCount },
            { id: "unmarked", label: "Unmarked", count: unmarkedCount },
            { id: "present", label: "Present", count: presentCount },
            { id: "absent", label: "Absent", count: absentCount },
            { id: "late", label: "Late", count: lateCount },
            { id: "excused", label: "Excused", count: excusedCount },
          ].map((tab) => {
            const isActive = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 active:scale-95",
                  isActive
                    ? "bg-[#4B0A8F] text-white shadow-md shadow-[#4B0A8F]/20"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "text-[10px] font-bold rounded-full px-1.5 py-0.2 text-center min-w-[16px]",
                    isActive ? "bg-white/20 text-white" : "bg-background text-foreground"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Attendance KPI Summary Bar ──────────────────────────────────── */}
      <div className="p-4 space-y-3">
        <div className="p-3.5 rounded-2xl bg-card border border-border/80 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-foreground">
              <Users className="size-4 text-[#4B0A8F]" />
              Session Attendance Progress
            </span>
            <span className="text-[#4B0A8F] dark:text-purple-400 font-extrabold">{presentPercentage}% Present</span>
          </div>

          {/* Progress Bar */}
          <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                presentPercentage >= 75
                  ? "bg-emerald-500"
                  : presentPercentage >= 50
                  ? "bg-amber-500"
                  : "bg-red-500"
              )}
              style={{ width: `${presentPercentage}%` }}
            />
          </div>

          {/* KPI Chips Grid */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-center border border-emerald-200/50">
              <div className="text-base font-black text-emerald-700 dark:text-emerald-400">{presentCount}</div>
              <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Present</div>
            </div>

            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/30 text-center border border-red-200/50">
              <div className="text-base font-black text-red-700 dark:text-red-400">{absentCount}</div>
              <div className="text-[10px] font-semibold text-red-600 dark:text-red-400">Absent</div>
            </div>

            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-center border border-amber-200/50">
              <div className="text-base font-black text-amber-700 dark:text-amber-400">{lateCount}</div>
              <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Late</div>
            </div>

            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-center border border-purple-200/50">
              <div className="text-base font-black text-[#4B0A8F] dark:text-purple-300">{unmarkedCount}</div>
              <div className="text-[10px] font-semibold text-[#4B0A8F] dark:text-purple-300">Unmarked</div>
            </div>
          </div>
        </div>

        {/* ─── Student Roster List ───────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
            <span>Student Roster ({filteredRoster.length})</span>
            <span>Tap status to mark</span>
          </div>

          <AnimatePresence initial={false}>
            {filteredRoster.map((student, index) => {
              const initials = student.name
                .split(" ")
                .slice(0, 2)
                .map((n) => n[0])
                .join("")
                .toUpperCase();

              return (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ delay: index * 0.03, duration: 0.2 }}
                  className={cn(
                    "relative rounded-2xl overflow-hidden bg-card border p-3.5 flex items-center justify-between gap-3 transition-all border-l-[4px] shadow-sm",
                    student.status === "present" && "border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20",
                    student.status === "absent" && "border-l-red-500 bg-red-50/40 dark:bg-red-950/20",
                    student.status === "late" && "border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/20",
                    student.status === "excused" && "border-l-sky-500 bg-sky-50/40 dark:bg-sky-950/20",
                    student.status === null && "border-l-muted-foreground/30"
                  )}
                >
                  {/* Student Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "size-11 rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-sm",
                        student.status === "present" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50",
                        student.status === "absent" && "bg-red-100 text-red-800 dark:bg-red-900/50",
                        student.status === "late" && "bg-amber-100 text-amber-800 dark:bg-amber-900/50",
                        student.status === "excused" && "bg-sky-100 text-sky-800 dark:bg-sky-900/50",
                        student.status === null && "bg-[#4B0A8F]/10 text-[#4B0A8F]"
                      )}
                    >
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm font-bold truncate text-foreground leading-tight">
                        {student.name}
                      </h3>
                      <p className="text-[11px] text-muted-foreground truncate">{student.code}</p>
                    </div>
                  </div>

                  {/* 44px+ Touch Quick-Mark Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setStudentStatus(student.id, "present")}
                      className={cn(
                        "size-10 rounded-xl font-extrabold text-xs transition-all active:scale-95 flex items-center justify-center",
                        student.status === "present"
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                          : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                      )}
                      title="Present"
                    >
                      P
                    </button>

                    <button
                      onClick={() => setStudentStatus(student.id, "absent")}
                      className={cn(
                        "size-10 rounded-xl font-extrabold text-xs transition-all active:scale-95 flex items-center justify-center",
                        student.status === "absent"
                          ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                          : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400"
                      )}
                      title="Absent"
                    >
                      A
                    </button>

                    <button
                      onClick={() => setStudentStatus(student.id, "late")}
                      className={cn(
                        "size-10 rounded-xl font-extrabold text-xs transition-all active:scale-95 flex items-center justify-center",
                        student.status === "late"
                          ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                          : "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-400"
                      )}
                      title="Late"
                    >
                      L
                    </button>

                    <button
                      onClick={() => setStudentStatus(student.id, "excused")}
                      className={cn(
                        "size-10 rounded-xl font-extrabold text-xs transition-all active:scale-95 flex items-center justify-center",
                        student.status === "excused"
                          ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                          : "bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-950/40 dark:text-sky-400"
                      )}
                      title="Excused"
                    >
                      E
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── Fixed Bottom Action CTA ─────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t border-border/80 z-30">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "w-full h-12 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
            isSaved
              ? "bg-emerald-600 text-white shadow-emerald-600/25"
              : "bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white shadow-[#4B0A8F]/25"
          )}
        >
          {isSaved ? (
            <>
              <Check className="size-5" />
              <span>Attendance Roster Saved!</span>
            </>
          ) : (
            <>
              <Save className="size-5" />
              <span>Submit Attendance Roster ({presentCount}/{totalCount})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
