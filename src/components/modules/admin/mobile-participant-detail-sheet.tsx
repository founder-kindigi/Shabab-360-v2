"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPKT } from "@/lib/timezone";
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  ChevronRight,
  ShieldAlert,
  CreditCard,
  Building2,
  Activity,
  X,
  ExternalLink,
} from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";

// --- Types ---
interface ParticipantDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantId: string | null;
  participantName?: string;
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
  feeSummary: {
    totalFees: number;
    totalExpected: number;
    totalPaid: number;
    outstanding: number;
  };
  recentPayments: {
    feeEventTitle: string;
    amount: number;
    date: string;
  }[];
}

// --- Helpers ---
function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
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
      return "text-[#4B0A8F] border-[#D4B8E3] bg-[#F3ECF6]";
    case "dropped":
      return "text-red-600 border-red-200 bg-red-50";
    default:
      return "text-muted-foreground border-muted bg-muted/50";
  }
}

// --- Component ---
export function MobileParticipantDetailSheet({
  open,
  onOpenChange,
  participantId,
}: ParticipantDetailSheetProps) {
  const navigateTo = useAppStore((s) => s.navigateTo);

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[95vh] rounded-t-3xl p-0 flex flex-col bg-muted/30">
        <SheetHeader className="p-4 border-b bg-background sticky top-0 z-10 flex flex-row justify-between items-center text-left">
          <SheetTitle className="text-lg">Participant Details</SheetTitle>
          <Button variant="ghost" size="icon" className="rounded-full size-8" onClick={() => onOpenChange(false)}>
            <X className="size-5" />
          </Button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-background p-4 rounded-2xl">
                <Skeleton className="size-16 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          )}

          {isError && !isLoading && (
            <div className="py-12 text-center text-muted-foreground">
              Failed to load details.
            </div>
          )}

          {data && p && att && fees && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 pb-6"
            >
              {/* Header Profile Card */}
              <Card className="rounded-2xl border-none shadow-sm">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="size-16 rounded-full bg-gradient-to-br from-[#4B0A8F] to-[#A0006B] flex items-center justify-center text-white text-xl font-bold shrink-0">
                    {getInitials(p.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-lg truncate leading-tight">{p.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={cn("px-2 py-0 text-[10px]", getStatusVariant(p.state))}>
                        {p.state}
                      </Badge>
                      {p.gender && <span className="text-xs text-muted-foreground capitalize">{p.gender}</span>}
                    </div>
                    {p.phone && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                        <Phone className="size-3" /> {p.phone}
                      </p>
                    )}
                    {p.user && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                        <Mail className="size-3" /> {p.user.email}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Personal Info Card */}
              <Card className="rounded-2xl border-none shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                    <ShieldAlert className="size-3.5" /> Info & Organization
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {p.dateOfBirth && (
                      <div>
                        <p className="text-xs text-muted-foreground">Age</p>
                        <p className="font-medium">{calcAge(p.dateOfBirth)} years</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Joined</p>
                      <p className="font-medium">{formatPKT(new Date(p.joinedAt))}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Path</p>
                      <p className="text-xs font-medium mt-1 leading-snug">
                        {p.group.batch.park.city.name} › {p.group.batch.park.name} › {p.group.batch.name} › {p.group.name}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Card */}
              <Card className="rounded-2xl border-none shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Activity className="size-3.5" /> Attendance
                    </h4>
                    <span className={cn("text-lg font-bold", att.rate >= 80 ? "text-emerald-600" : att.rate >= 50 ? "text-amber-500" : "text-red-500")}>
                      {att.rate}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", att.rate >= 80 ? "bg-emerald-500" : att.rate >= 50 ? "bg-amber-500" : "bg-red-500")}
                      style={{ width: `${Math.min(att.rate, 100)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-emerald-50 text-emerald-700 rounded-lg py-2">
                      <p className="font-bold">{att.present}</p>
                      <p className="text-[9px]">Present</p>
                    </div>
                    <div className="bg-red-50 text-red-700 rounded-lg py-2">
                      <p className="font-bold">{att.absent}</p>
                      <p className="text-[9px]">Absent</p>
                    </div>
                    <div className="bg-amber-50 text-amber-700 rounded-lg py-2">
                      <p className="font-bold">{att.late}</p>
                      <p className="text-[9px]">Late</p>
                    </div>
                    <div className="bg-blue-50 text-blue-700 rounded-lg py-2">
                      <p className="font-bold">{att.excused}</p>
                      <p className="text-[9px]">Excused</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fee Card */}
              <Card className="rounded-2xl border-none shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <CreditCard className="size-3.5" /> Fees
                    </h4>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted/50 rounded-xl p-2">
                      <p className="font-bold text-sm">Rs {fees.totalExpected.toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground">Total</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-2">
                      <p className="font-bold text-sm text-emerald-600">Rs {fees.totalPaid.toLocaleString()}</p>
                      <p className="text-[9px] text-emerald-700">Paid</p>
                    </div>
                    <div className={cn("rounded-xl p-2", fees.outstanding > 0 ? "bg-red-50" : "bg-muted/50")}>
                      <p className={cn("font-bold text-sm", fees.outstanding > 0 ? "text-red-600" : "text-muted-foreground")}>
                        Rs {fees.outstanding.toLocaleString()}
                      </p>
                      <p className="text-[9px] text-muted-foreground">Remaining</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="h-6" />
            </motion.div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
