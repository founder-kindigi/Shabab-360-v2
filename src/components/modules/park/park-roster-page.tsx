"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  User,
  Phone,
  Minus,
  Users,
  ShieldCheck,
  Loader2,
  Calendar,
  MapPin,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  address: string | null;
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
  activeParticipants: number;
  inactiveParticipants: number;
  onLeaveParticipants: number;
  activeGroups: number;
};

// ==================== CONSTANTS ====================

const AVATAR_COLORS = [
  "#4B0A8F", "#A0006B", "#2A0C8F", "#6B21A8",
  "#7C3AED", "#9333EA", "#C026D3", "#DB2777",
  "#A21CAF", "#86198F",
];

const STATUS_CONFIG: Record<string, { label: string; className: string; dotClass: string }> = {
  present: { label: "P", className: "bg-[#4B0A8F] text-white", dotClass: "bg-[#4B0A8F]" },
  absent: { label: "A", className: "bg-red-500 text-white", dotClass: "bg-red-500" },
  late: { label: "L", className: "bg-amber-500 text-white", dotClass: "bg-amber-500" },
  excused: { label: "E", className: "bg-sky-500 text-white", dotClass: "bg-sky-500" },
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
    case "on_leave":
      return (
        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] px-1.5 py-0">
          On Leave
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

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}

function calculateAge(dob: string | null): string {
  if (!dob) return "—";
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return `${age} yrs`;
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

// ==================== SUMMARY BAR ====================

function SummaryBar({
  total,
  active,
  inactive,
  onLeave,
}: {
  total: number;
  active: number;
  inactive: number;
  onLeave: number;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0 }}
        className="rounded-xl border bg-card p-3 flex items-center gap-3"
      >
        <div className="size-9 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086080] flex items-center justify-center shrink-0">
          <Users className="size-4 text-[#4B0A8F] dark:text-[#D4B8E3]" />
        </div>
        <div>
          <p className="text-lg font-bold leading-none">{total}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Total</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="rounded-xl border bg-card p-3 flex items-center gap-3"
      >
        <div className="size-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
          <span className="size-3 rounded-full bg-green-500" />
        </div>
        <div>
          <p className="text-lg font-bold leading-none text-green-600 dark:text-green-400">{active}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Active</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-xl border bg-card p-3 flex items-center gap-3"
      >
        <div className="size-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
          <span className="size-3 rounded-full bg-red-500" />
        </div>
        <div>
          <p className="text-lg font-bold leading-none text-red-600 dark:text-red-400">{inactive}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Inactive</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="rounded-xl border bg-card p-3 flex items-center gap-3"
      >
        <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
          <span className="size-3 rounded-full bg-amber-500" />
        </div>
        <div>
          <p className="text-lg font-bold leading-none text-amber-600 dark:text-amber-400">{onLeave}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">On Leave</p>
        </div>
      </motion.div>
    </div>
  );
}

// ==================== SKELETON LOADING ====================

function RosterSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-3 flex items-center gap-3">
            <Skeleton className="size-9 rounded-lg shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Skeleton className="h-9 w-full sm:w-48" />
        <div className="relative flex-1">
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
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

// ==================== DETAIL SHEET ====================

function ParticipantDetailSheet({
  participant,
  open,
  onClose,
}: {
  participant: RosterParticipant | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!participant) return null;
  const stats = participant.attendance30Day;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="space-y-4 pb-4">
          <div className="flex items-center gap-4">
            <div
              className="size-14 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
              style={{ backgroundColor: getAvatarColor(participant._idx) }}
            >
              {getInitials(participant.name)}
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-lg truncate">{participant.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                {getStateBadge(participant.state)}
                {participant.gender && (
                  <span className="text-xs text-muted-foreground capitalize">{participant.gender}</span>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Contact Info */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Personal Information</h4>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{participant.phone || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gender</span>
                <span className="font-medium capitalize">{participant.gender || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date of Birth</span>
                <span className="font-medium">{formatDate(participant.dateOfBirth)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Age</span>
                <span className="font-medium">{calculateAge(participant.dateOfBirth)}</span>
              </div>
              {participant.address && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Address</span>
                  <span className="font-medium text-right max-w-[200px] truncate">{participant.address}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Joined</span>
                <span className="font-medium">{formatDate(participant.joinedAt)}</span>
              </div>
            </div>
          </section>

          <Separator />

          {/* Guardian */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Guardian</h4>
            {participant.guardianName ? (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-[#A0006B]" />
                  <span className="font-medium">{participant.guardianName}</span>
                </div>
                {participant.guardianPhone && (
                  <div className="flex items-center gap-2 text-muted-foreground pl-6">
                    <Phone className="size-3" />
                    <span>{participant.guardianPhone}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No guardian linked</p>
            )}
          </section>

          <Separator />

          {/* 30-Day Attendance Summary */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">30-Day Attendance Summary</h4>
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-muted flex items-center justify-center">
                  <div className="text-center">
                    <span className={cn("text-2xl font-bold", getRateTextColor(stats.rate))}>
                      {stats.rate}%
                    </span>
                    <p className="text-[10px] text-muted-foreground">rate</p>
                  </div>
                </div>
                <svg className="absolute inset-0 w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                  <circle
                    cx="48" cy="48" r="44"
                    fill="none"
                    stroke={stats.rate >= 80 ? "#22c55e" : stats.rate >= 50 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="4"
                    strokeDasharray={`${(stats.rate / 100) * 276.5} 276.5`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-green-500/5 border border-green-500/10 p-3 text-center">
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{stats.present}</p>
                <p className="text-[10px] text-muted-foreground">Present</p>
              </div>
              <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 text-center">
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{stats.absent}</p>
                <p className="text-[10px] text-muted-foreground">Absent</p>
              </div>
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3 text-center">
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.late}</p>
                <p className="text-[10px] text-muted-foreground">Late</p>
              </div>
              <div className="rounded-lg bg-sky-500/5 border border-sky-500/10 p-3 text-center">
                <p className="text-lg font-bold text-sky-600 dark:text-sky-400">{stats.excused}</p>
                <p className="text-[10px] text-muted-foreground">Excused</p>
              </div>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ==================== DESKTOP TABLE ROW ====================

function ParticipantRow({
  p,
  index,
  onView,
  groupName,
}: {
  p: RosterParticipant;
  index: number;
  onView: () => void;
  groupName: string;
}) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className="group border-b last:border-b-0 transition-colors hover:bg-[#F3ECF6]/50 dark:hover:bg-[#1F0860]/20 cursor-pointer"
      onClick={onView}
    >
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

      <td className="py-2.5 px-3 hidden lg:table-cell">
        <Badge variant="secondary" className="bg-[#F3ECF6] dark:bg-[#1F086080] text-[#4B0A8F] dark:text-[#D4B8E3] text-[10px] px-1.5 py-0 border-0 font-medium">
          {groupName}
        </Badge>
      </td>

      <td className="py-2.5 px-3">{getStateBadge(p.state)}</td>

      <td className="py-2.5 px-3 hidden md:table-cell text-xs text-muted-foreground">
        {formatDate(p.joinedAt)}
      </td>

      <td className="py-2.5 px-3">
        <RateBar rate={p.attendance30Day.rate} />
      </td>

      <td className="py-2.5 px-3 text-center">
        <TodayStatusBadge status={p.todayStatus} />
      </td>

      <td className="py-2.5 px-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onView(); }}
        >
          <User className="size-3.5 mr-1" />
          View
        </Button>
      </td>
    </motion.tr>
  );
}

// ==================== MOBILE CARD ====================

function ParticipantCard({
  p,
  index,
  onView,
  groupName,
}: {
  p: RosterParticipant;
  index: number;
  onView: () => void;
  groupName: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors hover:bg-[#F3ECF6]/50 dark:hover:bg-[#1F0860]/20 cursor-pointer"
      onClick={onView}
    >
      <div
        className="size-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ backgroundColor: getAvatarColor(p._idx) }}
      >
        {getInitials(p.name)}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold truncate">{p.name}</span>
          <GenderIcon gender={p.gender} />
          {getStateBadge(p.state)}
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{p.phone || "No phone"}</p>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-[#F3ECF6] dark:bg-[#1F086080] text-[#4B0A8F] dark:text-[#D4B8E3] text-[9px] px-1.5 py-0 border-0">
            {groupName}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{formatDate(p.joinedAt)}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <RateBar rate={p.attendance30Day.rate} />
        <TodayStatusBadge status={p.todayStatus} />
      </div>
    </motion.div>
  );
}

// ==================== GROUP SECTION ====================

function GroupSection({
  group,
  defaultOpen,
  onViewParticipant,
}: {
  group: RosterGroup;
  defaultOpen: boolean;
  onViewParticipant: (p: RosterParticipant) => void;
}) {
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
              <svg
                className={cn(
                  "size-4 text-muted-foreground transition-transform duration-200",
                  open && "rotate-90"
                )}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
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
                      <th className="py-2 px-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                        Group
                      </th>
                      <th className="py-2 px-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="py-2 px-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                        Joined
                      </th>
                      <th className="py-2 px-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        30-Day Rate
                      </th>
                      <th className="py-2 px-3 text-center text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Today
                      </th>
                      <th className="py-2 px-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-16">
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.participants.map((p, idx) => (
                      <ParticipantRow
                        key={p.id}
                        p={p}
                        index={idx}
                        groupName={group.name}
                        onView={() => onViewParticipant(p)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden p-3 pt-0 space-y-2">
                {group.participants.map((p, idx) => (
                  <ParticipantCard
                    key={p.id}
                    p={p}
                    index={idx}
                    groupName={group.name}
                    onView={() => onViewParticipant(p)}
                  />
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
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [detailParticipant, setDetailParticipant] = useState<RosterParticipant | null>(null);

  const { data, isLoading, error, refetch } = useQuery<RosterResponse>({
    queryKey: ["park-roster", search, selectedGroupId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedGroupId && selectedGroupId !== "all") params.set("groupId", selectedGroupId);
      const res = await fetch(`/api/park/roster?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load roster");
      }
      return res.json();
    },
    staleTime: 30000,
  });

  // Flatten all groups across batches
  const allGroups = useMemo(() => {
    const groups: RosterGroup[] = [];
    for (const batch of data?.batches || []) {
      for (const group of batch.groups) {
        groups.push(group);
      }
    }
    return groups;
  }, [data]);

  // Debounced search
  const handleSearchSubmit = () => {
    setSearch(searchInput.trim());
  };

  const handleGroupChange = (val: string) => {
    setSelectedGroupId(val);
  };

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

  const hasAnyParticipants = allGroups.some((g) => g.participants.length > 0);

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Park Roster</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.park.name}{" "}
            <span className="text-muted-foreground/60">· {data.park.city}</span>
          </p>
        </div>
      </div>

      {/* Summary Bar */}
      <SummaryBar
        total={data.totalParticipants}
        active={data.activeParticipants}
        inactive={data.inactiveParticipants}
        onLeave={data.onLeaveParticipants}
      />

      {/* Search + Group Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
            className="pl-9 h-9 text-sm"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput("");
                setSearch("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <Select value={selectedGroupId} onValueChange={handleGroupChange}>
          <SelectTrigger className="w-full sm:w-48 h-9 text-sm">
            <SelectValue placeholder="All Groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {allGroups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Roster Content */}
      {allGroups.length === 0 ? (
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
            Try a different name.
          </p>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3" key={`${selectedGroupId}-${search}`}>
            {allGroups.map((group, gIdx) => (
              <GroupSection
                key={group.id}
                group={group}
                defaultOpen={gIdx === 0}
                onViewParticipant={setDetailParticipant}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Detail Sheet */}
      <ParticipantDetailSheet
        participant={detailParticipant}
        open={!!detailParticipant}
        onClose={() => setDetailParticipant(null)}
      />
    </div>
  );
}