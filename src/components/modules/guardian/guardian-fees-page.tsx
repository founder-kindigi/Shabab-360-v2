"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/empty-state";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Users,
  GraduationCap,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

type FeeEvent = {
  id: string;
  title: string;
  feeType: string;
  amount: number;
  dueDate: string | null;
  status: "paid" | "unpaid" | "partial";
  totalPaid: number;
  remaining: number;
  paymentCount: number;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    receiptNo: string | null;
    notes: string | null;
    createdAt: string;
  }>;
};

type ChildSummary = {
  totalFees: number;
  totalPaid: number;
  totalRemaining: number;
  totalEvents: number;
  paidCount: number;
  unpaidCount: number;
  partialCount: number;
};

type GuardianChild = {
  id: string;
  name: string;
  groupName: string | null;
  batchName: string | null;
  parkName: string | null;
  cityName: string | null;
  feeEvents: FeeEvent[];
  summary: ChildSummary;
};

type FeesResponse = {
  guardian: { name: string; phone: string } | null;
  children: GuardianChild[];
  overallSummary: ChildSummary;
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

const listItem: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.03, duration: 0.3 },
  }),
};

// ─── Helpers ─────────────────────────────────────────────────────────

function statusBadge(status: string) {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-700 border-0 dark:bg-green-900/30 dark:text-green-400";
    case "unpaid":
      return "bg-red-100 text-red-700 border-0 dark:bg-red-900/30 dark:text-red-400";
    case "partial":
      return "bg-amber-100 text-amber-700 border-0 dark:bg-amber-900/30 dark:text-amber-400";
    default:
      return "bg-muted text-muted-foreground border-0";
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "paid":
      return <CheckCircle2 className="size-3.5 text-green-600 dark:text-green-400" />;
    case "unpaid":
      return <XCircle className="size-3.5 text-red-500 dark:text-red-400" />;
    case "partial":
      return <Clock className="size-3.5 text-amber-600 dark:text-amber-400" />;
    default:
      return <AlertTriangle className="size-3.5 text-muted-foreground" />;
  }
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const avatarColors = [
  "bg-[#4B0A8F] text-white",
  "bg-[#A0006B] text-white",
  "bg-[#2A0C8F] text-white",
  "bg-amber-600 text-white",
  "bg-rose-600 text-white",
];

// ─── Component ───────────────────────────────────────────────────────

export function GuardianFeesPage() {
  const [expandedChild, setExpandedChild] = useState<string | null>(null);
  const [expandedFee, setExpandedFee] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<FeesResponse>({
    queryKey: ["guardian-fees"],
    queryFn: () =>
      fetch("/api/guardian/fees").then((r) => {
        if (!r.ok) throw new Error("Failed to load fees");
        return r.json();
      }),
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-800/50">
        <CardContent className="p-4 text-center">
          <AlertTriangle className="size-6 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Failed to load fee information
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data?.children?.length) {
    return (
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="space-y-5"
      >
        <motion.div variants={fadeUp}>
          <h2 className="text-lg font-bold text-foreground">Fees</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            View fee details for all your children
          </p>
        </motion.div>
        <EmptyState
          icon={DollarSign}
          title="No fees found"
          description="There are no fee events for your children at this time."
        />
      </motion.div>
    );
  }

  const { overallSummary, children } = data;

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* ─── Header ───────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <h2 className="text-lg font-bold text-foreground">Fees</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Fee details for {children.length} child{children.length !== 1 ? "ren" : ""}
        </p>
      </motion.div>

      {/* ─── Overall Summary Cards ────────────────────────────────── */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Fees"
          value={`Rs ${formatAmount(overallSummary.totalFees)}`}
          icon={DollarSign}
          color="text-[#4B0A8F] dark:text-[#8A40B0]"
          bg="bg-[#F3ECF6] dark:bg-[#1F086099]"
        />
        <StatCard
          label="Paid"
          value={`Rs ${formatAmount(overallSummary.totalPaid)}`}
          icon={CheckCircle2}
          color="text-green-600 dark:text-green-400"
          bg="bg-green-50 dark:bg-green-950/40"
        />
        <StatCard
          label="Remaining"
          value={`Rs ${formatAmount(overallSummary.totalRemaining)}`}
          icon={XCircle}
          color={overallSummary.totalRemaining > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}
          bg={overallSummary.totalRemaining > 0 ? "bg-red-50 dark:bg-red-950/40" : "bg-green-50 dark:bg-green-950/40"}
        />
        <StatCard
          label="Children"
          value={String(children.length)}
          icon={Users}
          color="text-[#A0006B] dark:text-[#D44A8B]"
          bg="bg-[#F5E8EF] dark:bg-[#A0006B20]"
        />
      </motion.div>

      {/* ─── Progress bar ────────────────────────────────────────── */}
      {overallSummary.totalFees > 0 && (
        <motion.div variants={fadeUp}>
          <Card className="border-border overflow-hidden">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Overall Payment Progress</span>
                <span className="font-bold text-[#4B0A8F] dark:text-[#8A40B0]">
                  {Math.round((overallSummary.totalPaid / overallSummary.totalFees) * 100)}%
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(overallSummary.totalPaid / overallSummary.totalFees) * 100}%`,
                  }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                  className="h-full rounded-full bg-gradient-to-r from-[#4B0A8F] to-[#A0006B]"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Children Fee Groups ─────────────────────────────────── */}
      <motion.div variants={fadeUp} className="space-y-4">
        {children.map((child, childIdx) => {
          const isChildExpanded = expandedChild === child.id;
          const childInitials = child.name
            .split(" ")
            .map((w) => w.charAt(0))
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <Card key={child.id} className="border-border overflow-hidden">
              <CardContent className="p-0">
                {/* Child header */}
                <button
                  onClick={() => setExpandedChild(isChildExpanded ? null : child.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
                >
                  <div
                    className={cn(
                      "flex items-center justify-center size-10 rounded-full text-sm font-bold shrink-0",
                      avatarColors[childIdx % avatarColors.length]
                    )}
                  >
                    {childInitials}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">{child.name}</p>
                      <div className="flex items-center gap-1.5">
                        <Badge className="text-[9px] font-bold px-1.5 py-0 bg-green-100 text-green-700 border-0 dark:bg-green-900/30 dark:text-green-400">
                          {child.summary.paidCount} paid
                        </Badge>
                        {child.summary.unpaidCount > 0 && (
                          <Badge className="text-[9px] font-bold px-1.5 py-0 bg-red-100 text-red-700 border-0 dark:bg-red-900/30 dark:text-red-400">
                            {child.summary.unpaidCount} unpaid
                          </Badge>
                        )}
                        {child.summary.partialCount > 0 && (
                          <Badge className="text-[9px] font-bold px-1.5 py-0 bg-amber-100 text-amber-700 border-0 dark:bg-amber-900/30 dark:text-amber-400">
                            {child.summary.partialCount} partial
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {child.groupName || "No group"}
                      {child.batchName ? ` · ${child.batchName}` : ""}
                      {child.parkName ? ` · ${child.parkName}` : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                      Paid: Rs {formatAmount(child.summary.totalPaid)} of Rs {formatAmount(child.summary.totalFees)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {isChildExpanded ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded: Fee events for this child */}
                <AnimatePresence>
                  {isChildExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border/50">
                        {/* Mini summary bar */}
                        <div className="px-4 py-2 bg-muted/30">
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#4B0A8F] to-[#A0006B]"
                              style={{
                                width: `${child.summary.totalFees > 0 ? (child.summary.totalPaid / child.summary.totalFees) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>

                        {child.feeEvents.length === 0 ? (
                          <div className="px-4 py-6 text-center">
                            <DollarSign className="size-5 text-muted-foreground/40 mx-auto mb-1" />
                            <p className="text-xs text-muted-foreground">No fees for this child</p>
                          </div>
                        ) : (
                          <div>
                            {/* Desktop header */}
                            <div className="hidden sm:grid sm:grid-cols-[1fr_90px_90px_90px_80px_40px] gap-3 px-4 py-2 bg-muted/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                              <span>Fee</span>
                              <span>Amount</span>
                              <span>Paid</span>
                              <span>Due Date</span>
                              <span className="text-right">Status</span>
                              <span />
                            </div>

                            <AnimatePresence mode="popLayout">
                              {child.feeEvents.map((fee, i) => (
                                <motion.div
                                  key={fee.id}
                                  custom={i}
                                  variants={listItem}
                                  initial="hidden"
                                  animate="visible"
                                  exit={{ opacity: 0, x: -8 }}
                                  className="border-t border-border/30 last:border-0"
                                >
                                  <button
                                    onClick={() => setExpandedFee(expandedFee === fee.id ? null : fee.id)}
                                    className={cn(
                                      "w-full grid sm:grid-cols-[1fr_90px_90px_90px_80px_40px] gap-1 sm:gap-3 px-4 py-2.5 items-center text-left hover:bg-muted/20 transition-colors",
                                      i % 2 === 0 ? "bg-background" : "bg-muted/10"
                                    )}
                                  >
                                    {/* Fee name */}
                                    <div className="min-w-0 col-span-2 sm:col-span-1">
                                      <div className="flex items-center gap-2">
                                        {statusIcon(fee.status)}
                                        <p className="text-xs font-medium truncate">{fee.title}</p>
                                      </div>
                                      <p className="text-[10px] text-muted-foreground sm:hidden ml-5">
                                        Rs {formatAmount(fee.totalPaid)} / Rs {formatAmount(fee.amount)} · {fee.status}
                                      </p>
                                    </div>

                                    <p className="text-xs font-medium hidden sm:block">Rs {formatAmount(fee.amount)}</p>
                                    <p className="text-xs font-medium text-green-600 dark:text-green-400 hidden sm:block">Rs {formatAmount(fee.totalPaid)}</p>
                                    <p className="text-[11px] text-muted-foreground hidden sm:block">{fee.dueDate || "—"}</p>
                                    <div className="hidden sm:flex justify-end">
                                      <Badge className={cn("text-[9px] font-bold px-1.5 py-0 capitalize", statusBadge(fee.status))}>
                                        {fee.status}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center justify-center">
                                      {fee.payments.length > 0 && (
                                        expandedFee === fee.id
                                          ? <ChevronUp className="size-3.5 text-muted-foreground" />
                                          : <ChevronDown className="size-3.5 text-muted-foreground" />
                                      )}
                                    </div>
                                  </button>

                                  {/* Expanded payment history */}
                                  <AnimatePresence>
                                    {expandedFee === fee.id && fee.payments.length > 0 && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="px-4 pb-2.5 pl-9 sm:pl-16 space-y-1.5">
                                          {fee.payments.map((payment) => (
                                            <div
                                              key={payment.id}
                                              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] py-1 px-2.5 rounded-md bg-muted/40"
                                            >
                                              <span className="font-medium text-foreground">Rs {formatAmount(payment.amount)}</span>
                                              <Badge variant="outline" className="text-[9px] h-4 px-1.5">{payment.method}</Badge>
                                              {payment.receiptNo && (
                                                <span className="text-muted-foreground">Receipt: {payment.receiptNo}</span>
                                              )}
                                              <span className="text-muted-foreground ml-auto">{payment.createdAt}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

// ─── Stat Card Sub-component ────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: string;
  icon: typeof DollarSign;
  color: string;
  bg: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <div className={cn("flex items-center justify-center size-7 rounded-lg mb-2", bg)}>
          <Icon className={cn("size-3.5", color)} />
        </div>
        <p className={cn("text-base font-bold leading-tight", color)}>{value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
      </CardContent>
    </Card>
  );
}
