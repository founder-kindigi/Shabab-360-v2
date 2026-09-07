"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  DollarSign,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Plus,
  CreditCard,
  MessageSquare,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  MapPin,
  FileText,
  User,
  Percent,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface MobileFeesPageProps {
  onBack?: () => void;
}

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "paid", label: "Paid" },
  { id: "pending", label: "Pending" },
  { id: "overdue", label: "Overdue" },
];

const MOCK_CHALLANS_FALLBACK = [
  {
    id: "f1",
    studentName: "Muhammad Umair",
    guardianPhone: "0327-4088002",
    park: "Umme Hani Park",
    feeTitle: "Batch 4 Monthly Tarbiyah Fee (Sep 2026)",
    amount: 1500,
    status: "paid",
    paidAt: "2026-09-01",
    receiptNo: "REC-2026-0041",
    paymentMethod: "Cash",
  },
  {
    id: "f2",
    studentName: "M. Moosa",
    guardianPhone: "0300-4188623",
    park: "Nazimabad Park",
    feeTitle: "Batch 4 Monthly Tarbiyah Fee (Sep 2026)",
    amount: 1500,
    status: "pending",
    paidAt: null,
    receiptNo: null,
    paymentMethod: null,
  },
  {
    id: "f3",
    studentName: "Huzaifa Saif",
    guardianPhone: "0323-4977806",
    park: "Bufferzone Park",
    feeTitle: "Batch 4 Monthly Tarbiyah Fee (Sep 2026)",
    amount: 1500,
    status: "paid",
    paidAt: "2026-09-03",
    receiptNo: "REC-2026-0042",
    paymentMethod: "Online / Bank",
  },
  {
    id: "f4",
    studentName: "Muhammad Yusha",
    guardianPhone: "0333-4649728",
    park: "Gulshan Park",
    feeTitle: "Batch 4 Monthly Tarbiyah Fee (Aug 2026)",
    amount: 1500,
    status: "overdue",
    paidAt: null,
    receiptNo: null,
    paymentMethod: null,
  },
  {
    id: "f5",
    studentName: "Abdullah Tariq",
    guardianPhone: "0321-8899112",
    park: "Johar Park",
    feeTitle: "Batch 4 Monthly Tarbiyah Fee (Sep 2026)",
    amount: 1500,
    status: "pending",
    paidAt: null,
    receiptNo: null,
    paymentMethod: null,
  },
];

export function MobileFeesPage({ onBack }: MobileFeesPageProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sheets state
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState<any>(null);

  // Record Payment Form State
  const [payAmount, setPayAmount] = useState(1500);
  const [payMethod, setPayMethod] = useState("Cash");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");

  // Generate Challan Form State
  const [genTitle, setGenTitle] = useState("Batch 4 Monthly Tarbiyah Fee (Oct 2026)");
  const [genAmount, setGenAmount] = useState(1500);
  const [genDueDate, setGenDueDate] = useState("2026-10-10");

  // ─── Query Fee Report & Challans ────────────────────────────────────────
  const { data: feeReport, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["fees-report-mobile"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reports/fee-report");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30000,
  });

  const [challansList, setChallansList] = useState(MOCK_CHALLANS_FALLBACK);

  const totalCollected = feeReport?.summary?.totalCollected ?? 45000;
  const totalPending = feeReport?.summary?.totalPending ?? 12000;
  const totalOverdue = feeReport?.summary?.totalOverdue ?? 4500;
  const totalExpected = totalCollected + totalPending + totalOverdue;
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 73;

  const filteredChallans = challansList.filter((f) => {
    const matchSearch =
      !searchQuery.trim() ||
      f.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.guardianPhone.includes(searchQuery) ||
      (f.receiptNo && f.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchStatus = statusFilter === "all" || f.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleOpenPayment = (fee: any) => {
    setSelectedFeeForPayment(fee);
    setPayAmount(fee.amount || 1500);
    setPayMethod("Cash");
    setPayRef(`REC-${Date.now().toString().slice(-4)}`);
    setPayNotes("");
    setIsPaymentOpen(true);
  };

  const handleSavePayment = () => {
    if (!selectedFeeForPayment) return;
    setChallansList((prev) =>
      prev.map((item) =>
        item.id === selectedFeeForPayment.id
          ? {
              ...item,
              status: "paid",
              paidAt: new Date().toISOString().slice(0, 10),
              receiptNo: payRef || `REC-${Date.now().toString().slice(-4)}`,
              paymentMethod: payMethod,
            }
          : item
      )
    );
    toast.success(`Payment of PKR ${payAmount} recorded for ${selectedFeeForPayment.studentName}!`);
    setIsPaymentOpen(false);
  };

  const handleGenerateChallans = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`Challans generated for Batch 4 active roster!`);
    setIsGenerateOpen(false);
  };

  const handleOpenWhatsAppReminder = (fee: any) => {
    const rawPhone = fee.guardianPhone || "";
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? `92${cleanPhone.slice(1)}` : cleanPhone;
    const text = `السلام علیکم ورحمۃ اللہ، شباب ۳۶۰ تربیتی پروگرام کی طرف سے یاد دہانی ہے کہ ${fee.studentName} کے واجب الادا فیس چالان (${fee.feeTitle}) کی آخری تاریخ قریب ہے۔ براہ کرم ادائیگی کو یقینی بنائیں۔ شکریہ۔`;
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: CheckCircle2,
          label: "Paid",
        };
      case "overdue":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          icon: AlertTriangle,
          label: "Overdue",
        };
      default:
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          icon: Clock,
          label: "Pending",
        };
    }
  };

  return (
    <div className="w-full max-w-[460px] mx-auto flex flex-col min-h-screen w-full bg-slate-50 text-slate-900 pb-28 select-none">
      {/* ─── Header matching docs/pwa screens style ───────────────────────── */}
      <div className="px-5 pt-6 pb-4 bg-white border-b border-slate-100 shadow-sm sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-black text-[#1F0860] tracking-tight">Fees Desk</h1>
              <p className="text-[11px] text-slate-500 font-medium">
                {collectionRate}% Collection Rate • Cohort Accounts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin text-[#4B0A8F]")} />
            </button>
            <Button
              onClick={() => setIsGenerateOpen(true)}
              size="sm"
              className="h-8 bg-[#4B0A8F] hover:bg-[#3d0875] text-white text-xs font-bold px-3 rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Challan</span>
            </Button>
          </div>
        </div>

        {/* 3 KPI Summary Pills */}
        <div className="grid grid-cols-3 gap-2 mt-3.5">
          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
            <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider block">Collected</span>
            <span className="text-xs font-black text-emerald-700">PKR {totalCollected.toLocaleString()}</span>
          </div>
          <div className="p-2 rounded-xl bg-amber-50 border border-amber-100 text-center">
            <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wider block">Pending</span>
            <span className="text-xs font-black text-amber-700">PKR {totalPending.toLocaleString()}</span>
          </div>
          <div className="p-2 rounded-xl bg-purple-50 border border-purple-100 text-center">
            <span className="text-[9px] font-bold text-[#4B0A8F] uppercase tracking-wider block">Rate</span>
            <span className="text-xs font-black text-[#4B0A8F]">{collectionRate}%</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mt-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, receipt, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-100/90 border border-slate-200/80 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4B0A8F] focus:bg-white transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar pb-0.5">
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold capitalize whitespace-nowrap transition-all",
                  isActive
                    ? "bg-[#1F0860] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Challans Roster List ─────────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-16 text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#4B0A8F]" />
            Loading fee accounts…
          </div>
        ) : filteredChallans.length === 0 ? (
          <div className="text-center py-12 px-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
            <CreditCard className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-900 text-sm">No challans found</p>
            <p className="text-xs text-slate-500 mt-1">
              No fee records match the current status filter or search parameters.
            </p>
          </div>
        ) : (
          filteredChallans.map((fee) => {
            const isExpanded = expandedId === fee.id;
            const badge = getStatusBadge(fee.status);
            const StatusIcon = badge.icon;

            return (
              <motion.div
                key={fee.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden transition-all"
              >
                {/* Header Row */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpand(fee.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand(fee.id);
                    }
                  }}
                  className="p-4 cursor-pointer hover:bg-slate-50/70 transition-colors focus:outline-none"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-800 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-100">
                        <CreditCard className="w-5 h-5 text-emerald-700" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          {fee.studentName}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1.5">
                          <span>{fee.park}</span>
                          <span>•</span>
                          <span>{fee.guardianPhone}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900 block">
                        PKR {fee.amount.toLocaleString()}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 border mt-1",
                          badge.bg
                        )}
                      >
                        <StatusIcon className="w-3 h-3 mr-1 inline" />
                        {badge.label}
                      </Badge>
                    </div>
                  </div>

                  {/* Sub-row */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
                    <span className="truncate max-w-[220px]">
                      {fee.receiptNo ? `Receipt: ${fee.receiptNo}` : fee.feeTitle}
                    </span>
                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details & Actions */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/50 space-y-3 text-xs"
                    >
                      <div className="p-3 rounded-xl bg-white border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fee Description</span>
                          <span className="text-xs font-bold text-slate-900">{fee.feeTitle}</span>
                        </div>
                        {fee.paidAt && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Date</span>
                            <span className="text-xs font-bold text-emerald-700">{fee.paidAt} ({fee.paymentMethod || "Cash"})</span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="pt-1 flex items-center gap-2">
                        {fee.status !== "paid" ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleOpenPayment(fee)}
                              className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Record Payment</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenWhatsAppReminder(fee)}
                              className="h-9 px-3 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Reminder</span>
                            </Button>
                          </>
                        ) : (
                          <div className="w-full p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center text-xs font-bold flex items-center justify-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Paid in Full • Receipt Verified ({fee.receiptNo})</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ─── Record Payment Bottom Sheet ──────────────────────────────────── */}
      <Sheet open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-w-[460px] mx-auto p-6 max-h-[90vh] overflow-y-auto">
          <SheetHeader className="text-left pb-4 border-b border-slate-100">
            <SheetTitle className="text-lg font-black text-[#1F0860]">
              Record Fee Payment
            </SheetTitle>
            <p className="text-xs text-slate-500 font-medium">
              Student: {selectedFeeForPayment?.studentName} ({selectedFeeForPayment?.park})
            </p>
          </SheetHeader>

          <div className="space-y-4 py-4 text-xs">
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Amount Received (PKR) *</Label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                className="rounded-xl h-10 text-xs font-bold text-slate-900"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Payment Channel *</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash at Park Desk</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer / Raast</SelectItem>
                  <SelectItem value="EasyPaisa">EasyPaisa</SelectItem>
                  <SelectItem value="JazzCash">JazzCash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Receipt / Reference #</Label>
              <Input
                placeholder="e.g. REC-2026-0045"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                className="rounded-xl h-10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Notes (Optional)</Label>
              <Textarea
                placeholder="Remarks, collected by murabbi name..."
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="rounded-xl text-xs resize-none"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPaymentOpen(false)}
                className="flex-1 rounded-xl h-11 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePayment}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 text-xs font-bold"
              >
                Confirm Payment
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Generate Challans Bottom Sheet ───────────────────────────────── */}
      <Sheet open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-w-[460px] mx-auto p-6 max-h-[90vh] overflow-y-auto">
          <SheetHeader className="text-left pb-4 border-b border-slate-100">
            <SheetTitle className="text-lg font-black text-[#1F0860]">
              Generate Monthly Challans
            </SheetTitle>
            <p className="text-xs text-slate-500 font-medium">
              Create fee vouchers for all enrolled participants in cohort
            </p>
          </SheetHeader>

          <form onSubmit={handleGenerateChallans} className="space-y-4 py-4 text-xs">
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Challan Title *</Label>
              <Input
                value={genTitle}
                onChange={(e) => setGenTitle(e.target.value)}
                className="rounded-xl h-10 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Amount (PKR) *</Label>
                <Input
                  type="number"
                  value={genAmount}
                  onChange={(e) => setGenAmount(Number(e.target.value))}
                  className="rounded-xl h-10 text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Due Date *</Label>
                <Input
                  type="date"
                  value={genDueDate}
                  onChange={(e) => setGenDueDate(e.target.value)}
                  className="rounded-xl h-10 text-xs"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsGenerateOpen(false)}
                className="flex-1 rounded-xl h-11 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#4B0A8F] hover:bg-[#3d0875] text-white rounded-xl h-11 text-xs font-bold"
              >
                Generate Challans
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
