"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  CheckSquare,
  AlertTriangle,
  RotateCcw,
  Send,
  WifiOff,
  UserCheck,
  Building2,
  Layers,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays, subDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { generateWhatsAppDeepLink } from "@/lib/calling/whatsapp";
import { v4 as uuidv4 } from "uuid";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface AttendanceEventSummary {
  id: string;
  title: string;
  groupId: string;
  groupName: string;
  eventDate: string;
  isClosed: boolean;
  participantCount: number;
  markedCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  progress: number;
}

export interface AttendancePreparation {
  prepared: number;
  eligibleGroups?: number;
  isOffDate: boolean;
  reason?: string;
}

export interface StudentRosterItem {
  participantId: string;
  participantName: string;
  phone: string | null;
  participantState?: string;
  status: AttendanceStatus | null;
  recordId: string | null;
  markedAt: string | null;
  markedByName: string | null;
}

export interface StaffRosterMember {
  staffMetaId: string;
  name: string;
  role: string;
  status: AttendanceStatus | null;
}

export interface MobileAttendancePageProps {
  onBack?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MobileAttendancePage({ onBack }: MobileAttendancePageProps) {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const sessionResult = useSession();
  const session = sessionResult?.data;
  const sessionStatus = sessionResult?.status ?? "unauthenticated";

  const user = session?.user as any;
  const role: string = user?.role ?? "";
  const isMurabbi = role === "murabbi";
  const assignedParkId = user?.assignedParkId;
  const assignedGroupId = user?.assignedGroupId;

  // ─── State ─────────────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [selectedParkId, setSelectedParkId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"students" | "staff">("students");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "unmarked" | "present" | "absent" | "late" | "excused">("all");

  // Local optimistic status override map for instant UI response
  const [localStatusMap, setLocalStatusMap] = useState<Map<string, AttendanceStatus>>(new Map());

  // Dialog states
  const [bulkDialogOpen, setBulkDialogOpen] = useState<"present" | "absent" | "reset" | null>(null);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [lockReason, setLockReason] = useState("");
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [whatsAppModalStudent, setWhatsAppModalStudent] = useState<StudentRosterItem | null>(null);

  // ─── Query: Parks list for Scope ──────────────────────────────────────────
  const { data: parksData } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["mobile-attendance-parks"],
    queryFn: async () => {
      const res = await fetch("/api/park/attendance/parks");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const effectiveParkId = assignedParkId || selectedParkId || (parksData && parksData.length > 0 ? parksData[0].id : "");
  const requiresParkSelection = sessionStatus === "authenticated" && !assignedParkId && !isMurabbi;

  // Automatically select first park if none selected
  useEffect(() => {
    if (parksData && parksData.length > 0 && !selectedParkId) {
      setSelectedParkId(parksData[0].id);
    }
  }, [parksData, selectedParkId]);

  // ─── Query: Prepare & Fetch Attendance Events for Selected Date ────────────
  const {
    data: sessionsData,
    isLoading: isSessionsLoading,
    isFetching: isSessionsFetching,
    refetch: refetchSessions,
    error: sessionsError,
  } = useQuery<{
    date: string;
    parkId: string;
    events: AttendanceEventSummary[];
    preparation: AttendancePreparation;
  }>({
    queryKey: ["mobile-attendance-sessions", selectedDate, effectiveParkId],
    queryFn: async () => {
      const res = await fetch("/api/park/attendance/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, ...(effectiveParkId ? { parkId: effectiveParkId } : {}) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not prepare attendance sessions");
      return body;
    },
    enabled: Boolean(effectiveParkId) || sessionStatus === "authenticated",
    staleTime: 30 * 1000,
  });

  const events = sessionsData?.events ?? [];

  // Derive effective event ID (supports SSR & instant synchronous render)
  const effectiveEventId = useMemo(() => {
    if (selectedEventId && events.some((e) => e.id === selectedEventId)) {
      return selectedEventId;
    }
    if (events.length > 0) {
      if (assignedGroupId) {
        const assigned = events.find((e) => e.groupId === assignedGroupId);
        if (assigned) return assigned.id;
      }
      return events[0].id;
    }
    return selectedEventId || null;
  }, [selectedEventId, events, assignedGroupId]);

  // ─── Query: Fetch Event Student Roster ─────────────────────────────────────
  const {
    data: rosterData,
    isLoading: isRosterLoading,
    isFetching: isRosterFetching,
    refetch: refetchRoster,
  } = useQuery<{
    permissions: { canCorrect: boolean };
    event: {
      id: string;
      title: string;
      groupId: string;
      groupName: string;
      batchName: string;
      parkName: string;
      eventDate: string;
      isClosed: boolean;
      closedAt: string | null;
      closedByName: string | null;
    };
    roster: StudentRosterItem[];
    summary: {
      total: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
      unmarked: number;
    };
  }>({
    queryKey: ["mobile-attendance-roster", effectiveEventId],
    queryFn: async () => {
      const res = await fetch(`/api/park/attendance/${effectiveEventId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load roster");
      }
      return res.json();
    },
    enabled: Boolean(effectiveEventId),
    staleTime: 15 * 1000,
  });

  // Clear local overrides whenever the active event changes
  useEffect(() => {
    setLocalStatusMap(new Map());
  }, [effectiveEventId]);

  const activeEvent = rosterData?.event;
  const isClosed = activeEvent?.isClosed ?? false;
  const canCorrect = rosterData?.permissions?.canCorrect ?? false;

  // ─── Query: Staff Attendance Summary & Roster ──────────────────────────────
  const {
    data: staffSummaryData,
    isLoading: isStaffLoading,
    refetch: refetchStaffSummary,
  } = useQuery<{
    event: { id: string; isClosed: boolean; _count: { records: number } } | null;
    park: { id: string; name: string };
    date: string;
  } | null>({
    queryKey: ["mobile-park-staff-summary", selectedDate, effectiveParkId],
    queryFn: async () => {
      const query = new URLSearchParams({ date: selectedDate, parkId: effectiveParkId! });
      const res = await fetch(`/api/park/staff-attendance?${query}`);
      if (res.status === 403) return null;
      if (!res.ok) return null;
      return res.json();
    },
    enabled: Boolean(effectiveParkId) && sessionStatus === "authenticated",
    staleTime: 30 * 1000,
  });

  const staffEventId = staffSummaryData?.event?.id;

  const {
    data: staffDetailData,
    isLoading: isStaffDetailLoading,
    refetch: refetchStaffDetail,
  } = useQuery<{
    event: { id: string; title: string; isClosed: boolean };
    roster: StaffRosterMember[];
  }>({
    queryKey: ["mobile-park-staff-detail", staffEventId],
    queryFn: async () => {
      const res = await fetch(`/api/park/staff-attendance/${staffEventId}`);
      if (!res.ok) throw new Error("Could not load staff roster");
      return res.json();
    },
    enabled: Boolean(staffEventId),
    staleTime: 15 * 1000,
  });

  // ─── Mutations: Student Attendance ─────────────────────────────────────────

  // Single status mark
  const markSingleMutation = useMutation({
    mutationFn: async ({ participantId, status }: { participantId: string; status: AttendanceStatus }) => {
      const res = await fetch(`/api/park/attendance/${effectiveEventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          status,
          mutationId: uuidv4(),
          markedAt: new Date().toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to mark attendance");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-attendance-sessions", selectedDate, effectiveParkId] });
    },
    onError: (err: Error, vars) => {
      // Revert optimistic update
      setLocalStatusMap((prev) => {
        const next = new Map(prev);
        next.delete(vars.participantId);
        return next;
      });
      toast.error(err.message || "Failed to save attendance mark");
    },
  });

  // Batch sync mutation (used for bulk present / absent)
  const batchSyncMutation = useMutation({
    mutationFn: async ({ participantIds, status }: { participantIds: string[]; status: AttendanceStatus }) => {
      const now = new Date().toISOString();
      const mutations = participantIds.map((pid) => ({
        mutationId: uuidv4(),
        eventId: effectiveEventId!,
        participantId: pid,
        status,
        markedAt: now,
      }));

      const res = await fetch("/api/park/attendance/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mutations }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Batch sync failed");
      return data;
    },
    onSuccess: (_data, vars) => {
      toast.success(`Marked ${vars.participantIds.length} student(s) as ${vars.status}`);
      queryClient.invalidateQueries({ queryKey: ["mobile-attendance-roster", effectiveEventId] });
      queryClient.invalidateQueries({ queryKey: ["mobile-attendance-sessions", selectedDate, effectiveParkId] });
    },
    onError: (err: Error, vars) => {
      setLocalStatusMap((prev) => {
        const next = new Map(prev);
        vars.participantIds.forEach((id) => next.delete(id));
        return next;
      });
      toast.error(err.message || "Bulk operation failed");
    },
  });

  // Reset all mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/park/attendance/${effectiveEventId}/reset`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to reset attendance");
      return data;
    },
    onMutate: () => {
      setLocalStatusMap(new Map());
    },
    onSuccess: () => {
      toast.success("Attendance roster marks cleared");
      setBulkDialogOpen(null);
      queryClient.invalidateQueries({ queryKey: ["mobile-attendance-roster", effectiveEventId] });
      queryClient.invalidateQueries({ queryKey: ["mobile-attendance-sessions", selectedDate, effectiveParkId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reset attendance");
      refetchRoster();
    },
  });

  // Lock event mutation
  const closeMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await fetch(`/api/park/attendance/${effectiveEventId}/close`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to lock attendance");
      return data;
    },
    onSuccess: () => {
      toast.success("Attendance locked successfully");
      setLockDialogOpen(false);
      setLockReason("");
      queryClient.invalidateQueries({ queryKey: ["mobile-attendance-roster", effectiveEventId] });
      queryClient.invalidateQueries({ queryKey: ["mobile-attendance-sessions", selectedDate, effectiveParkId] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to lock session"),
  });

  // Reopen event mutation
  const reopenMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await fetch(`/api/park/attendance/${effectiveEventId}/reopen`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to reopen attendance");
      return data;
    },
    onSuccess: () => {
      toast.success("Attendance reopened for correction");
      setReopenDialogOpen(false);
      setReopenReason("");
      queryClient.invalidateQueries({ queryKey: ["mobile-attendance-roster", effectiveEventId] });
      queryClient.invalidateQueries({ queryKey: ["mobile-attendance-sessions", selectedDate, effectiveParkId] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to reopen session"),
  });

  // ─── Mutations: Staff Attendance ───────────────────────────────────────────
  const startStaffRollCallMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/park/staff-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parkId: effectiveParkId, date: selectedDate }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not start staff roll-call");
      return data;
    },
    onSuccess: () => {
      toast.success("Staff roll-call session created");
      queryClient.invalidateQueries({ queryKey: ["mobile-park-staff-summary", selectedDate, effectiveParkId] });
    },
    onError: (err: Error) => toast.error(err.message || "Could not start staff roll-call"),
  });

  const markStaffMutation = useMutation({
    mutationFn: async ({ staffMetaId, status }: { staffMetaId: string; status: AttendanceStatus }) => {
      const res = await fetch(`/api/park/staff-attendance/${staffEventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffMetaId, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not mark staff attendance");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-park-staff-detail", staffEventId] });
      queryClient.invalidateQueries({ queryKey: ["mobile-park-staff-summary", selectedDate, effectiveParkId] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to mark staff"),
  });

  const lockStaffMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/park/staff-attendance/${staffEventId}/close`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Completed park staff roll-call" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not lock staff attendance");
      return data;
    },
    onSuccess: () => {
      toast.success("Staff roll-call locked");
      queryClient.invalidateQueries({ queryKey: ["mobile-park-staff-detail", staffEventId] });
      queryClient.invalidateQueries({ queryKey: ["mobile-park-staff-summary", selectedDate, effectiveParkId] });
    },
    onError: (err: Error) => toast.error(err.message || "Could not lock staff attendance"),
  });

  // ─── Computed Student Roster & Live Counts ─────────────────────────────────
  const rawRoster = rosterData?.roster ?? [];

  const rosterWithOptimistic = useMemo(() => {
    return rawRoster.map((item) => {
      const override = localStatusMap.get(item.participantId);
      return override ? { ...item, status: override } : item;
    });
  }, [rawRoster, localStatusMap]);

  const filteredRoster = useMemo(() => {
    return rosterWithOptimistic.filter((student) => {
      const matchesSearch =
        !searchQuery.trim() ||
        student.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.participantId.toLowerCase().includes(searchQuery.toLowerCase());

      const status = student.status;
      let matchesStatus = true;
      if (filterStatus === "unmarked") matchesStatus = status === null;
      else if (filterStatus !== "all") matchesStatus = status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [rosterWithOptimistic, searchQuery, filterStatus]);

  const liveSummary = useMemo(() => {
    const total = rosterWithOptimistic.length;
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    let unmarked = 0;

    for (const item of rosterWithOptimistic) {
      if (item.status === "present") present++;
      else if (item.status === "absent") absent++;
      else if (item.status === "late") late++;
      else if (item.status === "excused") excused++;
      else unmarked++;
    }

    const marked = total - unmarked;
    const progress = total > 0 ? Math.round((marked / total) * 100) : 0;
    return { total, marked, present, absent, late, excused, unmarked, progress };
  }, [rosterWithOptimistic]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleMarkStudent = useCallback(
    (participantId: string, status: AttendanceStatus) => {
      if (isClosed || !effectiveEventId) return;

      // Optimistic update
      setLocalStatusMap((prev) => {
        const next = new Map(prev);
        next.set(participantId, status);
        return next;
      });

      markSingleMutation.mutate({ participantId, status });
    },
    [isClosed, effectiveEventId, markSingleMutation]
  );

  const handleBulkConfirm = () => {
    if (!bulkDialogOpen || !effectiveEventId) return;

    if (bulkDialogOpen === "reset") {
      resetMutation.mutate();
      return;
    }

    const targetStatus = bulkDialogOpen;
    const unmarked = rosterWithOptimistic.filter((s) => s.status === null);
    const ids = unmarked.map((s) => s.participantId);

    if (ids.length === 0) {
      toast.info("No unmarked students to mark");
      setBulkDialogOpen(null);
      return;
    }

    // Optimistic batch
    setLocalStatusMap((prev) => {
      const next = new Map(prev);
      ids.forEach((id) => next.set(id, targetStatus));
      return next;
    });

    setBulkDialogOpen(null);
    batchSyncMutation.mutate({ participantIds: ids, status: targetStatus });
  };

  const handleLockSubmit = () => {
    if (!lockReason.trim()) {
      toast.error("Please provide a reason for locking attendance");
      return;
    }
    closeMutation.mutate(lockReason.trim());
  };

  const handleReopenSubmit = () => {
    if (!reopenReason.trim()) {
      toast.error("Please provide a reason for reopening attendance");
      return;
    }
    reopenMutation.mutate(reopenReason.trim());
  };

  // Date Navigation Helpers
  const handlePrevDay = () => {
    const prev = subDays(parseISO(selectedDate), 1);
    setSelectedDate(format(prev, "yyyy-MM-dd"));
  };

  const handleNextDay = () => {
    const next = addDays(parseISO(selectedDate), 1);
    setSelectedDate(format(next, "yyyy-MM-dd"));
  };

  const handleSetToday = () => {
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
  };

  // WhatsApp Alert Link Dispatcher
  const handleOpenWhatsApp = (student: StudentRosterItem) => {
    if (!student.phone) {
      toast.error("Student has no guardian phone number recorded");
      return;
    }
    const templateMsg = `السلام علیکم! معزز والدین، آج شباب 360 سیشن میں ${student.participantName} غیر حاضر رہے ہیں۔ برائے مہربانی خیر و عافیت سے مطلع فرمائیں۔ شکریہ!`;
    const deepLink = generateWhatsAppDeepLink({
      phone: student.phone,
      templateMessage: templateMsg,
    });

    if (!deepLink.isAuthorized || !deepLink.url) {
      toast.error(deepLink.error || "Could not generate WhatsApp deep link");
      return;
    }
    window.open(deepLink.url, "_blank");
    setWhatsAppModalStudent(null);
  };

  // ─── UI Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-28 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] text-white pt-5 pb-8 px-4 rounded-b-[2rem] shadow-xl overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] size-60 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        {/* Top Navbar Row */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2.5">
            {onBack && (
              <button
                onClick={onBack}
                aria-label="Go back"
                className="size-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/25 active:scale-95 transition-all border border-white/20"
              >
                <ArrowLeft className="size-5" />
              </button>
            )}
            <div className="size-11 rounded-2xl bg-white/10 border border-white/20 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
              <img src="/shabab-logo.png" alt="Logo" className="size-full object-contain" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight leading-tight">Park Attendance</h1>
              <p className="text-xs text-purple-200 font-medium truncate max-w-[160px] sm:max-w-xs">
                {activeEvent?.parkName ?? (parksData?.find((p) => p.id === effectiveParkId)?.name || "Shabab 360 Park")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Online / Offline status */}
            <div
              className={cn(
                "flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-full border backdrop-blur-md",
                isOnline
                  ? "bg-white/15 border-white/20 text-emerald-300"
                  : "bg-rose-950/60 border-rose-500/50 text-rose-300 animate-pulse"
              )}
            >
              {isOnline ? <span className="size-2 rounded-full bg-emerald-400 animate-pulse" /> : <WifiOff className="size-3" />}
              <span>{isOnline ? "Live" : "Offline"}</span>
            </div>

            {/* Refresh button */}
            <button
              onClick={() => {
                refetchSessions();
                if (effectiveEventId) refetchRoster();
              }}
              disabled={isSessionsFetching || isRosterFetching}
              aria-label="Refresh attendance"
              className="size-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/25 active:scale-95 transition-all border border-white/20"
            >
              <RefreshCw className={cn("size-4", (isSessionsFetching || isRosterFetching) && "animate-spin text-purple-200")} />
            </button>
          </div>
        </div>

        {/* ─── Park Selector (if multiple parks available or not assigned) ─── */}
        {parksData && parksData.length > 0 && (!assignedParkId || parksData.length > 1) && (
          <div className="mb-3 relative z-10">
            <div className="flex items-center gap-2 bg-white/15 p-1.5 rounded-2xl border border-white/20 backdrop-blur-md">
              <Building2 className="size-4 ml-2 text-purple-200 shrink-0" />
              <select
                value={effectiveParkId}
                onChange={(e) => setSelectedParkId(e.target.value)}
                aria-label="Select Park Scope"
                className="w-full bg-transparent text-xs font-bold text-white outline-none cursor-pointer pr-3"
              >
                {parksData.map((park) => (
                  <option key={park.id} value={park.id} className="text-slate-900 font-medium">
                    {park.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ─── Date Navigator Row ────────────────────────────────────────── */}
        <div className="relative z-10 flex items-center justify-between bg-white/15 px-3 py-2 rounded-2xl border border-white/20 backdrop-blur-md">
          <button
            onClick={handlePrevDay}
            aria-label="Previous day"
            className="size-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center active:scale-95 transition-all text-white"
          >
            <ChevronLeft className="size-4" />
          </button>

          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-purple-200" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              aria-label="Choose attendance date"
              className="bg-transparent text-xs md:text-sm font-extrabold text-white text-center outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleSetToday}
              aria-label="Go to today"
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all active:scale-95",
                selectedDate === format(new Date(), "yyyy-MM-dd")
                  ? "bg-amber-400 text-slate-950 shadow-sm"
                  : "bg-white/15 text-white hover:bg-white/25"
              )}
            >
              Today
            </button>
            <button
              onClick={handleNextDay}
              aria-label="Next day"
              className="size-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center active:scale-95 transition-all text-white"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* ─── Workspace Switcher: Student Cadets vs Staff Roll-Call ──────── */}
        <div className="mt-3 relative z-10 grid grid-cols-2 gap-1.5 p-1 bg-black/20 rounded-2xl border border-white/15">
          <button
            onClick={() => setActiveTab("students")}
            aria-label="Student Cadets Roster"
            className={cn(
              "min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98",
              activeTab === "students"
                ? "bg-white text-[#4B0A8F] shadow-lg font-extrabold"
                : "text-purple-100 hover:bg-white/10"
            )}
          >
            <Users className="size-4" />
            <span>Student Cadets {events.length > 0 && `(${liveSummary.total})`}</span>
          </button>

          <button
            onClick={() => setActiveTab("staff")}
            aria-label="Park Staff Roll-Call"
            className={cn(
              "min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98",
              activeTab === "staff"
                ? "bg-white text-[#4B0A8F] shadow-lg font-extrabold"
                : "text-purple-100 hover:bg-white/10"
            )}
          >
            <ShieldCheck className="size-4" />
            <span>Park Staff Roll-Call</span>
          </button>
        </div>
      </div>

      {/* ─── Main Content Container ──────────────────────────────────────── */}
      <div className="-mt-4 px-3.5 z-20 space-y-3.5 max-w-2xl mx-auto w-full">
        {/* ─── Off-Date or Empty Sessions Banner ─────────────────────────── */}
        {sessionsData?.preparation.isOffDate && (
          <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 shadow-sm flex items-start gap-3">
            <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-extrabold text-amber-900 dark:text-amber-200">Operational Off-Date</h3>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                {sessionsData.preparation.reason || "No routine attendance scheduled on this operational holiday."}
              </p>
            </div>
          </div>
        )}

        {/* ─── TAB 1: STUDENT CADETS ROSTER ──────────────────────────────── */}
        {activeTab === "students" && (
          <>
            {/* ─── Unauthenticated State ───────────────────────────────────── */}
            {sessionStatus === "unauthenticated" ? (
              <div className="p-6 text-center bg-card rounded-3xl border border-border/80 space-y-3 shadow-lg" data-testid="unauthenticated-prompt">
                <Lock className="size-10 text-[#4B0A8F] mx-auto" />
                <h3 className="text-base font-extrabold text-foreground">Sign In Required</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Please sign in with your authorized staff or murabbi account to access attendance sessions and student rosters.
                </p>
                <div className="pt-2 max-w-xs mx-auto">
                  <a
                    href="/login"
                    className="w-full h-11 rounded-2xl bg-[#4B0A8F] text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 shadow-md hover:bg-[#4B0A8FE6]"
                  >
                    <span>Go to Sign In</span>
                  </a>
                </div>
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-2 p-3.5 rounded-3xl bg-card border border-border/80 shadow-sm">
                <div className="flex items-center justify-between px-1 text-xs font-extrabold text-foreground tracking-tight">
                  <span className="flex items-center gap-1.5">
                    <Layers className="size-4 text-[#4B0A8F]" />
                    Group Selection ({events.length})
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {isMurabbi ? "Murabbi Scope" : "Tap group to switch"}
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  {events.map((ev) => {
                    const isSelected = ev.id === effectiveEventId;
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEventId(ev.id)}
                        aria-label={`Select ${ev.groupName}`}
                        className={cn(
                          "min-h-[44px] px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 flex items-center gap-2 border shadow-sm shrink-0",
                          isSelected
                            ? "bg-[#4B0A8F] text-white border-[#4B0A8F] shadow-purple-500/30 ring-2 ring-purple-400/50 font-extrabold scale-[1.02]"
                            : "bg-muted/50 text-foreground border-border/80 hover:bg-muted"
                        )}
                      >
                        <span>{ev.groupName}</span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight",
                            isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {`${ev.markedCount}/${ev.participantCount}`}
                        </span>
                        {ev.isClosed && <Lock className="size-3 text-amber-300 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : !isSessionsLoading && !sessionsData?.preparation.isOffDate ? (
              <div className="p-8 text-center bg-card rounded-3xl border border-border/80 space-y-3">
                <Calendar className="size-9 text-muted-foreground mx-auto opacity-40" />
                <h3 className="text-sm font-bold text-foreground">No scheduled classes on this date</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Choose a weekend class day or another active batch date to take attendance and view group rosters.
                </p>
                {parksData && parksData.length > 1 && (
                  <div className="pt-2">
                    <p className="text-[11px] text-muted-foreground font-semibold mb-2">Or switch park:</p>
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {parksData.map((park) => (
                        <button
                          key={park.id}
                          type="button"
                          onClick={() => setSelectedParkId(park.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
                            park.id === effectiveParkId
                              ? "bg-[#4B0A8F] text-white border-[#4B0A8F]"
                              : "bg-muted text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {park.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* ─── Locked Session Notice Banner ──────────────────────────── */}
            {isClosed && (
              <div className="p-3.5 rounded-3xl bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-xl bg-[#4B0A8F] text-white flex items-center justify-center shrink-0">
                    <Lock className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-[#4B0A8F] dark:text-purple-300">Session Locked (Read-Only)</h4>
                    <p className="text-[11px] text-muted-foreground">
                      {activeEvent?.closedByName ? `Closed by ${activeEvent.closedByName}` : "Attendance is locked."}
                    </p>
                  </div>
                </div>

                {canCorrect && (
                  <button
                    onClick={() => setReopenDialogOpen(true)}
                    aria-label="Reopen attendance session"
                    className="min-h-[44px] px-3 rounded-xl bg-purple-100 hover:bg-purple-200 text-[#4B0A8F] dark:bg-purple-900/60 dark:text-purple-200 text-xs font-extrabold transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                  >
                    <Unlock className="size-3.5" />
                    <span>Reopen</span>
                  </button>
                )}
              </div>
            )}

            {/* ─── Progress & KPI Card ───────────────────────────────────── */}
            {effectiveEventId && (
              <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-extrabold text-foreground leading-tight">
                      {activeEvent?.groupName ?? "Group Roster"}
                    </h2>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {activeEvent?.batchName ?? "Active Batch"} • {selectedDate}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-[#4B0A8F] dark:text-purple-300">
                      {`${liveSummary.marked}/${liveSummary.total} Marked`}
                    </span>
                    <p className="text-[11px] font-bold text-muted-foreground">
                      {`${liveSummary.progress}% Complete`}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border/40">
                  <div
                    className="h-full bg-gradient-to-r from-[#D90429] via-[#4B0A8F] to-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${liveSummary.progress}%` }}
                  />
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  <div className="p-2 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/20 text-center">
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">{liveSummary.present}</span>
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Present</p>
                  </div>
                  <div className="p-2 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-500/20 text-center">
                    <span className="text-xs font-black text-rose-700 dark:text-rose-300">{liveSummary.absent}</span>
                    <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Absent</p>
                  </div>
                  <div className="p-2 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-500/20 text-center">
                    <span className="text-xs font-black text-amber-700 dark:text-amber-300">{liveSummary.late}</span>
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Late</p>
                  </div>
                  <div className="p-2 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-500/20 text-center">
                    <span className="text-xs font-black text-sky-700 dark:text-sky-300">{liveSummary.excused}</span>
                    <p className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase">Excused</p>
                  </div>
                </div>

                {/* Quick Bulk Actions Row */}
                {!isClosed && (
                  <div className="pt-2 border-t border-border/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => setBulkDialogOpen("present")}
                      aria-label="Mark all unmarked present"
                      className="min-h-[44px] px-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-extrabold transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>All Present</span>
                    </button>

                    <button
                      onClick={() => setBulkDialogOpen("absent")}
                      aria-label="Mark all unmarked absent"
                      className="min-h-[44px] px-3 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 text-xs font-extrabold transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                    >
                      <XCircle className="size-3.5" />
                      <span>All Absent</span>
                    </button>

                    {canCorrect && (
                      <button
                        onClick={() => setBulkDialogOpen("reset")}
                        aria-label="Reset roster marks"
                        className="min-h-[44px] px-3 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                      >
                        <RotateCcw className="size-3.5" />
                        <span>Reset</span>
                      </button>
                    )}

                    <button
                      onClick={() => setLockDialogOpen(true)}
                      aria-label="Lock attendance session"
                      className="min-h-[44px] px-3 ml-auto rounded-xl bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white text-xs font-extrabold transition-all active:scale-95 flex items-center gap-1.5 shrink-0 shadow-sm"
                    >
                      <Lock className="size-3.5 text-amber-300" />
                      <span>Lock</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ─── Search & Status Filters ───────────────────────────────── */}
            {effectiveEventId && (
              <div className="space-y-2">
                <div className="relative w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search student by name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search student roster"
                    className="w-full h-11 pl-10 pr-4 rounded-2xl bg-card text-foreground placeholder:text-muted-foreground text-xs md:text-sm font-medium border border-border/80 focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]/50 transition-all shadow-sm"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {[
                    { id: "all", label: `All (${liveSummary.total})` },
                    { id: "unmarked", label: `Unmarked (${liveSummary.unmarked})` },
                    { id: "present", label: `Present (${liveSummary.present})` },
                    { id: "absent", label: `Absent (${liveSummary.absent})` },
                    { id: "late", label: `Late (${liveSummary.late})` },
                    { id: "excused", label: `Excused (${liveSummary.excused})` },
                  ].map((tab) => {
                    const isActive = filterStatus === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setFilterStatus(tab.id as any)}
                        aria-label={`Filter ${tab.label}`}
                        className={cn(
                          "min-h-[44px] px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 flex items-center justify-center border",
                          isActive
                            ? "bg-amber-400 text-slate-950 border-amber-400 shadow-md font-extrabold"
                            : "bg-card text-muted-foreground border-border/80 hover:bg-muted"
                        )}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── Student Roster Cards List ─────────────────────────────── */}
            <div className="space-y-2.5">
              {isRosterLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-28 rounded-3xl bg-card border border-border/60 animate-pulse" />
                ))
              ) : filteredRoster.length === 0 && effectiveEventId ? (
                <div className="p-8 text-center bg-card rounded-3xl border border-border/80 space-y-2">
                  <UserCheck className="size-9 text-muted-foreground mx-auto opacity-40" />
                  <p className="text-sm font-bold text-muted-foreground">No students match the current filter</p>
                </div>
              ) : (
                filteredRoster.map((student) => {
                  const isPresent = student.status === "present";
                  const isAbsent = student.status === "absent";
                  const isLate = student.status === "late";
                  const isExcused = student.status === "excused";
                  const isUnmarked = student.status === null;

                  return (
                    <div
                      key={student.participantId}
                      className={cn(
                        "p-3.5 rounded-3xl bg-card border transition-all shadow-sm space-y-2.5",
                        isPresent && "border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20",
                        isAbsent && "border-rose-500/40 bg-rose-50/20 dark:bg-rose-950/20",
                        isLate && "border-amber-500/40 bg-amber-50/20 dark:bg-amber-950/20",
                        isExcused && "border-sky-500/40 bg-sky-50/20 dark:bg-sky-950/20",
                        isUnmarked && "border-border/80"
                      )}
                    >
                      {/* Student Header Info */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-10 rounded-2xl bg-[#4B0A8F]/10 text-[#4B0A8F] dark:text-purple-300 font-black text-xs flex items-center justify-center border border-[#4B0A8F]/20 shrink-0">
                            {student.participantName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-extrabold text-foreground leading-tight truncate">
                              {student.participantName}
                            </h3>
                            <p className="text-[11px] text-muted-foreground font-medium truncate">
                              ID: {student.participantId.slice(-6).toUpperCase()}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge + WhatsApp trigger */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isAbsent && student.phone && (
                            <button
                              onClick={() => setWhatsAppModalStudent(student)}
                              aria-label={`Send WhatsApp absentee alert for ${student.participantName}`}
                              className="size-8 rounded-xl bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 flex items-center justify-center transition-all active:scale-95"
                            >
                              <Send className="size-3.5" />
                            </button>
                          )}

                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                              isPresent && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                              isAbsent && "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
                              isLate && "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
                              isExcused && "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
                              isUnmarked && "bg-muted/60 text-muted-foreground border-border/60"
                            )}
                          >
                            {student.status ?? "Unmarked"}
                          </span>
                        </div>
                      </div>

                      {/* 44px Touch Targets for 4 Attendance States */}
                      <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                        <button
                          onClick={() => handleMarkStudent(student.participantId, "present")}
                          disabled={isClosed}
                          aria-label={`Mark ${student.participantName} Present`}
                          className={cn(
                            "min-h-[44px] rounded-2xl font-black text-xs flex items-center justify-center gap-1 transition-all active:scale-95 border",
                            isPresent
                              ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/50"
                              : "bg-muted/60 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600 border-border/60"
                          )}
                        >
                          <CheckCircle2 className="size-4" />
                          <span>P</span>
                        </button>

                        <button
                          onClick={() => handleMarkStudent(student.participantId, "absent")}
                          disabled={isClosed}
                          aria-label={`Mark ${student.participantName} Absent`}
                          className={cn(
                            "min-h-[44px] rounded-2xl font-black text-xs flex items-center justify-center gap-1 transition-all active:scale-95 border",
                            isAbsent
                              ? "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-500/30 ring-2 ring-rose-400/50"
                              : "bg-muted/60 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 border-border/60"
                          )}
                        >
                          <XCircle className="size-4" />
                          <span>A</span>
                        </button>

                        <button
                          onClick={() => handleMarkStudent(student.participantId, "late")}
                          disabled={isClosed}
                          aria-label={`Mark ${student.participantName} Late`}
                          className={cn(
                            "min-h-[44px] rounded-2xl font-black text-xs flex items-center justify-center gap-1 transition-all active:scale-95 border",
                            isLate
                              ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30 ring-2 ring-amber-400/50"
                              : "bg-muted/60 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600 border-border/60"
                          )}
                        >
                          <Clock className="size-4" />
                          <span>L</span>
                        </button>

                        <button
                          onClick={() => handleMarkStudent(student.participantId, "excused")}
                          disabled={isClosed}
                          aria-label={`Mark ${student.participantName} Excused`}
                          className={cn(
                            "min-h-[44px] rounded-2xl font-black text-xs flex items-center justify-center gap-1 transition-all active:scale-95 border",
                            isExcused
                              ? "bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-500/30 ring-2 ring-sky-400/50"
                              : "bg-muted/60 text-muted-foreground hover:bg-sky-500/10 hover:text-sky-600 border-border/60"
                          )}
                        >
                          <ShieldCheck className="size-4" />
                          <span>E</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* ─── TAB 2: PARK STAFF ROLL-CALL ───────────────────────────────── */}
        {activeTab === "staff" && (
          <div className="space-y-3">
            {isStaffLoading ? (
              <div className="h-40 rounded-3xl bg-card border border-border/60 animate-pulse" />
            ) : !staffEventId ? (
              <div className="p-6 text-center bg-card rounded-3xl border border-border/80 space-y-3">
                <div className="size-12 rounded-2xl bg-[#4B0A8F]/10 text-[#4B0A8F] flex items-center justify-center mx-auto">
                  <ShieldCheck className="size-6" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">Park Staff Attendance</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Start today's presence roll-call for Park Lead, Park Admin, Murabbis, and active staff.
                  </p>
                </div>
                <button
                  onClick={() => startStaffRollCallMutation.mutate()}
                  disabled={startStaffRollCallMutation.isPending}
                  aria-label="Start Staff Roll-Call"
                  className="min-h-[44px] w-full rounded-2xl bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white text-xs font-extrabold shadow-md flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  {startStaffRollCallMutation.isPending ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="size-4 text-amber-300" />
                  )}
                  <span>Start Staff Roll-Call</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-md space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground">Staff Roll-Call</h3>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {staffSummaryData?.park.name} • {selectedDate}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {staffDetailData?.event.isClosed ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-muted text-muted-foreground border">
                        Locked
                      </span>
                    ) : (
                      <button
                        onClick={() => lockStaffMutation.mutate()}
                        disabled={lockStaffMutation.isPending}
                        aria-label="Lock staff attendance"
                        className="min-h-[44px] px-3 rounded-xl bg-[#4B0A8F] text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        <Lock className="size-3.5 text-amber-300" />
                        <span>Lock Roll-Call</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Staff List */}
                <div className="space-y-2.5">
                  {staffDetailData?.roster.map((member) => {
                    const isStaffClosed = staffDetailData.event.isClosed;
                    return (
                      <div
                        key={member.staffMetaId}
                        className="p-3 rounded-2xl bg-muted/40 border border-border/70 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-foreground">{member.name}</h4>
                            <p className="text-[10px] capitalize text-muted-foreground">
                              {member.role.replaceAll("_", " ")}
                            </p>
                          </div>
                          {member.status && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-background border">
                              {member.status}
                            </span>
                          )}
                        </div>

                        {/* 4-State Buttons for Staff */}
                        <div className="grid grid-cols-4 gap-1.5">
                          {(["present", "absent", "late", "excused"] as const).map((st) => (
                            <button
                              key={st}
                              disabled={isStaffClosed || markStaffMutation.isPending}
                              onClick={() => markStaffMutation.mutate({ staffMetaId: member.staffMetaId, status: st })}
                              aria-label={`Mark staff ${member.name} ${st}`}
                              className={cn(
                                "min-h-[44px] rounded-xl text-[11px] font-bold capitalize transition-all active:scale-95 border",
                                member.status === st
                                  ? st === "present"
                                    ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                                    : st === "absent"
                                    ? "bg-rose-600 text-white border-rose-500 shadow-sm"
                                    : st === "late"
                                    ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm"
                                    : "bg-sky-600 text-white border-sky-500 shadow-sm"
                                  : "bg-card text-muted-foreground border-border/60 hover:bg-muted"
                              )}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Bulk Action Confirmation Dialog ─────────────────────────────── */}
      <Dialog open={Boolean(bulkDialogOpen)} onOpenChange={(open) => !open && setBulkDialogOpen(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-3xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold">
              {bulkDialogOpen === "present" && "Mark All Unmarked Present"}
              {bulkDialogOpen === "absent" && "Mark All Unmarked Absent"}
              {bulkDialogOpen === "reset" && "Reset Roster Attendance"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              {bulkDialogOpen === "present" &&
                `Are you sure you want to mark all ${liveSummary.unmarked} unmarked students as Present?`}
              {bulkDialogOpen === "absent" &&
                `Are you sure you want to mark all ${liveSummary.unmarked} unmarked students as Absent?`}
              {bulkDialogOpen === "reset" &&
                "This will clear all recorded attendance marks for this session. Existing data will be reset."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-2 mt-4">
            <button
              onClick={() => setBulkDialogOpen(null)}
              className="flex-1 min-h-[44px] rounded-xl border border-border bg-muted hover:bg-muted/80 text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkConfirm}
              className={cn(
                "flex-1 min-h-[44px] rounded-xl text-white text-xs font-extrabold shadow-md transition-all",
                bulkDialogOpen === "present" && "bg-emerald-600 hover:bg-emerald-700",
                bulkDialogOpen === "absent" && "bg-rose-600 hover:bg-rose-700",
                bulkDialogOpen === "reset" && "bg-red-600 hover:bg-red-700"
              )}
            >
              Confirm
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Lock Session Dialog ─────────────────────────────────────────── */}
      <Dialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-3xl p-5 space-y-3">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold">Lock Attendance Session</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Locking prevents further modifications to this session roster.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Lock Reason</label>
            <input
              type="text"
              placeholder="e.g. Session concluded"
              value={lockReason}
              onChange={(e) => setLockReason(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-border bg-card text-xs font-medium focus:ring-2 focus:ring-[#4B0A8F]/50 outline-none"
            />
          </div>
          <DialogFooter className="flex flex-row gap-2 pt-2">
            <button
              onClick={() => setLockDialogOpen(false)}
              className="flex-1 min-h-[44px] rounded-xl border border-border bg-muted hover:bg-muted/80 text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleLockSubmit}
              disabled={closeMutation.isPending}
              className="flex-1 min-h-[44px] rounded-xl bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white text-xs font-extrabold shadow-md transition-all"
            >
              {closeMutation.isPending ? "Locking..." : "Lock Session"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Reopen Session Dialog ───────────────────────────────────────── */}
      <Dialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-3xl p-5 space-y-3">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold">Reopen Attendance Session</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Reopening allows corrections to this previously locked session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Correction Reason</label>
            <input
              type="text"
              placeholder="e.g. Updating late arrival marks"
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-border bg-card text-xs font-medium focus:ring-2 focus:ring-[#4B0A8F]/50 outline-none"
            />
          </div>
          <DialogFooter className="flex flex-row gap-2 pt-2">
            <button
              onClick={() => setReopenDialogOpen(false)}
              className="flex-1 min-h-[44px] rounded-xl border border-border bg-muted hover:bg-muted/80 text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleReopenSubmit}
              disabled={reopenMutation.isPending}
              className="flex-1 min-h-[44px] rounded-xl bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white text-xs font-extrabold shadow-md transition-all"
            >
              {reopenMutation.isPending ? "Reopening..." : "Reopen Session"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── WhatsApp Alert Modal ────────────────────────────────────────── */}
      <Dialog open={Boolean(whatsAppModalStudent)} onOpenChange={(open) => !open && setWhatsAppModalStudent(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-3xl p-5 space-y-3">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <Send className="size-4 text-emerald-600" />
              <span>Urdu Absentee Alert</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Notify guardian on WhatsApp regarding absence of {whatsAppModalStudent?.participantName}.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-2xl bg-muted/60 border border-border/80 text-xs font-medium text-foreground text-right dir-rtl leading-relaxed font-arabic">
            السلام علیکم! معزز والدین، آج شباب 360 سیشن میں {whatsAppModalStudent?.participantName} غیر حاضر رہے ہیں۔ برائے مہربانی خیر و عافیت سے مطلع فرمائیں۔ شکریہ!
          </div>
          <DialogFooter className="flex flex-row gap-2 pt-2">
            <button
              onClick={() => setWhatsAppModalStudent(null)}
              className="flex-1 min-h-[44px] rounded-xl border border-border bg-muted hover:bg-muted/80 text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => whatsAppModalStudent && handleOpenWhatsApp(whatsAppModalStudent)}
              className="flex-1 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Send className="size-3.5" />
              <span>Open WhatsApp</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
