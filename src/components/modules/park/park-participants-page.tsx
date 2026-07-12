"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  User,
  Phone,
  Eye,
  Users,
  ShieldCheck,
  Loader2,
  LayoutGrid,
  List,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  Plus,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

// ==================== TYPES ====================

type Attendance30Day = {
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number;
};

type Participant = {
  id: string;
  name: string;
  phone: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  state: string;
  joinedAt: string;
  groupName: string;
  batchName: string;
  guardianId: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianRelation: string | null;
  attendance30Day: Attendance30Day;
  lastAttendanceDate: string | null;
  _idx: number;
};

type GroupOption = {
  id: string;
  name: string;
  batchName: string;
};

type ParticipantsResponse = {
  data: Participant[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  totalActive: number;
  totalInactive: number;
  newThisMonth: number;
  weeklyAttendanceRate: number;
  park: { id: string; name: string; city: string };
  groups: GroupOption[];
};

// ==================== CONSTANTS ====================

const AVATAR_COLORS = [
  "#4B0A8F", "#A0006B", "#2A0C8F", "#6B21A8",
  "#7C3AED", "#9333EA", "#C026D3", "#DB2777",
  "#A21CAF", "#86198F",
];

const PAGE_SIZES = [20, 40, 60];

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

function getRateBadgeBg(rate: number): string {
  if (rate >= 80) return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
  if (rate >= 50) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
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

function GenderIcon({ gender }: { gender: string | null }) {
  if (gender === "male") return <span className="text-[10px] text-muted-foreground">♂</span>;
  if (gender === "female") return <span className="text-[10px] text-muted-foreground">♀</span>;
  return null;
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

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`;
  return formatDate(iso);
}

// ==================== STATS ROW ====================

function StatsRow({
  totalActive,
  totalInactive,
  newThisMonth,
  weeklyRate,
  total,
}: {
  totalActive: number;
  totalInactive: number;
  newThisMonth: number;
  weeklyRate: number;
  total: number;
}) {
  const stats = [
    {
      label: "Total",
      value: total,
      icon: Users,
      color: "text-[#4B0A8F] dark:text-[#D4B8E3]",
      bg: "bg-[#F3ECF6] dark:bg-[#1F086080]",
    },
    {
      label: "New This Month",
      value: newThisMonth,
      icon: UserPlus,
      color: "text-[#A0006B] dark:text-[#D4B8E3]",
      bg: "bg-[#A0006B]/10 dark:bg-[#A0006B]/20",
    },
    {
      label: "Active",
      value: totalActive,
      icon: Users,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-500/10",
    },
    {
      label: "Weekly Attendance",
      value: `${weeklyRate}%`,
      icon: TrendingUp,
      color: weeklyRate >= 70 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400",
      bg: weeklyRate >= 70 ? "bg-green-500/10" : "bg-amber-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          className="rounded-xl border bg-card p-3 flex items-center gap-3"
        >
          <div className={cn("size-9 rounded-lg flex items-center justify-center shrink-0", s.bg)}>
            <s.icon className={cn("size-4", s.color)} />
          </div>
          <div>
            <p className="text-lg font-bold leading-none">{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ==================== SKELETON LOADING ====================

function ParticipantsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-3 flex items-center gap-3">
            <Skeleton className="size-9 rounded-lg shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Skeleton className="h-9 w-full sm:w-64" />
        <Skeleton className="h-9 w-full sm:w-40" />
        <Skeleton className="h-9 w-10 shrink-0" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== RATE MINI BAR ====================

function RateMiniBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", getRateColor(rate))}
          initial={{ width: 0 }}
          animate={{ width: `${rate}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <span className={cn("text-[11px] font-semibold tabular-nums w-8 text-right", getRateTextColor(rate))}>
        {rate}%
      </span>
    </div>
  );
}

// ==================== ADD PARTICIPANT DIALOG ====================

function AddParticipantDialog({
  open,
  onClose,
  groups,
}: {
  open: boolean;
  onClose: () => void;
  groups: GroupOption[];
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [groupId, setGroupId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !groupId) {
      toast.error("Name and group are required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/park/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
          gender: gender || undefined,
          dateOfBirth: dateOfBirth || undefined,
          groupId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create participant");
      }

      toast.success("Participant added successfully");
      queryClient.invalidateQueries({ queryKey: ["park-participants"] });
      handleClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to add participant");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setName("");
    setPhone("");
    setGender("");
    setDateOfBirth("");
    setGroupId("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Participant</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="add-name">Name *</Label>
            <Input
              id="add-name"
              placeholder="Participant name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="add-phone">Phone</Label>
              <Input
                id="add-phone"
                placeholder="03XX-XXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-gender">Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="add-dob">Date of Birth</Label>
              <Input
                id="add-dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-group">Group *</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} ({g.batchName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !name.trim() || !groupId}
            className="bg-[#4B0A8F] hover:bg-[#3A0872] text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="size-3.5 mr-1.5" />
                Add Participant
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== PARTICIPANT CARD (Grid View) ====================

function ParticipantGridCard({
  p,
  index,
  onView,
}: {
  p: Participant;
  index: number;
  onView: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      whileHover={{ y: -2, boxShadow: "0 8px 25px -5px rgba(75,10,143,0.15)" }}
      className="rounded-xl border bg-card p-4 transition-colors hover:border-[#4B0A8F]/30 dark:hover:border-[#8A40B0]/30 cursor-pointer group"
      onClick={onView}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="size-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ backgroundColor: getAvatarColor(p._idx) }}
        >
          {getInitials(p.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold truncate">{p.name}</span>
            <GenderIcon gender={p.gender} />
            {getStateBadge(p.state)}
          </div>
          {p.phone && (
            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
              <Phone className="size-2.5 shrink-0" />
              {p.phone}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5 text-[11px] text-muted-foreground">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground/70">Group</span>
          <Badge variant="secondary" className="bg-[#F3ECF6] dark:bg-[#1F086080] text-[#4B0A8F] dark:text-[#D4B8E3] text-[10px] px-1.5 py-0 border-0 font-medium">
            {p.groupName}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground/70">30-Day Rate</span>
          <RateMiniBar rate={p.attendance30Day.rate} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground/70">Last Attendance</span>
          <span className="text-[11px] text-foreground/70">{formatRelativeDate(p.lastAttendanceDate)}</span>
        </div>
        {p.guardianName && (
          <div className="flex items-center gap-1 pt-1 border-t border-border/50">
            <ShieldCheck className="size-3 text-[#A0006B] dark:text-[#C94D99] shrink-0" />
            <span className="truncate">{p.guardianName}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ==================== PARTICIPANT TABLE ROW (List View) ====================

function ParticipantTableRow({
  p,
  index,
  sortField,
  sortOrder,
  onSort,
  onView,
}: {
  p: Participant;
  index: number;
  sortField: string;
  sortOrder: string;
  onSort: (field: string) => void;
  onView: () => void;
}) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
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
        <Badge variant="secondary" className="bg-[#F3ECF6] dark:bg-[#1F086080] text-[#4B0A8F] dark:text-[#D4B8E3] text-[10px] px-1.5 py-0 border-0">
          {p.groupName}
        </Badge>
      </td>
      <td className="py-2.5 px-3">{getStateBadge(p.state)}</td>
      <td className="py-2.5 px-3">
        <RateMiniBar rate={p.attendance30Day.rate} />
      </td>
      <td className="py-2.5 px-3 hidden md:table-cell text-xs text-muted-foreground">
        {formatRelativeDate(p.lastAttendanceDate)}
      </td>
      <td className="py-2.5 px-3 hidden lg:table-cell">
        <span className="text-xs text-muted-foreground">
          {p.guardianName || "—"}
        </span>
      </td>
      <td className="py-2.5 px-3 w-16">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onView(); }}
        >
          <Eye className="size-3.5 mr-1" />
          View
        </Button>
      </td>
    </motion.tr>
  );
}

// ==================== SORT HEADER ====================

function SortableHeader({
  label,
  field,
  sortField,
  sortOrder,
  onSort,
}: {
  label: string;
  field: string;
  sortField: string;
  sortOrder: string;
  onSort: (field: string) => void;
}) {
  const isActive = sortField === field;
  return (
    <th
      className="py-2 px-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={cn(
            "size-3",
            isActive ? "text-[#4B0A8F] dark:text-[#8A40B0]" : "opacity-30"
          )}
        />
      </div>
    </th>
  );
}

// ==================== DETAIL SHEET ====================

function DetailSheet({
  participant,
  open,
  onClose,
}: {
  participant: Participant | null;
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
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contact Information</h4>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{participant.phone || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date of Birth</span>
                <span className="font-medium">{formatDate(participant.dateOfBirth)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Age</span>
                <span className="font-medium">{calculateAge(participant.dateOfBirth)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Joined</span>
                <span className="font-medium">{formatDate(participant.joinedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Attendance</span>
                <span className="font-medium">{formatRelativeDate(participant.lastAttendanceDate)}</span>
              </div>
            </div>
          </section>

          <Separator />

          {/* Group Info */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Group Assignment</h4>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Batch</span>
                <span className="font-medium">{participant.batchName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Group</span>
                <Badge variant="secondary" className="bg-[#F3ECF6] dark:bg-[#1F086080] text-[#4B0A8F] dark:text-[#D4B8E3] text-[10px] px-1.5 py-0 border-0">
                  {participant.groupName}
                </Badge>
              </div>
            </div>
          </section>

          <Separator />

          {/* 30-Day Attendance Breakdown */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">30-Day Attendance</h4>
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

          <Separator />

          {/* Guardian Info */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Guardian</h4>
            {participant.guardianName ? (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-[#A0006B] dark:text-[#C94D99]" />
                  <span className="font-medium">{participant.guardianName}</span>
                </div>
                {participant.guardianPhone && (
                  <div className="flex items-center gap-2 text-muted-foreground pl-6">
                    <Phone className="size-3" />
                    <span>{participant.guardianPhone}</span>
                  </div>
                )}
                {participant.guardianRelation && (
                  <div className="pl-6 text-muted-foreground">
                    <span className="text-xs">Relation: {participant.guardianRelation}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No guardian linked</p>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ==================== MAIN COMPONENT ====================

export function ParkParticipantsPage() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [groupId, setGroupId] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [detailParticipant, setDetailParticipant] = useState<Participant | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<ParticipantsResponse>({
    queryKey: ["park-participants", search, groupId, stateFilter, page, pageSize, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (groupId && groupId !== "all") params.set("groupId", groupId);
      if (stateFilter && stateFilter !== "all") params.set("state", stateFilter);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      const res = await fetch(`/api/park/participants?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load participants");
      }
      return res.json();
    },
    staleTime: 30000,
  });

  const handleSearchSubmit = useCallback(() => {
    setSearch(searchInput.trim());
    setPage(1);
  }, [searchInput]);

  const handleGroupChange = useCallback((val: string) => {
    setGroupId(val);
    setPage(1);
  }, []);

  const handleStateChange = useCallback((val: string) => {
    setStateFilter(val);
    setPage(1);
  }, []);

  const handleSort = useCallback((field: string) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  }, [sortBy]);

  const handleViewToggle = useCallback((mode: "grid" | "list") => {
    setViewMode(mode);
  }, []);

  const totalPages = data?.pagination.totalPages || 0;

  // ==================== RENDER ====================

  if (isLoading) return <ParticipantsSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="size-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
          <span className="text-red-500 text-lg">!</span>
        </div>
        <p className="text-sm font-medium text-foreground mb-1">Failed to load participants</p>
        <p className="text-xs text-muted-foreground mb-4">{error.message}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <Loader2 className="size-3.5 mr-1.5 animate-spin" />
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const participants = data.data;

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Participants</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.park.name}{" "}
            <span className="text-muted-foreground/60">· {data.park.city}</span>
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setAddDialogOpen(true)}
          className="bg-[#4B0A8F] hover:bg-[#3A0872] text-white shrink-0"
        >
          <Plus className="size-3.5 mr-1.5" />
          Add Participant
        </Button>
      </div>

      {/* Stats Row */}
      <StatsRow
        totalActive={data.totalActive}
        totalInactive={data.totalInactive}
        newThisMonth={data.newThisMonth}
        weeklyRate={data.weeklyAttendanceRate}
        total={data.totalActive + data.totalInactive}
      />

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
            className="pl-9 h-9 text-sm"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select value={groupId} onValueChange={handleGroupChange}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {data.groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name} ({g.batchName})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stateFilter} onValueChange={handleStateChange}>
            <SelectTrigger className="w-[120px] h-9 text-xs">
              <SelectValue placeholder="All States" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => handleViewToggle("grid")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "grid"
                  ? "bg-[#4B0A8F] text-white"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              onClick={() => handleViewToggle("list")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "list"
                  ? "bg-[#4B0A8F] text-white"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              <List className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {participants.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="size-12 rounded-full bg-[#F3ECF6] dark:bg-[#1F086080] flex items-center justify-center mb-3">
            <Users className="size-6 text-[#4B0A8F] dark:text-[#D4B8E3]" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            {search ? "No participants match your search" : "No participants yet"}
          </p>
          <p className="text-xs text-muted-foreground">
            {search ? "Try a different name or phone number." : "Click 'Add Participant' to get started."}
          </p>
        </motion.div>
      ) : viewMode === "grid" ? (
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`grid-${search}-${groupId}-${stateFilter}-${page}`}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.04 } },
            }}
          >
            {participants.map((p, idx) => (
              <ParticipantGridCard
                key={p.id}
                p={p}
                index={idx}
                onView={() => setDetailParticipant(p)}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <SortableHeader label="Participant" field="name" sortField={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <th className="py-2 px-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Group</th>
                  <SortableHeader label="State" field="state" sortField={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <SortableHeader label="Rate" field="rate" sortField={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <th className="py-2 px-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Last Att.</th>
                  <th className="py-2 px-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Guardian</th>
                  <th className="py-2 px-3 w-16" />
                </tr>
              </thead>
              <tbody>
                {participants.map((p, idx) => (
                  <ParticipantTableRow
                    key={p.id}
                    p={p}
                    index={idx}
                    sortField={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    onView={() => setDetailParticipant(p)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Per page</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-16 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <DetailSheet
        participant={detailParticipant}
        open={!!detailParticipant}
        onClose={() => setDetailParticipant(null)}
      />

      {/* Add Participant Dialog */}
      <AddParticipantDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        groups={data.groups}
      />
    </div>
  );
}