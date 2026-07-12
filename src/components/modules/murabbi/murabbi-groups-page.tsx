"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/stores/useAppStore";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/layout/empty-state";
import {
  Users,
  ChevronDown,
  ChevronRight,
  CalendarCheck,
  TreePine,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  UserCircle,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────

type GroupParticipant = {
  id: string;
  name: string;
};

type MurabbiGroup = {
  id: string;
  name: string;
  batchName: string;
  parkName: string;
  cityName: string;
  participantCount: number;
  participants: GroupParticipant[];
  lastAttendanceDate: string | null;
  lastAttendanceRate: number | null;
  lastEventId: string | null;
  lastEventClosed: boolean;
  totalEvents: number;
};

type GroupsData = {
  groups: MurabbiGroup[];
};

// ─── Animation Config ────────────────────────────────────────────────

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// ─── Helper Functions ────────────────────────────────────────────────

function rateColor(rate: number) {
  if (rate >= 80) return "text-[#4B0A8F] dark:text-[#8A40B0]";
  if (rate >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function rateBgColor(rate: number) {
  if (rate >= 80) return "bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0]";
  if (rate >= 50) return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400";
  return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400";
}

function rateBarColor(rate: number) {
  if (rate >= 80) return "bg-[#4B0A8F]";
  if (rate >= 50) return "bg-amber-500";
  return "bg-red-500";
}

// ─── Loading Skeleton ────────────────────────────────────────────────

function GroupsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stats summary skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      {/* Mobile cards skeleton */}
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={`m-${i}`} className="h-48 rounded-xl" />
        ))}
      </div>
      {/* Desktop table skeleton */}
      <div className="hidden md:block">
        <Skeleton className="h-10 w-full rounded-lg mb-2" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={`d-${i}`} className="h-16 w-full rounded-lg mb-1" />
        ))}
      </div>
    </div>
  );
}

// ─── Group Card (Mobile) ─────────────────────────────────────────────

function GroupCard({
  group,
  onMarkAttendance,
}: {
  group: MurabbiGroup;
  onMarkAttendance: (g: MurabbiGroup) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div variants={fadeUp} layout>
      <Card className="overflow-hidden border-border hover:shadow-md transition-shadow">
        <CardContent className="p-4 space-y-3">
          {/* Header: Name + breadcrumb */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate">{group.name}</h3>
              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                <span className="truncate">{group.batchName}</span>
                <ChevronRight className="size-3 shrink-0" />
                <span className="truncate">{group.parkName}</span>
              </div>
            </div>
            <Badge
              className={cn(
                "shrink-0 text-[10px] font-semibold px-2 py-0.5",
                "bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0]"
              )}
            >
              <Users className="size-3 mr-1" />
              {group.participantCount}
            </Badge>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center justify-center size-7 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086099] shrink-0">
                <TreePine className="size-3.5 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px]">Park</p>
                <p className="font-medium truncate">{group.parkName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center justify-center size-7 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086099] shrink-0">
                <CalendarCheck className="size-3.5 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px]">Last Session</p>
                <p className="font-medium truncate">
                  {group.lastAttendanceDate || "No sessions"}
                </p>
              </div>
            </div>
          </div>

          {/* Attendance rate bar */}
          {group.lastAttendanceRate !== null && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Last attendance rate</span>
                <span className={cn("font-bold", rateColor(group.lastAttendanceRate))}>
                  {group.lastAttendanceRate}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    rateBarColor(group.lastAttendanceRate)
                  )}
                  style={{ width: `${group.lastAttendanceRate}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-[#2A0C8F] via-[#A0006B] to-[#FF0015] hover:from-[#2A0C8F] hover:to-[#FF0015] text-white font-semibold h-9 text-xs"
              onClick={() => onMarkAttendance(group)}
            >
              <CheckCircle2 className="size-3.5 mr-1.5" />
              Mark Attendance
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronDown className="size-3.5 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <Users className="size-3.5 mr-1" />
                  View
                </>
              )}
            </Button>
          </div>

          {/* Expandable participant list */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="border-t pt-3 mt-1">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    Participants ({group.participants.length})
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {group.participants.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-muted/60 transition-colors"
                      >
                        <div className="flex items-center justify-center size-6 rounded-full bg-[#F3ECF6] dark:bg-[#1F086080] shrink-0">
                          <span className="text-[10px] font-bold text-[#4B0A8F] dark:text-[#8A40B0]">
                            {p.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs font-medium truncate">{p.name}</span>
                      </div>
                    ))}
                    {group.participants.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        No active participants
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Group Table Row (Desktop) ───────────────────────────────────────

function GroupTableRow({
  group,
  onMarkAttendance,
}: {
  group: MurabbiGroup;
  onMarkAttendance: (g: MurabbiGroup) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div variants={fadeUp} layout>
      {/* Main row */}
      <div
        className={cn(
          "flex items-center gap-4 px-4 py-3 rounded-lg transition-colors",
          "bg-card border border-border hover:shadow-sm"
        )}
      >
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 flex items-center justify-center size-7 rounded-md hover:bg-muted transition-colors"
          aria-label={expanded ? "Collapse details" : "Expand details"}
        >
          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="size-4 text-muted-foreground" />
          </motion.div>
        </button>

        {/* Group name */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{group.name}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <span className="truncate">{group.batchName}</span>
            <ChevronRight className="size-3 shrink-0" />
            <TreePine className="size-3 shrink-0" />
            <span className="truncate">{group.parkName}</span>
          </div>
        </div>

        {/* Participant count */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <Users className="size-3.5 text-muted-foreground" />
          <span className="text-sm font-medium tabular-nums">
            {group.participantCount}
          </span>
        </div>

        {/* Last attendance */}
        <div className="hidden lg:flex flex-col items-end shrink-0 min-w-[100px]">
          <span className="text-xs text-muted-foreground">
            {group.lastAttendanceDate || "No sessions"}
          </span>
          {group.lastAttendanceRate !== null && (
            <Badge
              className={cn(
                "mt-0.5 text-[10px] font-semibold px-1.5 py-0",
                rateBgColor(group.lastAttendanceRate)
              )}
            >
              {group.lastAttendanceRate}%
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            className="bg-gradient-to-r from-[#2A0C8F] via-[#A0006B] to-[#FF0015] hover:from-[#2A0C8F] hover:to-[#FF0015] text-white font-semibold h-8 text-xs px-3"
            onClick={() => onMarkAttendance(group)}
          >
            <CheckCircle2 className="size-3.5 mr-1.5" />
            Mark Attendance
          </Button>
        </div>
      </div>

      {/* Expandable details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="ml-11 mt-1 mb-1 p-4 rounded-lg bg-muted/40 border border-border/60 space-y-3">
              {/* Location info */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  {group.cityName}
                </span>
                <span className="flex items-center gap-1">
                  <TreePine className="size-3" />
                  {group.parkName}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarCheck className="size-3" />
                  {group.totalEvents} session{group.totalEvents !== 1 ? "s" : ""} total
                </span>
              </div>

              {/* Attendance rate bar (desktop) */}
              {group.lastAttendanceRate !== null && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Last session attendance</span>
                    <span className={cn("font-bold", rateColor(group.lastAttendanceRate))}>
                      {group.lastAttendanceRate}%
                      <span className="text-muted-foreground font-normal ml-1">
                        ({group.lastAttendanceDate})
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden max-w-xs">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        rateBarColor(group.lastAttendanceRate)
                      )}
                      style={{ width: `${group.lastAttendanceRate}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Participant list */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  Participants ({group.participants.length})
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {group.participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-1.5 rounded-full bg-card border border-border/60 pl-1 pr-2.5 py-0.5"
                    >
                      <div className="flex items-center justify-center size-5 rounded-full bg-[#F3ECF6] dark:bg-[#1F086080]">
                        <span className="text-[9px] font-bold text-[#4B0A8F] dark:text-[#8A40B0]">
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs font-medium">{p.name}</span>
                    </div>
                  ))}
                  {group.participants.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">
                      No active participants
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────

export function MurabbiGroupsPage() {
  const { navigateTo, setSelectedGroup, setSelectedEventId } = useAppStore();

  const { data, isLoading, error } = useQuery<GroupsData>({
    queryKey: ["murabbi-groups"],
    queryFn: () =>
      fetch("/api/murabbi/groups").then((r) => {
        if (!r.ok) throw new Error("Failed to load groups");
        return r.json();
      }),
    staleTime: 30000,
  });

  const groups = data?.groups ?? [];

  const handleMarkAttendance = (group: MurabbiGroup) => {
    if (group.lastEventId && !group.lastEventClosed) {
      setSelectedEventId(group.lastEventId);
    } else {
      setSelectedEventId(null);
    }
    setSelectedGroup(group.id);
    toast.success("Navigating to attendance for " + group.name);
    navigateTo("park-attendance-roster");
  };

  // ─── Loading ─────────────────────────────────────────────────────
  if (isLoading) {
    return <GroupsLoadingSkeleton />;
  }

  // ─── Error ───────────────────────────────────────────────────────
  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-800/50">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="size-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Could not load groups
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Please check your connection and try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ─── Empty State ─────────────────────────────────────────────────
  if (groups.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No Groups Assigned"
        description="You don't have any groups assigned to you yet. Please contact your park admin to get assigned to a group."
      />
    );
  }

  // ─── Compute summary stats ───────────────────────────────────────
  const totalParticipants = groups.reduce((sum, g) => sum + g.participantCount, 0);
  const avgRate =
    groups.filter((g) => g.lastAttendanceRate !== null).length > 0
      ? Math.round(
          groups
            .filter((g) => g.lastAttendanceRate !== null)
            .reduce((sum, g) => sum + (g.lastAttendanceRate as number), 0) /
            groups.filter((g) => g.lastAttendanceRate !== null).length
        )
      : null;

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* ─── Summary Stats ─────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center size-9 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086099]">
                <Users className="size-4.5 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{groups.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {groups.length === 1 ? "Assigned Group" : "Assigned Groups"}
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center size-9 rounded-lg bg-sky-100 dark:bg-sky-950/60">
                <UserCircle className="size-4.5 text-sky-600 dark:text-sky-400" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{totalParticipants}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Shabab</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Mobile: Card layout ───────────────────────────────── */}
      <div className="space-y-3 md:hidden">
        {groups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            onMarkAttendance={handleMarkAttendance}
          />
        ))}
      </div>

      {/* ─── Desktop: List/Table layout ────────────────────────── */}
      <div className="hidden md:flex flex-col gap-1.5">
        {/* Column header */}
        <div className="flex items-center gap-4 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="w-7" />
          <div className="flex-1">Group</div>
          <div className="w-16 sm:w-20 text-center">Shabab</div>
          <div className="hidden lg:block w-[120px] text-right">Last Attendance</div>
          <div className="w-[140px] text-right">Actions</div>
        </div>

        {/* Group rows */}
        {groups.map((group) => (
          <GroupTableRow
            key={group.id}
            group={group}
            onMarkAttendance={handleMarkAttendance}
          />
        ))}
      </div>
    </motion.div>
  );
}