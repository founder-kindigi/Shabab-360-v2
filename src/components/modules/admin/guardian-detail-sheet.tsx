"use client";

import { useQuery } from "@tanstack/react-query";
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
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPKT } from "@/lib/timezone";
import {
  Phone,
  Mail,
  MapPin,
  Users,
  ChevronRight,
  Pencil,
  UserPlus,
  DollarSign,
  Clock,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  CreditCard,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────

interface GuardianDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guardianId: string | null;
  guardianName?: string;
  onEdit?: () => void;
  onLinkChild?: () => void;
  onChildClick?: (participantId: string, participantName: string) => void;
}

interface ChildEntry {
  participant: {
    id: string;
    name: string;
    phone: string | null;
    gender: string | null;
    state: string;
    joinedAt: string;
  };
  relation: string | null;
  group: {
    id: string;
    name: string;
    batch: {
      id: string;
      name: string;
      park: {
        id: string;
        name: string;
        city: { id: string; name: string };
      };
    };
  };
}

interface RecentPayment {
  childName: string;
  feeEventTitle: string;
  amount: number;
  method: string;
  receiptNo: string | null;
  date: string;
}

interface DetailData {
  guardian: {
    id: string;
    name: string;
    phone: string;
    cnic: string | null;
    address: string | null;
    isActive: boolean;
    user: { id: string; email: string; name: string | null } | null;
    children: ChildEntry[];
  };
  feeSummary: {
    totalChildren: number;
    totalExpected: number;
    totalPaid: number;
    outstanding: number;
    overdueFees: number;
  };
  recentPayments: RecentPayment[];
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
        {[1, 2, 3].map((i) => (
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
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

export function GuardianDetailSheet({
  open,
  onOpenChange,
  guardianId,
  guardianName,
  onEdit,
  onLinkChild,
  onChildClick,
}: GuardianDetailSheetProps) {
  const { data, isLoading, isError } = useQuery<DetailData>({
    queryKey: ["guardian-detail", guardianId],
    queryFn: () =>
      fetch(`/api/admin/guardians/${guardianId}/detail`).then((r) => {
        if (!r.ok) throw new Error("Failed to load details");
        return r.json();
      }),
    enabled: open && !!guardianId,
    staleTime: 30000,
  });

  const g = data?.guardian;
  const fees = data?.feeSummary;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 overflow-y-auto">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle>Guardian Details</SheetTitle>
          <SheetDescription>Profile, children, and fee overview</SheetDescription>
        </SheetHeader>

        {isLoading && <DetailSkeleton />}

        {isError && !isLoading && (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Failed to load guardian details. Please try again.
            </p>
          </div>
        )}

        {data && g && fees && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="px-6 pb-8"
          >
            {/* ── Header Section ────────────────────────────────────── */}
            <div className="mt-6 flex items-start gap-4">
              <Avatar className="size-16 shrink-0 border-2 border-emerald-300 dark:border-emerald-700">
                <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white text-lg font-bold">
                  {getInitials(g.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-bold leading-tight truncate">
                  {g.name}
                </h3>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {g.phone && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="size-3" />
                      {g.phone}
                    </span>
                  )}
                  {g.user && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="size-3" />
                      {g.user.email}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant="outline"
                    className={
                      g.isActive
                        ? "text-[#4B0A8F] border-[#D4B8E3] bg-[#F3ECF6] dark:text-[#8A40B0] dark:border-[#2A0C8F] dark:bg-[#1F0860]"
                        : "text-muted-foreground border-muted bg-muted/50"
                    }
                  >
                    {g.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  className="shrink-0 border-[#D4B8E3] text-[#4B0A8F] hover:bg-[#F3ECF6] dark:border-[#2A0C8F] dark:text-[#8A40B0] dark:hover:bg-[#1F086080]"
                >
                  <Pencil className="size-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>

            <Separator className="my-6" />

            {/* ── Info Cards Grid ───────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Children Card */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="size-3.5" />
                      Children
                      <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">
                        {fees.totalChildren}
                      </Badge>
                    </span>
                    {onLinkChild && (
                      <Button
                        variant="link"
                        onClick={onLinkChild}
                        className="text-[#4B0A8F] dark:text-[#8A40B0] h-auto p-0 text-[10px]"
                      >
                        <UserPlus className="size-3 mr-1" />
                        Link Child
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {g.children.length > 0 ? (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto">
                      {g.children.map((child) => (
                        <div
                          key={child.participant.id}
                          className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                        >
                          <div className="rounded-full bg-[#D4B8E3] dark:bg-[#1F086080] flex items-center justify-center size-9 text-[10px] font-semibold text-[#4B0A8F] dark:text-[#8A40B0] shrink-0">
                            {getInitials(child.participant.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {onChildClick ? (
                                <button
                                  onClick={() =>
                                    onChildClick(
                                      child.participant.id,
                                      child.participant.name
                                    )
                                  }
                                  className="text-sm font-medium truncate hover:text-[#4B0A8F] dark:hover:text-[#8A40B0] hover:underline transition-colors text-left"
                                >
                                  {child.participant.name}
                                </button>
                              ) : (
                                <p className="text-sm font-medium truncate">
                                  {child.participant.name}
                                </p>
                              )}
                              <Badge
                                variant="outline"
                                className={`text-[10px] shrink-0 ${getStatusVariant(child.participant.state)}`}
                              >
                                {child.participant.state}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-0.5 flex-wrap text-[10px] text-muted-foreground mt-0.5">
                              {child.relation && (
                                <span className="font-medium mr-1.5">
                                  {child.relation}
                                </span>
                              )}
                              <span>{child.group.name}</span>
                              <ChevronRight className="size-2.5 shrink-0" />
                              <span>{child.group.batch.name}</span>
                              <ChevronRight className="size-2.5 shrink-0" />
                              <span>{child.group.batch.park.name}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <Users className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No children linked yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Fees Card */}
              <Card>
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="size-3.5" />
                      Fees
                    </span>
                    {fees.overdueFees > 0 && (
                      <Badge
                        variant="outline"
                        className="text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-900 dark:bg-red-950 text-[10px]"
                      >
                        <AlertTriangle className="size-3 mr-1" />
                        {fees.overdueFees} overdue
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  {/* Fee summary numbers */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-sm font-bold">
                        Rs {fees.totalExpected.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Expected
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        Rs {fees.totalPaid.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Paid</p>
                    </div>
                    <div>
                      <p
                        className={`text-sm font-bold ${fees.outstanding > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}
                      >
                        Rs {fees.outstanding.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Outstanding
                      </p>
                    </div>
                  </div>

                  {/* Collection progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Collection</span>
                      <span className="font-semibold">
                        {fees.totalExpected > 0
                          ? Math.round(
                              (fees.totalPaid / fees.totalExpected) * 100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${fees.totalExpected > 0 ? Math.min((fees.totalPaid / fees.totalExpected) * 100, 100) : 0}%`,
                        }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full rounded-full bg-[#4B0A8F] dark:bg-[#8A40B0]"
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
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">
                              {pay.childName} — {pay.feeEventTitle}
                            </p>
                            <p className="text-muted-foreground">
                              {formatPKT(new Date(pay.date))}
                              {pay.receiptNo && (
                                <span className="ml-1.5">#{pay.receiptNo}</span>
                              )}
                            </p>
                          </div>
                          <span className="font-semibold shrink-0 ml-2">
                            Rs {pay.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {fees.totalExpected === 0 && fees.totalChildren > 0 && (
                    <p className="text-xs text-muted-foreground">
                      No fee events configured for children&apos;s batches.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Contact Card */}
              <Card>
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="size-3.5" />
                    Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  {/* Phone */}
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="size-3.5 text-muted-foreground shrink-0" />
                    <a
                      href={`tel:${g.phone}`}
                      className="text-[#4B0A8F] dark:text-[#8A40B0] hover:underline font-medium"
                    >
                      {g.phone}
                    </a>
                  </div>

                  {/* CNIC */}
                  {g.cnic && (
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-foreground font-mono text-xs">
                        {g.cnic}
                      </span>
                    </div>
                  )}

                  {/* Address */}
                  {g.address && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{g.address}</span>
                    </div>
                  )}

                  {/* Email */}
                  {g.user && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">
                        {g.user.email}
                      </span>
                    </div>
                  )}

                  {/* No extra info */}
                  {!g.cnic && !g.address && !g.user && (
                    <p className="text-xs text-muted-foreground">
                      No additional contact info.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </SheetContent>
    </Sheet>
  );
}