"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatPKT } from "@/lib/timezone";
import { toast } from "sonner";
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Users,
  ChevronRight,
  Pencil,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  DollarSign,
  ExternalLink,
  Building2,
  TrendingUp,
  BarChart3,
  History,
  CreditCard,
  UserCog,
  Activity,
  Loader2,
} from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";

// ─── Types ───────────────────────────────────────────────────────────────

interface ParticipantDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantId: string | null;
  participantName?: string;
  onEdit?: () => void;
}

interface DetailData {
  participant: {
    id: string;
    name: string;
    phone: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    address: string | null;
    state: string;
    joinedAt: string;
    group: {
      id: string;
      name: string;
      batch: {
        id: string;
        name: string;
        park: { id: string; name: string; city: { id: string; name: string } };
      };
    };
    user: { id: string; email: string } | null;
    guardianLinks: {
      guardian: { id: string; name: string; phone: string; cnic: string | null };
      relation: string | null;
    }[];
  };
  attendanceSummary: {
    totalEvents: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    rate: number;
  };
  recentAttendance: {
    eventDate: string;
    title: string;
    status: string;
    markedByName: string;
  }[];
  feeSummary: {
    totalFees: number;
    totalExpected: number;
    totalPaid: number;
    outstanding: number;
  };
  recentPayments: {
    feeEventTitle: string;
    amount: number;
    method: string;
    receiptNo: string | null;
    date: string;
    recordedByName: string;
  }[];
  tabPayments: {
    feeEventTitle: string;
    amount: number;
    method: string;
    receiptNo: string | null;
    date: string;
    recordedByName: string;
  }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function calcAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getStatusVariant(state: string) {
  switch (state) {
    case "active":
      return "text-[#4B0A8F] border-[#D4B8E3] bg-[#F3ECF6] dark:text-[#8A40B0] dark:border-[#2A0C8F] dark:bg-[#1F0860]";
    case "dropped":
      return "text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-900 dark:bg-red-950";
    default:
      return "text-muted-foreground border-muted bg-muted/50";
  }
}

function getAttendanceStatusBadge(status: string) {
  switch (status) {
    case "present":
      return (
        <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900 dark:bg-emerald-950 text-[10px]">
          Present
        </Badge>
      );
    case "absent":
      return (
        <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-900 dark:bg-red-950 text-[10px]">
          Absent
        </Badge>
      );
    case "late":
      return (
        <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-900 dark:bg-amber-950 text-[10px]">
          Late
        </Badge>
      );
    case "excused":
      return (
        <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-900 dark:bg-blue-950 text-[10px]">
          Excused
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  }
}

function getRateColor(rate: number) {
  if (rate >= 80) return "bg-[#4B0A8F] dark:bg-[#8A40B0]";
  if (rate >= 50) return "bg-amber-500 dark:bg-amber-400";
  return "bg-red-500 dark:bg-red-400";
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="mt-6 space-y-6 px-1">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
      <Separator />
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-2 w-full rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Tabs skeleton */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-9 w-64" />
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Edit Profile Dialog ─────────────────────────────────────────────────

function EditProfileDialog({
  open,
  onOpenChange,
  participantId,
  currentName,
  currentPhone,
  currentAddress,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantId: string;
  currentName: string;
  currentPhone: string | null;
  currentAddress: string | null;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(currentName);
  const [phone, setPhone] = useState(currentPhone || "");
  const [address, setAddress] = useState(currentAddress || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch(`/api/admin/students/${participantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e: any) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["participant-detail", participantId] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      if (err.error) {
        if (typeof err.error === "object") setErrors(err.error);
        else toast.error(err.error);
      } else {
        toast.error("Failed to update profile");
      }
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const data: Record<string, unknown> = {};
    if (name.trim() !== currentName) data.name = name.trim();
    if (phone.trim() !== (currentPhone || "")) data.phone = phone.trim() || null;
    if (address.trim() !== (currentAddress || "")) data.address = address.trim() || null;

    if (Object.keys(data).length === 0) {
      onOpenChange(false);
      return;
    }
    updateMutation.mutate(data);
  }

  // Reset form when opening
  function handleOpenChange(val: boolean) {
    if (val) {
      setName(currentName);
      setPhone(currentPhone || "");
      setAddress(currentAddress || "");
      setErrors({});
    }
    onOpenChange(val);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086080] flex items-center justify-center">
              <Pencil className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
            </div>
            Edit Profile
          </DialogTitle>
          <DialogDescription>
            Update participant contact information.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-part-name" className="text-xs font-medium">Full Name *</Label>
            <Input
              id="edit-part-name"
              placeholder="Participant name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {errors.name && (
              <p className="text-xs text-destructive">
                {Array.isArray(errors.name) ? errors.name[0] : errors.name}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-part-phone" className="text-xs font-medium">Phone</Label>
            <Input
              id="edit-part-phone"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">
                {Array.isArray(errors.phone) ? errors.phone[0] : errors.phone}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-part-address" className="text-xs font-medium">Address</Label>
            <Input
              id="edit-part-address"
              placeholder="Street address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#4B0A8F] hover:bg-[#4B0A8F]/90 text-white"
              disabled={updateMutation.isPending || !name.trim()}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

export function ParticipantDetailSheet({
  open,
  onOpenChange,
  participantId,
  participantName,
  onEdit,
}: ParticipantDetailSheetProps) {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, isError } = useQuery<DetailData>({
    queryKey: ["participant-detail", participantId],
    queryFn: () =>
      fetch(`/api/admin/students/${participantId}/detail`).then((r) => {
        if (!r.ok) throw new Error("Failed to load details");
        return r.json();
      }),
    enabled: open && !!participantId,
    staleTime: 30000,
  });

  const p = data?.participant;
  const att = data?.attendanceSummary;
  const fees = data?.feeSummary;

  function handleClose() {
    onOpenChange(false);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl p-0 overflow-y-auto">
          <SheetHeader className="px-6 pt-6 pb-0">
            <SheetTitle>Participant Details</SheetTitle>
            <SheetDescription>Comprehensive profile and activity</SheetDescription>
          </SheetHeader>

          {isLoading && <DetailSkeleton />}

          {isError && !isLoading && (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Failed to load participant details. Please try again.
              </p>
            </div>
          )}

          {data && p && att && fees && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="px-6 pb-8"
            >
              {/* ── Header Section ────────────────────────────────────── */}
              <div className="mt-6 flex items-start gap-4">
                <Avatar className="size-16 shrink-0 border-2 border-[#D4B8E3] dark:border-[#2A0C8F]">
                  <AvatarFallback className="bg-gradient-to-br from-[#4B0A8F] to-[#A0006B] text-white text-lg font-bold">
                    {getInitials(p.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold leading-tight truncate">{p.name}</h3>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {p.phone && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="size-3" />
                        {p.phone}
                      </span>
                    )}
                    {p.user && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="size-3" />
                        {p.user.email}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={getStatusVariant(p.state)}>
                      {p.state}
                    </Badge>
                    {p.gender && (
                      <span className="text-xs text-muted-foreground capitalize">{p.gender}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOpen(true)}
                  className="shrink-0 border-[#D4B8E3] text-[#4B0A8F] hover:bg-[#F3ECF6] dark:border-[#2A0C8F] dark:text-[#8A40B0] dark:hover:bg-[#1F086080]"
                >
                  <Pencil className="size-3.5 mr-1.5" />
                  Edit
                </Button>
              </div>

              <Separator className="my-6" />

              {/* ── Personal Information Section ───────────────────────── */}
              <div className="space-y-3 mb-6">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <UserCog className="size-3.5" />
                  Personal Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {p.dateOfBirth && (
                    <div>
                      <p className="text-xs text-muted-foreground">Date of Birth</p>
                      <p className="font-medium">{formatPKT(new Date(p.dateOfBirth))}</p>
                    </div>
                  )}
                  {p.dateOfBirth && (
                    <div>
                      <p className="text-xs text-muted-foreground">Age</p>
                      <p className="font-medium">{calcAge(p.dateOfBirth)} years</p>
                    </div>
                  )}
                  {p.address && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="font-medium">{p.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Info Cards Grid ───────────────────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Organization Card */}
                <Card>
                  <CardHeader className="pb-2 px-4 pt-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="size-3.5" />
                      Organization
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-0.5 flex-wrap text-xs">
                      <span className="font-medium text-foreground">{p.group.name}</span>
                      <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{p.group.batch.name}</span>
                      <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{p.group.batch.park.name}</span>
                      <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{p.group.batch.park.city.name}</span>
                    </div>
                    {/* Join date */}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="size-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Joined:</span>
                      <span className="font-medium">{formatPKT(new Date(p.joinedAt))}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Attendance Summary Card */}
                <Card>
                  <CardHeader className="pb-2 px-4 pt-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="size-3.5" />
                      Attendance Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    {/* Rate highlight */}
                    <div className="flex items-center gap-3">
                      <div className={`text-3xl font-bold ${att.rate >= 80 ? "text-emerald-600 dark:text-emerald-400" : att.rate >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                        {att.rate}%
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Attendance rate</p>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden mt-1">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(att.rate, 100)}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className={`h-full rounded-full ${getRateColor(att.rate)}`}
                          />
                        </div>
                      </div>
                    </div>
                    {/* Summary counts */}
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-1 py-1.5">
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{att.present}</p>
                        <p className="text-[9px] text-muted-foreground">Present</p>
                      </div>
                      <div className="rounded-lg bg-red-50 dark:bg-red-950/30 px-1 py-1.5">
                        <p className="text-sm font-bold text-red-600 dark:text-red-400">{att.absent}</p>
                        <p className="text-[9px] text-muted-foreground">Absent</p>
                      </div>
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 px-1 py-1.5">
                        <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{att.late}</p>
                        <p className="text-[9px] text-muted-foreground">Late</p>
                      </div>
                      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 px-1 py-1.5">
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{att.excused}</p>
                        <p className="text-[9px] text-muted-foreground">Excused</p>
                      </div>
                    </div>
                    {/* Mini sparkline */}
                    {data.recentAttendance.length > 0 && (
                      <div className="flex items-end gap-[3px] h-8">
                        {data.recentAttendance.slice(0, 14).map((rec, idx) => (
                          <div
                            key={idx}
                            className={`flex-1 rounded-sm min-h-[4px] transition-all ${
                              rec.status === "present"
                                ? "bg-emerald-500 dark:bg-emerald-400 h-full"
                                : rec.status === "late"
                                ? "bg-amber-500 dark:bg-amber-400 h-[60%]"
                                : rec.status === "excused"
                                ? "bg-blue-400 dark:bg-blue-300 h-[40%]"
                                : "bg-red-400 dark:bg-red-300 h-[30%]"
                            }`}
                            title={`${formatPKT(new Date(rec.eventDate), "dd MMM")} - ${rec.status}`}
                          />
                        ))}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground">
                      {att.totalEvents} total event{att.totalEvents !== 1 ? "s" : ""} recorded
                    </div>
                  </CardContent>
                </Card>

                {/* Guardians Card */}
                <Card>
                  <CardHeader className="pb-2 px-4 pt-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="size-3.5" />
                      Guardians
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {p.guardianLinks.length > 0 ? (
                      <div className="space-y-2.5">
                        {p.guardianLinks.map((gl) => (
                          <div
                            key={gl.guardian.id}
                            className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                          >
                            <div className="rounded-full bg-[#F3ECF6] dark:bg-[#1F086080] flex items-center justify-center size-8 text-[10px] font-semibold text-[#4B0A8F] dark:text-[#8A40B0] shrink-0">
                              {getInitials(gl.guardian.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{gl.guardian.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {gl.guardian.phone}
                                {gl.relation && <span className="ml-1.5">· {gl.relation}</span>}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No guardians linked.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Fee Status Card */}
                <Card>
                  <CardHeader className="pb-2 px-4 pt-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="size-3.5" />
                        Fee Status
                      </span>
                      <Button
                        variant="link"
                        className="text-[#4B0A8F] dark:text-[#8A40B0] h-auto p-0 text-[10px]"
                        onClick={() => {
                          handleClose();
                          navigateTo("admin-fees");
                        }}
                      >
                        View All Fees
                        <ExternalLink className="size-2.5 ml-1" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    {/* Total / Paid / Remaining */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-muted/50 p-2">
                        <p className="text-sm font-bold">
                          {fees.totalExpected > 0 ? `Rs ${fees.totalExpected.toLocaleString()}` : "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Total Fees</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2">
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          Rs {fees.totalPaid.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Paid</p>
                      </div>
                      <div className={`rounded-lg p-2 ${fees.outstanding > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-muted/50"}`}>
                        <p className={`text-sm font-bold ${fees.outstanding > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                          Rs {fees.outstanding.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Remaining</p>
                      </div>
                    </div>
                    {/* Collection progress */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Collection Progress</span>
                        <span className="font-semibold">
                          {fees.totalExpected > 0
                            ? Math.round((fees.totalPaid / fees.totalExpected) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${fees.totalExpected > 0 ? Math.min((fees.totalPaid / fees.totalExpected) * 100, 100) : 0}%`,
                          }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-[#4B0A8F] to-[#A0006B]"
                        />
                      </div>
                    </div>
                    {/* Recent payments */}
                    {data.recentPayments.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          Recent Payments
                        </p>
                        {data.recentPayments.map((pay, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{pay.feeEventTitle}</p>
                              <p className="text-muted-foreground">
                                {formatPKT(new Date(pay.date))}
                                {pay.receiptNo && <span className="ml-1.5">#{pay.receiptNo}</span>}
                              </p>
                            </div>
                            <span className="font-semibold shrink-0 ml-2">
                              Rs {pay.amount.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {fees.totalFees === 0 && (
                      <p className="text-xs text-muted-foreground">No fee events configured.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Separator className="my-6" />

              {/* Quick Actions */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="size-3.5" />
                  Quick Actions
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    className="h-9 text-xs justify-center border-[#D4B8E3] text-[#4B0A8F] hover:bg-[#F3ECF6] dark:border-[#2A0C8F] dark:text-[#8A40B0] dark:hover:bg-[#1F086080]"
                    onClick={() => {
                      handleClose();
                      navigateTo("admin-attendance-events");
                    }}
                  >
                    <CheckCircle2 className="size-3.5 mr-1.5" />
                    View Attendance
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 text-xs justify-center border-[#D4B8E3] text-[#4B0A8F] hover:bg-[#F3ECF6] dark:border-[#2A0C8F] dark:text-[#8A40B0] dark:hover:bg-[#1F086080]"
                    onClick={() => {
                      handleClose();
                      navigateTo("admin-fees");
                    }}
                  >
                    <CreditCard className="size-3.5 mr-1.5" />
                    View Fees
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 text-xs justify-center border-[#D4B8E3] text-[#4B0A8F] hover:bg-[#F3ECF6] dark:border-[#2A0C8F] dark:text-[#8A40B0] dark:hover:bg-[#1F086080]"
                    onClick={() => setEditOpen(true)}
                  >
                    <UserCog className="size-3.5 mr-1.5" />
                    Edit Profile
                  </Button>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Recent Activity Tabs */}
              <Card>
                <CardContent className="p-4">
                  <Tabs defaultValue="attendance">
                    <TabsList className="mb-4">
                      <TabsTrigger value="attendance" className="text-xs gap-1.5">
                        <CheckCircle2 className="size-3.5" />
                        Attendance
                      </TabsTrigger>
                      <TabsTrigger value="payments" className="text-xs gap-1.5">
                        <DollarSign className="size-3.5" />
                        Payments
                      </TabsTrigger>
                    </TabsList>

                    {/* Attendance Tab */}
                    <TabsContent value="attendance" className="mt-0">
                      {data.recentAttendance.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto rounded-lg border">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="text-[10px] h-8">Date</TableHead>
                                <TableHead className="text-[10px] h-8">Event</TableHead>
                                <TableHead className="text-[10px] h-8">Status</TableHead>
                                <TableHead className="text-[10px] h-8 text-right">Marked By</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {data.recentAttendance.map((rec, idx) => (
                                <TableRow key={idx} className="text-xs">
                                  <TableCell className="py-2 text-muted-foreground whitespace-nowrap">
                                    {formatPKT(new Date(rec.eventDate))}
                                  </TableCell>
                                  <TableCell className="py-2 font-medium truncate max-w-[140px]">
                                    {rec.title}
                                  </TableCell>
                                  <TableCell className="py-2">
                                    {getAttendanceStatusBadge(rec.status)}
                                  </TableCell>
                                  <TableCell className="py-2 text-right text-muted-foreground">
                                    {rec.markedByName}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="py-8 text-center">
                          <Clock className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No attendance records yet.</p>
                        </div>
                      )}
                    </TabsContent>

                    {/* Payments Tab */}
                    <TabsContent value="payments" className="mt-0">
                      {data.tabPayments && data.tabPayments.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto rounded-lg border">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="text-[10px] h-8">Date</TableHead>
                                <TableHead className="text-[10px] h-8">Fee Event</TableHead>
                                <TableHead className="text-[10px] h-8">Amount</TableHead>
                                <TableHead className="text-[10px] h-8">Method</TableHead>
                                <TableHead className="text-[10px] h-8 text-right">Recorded By</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {data.tabPayments.map((pay, idx) => (
                                <TableRow key={idx} className="text-xs">
                                  <TableCell className="py-2 text-muted-foreground whitespace-nowrap">
                                    {formatPKT(new Date(pay.date))}
                                  </TableCell>
                                  <TableCell className="py-2 font-medium truncate max-w-[100px]">
                                    {pay.feeEventTitle}
                                  </TableCell>
                                  <TableCell className="py-2 font-semibold whitespace-nowrap">
                                    Rs {pay.amount.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="py-2 capitalize text-muted-foreground">
                                    {pay.method}
                                  </TableCell>
                                  <TableCell className="py-2 text-right text-muted-foreground">
                                    {pay.recordedByName}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="py-8 text-center">
                          <DollarSign className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No payment records yet.</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Profile Dialog */}
      {p && (
        <EditProfileDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          participantId={p.id}
          currentName={p.name}
          currentPhone={p.phone}
          currentAddress={p.address}
        />
      )}
    </>
  );
}
