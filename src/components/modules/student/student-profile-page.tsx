"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, type Variants } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  User,
  Phone,
  MapPin,
  Mail,
  CalendarDays,
  GraduationCap,
  TreePine,
  Building2,
  Users,
  CalendarCheck,
  TrendingUp,
  Pencil,
  Save,
  X,
  Loader2,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

export interface StudentProfilePageProps {
  participantId?: string | null;
  isSelf?: boolean;
}

// ─── Animation Config ────────────────────────────────────────────────

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

// ─── Helpers ─────────────────────────────────────────────────────────

const genderLabel = (g: string | null | undefined) => {
  if (!g) return "—";
  return g.charAt(0).toUpperCase() + g.slice(1);
};

const getInitials = (name?: string | null) => {
  if (!name) return "SB";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// ─── Component ───────────────────────────────────────────────────────

export function StudentProfilePage({
  participantId,
  isSelf = false,
}: StudentProfilePageProps = {}) {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const isDetailQuery = Boolean(participantId && !isSelf);

  const { data, isLoading, error } = useQuery<any>({
    queryKey: isDetailQuery ? ["student-detail", participantId] : ["user-profile"],
    queryFn: async () => {
      const url = isDetailQuery
        ? `/api/admin/students/${participantId}/detail`
        : `/api/user/profile`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
    staleTime: 15000,
  });

  const updateMutation = useMutation({
    mutationFn: async (body: { name?: string; phone?: string; address?: string }) => {
      const url = isDetailQuery
        ? `/api/admin/students/${participantId}`
        : `/api/user/profile`;
      const method = "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      if (isDetailQuery) {
        queryClient.invalidateQueries({ queryKey: ["student-detail", participantId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      }
      toast.success("Profile updated successfully");
      setEditOpen(false);
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });

  // Data normalization to handle both /api/admin/students/[id]/detail and /api/user/profile
  const rawParticipant = data?.participant;

  const groupName =
    typeof rawParticipant?.group === "object"
      ? rawParticipant?.group?.name
      : rawParticipant?.group;
  const batchName =
    typeof rawParticipant?.group?.batch === "object"
      ? rawParticipant?.group?.batch?.name
      : rawParticipant?.batch;
  const parkName =
    typeof rawParticipant?.group?.batch?.park === "object"
      ? rawParticipant?.group?.batch?.park?.name
      : rawParticipant?.park;
  const cityName =
    typeof rawParticipant?.group?.batch?.park?.city === "object"
      ? rawParticipant?.group?.batch?.park?.city?.name
      : rawParticipant?.city;
  const joinedDate = rawParticipant?.createdAt
    ? new Date(rawParticipant.createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : rawParticipant?.joinedAt || "—";

  const p = rawParticipant
    ? {
        id: rawParticipant.id,
        name: rawParticipant.name || data?.name || "Shabab",
        phone: rawParticipant.phone || data?.phone || null,
        dateOfBirth: rawParticipant.dateOfBirth
          ? typeof rawParticipant.dateOfBirth === "string" && rawParticipant.dateOfBirth.includes("T")
            ? new Date(rawParticipant.dateOfBirth).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : rawParticipant.dateOfBirth
          : null,
        gender: rawParticipant.gender,
        age: rawParticipant.age,
        gradeClass: rawParticipant.gradeClass,
        address: rawParticipant.address,
        state: rawParticipant.state || "active",
        joinedAt: joinedDate,
        group: groupName,
        batch: batchName,
        park: parkName,
        city: cityName,
        email: rawParticipant.user?.email || data?.email || null,
        guardians: rawParticipant.guardianLinks || [],
      }
    : null;

  // Normalized Attendance
  const attTotal =
    data?.attendanceSummary?.totalEvents ?? data?.attendanceSummary?.total ?? 0;
  const attPresent = data?.attendanceSummary?.present ?? 0;
  const attAbsent = data?.attendanceSummary?.absent ?? 0;
  const attLate = data?.attendanceSummary?.late ?? 0;
  const attExcused = data?.attendanceSummary?.excused ?? 0;
  const attRate =
    data?.attendanceSummary?.rate ??
    (attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0);
  const hasAttendance = data?.attendanceSummary != null;

  const recentAttendance: Array<{
    eventDate: string;
    title: string;
    status: string;
    markedByName?: string;
  }> = data?.recentAttendance || [];

  const handleOpenEdit = () => {
    setEditName(p?.name || data?.name || "");
    setEditPhone(p?.phone || data?.phone || "");
    setEditAddress(p?.address || "");
    setEditOpen(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      name: editName.trim() || undefined,
      phone: editPhone.trim() || undefined,
      address: editAddress.trim() || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-44 rounded-3xl" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card className="border-red-200 dark:border-red-800/50 bg-red-50/30">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="size-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              Failed to load Shabab profile
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Please check network connection or verify authorization scopes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryGuardianPhone =
    p?.guardians && p.guardians.length > 0 && p.guardians[0]?.guardian?.phone
      ? p.guardians[0].guardian.phone
      : null;

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-4 p-4 pb-28 select-none"
    >
      {/* ─── Profile Hero Card (Integrated, no negative margin) ────────── */}
      <motion.div variants={fadeUp}>
        <div className="rounded-3xl bg-gradient-to-br from-[#1F0860] via-[#3B0764] to-[#12082E] p-5 shadow-xl border border-purple-900/30 text-white relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 size-40 bg-white/[0.05] rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 size-32 bg-[#D90429]/15 rounded-full blur-2xl pointer-events-none -ml-8 -mb-8" />

          <div className="relative z-10 flex items-start gap-4">
            {/* Avatar with Status Ring */}
            <div className="relative shrink-0">
              <div className="size-16 rounded-2xl bg-gradient-to-br from-[#4B0A8F] to-[#D90429] p-0.5 shadow-md">
                <div className="size-full rounded-[14px] bg-[#1F0860] flex items-center justify-center text-white font-black text-xl tracking-wider">
                  {getInitials(p?.name || data?.name)}
                </div>
              </div>
              <span
                className={cn(
                  "absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-[#1F0860]",
                  p?.state === "active" ? "bg-emerald-500" : "bg-amber-500"
                )}
              />
            </div>

            {/* Identity & Badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white tracking-tight truncate">
                  {p?.name || data?.name || "Shabab"}
                </h2>
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0",
                    p?.state === "active"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      p?.state === "active" ? "bg-emerald-400" : "bg-amber-400"
                    )}
                  />
                  {p?.state === "active" ? "Active Shabab" : p?.state || "Active"}
                </span>
              </div>

              <p className="text-xs text-purple-200/90 font-semibold mt-1 truncate">
                {p?.group && p?.park
                  ? `${p.group} · ${p.park}`
                  : p?.group || p?.park || "Group Alpha · Gulshan Ravi"}
              </p>

              <p className="text-[11px] text-purple-300/60 font-medium mt-0.5 truncate">
                {[p?.batch, p?.city].filter(Boolean).join(" · ") || "Batch 4 · Lahore"}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons Row */}
          <div className="relative z-10 flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
            {p?.phone && (
              <a
                href={`tel:${p.phone}`}
                className="flex-1 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Phone className="size-3.5 text-emerald-400" />
                <span>Call Shabab</span>
              </a>
            )}

            {primaryGuardianPhone && (
              <a
                href={`tel:${primaryGuardianPhone}`}
                className="flex-1 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Phone className="size-3.5 text-sky-400" />
                <span>Call Guardian</span>
              </a>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenEdit}
              className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold shrink-0"
            >
              <Pencil className="size-3.5 mr-1" />
              Edit
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ─── Attendance KPI Stats Row ──────────────────────────────────── */}
      {hasAttendance && (
        <motion.div variants={fadeUp} className="space-y-2">
          <div className="grid grid-cols-4 gap-2 bg-white dark:bg-[#180E30] border border-slate-100 dark:border-white/10 rounded-2xl p-3 shadow-xs">
            <div className="text-center">
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-tight">
                {attRate}%
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Rate</p>
            </div>
            <div className="text-center border-l border-slate-100 dark:border-white/10">
              <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                {attPresent}
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Present</p>
            </div>
            <div className="text-center border-l border-slate-100 dark:border-white/10">
              <p className="text-lg font-black text-rose-500 leading-tight">
                {attAbsent}
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Absent</p>
            </div>
            <div className="text-center border-l border-slate-100 dark:border-white/10">
              <p className="text-lg font-black text-[#4B0A8F] dark:text-purple-300 leading-tight">
                {attTotal}
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Total</p>
            </div>
          </div>

          {attTotal > 0 && (
            <div className="space-y-1 px-1">
              <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#4B0A8F] to-[#D90429] transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, attRate))}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 text-right font-medium">
                {attRate}% overall attendance rate ({attPresent} of {attTotal} sessions)
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* ─── Personal Information Card ───────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <Card className="border border-slate-100 dark:border-white/10 rounded-2xl shadow-xs overflow-hidden bg-white dark:bg-[#180E30]">
          <CardHeader className="pb-2 pt-3.5 px-4 bg-slate-50/60 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <User className="size-4 text-[#4B0A8F] dark:text-purple-400" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3 space-y-3 divide-y divide-slate-100 dark:divide-white/5">
            <InfoRow label="Full Name" value={p?.name || data?.name || "—"} />
            <div className="pt-2.5">
              <InfoRow label="Email" value={p?.email || data?.email || "—"} icon={Mail} />
            </div>
            <div className="pt-2.5">
              <InfoRow label="Phone" value={p?.phone || data?.phone || "Not set"} icon={Phone} isPhone />
            </div>
            <div className="pt-2.5">
              <InfoRow
                label="Grade / Class"
                value={p?.gradeClass ? p.gradeClass : "Not provided"}
                icon={GraduationCap}
              />
            </div>
            <div className="pt-2.5">
              <InfoRow
                label="Age"
                value={p?.age != null ? String(p.age) : "Not provided"}
                icon={CalendarDays}
              />
            </div>
            <div className="pt-2.5">
              <InfoRow label="Date of Birth" value={p?.dateOfBirth || "Not set"} icon={CalendarDays} />
            </div>
            <div className="pt-2.5">
              <InfoRow label="Gender" value={genderLabel(p?.gender)} icon={ShieldCheck} />
            </div>
            <div className="pt-2.5">
              <InfoRow label="Address" value={p?.address || "Not set"} icon={MapPin} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Guardian & Family Details Card ─────────────────────────── */}
      {p?.guardians && p.guardians.length > 0 && (
        <motion.div variants={fadeUp}>
          <Card className="border border-slate-100 dark:border-white/10 rounded-2xl shadow-xs overflow-hidden bg-white dark:bg-[#180E30]">
            <CardHeader className="pb-2 pt-3.5 px-4 bg-slate-50/60 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <ShieldCheck className="size-4 text-[#D90429]" />
                Guardian & Family Details
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3 space-y-3 divide-y divide-slate-100 dark:divide-white/5">
              {p.guardians.map((g: any, idx: number) => (
                <div key={idx} className={idx > 0 ? "pt-2.5" : ""}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                      {g.guardian?.name || "Guardian"}
                    </p>
                    <Badge variant="outline" className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {g.relation || "Parent"}
                    </Badge>
                  </div>
                  {g.guardian?.phone && (
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                      <span className="text-[11px] text-slate-400">Contact Number</span>
                      <a
                        href={`tel:${g.guardian.phone}`}
                        className="font-bold text-[#4B0A8F] dark:text-purple-300 hover:underline flex items-center gap-1"
                      >
                        <Phone className="size-3" />
                        {g.guardian.phone}
                      </a>
                    </div>
                  )}
                  {g.guardian?.cnic && (
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                      <span className="text-[11px] text-slate-400">CNIC</span>
                      <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                        {g.guardian.cnic}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Organization & Program Details Card ────────────────────── */}
      <motion.div variants={fadeUp}>
        <Card className="border border-slate-100 dark:border-white/10 rounded-2xl shadow-xs overflow-hidden bg-white dark:bg-[#180E30]">
          <CardHeader className="pb-2 pt-3.5 px-4 bg-slate-50/60 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Building2 className="size-4 text-[#A0006B] dark:text-pink-400" />
              Organization Details
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3 space-y-3 divide-y divide-slate-100 dark:divide-white/5">
            <InfoRow label="Group" value={p?.group || "—"} icon={Users} />
            <div className="pt-2.5">
              <InfoRow label="Batch" value={p?.batch || "—"} icon={CalendarDays} />
            </div>
            <div className="pt-2.5">
              <InfoRow label="Park" value={p?.park || "—"} icon={TreePine} />
            </div>
            <div className="pt-2.5">
              <InfoRow label="City" value={p?.city || "—"} icon={Building2} />
            </div>
            <div className="pt-2.5">
              <InfoRow label="Joined" value={p?.joinedAt || "—"} icon={CalendarCheck} />
            </div>
            <div className="pt-2.5">
              <InfoRow label="Status" value={p?.state || "Active"} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Recent Attendance Activity Card ────────────────────────── */}
      {recentAttendance.length > 0 && (
        <motion.div variants={fadeUp}>
          <Card className="border border-slate-100 dark:border-white/10 rounded-2xl shadow-xs overflow-hidden bg-white dark:bg-[#180E30]">
            <CardHeader className="pb-2 pt-3.5 px-4 bg-slate-50/60 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <CalendarCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                  Recent Attendance Log
                </CardTitle>
                <span className="text-[11px] font-bold text-slate-400">
                  {recentAttendance.length} sessions
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-4 py-2 divide-y divide-slate-100 dark:divide-white/5">
              {recentAttendance.map((rec, idx) => {
                const statusColors =
                  rec.status === "present"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : rec.status === "late"
                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                    : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300";
                const dateStr = rec.eventDate
                  ? new Date(rec.eventDate).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })
                  : "Session";
                return (
                  <div key={idx} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                        {rec.title || "Tarbiyah Drill"}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {dateStr} {rec.markedByName ? `· marked by ${rec.markedByName}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize shrink-0",
                        statusColors
                      )}
                    >
                      {rec.status}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md max-w-[92vw] rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Edit Shabab Profile
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Full Name
              </Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter full name"
                className="h-10 rounded-xl text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Phone Number
              </Label>
              <Input
                id="edit-phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="0300-1234567"
                className="h-10 rounded-xl text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-address" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Residential Address
              </Label>
              <Textarea
                id="edit-address"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Enter address"
                className="text-sm min-h-[70px] rounded-xl"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(false)}
              disabled={updateMutation.isPending}
              className="h-10 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-10 rounded-xl bg-[#4B0A8F] hover:bg-[#3A0870] text-white text-xs font-bold shadow-sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="size-3.5 mr-1.5" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  icon: Icon,
  isPhone = false,
}: {
  label: string;
  value: string;
  icon?: any;
  isPhone?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        {Icon && <Icon className="size-3.5 text-slate-400 shrink-0" />}
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <div className="text-right min-w-0 truncate">
        {isPhone && value && value !== "Not set" && value !== "—" ? (
          <a
            href={`tel:${value}`}
            className="text-xs font-bold text-[#4B0A8F] dark:text-purple-300 hover:underline"
          >
            {value}
          </a>
        ) : (
          <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
            {value}
          </span>
        )}
      </div>
    </div>
  );
}
