"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { useAttendanceSync } from "@/hooks/use-attendance-sync";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Circle,
  Search,
  ArrowLeft,
  Lock,
  WifiOff,
  Users,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  X,
} from "lucide-react";
import type { AttendanceStatus } from "@/lib/offline/db";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Status Config ─────────────────────────────────────────────────────────

const STATUS_META = {
  present: {
    label: "Present",
    letter: "P",
    icon: CheckCircle2,
    ringClass: "ring-2 ring-emerald-500",
    bgCard: "bg-emerald-50 dark:bg-emerald-950/20",
    borderLeft: "border-l-[4px] border-l-emerald-500",
    chip: "bg-emerald-500 text-white",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    btnActive: "bg-emerald-500 text-white shadow-emerald-200 shadow-md",
    btnIdle:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  absent: {
    label: "Absent",
    letter: "A",
    icon: XCircle,
    ringClass: "ring-2 ring-red-500",
    bgCard: "bg-red-50 dark:bg-red-950/20",
    borderLeft: "border-l-[4px] border-l-red-500",
    chip: "bg-red-500 text-white",
    iconColor: "text-red-600 dark:text-red-400",
    btnActive: "bg-red-500 text-white shadow-red-200 shadow-md",
    btnIdle:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  late: {
    label: "Late",
    letter: "L",
    icon: Clock,
    ringClass: "ring-2 ring-amber-500",
    bgCard: "bg-amber-50 dark:bg-amber-950/20",
    borderLeft: "border-l-[4px] border-l-amber-500",
    chip: "bg-amber-500 text-white",
    iconColor: "text-amber-600 dark:text-amber-400",
    btnActive: "bg-amber-500 text-white shadow-amber-200 shadow-md",
    btnIdle:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  excused: {
    label: "Excused",
    letter: "E",
    icon: ShieldCheck,
    ringClass: "ring-2 ring-sky-500",
    bgCard: "bg-sky-50 dark:bg-sky-950/20",
    borderLeft: "border-l-[4px] border-l-sky-500",
    chip: "bg-sky-500 text-white",
    iconColor: "text-sky-600 dark:text-sky-400",
    btnActive: "bg-sky-500 text-white shadow-sky-200 shadow-md",
    btnIdle:
      "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  },
} as const;

type FilterTab = "all" | "unmarked" | "present" | "absent" | "late" | "excused";

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusButton({
  status,
  active,
  disabled,
  onPress,
}: {
  status: AttendanceStatus;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onPress}
      disabled={disabled}
      aria-label={`Mark ${meta.label}`}
      className={cn(
        "flex flex-col items-center justify-center gap-1 h-14 w-14 rounded-2xl transition-all duration-150 disabled:opacity-40",
        active ? meta.btnActive : meta.btnIdle
      )}
    >
      <Icon className={cn("size-5", active ? "text-white" : meta.iconColor)} />
      <span className={cn("text-[10px] font-semibold leading-none", active ? "text-white" : "")}>
        {meta.label}
      </span>
    </motion.button>
  );
}

function ParticipantCard({
  item,
  localStatus,
  processing,
  isClosed,
  onMark,
  index,
}: {
  item: RosterItem;
  localStatus: AttendanceStatus | null;
  processing: boolean;
  isClosed: boolean;
  onMark: (id: string, status: AttendanceStatus) => void;
  index: number;
}) {
  const effective = localStatus ?? item.status;
  const meta = effective ? STATUS_META[effective] : null;
  const initials = item.participantName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className={cn(
        "relative rounded-2xl overflow-hidden bg-card border transition-all duration-200",
        meta ? meta.borderLeft : "border-l-[4px] border-l-muted",
        meta ? meta.bgCard : "",
        processing ? "opacity-70" : ""
      )}
    >
      <div className="p-4">
        {/* Top: avatar + name + chip */}
        <div className="flex items-center gap-3 mb-4">
          {/* Avatar circle */}
          <div
            className={cn(
              "size-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all",
              meta
                ? `${meta.chip}`
                : "bg-[#4B0A8F]/10 text-[#4B0A8F] dark:bg-[#4B0A8F]/20 dark:text-purple-300"
            )}
          >
            {effective && processing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="size-4 border-2 border-current border-t-transparent rounded-full"
              />
            ) : (
              initials
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate leading-tight">
              {item.participantName}
            </p>
            {item.markedAt && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Marked by {item.markedByName} ·{" "}
                {new Date(item.markedAt).toLocaleTimeString("en-PK", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>

          {effective && (
            <span
              className={cn(
                "px-2.5 py-1 text-[11px] font-bold rounded-full shrink-0",
                meta?.chip
              )}
            >
              {meta?.letter}
            </span>
          )}
          {!effective && (
            <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-muted text-muted-foreground shrink-0">
              —
            </span>
          )}
        </div>

        {/* Quick-mark buttons */}
        {!isClosed && (
          <div className="flex items-center gap-2 justify-between">
            {(["present", "absent", "late", "excused"] as AttendanceStatus[]).map(
              (s) => (
                <StatusButton
                  key={s}
                  status={s}
                  active={effective === s}
                  disabled={processing || isClosed}
                  onPress={() => onMark(item.participantId, s)}
                />
              )
            )}
          </div>
        )}

        {isClosed && effective && (
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium",
              meta?.btnIdle
            )}
          >
            {meta && <meta.icon className={cn("size-4", meta.iconColor)} />}
            <span>{meta?.label}</span>
            {item.markedAt && (
              <span className="ml-auto text-xs opacity-60">
                {new Date(item.markedAt).toLocaleTimeString("en-PK", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Summary Strip ────────────────────────────────────────────────────────────

function SummaryStrip({ summary }: { summary: Summary }) {
  const pct =
    summary.total > 0
      ? Math.round((summary.present / summary.total) * 100)
      : 0;

  const pctColor =
    pct >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : pct >= 50
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";

  const barColor =
    pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="rounded-2xl bg-card border p-4 space-y-3">
      {/* progress bar */}
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground font-medium">
          {summary.present + summary.absent + summary.late + summary.excused} /{" "}
          {summary.total} marked
        </span>
        <span className={cn("font-bold text-sm", pctColor)}>{pct}%</span>
      </div>
      <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", barColor)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7 }}
        />
      </div>

      {/* stat chips */}
      <div className="grid grid-cols-4 gap-2 pt-1">
        {(
          [
            { label: "Present", count: summary.present, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
            { label: "Absent", count: summary.absent, color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
            { label: "Late", count: summary.late, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
            { label: "Excused", count: summary.excused, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-100 dark:bg-sky-900/30" },
          ] as const
        ).map((s) => (
          <div
            key={s.label}
            className={cn("rounded-xl p-2 flex flex-col items-center gap-0.5", s.bg)}
          >
            <span className={cn("text-lg font-extrabold leading-none", s.color)}>
              {s.count}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {summary.unmarked > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-xl px-3 py-2">
          <AlertTriangle className="size-3.5 shrink-0" />
          <span>
            <strong>{summary.unmarked}</strong> participant
            {summary.unmarked !== 1 ? "s" : ""} still unmarked
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Filter Tabs ──────────────────────────────────────────────────────────────

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: "All", value: "all" },
  { label: "Unmarked", value: "unmarked" },
  { label: "Present", value: "present" },
  { label: "Absent", value: "absent" },
  { label: "Late", value: "late" },
  { label: "Excused", value: "excused" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function MobileAttendanceView() {
  const { selectedEventId, navigateTo } = useAppStore();
  const { data: session } = useSession();
  const { markAttendance } = useAttendanceSync();
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [localStatusMap, setLocalStatusMap] = useState<Map<string, AttendanceStatus>>(
    () => new Map()
  );
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const filterRef = useRef<HTMLDivElement>(null);

  const userRole = (session?.user as { role?: string } | undefined)?.role;

  // ─── Fetch data ────────────────────────────────────────────────────────────

  const { data, isLoading, error, refetch } = useQuery<{
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
    refetchInterval: 20000,
    staleTime: 10000,
  });

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleMark = useCallback(
    async (participantId: string, status: AttendanceStatus) => {
      if (!selectedEventId || !data?.event || data.event.isClosed) return;

      setLocalStatusMap((prev) => {
        const next = new Map(prev);
        next.set(participantId, status);
        return next;
      });
      setProcessingIds((prev) => new Set(prev).add(participantId));

      try {
        const result = await markAttendance({ eventId: selectedEventId, participantId, status });
        if (!result.success) {
          setLocalStatusMap((prev) => {
            const next = new Map(prev);
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

  // ─── Derived state ─────────────────────────────────────────────────────────

  const roster = data?.roster ?? [];
  const event = data?.event;

  const liveSummary = useMemo<Summary>(() => {
    const counts: Summary = { total: roster.length, present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };
    for (const item of roster) {
      const s = localStatusMap.get(item.participantId) ?? item.status;
      if (s && s in counts) counts[s]++;
      else counts.unmarked++;
    }
    return counts;
  }, [roster, localStatusMap]);

  const filteredRoster = useMemo(() => {
    let items = roster;
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((r) => r.participantName.toLowerCase().includes(q));
    }
    if (activeFilter !== "all") {
      if (activeFilter === "unmarked") {
        items = items.filter((r) => !(localStatusMap.get(r.participantId) ?? r.status));
      } else {
        items = items.filter((r) => (localStatusMap.get(r.participantId) ?? r.status) === activeFilter);
      }
    }
    return items;
  }, [roster, search, activeFilter, localStatusMap]);

  const filterCount = useCallback(
    (tab: FilterTab) => {
      if (tab === "all") return roster.length;
      if (tab === "unmarked") return roster.filter((r) => !(localStatusMap.get(r.participantId) ?? r.status)).length;
      return roster.filter((r) => (localStatusMap.get(r.participantId) ?? r.status) === tab).length;
    },
    [roster, localStatusMap]
  );

  // ─── Guards ────────────────────────────────────────────────────────────────

  if (!selectedEventId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <div className="size-16 rounded-2xl bg-[#4B0A8F]/10 flex items-center justify-center">
          <Users className="size-8 text-[#4B0A8F]" />
        </div>
        <p className="font-semibold text-lg">No event selected</p>
        <p className="text-muted-foreground text-sm">
          Go back to Attendance and select an event to begin.
        </p>
        <Button onClick={() => navigateTo("park-attendance")} className="bg-[#4B0A8F] text-white">
          <ArrowLeft className="size-4 mr-2" />
          Back to Events
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-1">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-9 rounded-xl bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded-lg w-3/4 animate-pulse" />
            <div className="h-3 bg-muted rounded-lg w-1/2 animate-pulse" />
          </div>
        </div>
        <div className="h-28 bg-muted rounded-2xl animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 bg-muted/60 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <XCircle className="size-12 text-red-500" />
        <p className="font-semibold text-lg">Could not load roster</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="size-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const isClosed = event.isClosed;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pt-2 pb-3 space-y-3 border-b border-border/50 px-1">
        {/* Back + title row */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-xl"
            onClick={() => navigateTo("park-attendance")}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold truncate">{event.title}</h1>
              {isClosed ? (
                <Badge className="text-[10px] bg-muted text-muted-foreground">
                  <Lock className="size-2.5 mr-1" />
                  Closed
                </Badge>
              ) : (
                <Badge className="text-[10px] bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F0860] dark:text-[#8A40B0]">
                  <Circle className="size-2 mr-1 fill-current" />
                  Live
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {event.groupName} · {event.batchName}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-xl"
            onClick={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ["attendance-roster", selectedEventId] });
            }}
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>

        {/* Offline banner */}
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50 text-sm text-amber-700 dark:text-amber-400"
          >
            <WifiOff className="size-3.5 shrink-0" />
            <span className="font-medium">Offline — marks queued locally</span>
          </motion.div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            id="mobile-attendance-search"
            placeholder="Search participants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9 rounded-xl h-10"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filter tabs (horizontal scroll) */}
        <div
          ref={filterRef}
          className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar"
        >
          {FILTER_TABS.map((tab) => {
            const count = filterCount(tab.value);
            const isActive = activeFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveFilter(tab.value)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0",
                  isActive
                    ? "bg-[#4B0A8F] text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "text-[10px] font-bold rounded-full px-1 min-w-[16px] text-center",
                    isActive ? "bg-white/20 text-white" : "bg-background text-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto space-y-3 px-1 pt-4">
        {/* Summary card */}
        <SummaryStrip summary={liveSummary} />

        {/* Roster list */}
        {filteredRoster.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <Users className="size-10 opacity-40" />
            <p className="text-sm font-medium">No participants match</p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-xs underline text-[#4B0A8F]"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredRoster.map((item, index) => (
              <ParticipantCard
                key={item.participantId}
                item={item}
                localStatus={localStatusMap.get(item.participantId) ?? null}
                processing={processingIds.has(item.participantId)}
                isClosed={isClosed}
                onMark={handleMark}
                index={index}
              />
            ))}
          </AnimatePresence>
        )}

        {/* Bottom spacer */}
        <div className="h-6" />
      </div>

      {/* ── Fixed bottom CTA (open events only) ── */}
      {!isClosed && liveSummary.unmarked === 0 && liveSummary.total > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t"
        >
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
            <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              All {liveSummary.total} participants marked!
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
