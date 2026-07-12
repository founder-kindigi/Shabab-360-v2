"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronDown,
  User,
  Phone,
  Minus,
  Eye,
  Users,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// ==================== TYPES ====================

type Attendance30Day = {
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number;
};

type RosterParticipant = {
  id: string;
  name: string;
  phone: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  state: string;
  joinedAt: string;
  guardianName: string | null;
  guardianPhone: string | null;
  attendance30Day: Attendance30Day;
  todayStatus: string | null;
  _idx: number;
};

type RosterGroup = {
  id: string;
  name: string;
  avgAttendanceRate: number;
  participants: RosterParticipant[];
};

type RosterBatch = {
  id: string;
  name: string;
  groups: RosterGroup[];
};

type RosterResponse = {
  park: { id: string; name: string; city: string };
  batches: RosterBatch[];
  totalParticipants: number;
  activeGroups: number;
};

// ==================== CONSTANTS ====================

const AVATAR_COLORS = [
  "#4B0A8F", "#A0006B", "#2A0C8F", "#6B21A8",
  "#7C3AED", "#9333EA", "#C026D3", "#DB2777",
  "#A21CAF", "#86198F",
];

const STATUS_CONFIG: Record<string, { label: string; className: string; dotClass: string }> = {
  present: {
    label: "P",
    className: "bg-[#4B0A8F] text-white",
    dotClass: "bg-[#4B0A8F]",
  },
  absent: {
    label: "A",
    className: "bg-red-500 text-white",
    dotClass: "bg-red-500",
  },
  late: {
    label: "L",
    className: "bg-amber-500 text-white",
    dotClass: "bg-amber-500",
  },
  excused: {
    label: "E",
    className: "bg-sky-500 text-white",
    dotClass: "bg-sky-500",
  },
};

// ==================== HELPERS ====================

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(idx: number): string {
  return AVATAR_COLORS[idx % AVATAR_COLORS.length];
}

function getRateColor(rate: number): string {
  if (rate >= 80) return "bg-green-500";
  if (rate >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function getRateTextColor(rate: number): string {
  if (rate >= 80) return "text-green-600 dark:text-green-400";
  if (rate >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getStateBadge(state: string) {
  switch (state) {
    case "active":
      return (
        <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 text-[10px] px-1.5 py-0">
          Active
        </Badge>
      );
    case "inactive":
      return (
        <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[10px] px-1.5 py-0">
          Inactive
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {state}
        </Badge>
      );
  }
}

// ==================== SUB-COMPONENTS ====================

function TodayStatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="flex items-center justify-center size-6">
        <Minus className="size-4 text-muted-foreground/40" />
      </span>
    );
  }
  const config = STATUS_CONFIG[status];
  if (!config) {
    return (
      <span className="flex items-center justify-center size-6">
        <Minus className="size-4 text-muted-foreground/40" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center size-6 rounded-full text-[10px] font-bold",
        config.className
      )}
      title={status.charAt(0).toUpperCase() + status.slice(1)}
    >
      {config.label}
    </span>
  );
}

function RateBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", getRateColor(rate))}
          initial={{ width: 0 }}
          animate={{ width: `${rate}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className={cn("text-xs font-semibold tabular-nums w-9 text-right", getRateTextColor(rate))}>
        {rate}%
      </span>
    </div>
  );
}

function GenderIcon({ gender }: { gender: string | null }) {
  if (gender === "male") {
    return <span className="text-[10px] text-muted-foreground">♂</span>;
  }
  if (gender === "female") {
    return <span className="text-[10px] text-muted-foreground">♀</span>;
  }
  return null;
}

// ==================== SKELETON LOADING ====================

function RosterSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-full sm:w-72" />
      </div>
      {/* Filter bar */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      {/* Group sections */}
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="flex items-center gap-3 py-2">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-6 rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ==================== DESKTOP TABLE ROW ====================

function ParticipantRow({ p, index }: { p: RosterParticipant; index: number }) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className="group border-b last:border-b-0 transition-colors hover:bg-[#F3ECF6]/50 dark:hover:bg-[#1F0860]/20"
    >
      {/* Avatar + Name + Phone + Gender */}
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-3">
          <div
            className="size-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
            style={{ backgroundColor: getAvatarColor(p._idx) }}
          >
            {getInitials(p.name)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold truncate max-w-[180px]">{p.name}</span>
              <GenderIcon gender={p.gender} />
            </div>
            {p.phone && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Phone className="size-2.5" />
                <span>{p.phone}</span>
              </div>
            )}
          </div>
        </div>
      </td>

      {/* 30-day rate */}
      <td className="py-2.5 px-3">
        <RateBar rate={p.attendance30Day.rate} />
      </td>

      {/* Today's status */}
      <td className="py-2.5 px-3 text-center">
        <TodayStatusBadge status={p.todayStatus} />
      </td>

      {/* Guardian */}
      <td className="py-2.5 px-3">
        <div className="text-xs text-muted-foreground">
          {p.guardianName ? (
            <span className="flex items-center gap-1">
              <ShieldCheck className="size-3 text-[#A0006B] dark:text-[#C94D99]" />
              {p.guardianName}
            </span>
          ) : (
            <span className="text-muted-foreground/40">—</span>
          )}
        </div>
      </td>

      {/* State */}
      <td className="py-2.5 px-3">{getStateBadge(p.state)}</td>

      {/* Action */}
      <td className="py-2.5 px-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          disabled
        >
          <Eye className="size-3.5 mr-1" />
          View
        </Button>
      </td>
    </motion.tr>
  );
}

// ==================== MOBILE CARD ====================

function ParticipantCard({ p, index }: { p: RosterParticipant; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors hover:bg-[#F3ECF6]/50 dark:hover:bg-[#1F0860]/20"
    >
      {/* Avatar */}
      <div
        className="size-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ backgroundColor: getAvatarColor(p._idx) }}
      >
        {getInitials(p.name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold truncate">{p.name}</span>
          <GenderIcon gender={p.gender} />
          {getStateBadge(p.state)}
        </div>
        {p.phone && (
          <p className="text-[11px] text-muted-foreground truncate">{p.phone}</p>
        )}
        {p.guardianName && (
          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
            <ShieldCheck className="size-2.5 text-[#A0006B] dark:text-[#C94D99]" />
            {p.guardianName}
          </p>
        )}
      </div>

      {/* Rate + Today */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <RateBar rate={p.attendance30Day.rate} />
        <TodayStatusBadge status={p.todayStatus} />
      </div>
    </motion.div>
  );
}

// ==================== GROUP SECTION ====================

function GroupSection({ group, defaultOpen }: { group: RosterGroup; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  const avgRateColor = group.avgAttendanceRate >= 80
    ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
    : group.avgAttendanceRate >= 50
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl border bg-card overflow-hidden"
      >
        {/* Group header */}
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <ChevronDown
                className={cn(
                  "size-4 text-muted-foreground transition-transform duration-200",
                  open && "rotate-180"
                )}
              />
              <h3 className="text-sm font-semibold">{group.name}</h3>
              <Badge variant="secondary" className="bg-[#F3ECF6] dark:bg-[#1F086080] text-[#4B0A8F] dark:text-[#D4B8E3] text-[10px] px-1.5 py-0 border-0">
                {group.participants.length}
              </Badge>
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", avgRateColor)}>
                {group.avgAttendanceRate}% avg
              </Badge>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="size-3" />
              <span>{group.participants.length} participant{group.participants.length !== 1 ? "s" : ""}</span>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          {group.participants.length === 0 ? (
            <div className="px-4 pb-4 text-center py-8">
              <Users className="size-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No participants in this group</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y bg-muted/30">
                      <th className="py-2 px-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Participant
                      </th>
                      <th className="py-2 px-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        30-Day Rate
                      </th>
                      <th className="py-2 px-3 text-center text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Today
                      </th>
                      <th className="py-2 px-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Guardian
                      </th>
                      <th className="py-2 px-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        State
                      </th>
                      <th className="py-2 px-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-16">
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.participants.map((p, idx) => (
                      <ParticipantRow key={p.id} p={p} index={idx} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden p-3 pt-0 space-y-2">
                {group.participants.map((p, idx) => (
                  <ParticipantCard key={p.id} p={p} index={idx} />
                ))}
              </div>
            </>
          )}
        </CollapsibleContent>
      </motion.div>
    </Collapsible>
  );
}

// ==================== MAIN COMPONENT ====================

export function ParkRosterPage() {
  const [search, setSearch] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading, error, refetch } = useQuery<RosterResponse>({
    queryKey: ["park-roster", search, selectedBatchId, selectedGroupId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedGroupId) params.set("groupId", selectedGroupId);
      else if (selectedBatchId) params.set("batchId", selectedBatchId);
      const res = await fetch(`/api/park/roster?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load roster");
      }
      return res.json();
    },
    staleTime: 30000,
  });

  // Derived: all batches for filter tabs
  const allBatches = useMemo(() => data?.batches || [], [data]);

  // When batch changes, reset group filter
  const handleBatchChange = (batchId: string | null) => {
    setSelectedBatchId(batchId);
    setSelectedGroupId(null);
  };

  // Groups in the selected batch (for sub-filter)
  const groupsInBatch = useMemo(() => {
    if (selectedBatchId) {
      const batch = allBatches.find((b) => b.id === selectedBatchId);
      return batch?.groups || [];
    }
    return allBatches.flatMap((b) => b.groups);
  }, [allBatches, selectedBatchId]);

  // Debounced search
  const handleSearchSubmit = () => {
    setSearch(searchInput.trim());
  };

  // Flatten groups for rendering
  const displayGroups = useMemo(() => {
    const groups: RosterGroup[] = [];
    for (const batch of allBatches) {
      for (const group of batch.groups) {
        groups.push(group);
      }
    }
    return groups;
  }, [allBatches]);

  // ==================== RENDER ====================

  if (isLoading) return <RosterSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="size-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
          <span className="text-red-500 text-lg">!</span>
        </div>
        <p className="text-sm font-medium text-foreground mb-1">Failed to load roster</p>
        <p className="text-xs text-muted-foreground mb-4">{error.message}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <Loader2 className="size-3.5 mr-1.5 animate-spin" />
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const totalParticipants = data.totalParticipants;
  const activeGroups = data.activeGroups;
  const hasAnyParticipants = displayGroups.some((g) => g.participants.length > 0);

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Park Roster</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.park.name}{" "}
            <span className="text-muted-foreground/60">· {data.park.city}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-semibold text-foreground">{totalParticipants}</span> participant{totalParticipants !== 1 ? "s" : ""} across{" "}
            <span className="font-semibold text-foreground">{activeGroups}</span> group{activeGroups !== 1 ? "s" : ""}
          </p>
        </div>
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
            className="pl-9 h-10 text-sm"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput("");
                setSearch("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar: Batch tabs */}
      {allBatches.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => handleBatchChange(null)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                !selectedBatchId
                  ? "bg-[#4B0A8F] text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              All Batches
            </button>
            {allBatches.map((batch) => (
              <button
                key={batch.id}
                onClick={() => handleBatchChange(batch.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  selectedBatchId === batch.id
                    ? "bg-[#4B0A8F] text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {batch.name}
              </button>
            ))}
          </div>

          {/* Group sub-filter when a batch is selected */}
          {selectedBatchId && groupsInBatch.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap pl-1">
              <button
                onClick={() => setSelectedGroupId(null)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
                  !selectedGroupId
                    ? "bg-[#A0006B] text-white"
                    : "bg-[#F3ECF6] dark:bg-[#1F086080] text-[#4B0A8F] dark:text-[#D4B8E3] hover:bg-[#D4B8E3]/60 dark:hover:bg-[#442A78]/60"
                )}
              >
                All Groups
              </button>
              {groupsInBatch.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
                    selectedGroupId === group.id
                      ? "bg-[#A0006B] text-white"
                      : "bg-[#F3ECF6] dark:bg-[#1F086080] text-[#4B0A8F] dark:text-[#D4B8E3] hover:bg-[#D4B8E3]/60 dark:hover:bg-[#442A78]/60"
                  )}
                >
                  {group.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Roster Content */}
      {allBatches.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="size-12 rounded-full bg-[#F3ECF6] dark:bg-[#1F086080] flex items-center justify-center mb-3">
            <Users className="size-6 text-[#4B0A8F] dark:text-[#D4B8E3]" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No active batches in this park</p>
          <p className="text-xs text-muted-foreground">
            Batches will appear here once they are created and activated.
          </p>
        </motion.div>
      ) : search && !hasAnyParticipants ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="size-12 rounded-full bg-[#F3ECF6] dark:bg-[#1F086080] flex items-center justify-center mb-3">
            <Search className="size-6 text-[#4B0A8F] dark:text-[#D4B8E3]" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No participants match your search</p>
          <p className="text-xs text-muted-foreground">
            Try a different name or phone number.
          </p>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3" key={`${selectedBatchId}-${selectedGroupId}-${search}`}>
            {displayGroups.map((group, gIdx) => (
              <GroupSection
                key={group.id}
                group={group}
                defaultOpen={gIdx === 0}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}