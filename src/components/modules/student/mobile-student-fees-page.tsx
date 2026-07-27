"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
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

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.03, duration: 0.3 },
  }),
};

// ─── Helpers ─────────────────────────────────────────────────────────

function statusColors(status: string) {
  switch (status) {
    case "paid":
      return { bg: "bg-emerald-100", text: "text-emerald-700", icon: CheckCircle2, iconColor: "text-emerald-500" };
    case "unpaid":
      return { bg: "bg-red-100", text: "text-red-700", icon: XCircle, iconColor: "text-red-500" };
    case "partial":
      return { bg: "bg-amber-100", text: "text-amber-700", icon: Clock, iconColor: "text-amber-500" };
    default:
      return { bg: "bg-muted", text: "text-muted-foreground", icon: AlertTriangle, iconColor: "text-muted-foreground" };
  }
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─── Component ───────────────────────────────────────────────────────

export function MobileStudentFeesPage() {
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
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 space-y-4">
        <Card className="rounded-2xl border-red-200 dark:border-red-800/50 bg-card">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="size-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Failed to load fee information
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { summary, feeEvents } = data;
  const pct = summary.totalFees > 0 ? Math.round((summary.totalPaid / summary.totalFees) * 100) : 0;

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border/50">
        <h1 className="text-lg font-bold">Fees & Payments</h1>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          
          {/* Summary Cards */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Paid</p>
                <p className="text-xl font-bold text-emerald-600">Rs {formatAmount(summary.totalPaid)}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Remaining Due</p>
                <p className={cn("text-xl font-bold", summary.totalRemaining > 0 ? "text-red-600" : "text-emerald-600")}>
                  Rs {formatAmount(summary.totalRemaining)}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Progress Card */}
          {summary.totalFees > 0 && (
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">Payment Progress</span>
                    <span className="font-bold text-[#4B0A8F]">{pct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-[#4B0A8F] transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* List */}
          {feeEvents.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground text-center">
              <DollarSign className="size-10 opacity-40" />
              <p className="text-sm font-medium">No fees assigned</p>
            </div>
          ) : (
            <AnimatePresence>
              <div className="space-y-3">
                {feeEvents.map((fee, i) => {
                  const colors = statusColors(fee.status);
                  const Icon = colors.icon;
                  const isExpanded = expandedFee === fee.id;
                  
                  return (
                    <motion.div key={fee.id} custom={i} variants={listItem} initial="hidden" animate="visible">
                      <Card className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                        <Button
                          variant="ghost"
                          onClick={() => toggleExpand(fee.id)}
                          className="w-full h-auto p-4 flex items-start justify-between rounded-none hover:bg-muted/50"
                        >
                          <div className="flex gap-3 text-left">
                            <div className={cn("mt-0.5 rounded-full p-1.5 shrink-0 h-8 w-8 flex items-center justify-center", colors.bg)}>
                              <Icon className={cn("size-4", colors.iconColor)} />
                            </div>
                            <div className="space-y-1">
                              <p className="font-semibold text-sm leading-tight">{fee.title}</p>
                              <p className="text-xs text-muted-foreground">Due: {fee.dueDate || "N/A"}</p>
                              <Badge className={cn("text-[10px] uppercase font-bold px-2 py-0 border-0 mt-1", colors.bg, colors.text)}>
                                {fee.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <p className="font-bold text-sm">Rs {formatAmount(fee.amount)}</p>
                            {fee.status !== "paid" && fee.remaining > 0 && (
                              <p className="text-xs text-red-600 font-medium">Bal: Rs {formatAmount(fee.remaining)}</p>
                            )}
                            {fee.payments.length > 0 && (
                              <div className="mt-2 text-muted-foreground">
                                {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                              </div>
                            )}
                          </div>
                        </Button>
                        
                        <AnimatePresence>
                          {isExpanded && fee.payments.length > 0 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden bg-muted/30 border-t"
                            >
                              <div className="p-4 space-y-3">
                                <p className="text-xs font-semibold uppercase text-muted-foreground">Payment History</p>
                                {fee.payments.map(p => (
                                  <div key={p.id} className="flex items-center justify-between bg-card border p-2.5 rounded-xl">
                                    <div>
                                      <p className="font-semibold text-sm">Rs {formatAmount(p.amount)}</p>
                                      <p className="text-[10px] text-muted-foreground">{p.createdAt}</p>
                                    </div>
                                    <div className="text-right">
                                      <Badge variant="outline" className="text-[10px]">{p.method}</Badge>
                                      {p.receiptNo && <p className="text-[10px] text-muted-foreground mt-0.5">Rec: {p.receiptNo}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          )}

          {/* Bottom spacer */}
          <div className="h-6" />
        </motion.div>
      </div>
    </div>
  );
}
