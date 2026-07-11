"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { useAttendanceSync } from "@/hooks/use-attendance-sync";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { OfflineQueuePanel } from "./offline-queue-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/lib/offline/db";

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
  },
  absent: {
    label: "Absent",
    letter: "A",
    bg: "bg-red-500/10 dark:bg-red-900/20",
    text: "text-red-600 dark:text-red-400",
    icon: XCircle,
    iconColor: "text-red-600 dark:text-red-400",
    borderClass: "border-l-[3px] border-l-red-500",
  },
  late: {
    label: "Late",
    letter: "L",
    bg: "bg-amber-500/10 dark:bg-amber-900/20",
    text: "text-amber-600 dark:text-amber-400",
    icon: Clock,
    iconColor: "text-amber-600 dark:text-amber-400",
    borderClass: "border-l-[3px] border-l-amber-500",
  },
  excused: {
    label: "Excused",
    letter: "E",
    bg: "bg-sky-500/10 dark:bg-sky-900/20",
    text: "text-sky-600 dark:text-sky-400",
    icon: ShieldCheck,
    iconColor: "text-sky-600 dark:text-sky-400",
    borderClass: "border-l-[3px] border-l-sky-500",
  },
};

export function AttendanceRoster() {
  const { selectedEventId, navigateTo } = useAppStore();
  const { data: session } = useSession();
  const { markAttendance, pendingCount } = useAttendanceSync();
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [showUnmarkedOnly, setShowUnmarkedOnly] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Optimistic local status overrides
  const localStatusMap = useRef<Map<string, AttendanceStatus>>(new Map());

  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const canClose =
    userRole === "park_admin" || userRole === "park_lead";

  // Fetch roster
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<{
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
      toast.success("Event closed successfully");
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

  const handleCycleStatus = useCallback(
    async (participantId: string, currentStatus: AttendanceStatus | null) => {
      if (!selectedEventId || !data?.event || data.event.isClosed) return;

      const currentIdx = STATUS_CYCLE.indexOf(currentStatus);
      const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];

      // Update local optimistic state
      if (nextStatus) {
        localStatusMap.current.set(participantId, nextStatus);
      } else {
        localStatusMap.current.delete(participantId);
      }

      // Update processing indicator
      setProcessingIds((prev) => new Set(prev).add(participantId));

      try {
        if (nextStatus) {
          const result = await markAttendance({
            eventId: selectedEventId,
            participantId,
            status: nextStatus,
          });
          if (!result.success) {
            // Revert optimistic update
            localStatusMap.current.delete(participantId);
            toast.error(result.error || "Failed to mark attendance");
          }
        } else {
          // Cycling back to null - we don't actually call the API for this
          // The "null" state just means unmarking locally
        }
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(participantId);
          return next;
        });
        // Brief refetch delay to let sync process
        setTimeout(() => {
          refetch();
        }, 500);
      }
    },
    [selectedEventId, data?.event, markAttendance, refetch]
  );

  const handleCloseEvent = () => {
    if (!closeReason.trim()) {
      toast.error("Please provide a reason for closing");
      return;
    }
    closeMutation.mutate(closeReason.trim());
  };

  // Filtered roster
  const roster = data?.roster || [];
  const summary = data?.summary || ({} as Summary);
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
        (r) => !r.status && !localStatusMap.current.has(r.participantId)
      );
    }

    return items;
  }, [roster, search, showUnmarkedOnly]);

  // Merged status (server + optimistic local)
  const getStatus = useCallback(
    (item: RosterItem): AttendanceStatus | null => {
      return localStatusMap.current.get(item.participantId) ?? item.status;
    },
    []
  );

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

  return (
    <div className="space-y-4">
      {/* Back button + event info */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="mt-0.5 shrink-0"
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
              Event Closed
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
        </motion.div>
      )}

      {/* Progress section */}
      <div className="space-y-3 rounded-xl border bg-card p-4">
        {/* Gradient progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Attendance Progress</span>
            <span className="inline-flex items-center rounded-full bg-[#4B0A8F]/10 px-2.5 py-0.5 text-xs font-semibold text-[#4B0A8F] dark:bg-[#4B0A8F]/20 dark:text-[#8A40B0]">
              {summary.total > 0
                ? Math.round(((summary.present + summary.late) / summary.total) * 100)
                : 0}
              %
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2A0C8F] via-[#A0006B] to-[#FF0015] transition-all duration-500 ease-out"
              style={{
                width: `${summary.total > 0 ? ((summary.present + summary.late) / summary.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
        {/* Status count pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#4B0A8F]/10 px-2.5 py-1 text-xs font-semibold text-[#4B0A8F] dark:bg-[#4B0A8F]/20 dark:text-[#8A40B0]">
            P: {summary.present}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
            A: {summary.absent}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            L: {summary.late}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400">
            E: {summary.excused}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            —: {summary.unmarked}
          </span>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
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
      </div>

      {/* Roster list */}
      <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
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

              return (
                <motion.div
                  key={item.participantId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.5), duration: 0.2 }}
                  className={cn(
                    "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-all duration-200 min-h-[48px]",
                    !isClosed && "hover:translate-y-[-1px] hover:shadow-md",
                    isClosed
                      ? "bg-muted/30 border-border/50"
                      : "bg-card border-border hover:bg-accent/50"
                  )}
                >
                  {/* Name */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {item.participantName}
                    </p>
                    {item.phone && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.phone}
                      </p>
                    )}
                  </div>

                  {/* Status button */}
                  <button
                    disabled={isClosed || isProcessing}
                    onClick={() => handleCycleStatus(item.participantId, status)}
                    className={cn(
                      "relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-150 shrink-0",
                      config
                        ? cn(config.bg, config.borderClass)
                        : "bg-muted/50 border-2 border-dashed border-muted-foreground/30",
                      !isClosed && !isProcessing && "active:scale-90 hover:opacity-90",
                      !isClosed && !isProcessing && !config && "hover:border-muted-foreground/50",
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
                      <span
                        className={cn(
                          "text-sm font-bold",
                          config.text
                        )}
                      >
                        {config.letter}
                      </span>
                    ) : (
                      <Circle className="size-4 text-muted-foreground/40" />
                    )}
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Close event button */}
      {!isClosed && canClose && (
        <div className="pt-2">
          <Button
            variant="outline"
            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950/30 dark:text-red-400 dark:hover:text-red-300"
            onClick={() => setCloseDialogOpen(true)}
          >
            <Lock className="size-4 mr-2" />
            Close Event
          </Button>
        </div>
      )}

      {/* Offline Queue Panel */}
      <OfflineQueuePanel />

      {/* Close Event Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Close Event</DialogTitle>
            <DialogDescription>
              This will lock the event and prevent further attendance marks (except
              for park admins/leads with an edit reason).
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
                <strong>Note:</strong> {summary.unmarked} participant
                {summary.unmarked !== 1 ? "s" : ""} still unmarked.
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
                "Close Event"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}