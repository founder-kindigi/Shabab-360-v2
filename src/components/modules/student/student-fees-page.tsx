"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/layout/empty-state";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  Receipt,
  CalendarDays,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
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

type Summary = {
  totalFees: number;
  totalPaid: number;
  totalRemaining: number;
  totalEvents: number;
  paidCount: number;
  unpaidCount: number;
  partialCount: number;
};

type FeesResponse = {
  participant: {
    id: string;
    name: string;
    group: string;
    batch: string;
    park: string;
    city: string | null;
  } | null;
  feeEvents: FeeEvent[];
  summary: Summary;
};

// ─── Animation Config ────────────────────────────────────────────────

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const listItem = {
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
      return <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />;
    case "unpaid":
      return <XCircle className="size-4 text-red-500 dark:text-red-400" />;
    case "partial":
      return <Clock className="size-4 text-amber-600 dark:text-amber-400" />;
    default:
      return <AlertTriangle className="size-4 text-muted-foreground" />;
  }
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─── Component ───────────────────────────────────────────────────────

export function StudentFeesPage() {
  const [expandedFee, setExpandedFee] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<FeesResponse>({
    queryKey: ["student-fees"],
    queryFn: () =>
      fetch("/api/student/fees").then((r) => {
        if (!r.ok) throw new Error("Failed to load fees");
        return r.json();
      }),
    staleTime: 30000,
  });

  const toggleExpand = (id: string) => {
    setExpandedFee((prev) => (prev === id ? null : id));
  };

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
            <Skeleton key={i} className="h-20 rounded-xl" />
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

  if (!data?.participant || !data.feeEvents.length) {
    return (
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="space-y-5"
      >
        <motion.div variants={fadeUp}>
          <h2 className="text-lg font-bold text-foreground">My Fees</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data?.participant
              ? `${data.participant.group} · ${data.participant.batch}`
              : "View your fee schedule and payment status"}
          </p>
        </motion.div>
        <EmptyState
          icon={DollarSign}
          title="No fees assigned"
          description="There are no fee events for your batch at this time."
        />
      </motion.div>
    );
  }

  const { summary, feeEvents, participant } = data;

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* ─── Header ───────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <h2 className="text-lg font-bold text-foreground">My Fees</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {participant.group} &middot; {participant.batch}
          {participant.city ? ` · ${participant.city}` : ""}
        </p>
      </motion.div>

      {/* ─── Summary Cards ────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Fees"
          value={`Rs ${formatAmount(summary.totalFees)}`}
          icon={DollarSign}
          color="text-[#4B0A8F] dark:text-[#8A40B0]"
          bg="bg-[#F3ECF6] dark:bg-[#1F086099]"
        />
        <StatCard
          label="Paid"
          value={`Rs ${formatAmount(summary.totalPaid)}`}
          icon={CheckCircle2}
          color="text-green-600 dark:text-green-400"
          bg="bg-green-50 dark:bg-green-950/40"
        />
        <StatCard
          label="Remaining"
          value={`Rs ${formatAmount(summary.totalRemaining)}`}
          icon={XCircle}
          color={summary.totalRemaining > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}
          bg={summary.totalRemaining > 0 ? "bg-red-50 dark:bg-red-950/40" : "bg-green-50 dark:bg-green-950/40"}
        />
        <StatCard
          label="Status"
          value={`${summary.paidCount}/${summary.totalEvents} Paid`}
          icon={Clock}
          color="text-[#A0006B] dark:text-[#D44A8B]"
          bg="bg-[#F5E8EF] dark:bg-[#A0006B20]"
        />
      </motion.div>

      {/* ─── Progress bar ────────────────────────────────────────── */}
      {summary.totalFees > 0 && (
        <motion.div variants={fadeUp}>
          <Card className="border-border overflow-hidden">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Payment Progress</span>
                <span className="font-bold text-[#4B0A8F] dark:text-[#8A40B0]">
                  {summary.totalFees > 0
                    ? Math.round((summary.totalPaid / summary.totalFees) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${summary.totalFees > 0 ? (summary.totalPaid / summary.totalFees) * 100 : 0}%`,
                  }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                  className="h-full rounded-full bg-gradient-to-r from-[#4B0A8F] to-[#A0006B]"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Fee Events List ─────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Fee Details</h3>
          <Badge variant="outline" className="text-[10px] font-normal">
            {feeEvents.length} fee{feeEvents.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        <Card className="border-border overflow-hidden">
          <CardContent className="p-0">
            {/* Table header - desktop */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_100px_100px_100px_80px_40px] gap-3 px-4 py-2.5 bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              <span>Fee</span>
              <span>Amount</span>
              <span>Paid</span>
              <span>Due Date</span>
              <span className="text-right">Status</span>
              <span />
            </div>

            <div className="max-h-[500px] overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {feeEvents.map((fee, i) => (
                  <motion.div
                    key={fee.id}
                    custom={i}
                    variants={listItem}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, x: -8 }}
                    className="border-b border-border/50 last:border-0"
                  >
                    {/* Fee row */}
                    <button
                      onClick={() => toggleExpand(fee.id)}
                      className={cn(
                        "w-full grid sm:grid-cols-[1fr_100px_100px_100px_80px_40px] gap-1 sm:gap-3 px-4 py-3 items-center text-left transition-colors hover:bg-muted/30",
                        i % 2 === 0 ? "bg-background" : "bg-muted/20"
                      )}
                    >
                      {/* Fee name */}
                      <div className="min-w-0 col-span-2 sm:col-span-1">
                        <div className="flex items-center gap-2">
                          {statusIcon(fee.status)}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{fee.title}</p>
                            <p className="text-[10px] text-muted-foreground sm:hidden">
                              Due: {fee.dueDate || "N/A"} · {fee.status}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Amount (desktop) */}
                      <p className="text-xs font-medium hidden sm:block">
                        Rs {formatAmount(fee.amount)}
                      </p>

                      {/* Paid (desktop) */}
                      <p className="text-xs font-medium text-green-600 dark:text-green-400 hidden sm:block">
                        Rs {formatAmount(fee.totalPaid)}
                      </p>

                      {/* Due date (desktop) */}
                      <p className="text-xs text-muted-foreground hidden sm:block">
                        {fee.dueDate || "—"}
                      </p>

                      {/* Status badge */}
                      <div className="sm:text-right hidden sm:block">
                        <Badge className={cn("text-[10px] font-bold px-2 py-0.5 capitalize", statusBadge(fee.status))}>
                          {fee.status}
                        </Badge>
                      </div>

                      {/* Expand icon */}
                      <div className="flex items-center justify-center">
                        {fee.payments.length > 0 && (
                          expandedFee === fee.id
                            ? <ChevronUp className="size-4 text-muted-foreground" />
                            : <ChevronDown className="size-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Expanded: Payment history */}
                    <AnimatePresence>
                      {expandedFee === fee.id && fee.payments.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 pl-10 sm:pl-16 space-y-2">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                              Payment History ({fee.paymentCount})
                            </p>
                            {fee.payments.map((payment) => (
                              <div
                                key={payment.id}
                                className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs py-1.5 px-3 rounded-lg bg-muted/50"
                              >
                                <span className="font-medium text-foreground">
                                  Rs {formatAmount(payment.amount)}
                                </span>
                                <Badge variant="outline" className="text-[10px] h-5">
                                  {payment.method}
                                </Badge>
                                {payment.receiptNo && (
                                  <span className="text-muted-foreground">
                                    Receipt: {payment.receiptNo}
                                  </span>
                                )}
                                <span className="text-muted-foreground ml-auto">
                                  {payment.createdAt}
                                </span>
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
          </CardContent>
        </Card>
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