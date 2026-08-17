"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/stores/useAppStore";
import { useAttendanceSync } from "@/hooks/use-attendance-sync";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { EmptyState } from "@/components/layout/empty-state";
import { OfflineQueuePanel } from "./offline-queue-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Circle,
  Search,
  ArrowLeft,
  Lock,
  RefreshCw,
  Loader2,
  WifiOff,
  Filter,
  X,
  LayoutGrid,
  List,
  RotateCcw,
  Check,
  Users,
  AlertTriangle,
  Phone,
  Send,
  Pencil,
} from "lucide-react";
import { AttendanceEditDialog } from "@/components/shared/attendance-edit-dialog";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import type { AttendanceStatus } from "@/lib/offline/db";

// ─── Types ───────────────────────────────────────────────────────────────────

type RosterItem = {
  participantId: string;
  participantName: string;
  phone: string | null;
  status: AttendanceStatus | null;
  recordId: string | null;
  markedAt: string | null;
  markedByName: string | null;
};

type EventInfo = {
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

type Summary = {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  unmarked: number;
};

type WarningItem = {
  participantId: string;
  participantName: string;
  consecutiveAbsents: number;
  level: "warning" | "critical" | "dropout";
  threshold: number;
  lastAttendanceDate: string | null;
};

type WarningsData = {
  warnings: WarningItem[];
  settings: { warningAbsents: number; dropoutAbsents: number };
};

function warningLevelColor(level: WarningItem["level"]) {
  switch (level) {
    case "warning":
      return "text-amber-500 dark:text-amber-400";
    case "critical":
      return "text-orange-500 dark:text-orange-400";
    case "dropout":
      return "text-red-500 dark:text-red-400";
  }
}

function warningLevelBg(level: WarningItem["level"]) {
  switch (level) {
    case "warning":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/50";
    case "critical":
      return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800/50";
    case "dropout":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/50";
  }
}

function warningLevelBadge(level: WarningItem["level"]) {
  switch (level) {
    case "warning":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
    case "critical":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400";
    case "dropout":
      return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CYCLE: (AttendanceStatus | null)[] = [
  null,
  "present",
  "absent",
  "late",
  "excused",
];

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    letter: string;
    bg: string;
    text: string;
    icon: typeof CheckCircle2;
    iconColor: string;
    borderClass: string;
    btnClass: string;
  }
> = {
  present: {
    label: "Present",
    letter: "P",
    bg: "bg-[#4B0A8F]",
    text: "text-white",
    icon: CheckCircle2,
    iconColor: "text-white",
    borderClass: "",
    btnClass:
      "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50",
  },
  absent: {
    label: "Absent",
    letter: "A",
    bg: "bg-red-500/10 dark:bg-red-900/20",
    text: "text-red-600 dark:text-red-400",
    icon: XCircle,
    iconColor: "text-red-600 dark:text-red-400",
    borderClass: "border-l-[3px] border-l-red-500",
    btnClass:
      "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50",
  },
  late: {
    label: "Late",
    letter: "L",
    bg: "bg-amber-500/10 dark:bg-amber-900/20",
    text: "text-amber-600 dark:text-amber-400",
    icon: Clock,
    iconColor: "text-amber-600 dark:text-amber-400",
    borderClass: "border-l-[3px] border-l-amber-500",
    btnClass:
      "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50",
  },
  excused: {
    label: "Excused",
    letter: "E",
    bg: "bg-sky-500/10 dark:bg-sky-900/20",
    text: "text-sky-600 dark:text-sky-400",
    icon: ShieldCheck,
    iconColor: "text-sky-600 dark:text-sky-400",
    borderClass: "border-l-[3px] border-l-sky-500",
    btnClass:
      "bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:hover:bg-sky-900/50",
  },
};

const QUICK_STATUSES: { status: AttendanceStatus; icon: typeof CheckCircle2; label: string; colorClass: string }[] = [
  { status: "present", icon: CheckCircle2, label: "Present", colorClass: "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30" },
  { status: "absent", icon: XCircle, label: "Absent", colorClass: "text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30" },
  { status: "late", icon: Clock, label: "Late", colorClass: "text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30" },
  { status: "excused", icon: ShieldCheck, label: "Excused", colorClass: "text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/30" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function AttendanceRoster() {
  const { selectedEventId, navigateTo } = useAppStore();
  const { markAttendance, pendingCount } = useAttendanceSync();
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [showUnmarkedOnly, setShowUnmarkedOnly] = useState(false);
  const [rosterView, setRosterView] = useState<"cards" | "table">("cards");
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    recordId: string;
    participantName: string;
    currentStatus: AttendanceStatus | null;
  } | null>(null);
  // Confirmation dialogs
  const [bulkConfirm, setBulkConfirm] = useState<{
    type: "present" | "absent" | "reset";
    count: number;
  } | null>(null);

  // Range selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastClickedIdx = useRef<number | null>(null);

  // Optimistic local status overrides
  const [localStatusMap, setLocalStatusMap] = useState<Map<string, AttendanceStatus>>(
    () => new Map()
  );

  // ─── Fetch roster ────────────────────────────────────────────────────────

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<{
    permissions: { canCorrect: boolean };
    event: EventInfo;
    roster: RosterItem[];
    summary: Summary;
  }>({
    queryKey: ["attendance-roster", selectedEventId],
    queryFn: () =>
      fetch(`/api/park/attendance/${selectedEventId}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load roster");
        return r.json();
      }),
    enabled: !!selectedEventId,
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const canEditRecord = data?.permissions.canCorrect === true;
  const canClose = canEditRecord;
  const canReset = canEditRecord;

  // ─── Fetch warnings for this group ───────────────────────────────────

  const { data: warningsData } = useQuery<WarningsData>({
    queryKey: ["attendance-warnings", data?.event?.groupId],
    queryFn: () =>
      fetch(`/api/park/attendance/warnings?groupId=${data!.event!.groupId}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load warnings");
        return r.json();
      }),
    enabled: !!data?.event?.groupId,
    staleTime: 60000,
  });

  const warningMap = useMemo(() => {
    const map = new Map<string, WarningItem>();
    for (const w of warningsData?.warnings || []) {
      map.set(w.participantId, w);
    }
    return map;
  }, [warningsData]);

  // ─── Mutations ───────────────────────────────────────────────────────────

  // Batch sync mutation
  const batchSyncMutation = useMutation({
    mutationFn: async (params: {
      participantIds: string[];
      status: AttendanceStatus;
    }) => {
      const now = new Date().toISOString();
      const mutations = params.participantIds.map((pid) => ({
        mutationId: uuidv4(),
        eventId: selectedEventId,
        participantId: pid,
        status: params.status,
        markedAt: now,
      }));

      const res = await fetch("/api/park/attendance/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mutations }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Batch sync failed" }));
        throw new Error(err.error || "Batch sync failed");
      }

      return res.json();
    },
    onSuccess: (_data, variables) => {
      toast.success(
        `Marked ${variables.participantIds.length} as ${variables.status}`
      );
      queryClient.invalidateQueries({
        queryKey: ["attendance-roster", selectedEventId],
      });
    },
    onError: (err: Error, variables) => {
      // Revert optimistic updates for failed batch
      setLocalStatusMap((previous) => {
        const next = new Map(previous);
        variables.participantIds.forEach((participantId) => {
          next.delete(participantId);
        });
        return next;
      });
      toast.error(err.message || "Batch operation failed");
    },
  });

  // Reset all mutation
  const resetMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/park/attendance/${selectedEventId}/reset`, {
        method: "DELETE",
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => { throw new Error(e.error || "Reset failed"); });
        return r.json();
      }),
    onMutate: () => {
      // Clear all local optimistic state
      setLocalStatusMap(new Map());
    },
    onSuccess: () => {
      toast.success("All attendance marks cleared");
      queryClient.invalidateQueries({
        queryKey: ["attendance-roster", selectedEventId],
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reset attendance");
      refetch();
    },
  });

  // Close event mutation
  const closeMutation = useMutation({
    mutationFn: (reason: string) =>
      fetch(`/api/park/attendance/${selectedEventId}/close`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => { throw new Error(e.error || "Failed to close"); });
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Attendance locked successfully");
      setCloseDialogOpen(false);
      setCloseReason("");
      queryClient.invalidateQueries({ queryKey: ["attendance-roster", selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ["park-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["park-dashboard"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to close event");
    },
  });

  const reopenMutation = useMutation({
    mutationFn: (reason: string) =>
      fetch(`/api/park/attendance/${selectedEventId}/reopen`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }).then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Failed to reopen attendance");
        return body;
      }),
    onSuccess: () => {
      toast.success("Attendance reopened for correction");
      setReopenDialogOpen(false);
      setReopenReason("");
      queryClient.invalidateQueries({ queryKey: ["attendance-roster", selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ["park-attendance"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleMarkSingle = useCallback(
    async (participantId: string, status: AttendanceStatus) => {
      if (!selectedEventId || !data?.event || data.event.isClosed) return;

      // Optimistic update
      setLocalStatusMap((previous) => {
        const next = new Map(previous);
        next.set(participantId, status);
        return next;
      });
      setProcessingIds((prev) => new Set(prev).add(participantId));

      try {
        const result = await markAttendance({
          eventId: selectedEventId,
          participantId,
          status,
        });
        if (!result.success) {
          setLocalStatusMap((previous) => {
            const next = new Map(previous);
            next.delete(participantId);
            return next;
          });
          toast.error(result.error || "Failed to mark attendance");
        }
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(participantId);
          return next;
        });
        setTimeout(() => refetch(), 500);
      }
    },
    [selectedEventId, data, markAttendance, refetch]
  );

  const handleCycleStatus = useCallback(
    async (participantId: string, currentStatus: AttendanceStatus | null) => {
      const currentIdx = STATUS_CYCLE.indexOf(currentStatus);
      const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];

      if (!nextStatus) {
        // Cycling back to null
        setLocalStatusMap((previous) => {
          const next = new Map(previous);
          next.delete(participantId);
          return next;
        });
        return;
      }

      await handleMarkSingle(participantId, nextStatus);
    },
    [handleMarkSingle]
  );

  const handleBulkMark = useCallback(
    (status: "present" | "absent") => {
      if (!data?.roster) return;

      const unmarked = data.roster.filter(
        (r) => !r.status && !localStatusMap.has(r.participantId)
      );

      if (unmarked.length === 0) {
        toast.info("No unmarked participants to mark");
        return;
      }

      setBulkConfirm({ type: status, count: unmarked.length });
    },
    [data, localStatusMap]
  );

  const confirmBulkMark = useCallback(() => {
    if (!bulkConfirm || bulkConfirm.type === "reset" || !data?.roster) return;

    const targetStatus = bulkConfirm.type;
    const unmarked = data.roster.filter(
      (r) => !r.status && !localStatusMap.has(r.participantId)
    );

    const ids = unmarked.map((r) => r.participantId);

    // Optimistic: set all local statuses immediately
    setLocalStatusMap((previous) => {
      const next = new Map(previous);
      ids.forEach((participantId) => next.set(participantId, targetStatus));
      return next;
    });
    setProcessingIds(new Set(ids));

    // Clear selection after bulk mark
    setSelectedIds(new Set());
    lastClickedIdx.current = null;

    batchSyncMutation.mutate(
      { participantIds: ids, status: targetStatus },
      {
        onSettled: () => {
          setProcessingIds(new Set());
        },
      }
    );

    setBulkConfirm(null);
  }, [bulkConfirm, data, localStatusMap, batchSyncMutation]);

  const confirmReset = useCallback(() => {
    setSelectedIds(new Set());
    lastClickedIdx.current = null;
    resetMutation.mutate(undefined, {
      onSettled: () => {
        setProcessingIds(new Set());
      },
    });
    setBulkConfirm(null);
  }, [resetMutation]);

  const handleCloseEvent = () => {
    if (!closeReason.trim()) {
      toast.error("Please provide a reason for closing");
      return;
    }
    closeMutation.mutate(closeReason.trim());
  };

  // ─── Range selection handlers ────────────────────────────────────────────

  const handleRowClick = useCallback(
    (e: React.MouseEvent, index: number, participantId: string) => {
      if (!data?.roster || data.event.isClosed) return;

      if (e.shiftKey && lastClickedIdx.current !== null) {
        // Range select
        const start = Math.min(lastClickedIdx.current, index);
        const end = Math.max(lastClickedIdx.current, index);
        const visibleRoster = data.roster.filter((item) => {
          const matchesSearch = !search.trim() || item.participantName.toLowerCase().includes(search.toLowerCase());
          const isUnmarked = !item.status && !localStatusMap.has(item.participantId);
          return matchesSearch && (!showUnmarkedOnly || isUnmarked);
        });
        const rangeIds = visibleRoster
          .slice(start, end + 1)
          .map((r) => r.participantId);

        setSelectedIds((prev) => {
          const next = new Set(prev);
          rangeIds.forEach((id) => next.add(id));
          return next;
        });
      } else if (e.metaKey || e.ctrlKey) {
        // Toggle single in selection
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(participantId)) {
            next.delete(participantId);
          } else {
            next.add(participantId);
          }
          return next;
        });
        lastClickedIdx.current = index;
      } else {
        // Clear and select single
        setSelectedIds(new Set([participantId]));
        lastClickedIdx.current = index;
      }
    },
    [data, search, showUnmarkedOnly, localStatusMap]
  );

  const handleRangeMark = useCallback(
    (status: AttendanceStatus) => {
      if (selectedIds.size === 0) return;
      const ids = Array.from(selectedIds);

      // Optimistic
      setLocalStatusMap((previous) => {
        const next = new Map(previous);
        ids.forEach((participantId) => next.set(participantId, status));
        return next;
      });
      setProcessingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });

      batchSyncMutation.mutate(
        { participantIds: ids, status },
        {
          onSettled: () => {
            setProcessingIds(new Set());
            setSelectedIds(new Set());
            lastClickedIdx.current = null;
          },
        }
      );
    },
    [selectedIds, batchSyncMutation]
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastClickedIdx.current = null;
  }, []);

  // ─── Computed data ───────────────────────────────────────────────────────

  const roster = data?.roster || [];
  const serverSummary = data?.summary || ({} as Summary);
  const event = data?.event;

  const filteredRoster = useMemo(() => {
    let items = roster;
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((r) =>
        r.participantName.toLowerCase().includes(q)
      );
    }
    if (showUnmarkedOnly) {
      items = items.filter(
        (r) => !r.status && !localStatusMap.has(r.participantId)
      );
    }
    return items;
  }, [roster, search, showUnmarkedOnly, localStatusMap]);

  // Merged status (server + optimistic local)
  const getStatus = useCallback(
    (item: RosterItem): AttendanceStatus | null => {
      return localStatusMap.get(item.participantId) ?? item.status;
    },
    [localStatusMap]
  );

  // Computed summary with optimistic updates
  const liveSummary = useMemo<Summary>(() => {
    const counts: Summary = {
      total: roster.length,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      unmarked: 0,
    };

    for (const item of roster) {
      const status = localStatusMap.get(item.participantId) ?? item.status;
      if (status && status in counts) {
        counts[status]++;
      } else {
        counts.unmarked++;
      }
    }

    return counts;
  }, [roster, localStatusMap]);

  const unmarkedCount = useMemo(
    () =>
      roster.filter(
        (r) => !r.status && !localStatusMap.has(r.participantId)
      ).length,
    [roster, localStatusMap]
  );

  const hasMarkedRecords = serverSummary.total > 0 && serverSummary.unmarked < serverSummary.total;

  const presentPercent =
    liveSummary.total > 0
      ? Math.round((liveSummary.present / liveSummary.total) * 100)
      : 0;

  // ─── Loading / error / empty states ──────────────────────────────────────

  if (!selectedEventId) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="No event selected"
        description="Go back to the Attendance page and select an event."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateTo("park-attendance")}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="h-6 bg-muted rounded w-48 animate-pulse" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-14 bg-muted/50 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateTo("park-attendance")}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <EmptyState
          icon={XCircle}
          title="Could not load roster"
          description="There was an error loading the attendance roster. Please try again."
        />
      </div>
    );
  }

  const isClosed = event.isClosed;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 px-3 pb-5 pt-2 sm:px-4 lg:px-6">
      {/* Back button + event info */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="mt-0.5 shrink-0 no-print"
          onClick={() => navigateTo("park-attendance")}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold truncate">{event.title}</h2>
            <Badge
              variant={isClosed ? "secondary" : "default"}
              className={cn(
                "text-[10px] shrink-0",
                isClosed
                  ? "bg-muted text-muted-foreground"
                  : "bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F0860] dark:text-[#8A40B0]"
              )}
            >
              {isClosed ? "Closed" : "Open"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {event.groupName} &middot; {event.batchName}
          </p>
        </div>
        {!isClosed && canClose && (
          <Button
            variant="outline"
            size="sm"
            className="no-print shrink-0 mt-0.5 border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30"
            onClick={() => setCloseDialogOpen(true)}
          >
            <Lock className="size-4 mr-1.5" />
            Lock attendance
          </Button>
        )}
      </div>

      {/* Offline indicator */}
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-red-50 border-l-4 border-l-red-500 border border-red-200 dark:bg-red-950/30 dark:border-red-800/50"
        >
          <span className="relative flex shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <WifiOff className="relative size-4 text-red-600 dark:text-red-400" />
          </span>
          <p className="text-sm text-red-700 dark:text-red-300">
            You&apos;re offline. Marks will sync automatically.
            {pendingCount > 0 && (
              <span className="font-semibold ml-1">
                {pendingCount} mark{pendingCount !== 1 ? "s" : ""} queued.
              </span>
            )}
          </p>
        </motion.div>
      )}

      {/* Event closed banner */}
      {isClosed && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-muted border"
        >
          <Lock className="size-4 text-muted-foreground shrink-0" />
          <div className="text-sm">
            <span className="font-medium text-muted-foreground">
              Attendance locked
            </span>
            {event.closedByName && (
              <span className="text-muted-foreground">
                {" "}
                by {event.closedByName}
                {event.closedAt && (
                  <span>
                    {" "}
                    at{" "}
                    {new Date(event.closedAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </span>
            )}
          </div>
          {canClose && (
            <Button
              className="ml-auto shrink-0"
              onClick={() => setReopenDialogOpen(true)}
              size="sm"
              variant="outline"
            >
              <RotateCcw className="mr-1.5 size-3.5" />
              Reopen
            </Button>
          )}
        </motion.div>
      )}

      {/* Warning banner */}
      {warningsData && warningsData.warnings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50"
        >
          <AlertTriangle className="size-4 text-amber-500 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300 flex-1">
            <span className="font-semibold">{warningsData.warnings.length}</span>{" "}
            participant{warningsData.warnings.length !== 1 ? "s" : ""}{" "}
            {warningsData.warnings.length === 1 ? "has" : "have"} attendance warnings
          </p>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 text-[11px] h-7 px-2.5 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/50"
            onClick={() => setWarningDialogOpen(true)}
          >
            View Details
          </Button>
        </motion.div>
      )}

      {/* ─── Bulk Action Toolbar (sticky) ────────────────────────────────── */}
      {!isClosed && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-20 rounded-xl border bg-background/95 px-3 py-2.5 backdrop-blur-sm no-print sm:px-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground mr-1 hidden sm:inline">
              Bulk:
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "gap-1.5 text-xs",
                    "border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800",
                    "dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
                  )}
                  onClick={() => handleBulkMark("present")}
                  disabled={unmarkedCount === 0}
                >
                  <CheckCircle2 className="size-3.5" />
                  <span className="hidden sm:inline">All Present</span>
                  <span className="sm:hidden">Present</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Mark {unmarkedCount} unmarked as Present
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "gap-1.5 text-xs",
                    "border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700",
                    "dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                  )}
                  onClick={() => handleBulkMark("absent")}
                  disabled={unmarkedCount === 0}
                >
                  <XCircle className="size-3.5" />
                  <span className="hidden sm:inline">All Absent</span>
                  <span className="sm:hidden">Absent</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Mark {unmarkedCount} unmarked as Absent
              </TooltipContent>
            </Tooltip>

            {canReset && hasMarkedRecords && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      setBulkConfirm({ type: "reset", count: liveSummary.total - liveSummary.unmarked })
                    }
                  >
                    <RotateCcw className="size-3.5" />
                    <span className="hidden sm:inline">Reset All</span>
                    <span className="sm:hidden">Reset</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear all attendance marks</TooltipContent>
              </Tooltip>
            )}

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-1 ml-auto">
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Users className="size-3" />
                  {selectedIds.size} selected
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={clearSelection}
                >
                  <X className="size-3" />
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Compact progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Attendance Progress
          </span>
          <span className="inline-flex items-center rounded-full bg-[#4B0A8F]/10 px-2 py-0.5 text-[10px] font-semibold text-[#4B0A8F] dark:bg-[#4B0A8F]/20 dark:text-[#8A40B0]">
            {presentPercent}%
          </span>
        </div>
        <Progress
          value={presentPercent}
          className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-[#2A0C8F] [&>div]:via-[#A0006B] [&>div]:to-[#4B0A8F] [&>div]:transition-all [&>div]:duration-500"
        />
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative basis-full sm:min-w-0 sm:flex-1 sm:basis-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search participant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl focus-visible:ring-[#A0006B]/30"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
            >
              <X className="size-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <Button
          variant={showUnmarkedOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowUnmarkedOnly(!showUnmarkedOnly)}
          className={cn(
            showUnmarkedOnly &&
              "bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
          )}
        >
          <Filter className="size-3.5 mr-1.5" />
          Unmarked
        </Button>
        <div className="ml-auto flex rounded-lg border bg-muted/40 p-1" aria-label="Roster layout">
          <Button
            aria-pressed={rosterView === "cards"}
            className={cn("h-8 px-2", rosterView === "cards" ? "bg-background shadow-sm" : "text-muted-foreground")}
            onClick={() => setRosterView("cards")}
            size="sm"
            type="button"
            variant="ghost"
          >
            <LayoutGrid className="size-4" />
            <span className="sr-only">Cards</span>
          </Button>
          <Button
            aria-pressed={rosterView === "table"}
            className={cn("h-8 px-2", rosterView === "table" ? "bg-background shadow-sm" : "text-muted-foreground")}
            onClick={() => setRosterView("table")}
            size="sm"
            type="button"
            variant="ghost"
          >
            <List className="size-4" />
            <span className="sr-only">Table</span>
          </Button>
        </div>
      </div>

      {/* One document scroll only; cards are the fast-touch default. */}
      {rosterView === "table" ? (
        <div className="rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="min-w-[620px] w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 font-medium">Participant</th>
                  <th className="px-3 py-3 font-medium">Current status</th>
                  <th className="px-3 py-3 font-medium">Mark attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRoster.map((item) => {
                  const status = getStatus(item);
                  return (
                    <tr key={item.participantId}>
                      <td className="px-3 py-3"><p className="font-medium">{item.participantName}</p>{item.phone && <p className="text-xs text-muted-foreground">{item.phone}</p>}</td>
                      <td className="px-3 py-3"><Badge variant="secondary">{status ? STATUS_CONFIG[status].label : "Unmarked"}</Badge></td>
                      <td className="px-3 py-3">
                        {isClosed ? <span className="text-xs text-muted-foreground">Locked</span> : (
                          <div className="flex gap-1.5">{QUICK_STATUSES.map((qs) => <Button className={cn("h-8 px-2 text-xs", status === qs.status && qs.colorClass)} disabled={processingIds.has(item.participantId)} key={qs.status} onClick={() => handleMarkSingle(item.participantId, qs.status)} size="sm" variant={status === qs.status ? "default" : "outline"}>{qs.label}</Button>)}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
      <div className="space-y-2">
        {filteredRoster.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {showUnmarkedOnly
                ? "All participants are marked!"
                : "No participants found."}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredRoster.map((item, i) => {
              const status = getStatus(item);
              const config = status ? STATUS_CONFIG[status] : null;
              const isProcessing = processingIds.has(item.participantId);
              const isSelected = selectedIds.has(item.participantId);
              const participantWarning = warningMap.get(item.participantId);

              return (
                <motion.div
                  key={item.participantId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: Math.min(i * 0.02, 0.5),
                    duration: 0.2,
                  }}
                  onClick={(e) => handleRowClick(e, i, item.participantId)}
                  className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-all duration-200 min-h-[52px] cursor-pointer group/row",
                    !isClosed && "hover:translate-y-[-1px] hover:shadow-md",
                    isClosed
                      ? "bg-muted/30 border-border/50"
                      : "bg-card border-border hover:bg-accent/50",
                    isSelected &&
                      "ring-2 ring-[#4B0A8F]/40 border-[#4B0A8F]/30 bg-[#4B0A8F]/5 dark:ring-[#8A40B0]/40 dark:border-[#8A40B0]/30 dark:bg-[#4B0A8F]/10",
                    config && !isSelected && config.borderClass
                  )}
                >
                  {/* Name + phone */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">
                        {item.participantName}
                      </p>
                      {participantWarning && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertTriangle
                              className={cn(
                                "size-3.5 shrink-0",
                                warningLevelColor(participantWarning.level)
                              )}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {participantWarning.consecutiveAbsents} consecutive absences ({participantWarning.level} threshold: {participantWarning.threshold})
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    {item.phone && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.phone}
                      </p>
                    )}
                  </div>

                  {/* Quick status buttons (mobile: always visible, desktop: hover) */}
                  {!isClosed && (
                    <div className="hidden items-center gap-1 sm:flex sm:shrink-0 sm:opacity-0 sm:transition-opacity sm:duration-150 sm:group-hover/row:opacity-100">
                      {QUICK_STATUSES.map((qs) => {
                        const isCurrentStatus = status === qs.status;
                        const Icon = qs.icon;
                        return (
                          <Tooltip key={qs.status}>
                            <TooltipTrigger asChild>
                              <button
                                disabled={isProcessing}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isCurrentStatus) return;
                                  handleMarkSingle(
                                    item.participantId,
                                    qs.status
                                  );
                                }}
                                className={cn(
                                  "flex items-center justify-center w-10 h-10 sm:w-7 sm:h-7 rounded-full transition-all duration-150",
                                  isCurrentStatus
                                    ? qs.colorClass.replace(
                                        "hover:bg-",
                                        "bg-"
                                      ).replace(
                                        "dark:hover:bg-",
                                        "dark:bg-"
                                      )
                                    : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 dark:hover:bg-muted/30",
                                  isCurrentStatus && "ring-1.5 ring-current/20",
                                  !isProcessing && "active:scale-90"
                                )}
                                aria-label={`${qs.label} ${item.participantName}`}
                              >
                                {isProcessing && !isCurrentStatus ? (
                                  <Loader2 className="size-4 sm:size-3.5 animate-spin" />
                                ) : (
                                  <Icon
                                    className={cn(
                                      "size-4 sm:size-3.5",
                                      isCurrentStatus && qs.colorClass.split(" ")[0]
                                    )}
                                  />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              {qs.label}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  )}

                  {/* Mobile status cycle button */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Edit button (admin/park_admin only, when record exists) */}
                    {canEditRecord && item.recordId && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditTarget({
                                recordId: item.recordId!,
                                participantName: item.participantName,
                                currentStatus: status,
                              });
                              setEditDialogOpen(true);
                            }}
                            className="hidden sm:flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors"
                            aria-label={`Edit ${item.participantName}`}
                          >
                            <Pencil className="size-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="left">Edit record</TooltipContent>
                      </Tooltip>
                    )}
                    <button
                      disabled={isClosed || isProcessing}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCycleStatus(item.participantId, status);
                      }}
                      className={cn(
                        "relative flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-lg transition-all duration-150 shrink-0 sm:hidden touch-manipulation",
                      config
                        ? cn(config.bg, config.borderClass)
                        : "bg-muted/50 border-2 border-dashed border-muted-foreground/30",
                      !isClosed &&
                        !isProcessing &&
                        "active:scale-90 hover:opacity-90",
                      !isClosed &&
                        !isProcessing &&
                        !config &&
                        "hover:border-muted-foreground/50",
                      isClosed && "cursor-default opacity-70"
                    )}
                    aria-label={
                      config
                        ? `${item.participantName}: ${config.label}. Tap to change.`
                        : `${item.participantName}: Unmarked. Tap to mark present.`
                    }
                  >
                    {isProcessing ? (
                      <RefreshCw className="size-4 animate-spin text-muted-foreground" />
                    ) : config ? (
                      <span className={cn("text-sm font-bold", config.text)}>
                        {config.letter}
                      </span>
                    ) : (
                      <Circle className="size-4 text-muted-foreground/40" />
                    )}
                  </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
      )}

      {/* ─── Attendance Summary Bar (sticky bottom) ──────────────────────── */}
      {roster.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-20 rounded-xl border bg-background/95 px-3 py-3 shadow-sm backdrop-blur-sm no-print sm:sticky sm:bottom-3 sm:px-4"
        >
          {/* Progress bar */}
          <div className="mb-2">
            <Progress
              value={presentPercent}
              className="h-1.5 [&>div]:bg-emerald-500 [&>div]:transition-all [&>div]:duration-500"
            />
          </div>

          {/* Summary counts */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs sm:hidden">
            <span className="rounded-lg bg-muted px-2 py-2 font-semibold">Total<br />{liveSummary.total}</span>
            <span className="rounded-lg bg-emerald-50 px-2 py-2 font-semibold text-emerald-700">Present<br />{liveSummary.present}</span>
            <span className="rounded-lg bg-red-50 px-2 py-2 font-semibold text-red-700">Absent<br />{liveSummary.absent}</span>
            <span className="rounded-lg bg-amber-50 px-2 py-2 font-semibold text-amber-700">Late<br />{liveSummary.late}</span>
            <span className="rounded-lg bg-sky-50 px-2 py-2 font-semibold text-sky-700">Excused<br />{liveSummary.excused}</span>
            <span className="rounded-lg bg-muted px-2 py-2 font-semibold text-muted-foreground">Unmarked<br />{liveSummary.unmarked}</span>
          </div>
          <div className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:flex">
            <span className="font-semibold text-foreground">
              Total: {liveSummary.total}
            </span>
            <span className="text-muted-foreground">|</span>

            <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3" />
              Present: {liveSummary.present}{" "}
              <span className="text-muted-foreground">
                ({liveSummary.total > 0 ? Math.round((liveSummary.present / liveSummary.total) * 100) : 0}%)
              </span>
            </span>

            <span className="flex items-center gap-1 font-medium text-red-600 dark:text-red-400">
              <XCircle className="size-3" />
              Absent: {liveSummary.absent}{" "}
              <span className="text-muted-foreground">
                ({liveSummary.total > 0 ? Math.round((liveSummary.absent / liveSummary.total) * 100) : 0}%)
              </span>
            </span>

            <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
              <Clock className="size-3" />
              Late: {liveSummary.late}{" "}
              <span className="text-muted-foreground">
                ({liveSummary.total > 0 ? Math.round((liveSummary.late / liveSummary.total) * 100) : 0}%)
              </span>
            </span>

            <span className="flex items-center gap-1 font-medium text-sky-600 dark:text-sky-400">
              <ShieldCheck className="size-3" />
              Excused: {liveSummary.excused}{" "}
              <span className="text-muted-foreground">
                ({liveSummary.total > 0 ? Math.round((liveSummary.excused / liveSummary.total) * 100) : 0}%)
              </span>
            </span>

            {liveSummary.unmarked > 0 && (
              <>
                <span className="text-muted-foreground">|</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Circle className="size-3" />
                  Unmarked: {liveSummary.unmarked}{" "}
                  <span>
                    ({Math.round((liveSummary.unmarked / liveSummary.total) * 100)}%)
                  </span>
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* ─── Floating Range Action Bar ───────────────────────────────────── */}
      <AnimatePresence>
        {selectedIds.size > 0 && !isClosed && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-3 bottom-20 z-50 flex flex-col gap-2 rounded-xl border bg-background px-3 py-3 shadow-xl no-print sm:inset-x-auto sm:bottom-8 sm:left-1/2 sm:-translate-x-1/2 sm:flex-row sm:items-center sm:py-2"
          >
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Mark {selectedIds.size} as:
            </span>
            <div className="grid w-full grid-cols-4 gap-1.5 sm:flex sm:w-auto sm:items-center">
              {QUICK_STATUSES.map((qs) => {
                const Icon = qs.icon;
                return (
                  <Button
                    key={qs.status}
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "h-11 gap-1 px-1 text-xs font-medium sm:h-8 sm:gap-1.5 sm:px-2.5",
                      qs.colorClass
                    )}
                    onClick={() => handleRangeMark(qs.status)}
                    disabled={batchSyncMutation.isPending}
                  >
                    <Icon className="size-3.5" />
                    <span className="hidden sm:inline">{qs.label}</span>
                    <span className="sr-only sm:hidden">{qs.label}</span>
                  </Button>
                );
              })}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-2 top-2 h-8 px-2 text-xs text-muted-foreground sm:static"
              onClick={clearSelection}
            >
              <X className="size-3.5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Queue Panel */}
      <OfflineQueuePanel />

      {/* ─── Bulk Confirmation Dialog ────────────────────────────────────── */}
      <AlertDialog
        open={!!bulkConfirm && bulkConfirm.type !== "reset"}
        onOpenChange={(open) => !open && setBulkConfirm(null)}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Mark all as{" "}
              {bulkConfirm?.type === "present" ? "Present" : "Absent"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will mark{" "}
              <strong>{bulkConfirm?.count ?? 0} unmarked participants</strong>{" "}
              as {bulkConfirm?.type === "present" ? "Present" : "Absent"}.
              Already marked participants will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBulkConfirm(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkMark}
              className={cn(
                bulkConfirm?.type === "present" &&
                  "bg-emerald-600 hover:bg-emerald-700 text-white",
                bulkConfirm?.type === "absent" &&
                  "bg-red-600 hover:bg-red-700 text-white"
              )}
            >
              {batchSyncMutation.isPending ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Marking...
                </>
              ) : bulkConfirm?.type === "present" ? (
                <>
                  <CheckCircle2 className="size-4 mr-2" />
                  Mark All Present
                </>
              ) : (
                <>
                  <XCircle className="size-4 mr-2" />
                  Mark All Absent
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Reset Confirmation Dialog ───────────────────────────────────── */}
      <AlertDialog
        open={bulkConfirm?.type === "reset"}
        onOpenChange={(open) => !open && setBulkConfirm(null)}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all attendance marks?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <strong>{bulkConfirm?.count ?? 0} attendance records</strong> for
              this session. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBulkConfirm(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReset}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {resetMutation.isPending ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw className="size-4 mr-2" />
                  Reset All
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Lock attendance dialog ─────────────────────────────────────── */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lock attendance</DialogTitle>
            <DialogDescription>
              This will lock the event and prevent further attendance marks
              (except for park admins/leads with an edit reason).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="close-reason">Reason for closing</Label>
              <Textarea
                id="close-reason"
                placeholder="e.g. Session completed, all participants marked"
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50 px-3 py-2">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <strong>Note:</strong> {liveSummary.unmarked} participant
                {liveSummary.unmarked !== 1 ? "s" : ""} still unmarked.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCloseDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCloseEvent}
              disabled={!closeReason.trim() || closeMutation.isPending}
            >
              {closeMutation.isPending ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Closing...
                </>
              ) : (
                "Lock attendance"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reopen attendance?</DialogTitle>
            <DialogDescription>
              Reopening permits corrections. Existing records and any completed dropout decisions remain unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reopen-reason">Reason for reopening</Label>
            <Textarea
              id="reopen-reason"
              onChange={(event) => setReopenReason(event.target.value)}
              placeholder="e.g. A register correction was requested"
              rows={3}
              value={reopenReason}
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setReopenDialogOpen(false)} variant="outline">Cancel</Button>
            <Button
              disabled={!reopenReason.trim() || reopenMutation.isPending}
              onClick={() => reopenMutation.mutate(reopenReason.trim())}
            >
              {reopenMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Reopen attendance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Warnings Dialog ─────────────────────────────────────────────── */}
      <Dialog open={warningDialogOpen} onOpenChange={setWarningDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Attendance Warnings
            </DialogTitle>
            <DialogDescription>
              Participants with consecutive absences approaching or exceeding thresholds.
              {warningsData?.settings && (
                <span className="block mt-1">
                  Warning: {warningsData.settings.warningAbsents} absences &middot; Dropout: {warningsData.settings.dropoutAbsents} absences
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {warningsData && warningsData.warnings.length > 0 && (
            <div className="space-y-2 py-2">
              {warningsData.warnings
                .sort((a, b) => {
                  const order = { dropout: 0, critical: 1, warning: 2 };
                  return order[a.level] - order[b.level] || b.consecutiveAbsents - a.consecutiveAbsents;
                })
                .map((w) => (
                  <div
                    key={w.participantId}
                    className={cn(
                      "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border",
                      warningLevelBg(w.level)
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{w.participantName}</p>
                        <Badge
                          variant="secondary"
                          className={cn("text-[10px] shrink-0", warningLevelBadge(w.level))}
                        >
                          {w.level}
                        </Badge>
                      </div>
                      <p className="text-xs mt-0.5 opacity-80">
                        {w.consecutiveAbsents} consecutive absence{w.consecutiveAbsents !== 1 ? "s" : ""}
                        {w.lastAttendanceDate && (
                          <span> &middot; Last attended: {w.lastAttendanceDate}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => toast.info(`Contact guardian feature coming soon for ${w.participantName}`)}
                          >
                            <Phone className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Contact Guardian</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => toast.info(`Warning notice will be sent to ${w.participantName}'s guardian`)}
                          >
                            <Send className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Send Warning Notice</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setWarningDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Attendance Dialog ──────────────────────────────────────── */}
      {editTarget && selectedEventId && (
        <AttendanceEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          eventId={selectedEventId}
          recordId={editTarget.recordId}
          participantName={editTarget.participantName}
          currentStatus={editTarget.currentStatus}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
