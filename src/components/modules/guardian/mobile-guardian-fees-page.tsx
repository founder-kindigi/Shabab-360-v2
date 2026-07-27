"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/stores/useAppStore";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DollarSign, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, ChevronLeft } from "lucide-react";

type FeeEvent = { id: string; title: string; feeType: string; amount: number; dueDate: string | null; status: "paid" | "unpaid" | "partial"; totalPaid: number; remaining: number; paymentCount: number; payments: any[]; };
type ChildSummary = { totalFees: number; totalPaid: number; totalRemaining: number; totalEvents: number; paidCount: number; unpaidCount: number; partialCount: number; };
type GuardianChild = { id: string; name: string; groupName: string | null; batchName: string | null; parkName: string | null; cityName: string | null; feeEvents: FeeEvent[]; summary: ChildSummary; };
type FeesResponse = { guardian: any; children: GuardianChild[]; overallSummary: ChildSummary; };

const stagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } };
const fadeUp: Variants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const avatarColors = ["bg-[#4B0A8F] text-white", "bg-[#A0006B] text-white", "bg-emerald-600 text-white", "bg-amber-600 text-white"];

function formatAmount(amount: number) { return amount.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function statusBadge(status: string) { return status === "paid" ? "bg-emerald-100 text-emerald-700" : status === "unpaid" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"; }

export function MobileGuardianFeesPage() {
  const { navigateTo } = useAppStore();
  const [expandedFee, setExpandedFee] = useState<string | null>(null);

  const { data, isLoading } = useQuery<FeesResponse>({
    queryKey: ["guardian-fees"],
    queryFn: () => fetch("/api/guardian/fees").then(r => r.json()),
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 px-4 pt-4 pb-24 bg-background min-h-screen">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (!data) return null;
  const { overallSummary, children } = data;

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-background">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3 min-h-[60px] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0 h-11 w-11 rounded-xl" onClick={() => navigateTo("guardian-dashboard")}>
            <ChevronLeft className="size-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate">Fees Overview</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-6">
        <motion.div variants={fadeUp}>
          <Card className="rounded-2xl bg-[#4B0A8F] text-white border-0 shadow-lg overflow-hidden relative">
            <div className="absolute -top-12 -right-12 size-32 bg-white/10 rounded-full blur-xl" />
            <CardContent className="p-6">
              <p className="text-white/80 font-medium text-sm mb-1">Total Outstanding</p>
              <h2 className="text-3xl font-black">Rs {formatAmount(overallSummary.totalRemaining)}</h2>
              <div className="mt-4 flex items-center gap-4 text-xs font-semibold">
                <div className="flex flex-col">
                  <span className="text-white/60">Total Fees</span>
                  <span>Rs {formatAmount(overallSummary.totalFees)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-emerald-300">Paid</span>
                  <span className="text-emerald-100">Rs {formatAmount(overallSummary.totalPaid)}</span>
                </div>
              </div>
              <div className="mt-4 h-2 w-full bg-black/20 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${overallSummary.totalFees > 0 ? (overallSummary.totalPaid / overallSummary.totalFees) * 100 : 0}%` }} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
          {children.map((child, idx) => (
            <motion.div key={child.id} variants={fadeUp} className="space-y-3">
              <div className="flex items-center gap-3 px-2">
                <div className={cn("size-8 rounded-full flex items-center justify-center font-bold text-xs", avatarColors[idx % avatarColors.length])}>
                  {child.name.charAt(0)}
                </div>
                <h3 className="font-bold">{child.name}</h3>
              </div>
              
              {child.feeEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground px-2">No fees recorded.</p>
              ) : (
                <div className="space-y-3">
                  {child.feeEvents.map(fee => (
                    <Card key={fee.id} className="rounded-2xl bg-card border overflow-hidden">
                      <button onClick={() => setExpandedFee(expandedFee === fee.id ? null : fee.id)} className="w-full text-left p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{fee.title}</p>
                            <p className="text-[11px] text-muted-foreground font-medium mt-1">Due: {fee.dueDate || "N/A"}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">Rs {formatAmount(fee.amount)}</p>
                            <Badge className={cn("mt-1 text-[10px] font-bold border-0", statusBadge(fee.status))}>
                              {fee.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        {fee.status === "partial" && (
                          <div className="mt-3">
                            <div className="flex justify-between text-[10px] font-semibold mb-1">
                              <span className="text-emerald-600">Paid: Rs {formatAmount(fee.totalPaid)}</span>
                              <span className="text-red-600">Rem: Rs {formatAmount(fee.remaining)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(fee.totalPaid / fee.amount) * 100}%` }} />
                            </div>
                          </div>
                        )}
                        <div className="mt-3 flex items-center justify-center pt-2 border-t">
                          <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                            {expandedFee === fee.id ? "HIDE PAYMENTS" : "VIEW PAYMENTS"} 
                            {expandedFee === fee.id ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                          </span>
                        </div>
                      </button>
                      <AnimatePresence>
                        {expandedFee === fee.id && fee.payments.length > 0 && (
                          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden bg-muted/30">
                            <div className="p-4 space-y-2 border-t">
                              {fee.payments.map((p, i) => (
                                <div key={i} className="flex justify-between items-center text-xs font-medium bg-background p-2 rounded-xl border">
                                  <div>
                                    <p className="font-bold">Rs {formatAmount(p.amount)}</p>
                                    <p className="text-[10px] text-muted-foreground">{p.method} • {p.createdAt}</p>
                                  </div>
                                  {p.receiptNo && <Badge variant="outline" className="text-[9px]">#{p.receiptNo}</Badge>}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
        <div className="h-6" />
      </div>
    </div>
  );
}
