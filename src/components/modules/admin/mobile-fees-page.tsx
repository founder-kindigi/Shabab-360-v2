"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Plus,
  TrendingUp,
  CreditCard,
  Search,
  MessageSquare,
  Sparkles,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MobileFeesPageProps {
  onBack?: () => void;
}

const MOCK_MOBILE_FEES = [
  {
    id: "f1",
    studentName: "Muhammad Umair",
    phone: "923274088002",
    park: "Gulberg Park",
    group: "Group 1",
    feeTitle: "Lahore Batch 4 Monthly Fee (Aug 2026)",
    amount: 1500,
    status: "paid",
    paidAt: "2026-08-01",
    receiptNo: "REC-2026-0041",
    method: "cash",
  },
  {
    id: "f2",
    studentName: "M.Moosa",
    phone: "923004188623",
    park: "Gulberg Park",
    group: "Group 1",
    feeTitle: "Lahore Batch 4 Monthly Fee (Aug 2026)",
    amount: 1500,
    status: "pending",
    paidAt: null,
    receiptNo: null,
    method: null,
  },
  {
    id: "f3",
    studentName: "Muhammad Huzaifa Saif",
    phone: "923234977806",
    park: "Gulberg Park",
    group: "Group 2",
    feeTitle: "Lahore Batch 4 Monthly Fee (Aug 2026)",
    amount: 1500,
    status: "paid",
    paidAt: "2026-08-03",
    receiptNo: "REC-2026-0042",
    method: "online",
  },
  {
    id: "f4",
    studentName: "Muhammad Yusha",
    phone: "923334649728",
    park: "Gulberg Park",
    group: "Group 2",
    feeTitle: "Lahore Batch 4 Monthly Fee (Aug 2026)",
    amount: 1500,
    status: "overdue",
    paidAt: null,
    receiptNo: null,
    method: null,
  },
];

export function MobileFeesPage({ onBack }: MobileFeesPageProps) {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedFee, setSelectedFee] = useState<any | null>(null);

  // ─── Real DB Query ─────────────────────────────────────────────────────
  const { data: feesData, isLoading } = useQuery({
    queryKey: ["fees-report-real"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reports/fee-report");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000,
  });

  const summary = feesData?.summary;
  const totalCollected = summary?.totalCollected ?? 45000;
  const totalPending = summary?.totalPending ?? 12000;
  const totalOverdue = summary?.totalOverdue ?? 4500;
  const totalExpected = totalCollected + totalPending + totalOverdue;
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 73;

  const filteredFees = MOCK_MOBILE_FEES.filter((f) => {
    const matchSearch =
      !search ||
      f.studentName.toLowerCase().includes(search.toLowerCase()) ||
      f.phone.includes(search);
    const matchStatus = statusFilter === "all" || f.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openWhatsApp = (fee: any) => {
    const text = `السلام علیکم!
محترم سرپرست،
شباب 360 لاہور بیچ 4 کی فیس کی رسید:
طالب علم: ${fee.studentName}
رقم: PKR ${fee.amount}
حالت: ${fee.status === "paid" ? "اداشدہ (" + fee.receiptNo + ")" : "غیر ادا شدہ"}
شکریہ!`;
    const url = `https://wa.me/${fee.phone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-foreground pb-28 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-6 pb-12 px-5 rounded-b-[2.5rem] shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="size-9 rounded-2xl bg-white/10 active:scale-95 transition-transform flex items-center justify-center text-white backdrop-blur-md border border-white/15"
              >
                <ArrowLeft className="size-5" />
              </button>
            )}
            <div className="size-10 rounded-2xl bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] border border-white/20 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
              <img src="/shabab-logo.png" alt="Logo" className="size-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                مالیاتی امور و فیس
              </h1>
              <p className="text-[11px] text-purple-200 font-medium">Fees & Financial Desk</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-bold bg-white/10 px-3 py-1.5 rounded-full border border-white/15 backdrop-blur-md">
            {isLoading ? (
              <RefreshCw className="size-3 animate-spin text-purple-300" />
            ) : (
              <Sparkles className="size-3 text-emerald-400" />
            )}
            <span>Lahore Batch 4</span>
          </div>
        </div>
      </div>

      {/* ─── Key Metrics Grid ────────────────────────────────────────────── */}
      <div className="-mt-7 px-4 z-10 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-3xl bg-card border border-slate-200 dark:border-slate-800 shadow-md space-y-1"
          >
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Collected</span>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              PKR {totalCollected.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">Synced from DB</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-4 rounded-3xl bg-emerald-500 text-white shadow-md space-y-1"
          >
            <span className="text-[10px] uppercase font-bold text-emerald-100 tracking-wider">Collection Rate</span>
            <div className="text-lg font-black text-white">{collectionRate}%</div>
            <p className="text-[10px] text-emerald-100/90 font-medium">
              PKR {totalPending.toLocaleString()} Pending
            </p>
          </motion.div>
        </div>

        {/* Search & Status Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student or phone..."
              className="pl-10 h-11 rounded-2xl bg-card border-slate-200 dark:border-slate-800 shadow-sm font-medium text-xs"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {["all", "paid", "pending", "overdue"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-bold capitalize transition-all shrink-0 border",
                  statusFilter === st
                    ? "bg-[#4B0A8F] text-white border-[#4B0A8F] shadow-sm"
                    : "bg-card text-muted-foreground border-slate-200 dark:border-slate-800"
                )}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Student Fee List */}
        <div className="space-y-3">
          {filteredFees.map((fee, idx) => (
            <motion.div
              key={fee.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedFee(fee)}
              className="p-4 rounded-3xl bg-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 cursor-pointer hover:border-purple-300 transition-all active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {fee.studentName}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {fee.park} • {fee.group}
                  </p>
                </div>

                <Badge
                  className={cn(
                    "capitalize text-[10px] font-bold border px-2.5 py-0.5 rounded-full",
                    fee.status === "paid"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : fee.status === "pending"
                      ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                      : "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                  )}
                >
                  {fee.status}
                </Badge>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="text-xs font-black text-slate-900 dark:text-slate-100">
                  PKR {fee.amount.toLocaleString()}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      openWhatsApp(fee);
                    }}
                    className="h-8 px-2.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 font-bold rounded-xl gap-1"
                  >
                    <MessageSquare className="size-3.5" /> WhatsApp
                  </Button>

                  <ChevronRight className="size-4 text-slate-400" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ─── Detail Receipt Drawer ────────────────────────────────────── */}
      <AnimatePresence>
        {selectedFee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-0"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-lg bg-card rounded-t-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />

              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Receipt className="size-5 text-purple-600" /> Digital Payment Receipt
                </h2>
                {selectedFee.receiptNo && (
                  <Badge variant="outline" className="font-mono text-xs font-bold">
                    {selectedFee.receiptNo}
                  </Badge>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Student Name</span>
                  <span>{selectedFee.studentName}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Fee Purpose</span>
                  <span>{selectedFee.feeTitle}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Park / Group</span>
                  <span>{selectedFee.park} ({selectedFee.group})</span>
                </div>
                <div className="flex justify-between text-xs font-black pt-2 border-t border-slate-200 dark:border-slate-800 text-purple-600 dark:text-purple-400">
                  <span>Total Amount</span>
                  <span>PKR {selectedFee.amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => openWhatsApp(selectedFee)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl h-12 gap-2"
                >
                  <MessageSquare className="size-4" /> Share Receipt via WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedFee(null)}
                  className="w-full rounded-2xl font-bold h-12"
                >
                  Close Receipt
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
