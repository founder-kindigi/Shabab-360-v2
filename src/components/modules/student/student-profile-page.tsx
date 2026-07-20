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

type AttendanceSummary = {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number;
};

type ProfileResponse = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
  participant: {
    id: string;
    name: string;
    phone: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    address: string | null;
    state: string;
    joinedAt: string;
    group: string;
    batch: string;
    park: string;
    city: string | null;
  } | null;
  attendanceSummary: AttendanceSummary | null;
};

// ─── Animation Config ────────────────────────────────────────────────

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// ─── Helpers ─────────────────────────────────────────────────────────

const genderLabel = (g: string | null | undefined) => {
  if (!g) return "—";
  return g.charAt(0).toUpperCase() + g.slice(1);
};

// ─── Component ───────────────────────────────────────────────────────

export function StudentProfilePage() {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const { data, isLoading, error } = useQuery<ProfileResponse>({
    queryKey: ["user-profile"],
    queryFn: () =>
      fetch("/api/user/profile").then((r) => {
        if (!r.ok) throw new Error("Failed to load profile");
        return r.json();
      }),
    staleTime: 15000,
  });

  const updateMutation = useMutation({
    mutationFn: (body: { name?: string; phone?: string; address?: string }) =>
      fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) throw new Error("Update failed");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("Profile updated successfully");
      setEditOpen(false);
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });

  const handleOpenEdit = () => {
    if (data) {
      setEditName(data.participant?.name || data.name || "");
      setEditPhone(data.participant?.phone || data.phone || "");
      setEditAddress(data.participant?.address || "");
    }
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
      <div className="space-y-5">
        <Skeleton className="h-48 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-800/50">
        <CardContent className="p-4 text-center">
          <AlertTriangle className="size-6 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Failed to load profile
          </p>
        </CardContent>
      </Card>
    );
  }

  const p = data?.participant;
  const att = data?.attendanceSummary;

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* ─── Profile Header Card ──────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <Card className="border-border overflow-hidden">
          <CardContent className="p-0">
            {/* Banner */}
            <div className="h-20 bg-gradient-to-r from-[#4B0A8F] via-[#6B1FB0] to-[#A0006B] relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpIi8+PC9zdmc+')] opacity-50" />
            </div>

            <div className="px-4 sm:px-6 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3 -mt-8 sm:-mt-10">
                {/* Avatar */}
                <div className="flex items-center justify-center size-16 sm:size-20 rounded-2xl bg-card border-4 border-background shadow-lg shrink-0">
                  <div className="flex items-center justify-center size-full rounded-2xl bg-[#F3ECF6] dark:bg-[#1F086080]">
                    <User className="size-7 sm:size-9 text-[#4B0A8F] dark:text-[#8A40B0]" />
                  </div>
                </div>

                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-foreground truncate">
                      {p?.name || data?.name || "Student"}
                    </h2>
                    <Badge
                      className={cn(
                        "text-[10px] font-medium px-2 py-0.5",
                        p?.state === "active"
                          ? "bg-green-100 text-green-700 border-0 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-amber-100 text-amber-700 border-0 dark:bg-amber-900/30 dark:text-amber-400"
                      )}
                    >
                      {p?.state || "Unknown"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p?.group && p?.batch && p?.park
                      ? `${p.group} · ${p.batch} · ${p.park}`
                      : "No group assigned"}
                  </p>
                  {p?.city && (
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                      <Building2 className="size-3" />
                      {p.city}
                    </p>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs shrink-0 hover:border-[#D4B8E3] hover:text-[#4B0A8F] dark:hover:border-[#2A0C8F99] dark:hover:text-[#8A40B0]"
                  onClick={handleOpenEdit}
                >
                  <Pencil className="size-3.5 mr-1.5" />
                  Edit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Info Cards Grid ─────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Personal Information */}
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <InfoRow label="Full Name" value={p?.name || data?.name || "—"} />
            <InfoRow label="Email" value={data?.email || "—"} icon={Mail} />
            <InfoRow label="Phone" value={p?.phone || data?.phone || "Not set"} icon={Phone} />
            <InfoRow label="Date of Birth" value={p?.dateOfBirth || "Not set"} icon={CalendarDays} />
            <InfoRow label="Gender" value={genderLabel(p?.gender)} icon={ShieldCheck} />
            <InfoRow label="Address" value={p?.address || "Not set"} icon={MapPin} />
          </CardContent>
        </Card>

        {/* Organization Details */}
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GraduationCap className="size-4 text-[#A0006B] dark:text-[#D44A8B]" />
              Organization Details
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <InfoRow label="Group" value={p?.group || "—"} icon={Users} />
            <InfoRow label="Batch" value={p?.batch || "—"} icon={CalendarDays} />
            <InfoRow label="Park" value={p?.park || "—"} icon={TreePine} />
            <InfoRow label="City" value={p?.city || "—"} icon={Building2} />
            <Separator />
            <InfoRow label="Joined" value={p?.joinedAt || "—"} icon={CalendarCheck} />
            <InfoRow label="Status" value={p?.state || "—"} />
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Attendance Summary ──────────────────────────────────── */}
      {att && (
        <motion.div variants={fadeUp}>
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
                Attendance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <MiniStat label="Rate" value={`${att.rate}%`} color={att.rate >= 80 ? "text-green-600 dark:text-green-400" : att.rate >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"} />
                <MiniStat label="Total" value={String(att.total)} color="text-[#4B0A8F] dark:text-[#8A40B0]" />
                <MiniStat label="Present" value={String(att.present)} color="text-green-600 dark:text-green-400" />
                <MiniStat label="Absent" value={String(att.absent)} color="text-red-600 dark:text-red-400" />
                <MiniStat label="Late" value={String(att.late)} color="text-amber-600 dark:text-amber-400" />
                <MiniStat label="Excused" value={String(att.excused)} color="text-sky-600 dark:text-sky-400" />
              </div>
              {att.total > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#4B0A8F] to-[#A0006B] transition-all duration-500"
                      style={{ width: `${att.rate}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right">
                    {att.rate}% attendance rate
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-xs font-medium">
                Full Name
              </Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter full name"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone" className="text-xs font-medium">
                Phone Number
              </Label>
              <Input
                id="edit-phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Enter phone number"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address" className="text-xs font-medium">
                Address
              </Label>
              <Textarea
                id="edit-address"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Enter address"
                className="text-sm min-h-[60px]"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(false)}
              disabled={updateMutation.isPending}
            >
              <X className="size-3.5 mr-1.5" />
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#4B0A8F] hover:bg-[#3A0870] text-white"
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
}: {
  label: string;
  value: string;
  icon?: typeof User;
}) {
  return (
    <div className="flex items-start gap-2.5">
      {Icon && (
        <Icon className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="text-center p-2 rounded-lg bg-muted/50">
      <p className={cn("text-base font-bold leading-tight", color)}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
