"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileSpreadsheet,
  ArrowLeft,
  RefreshCw,
  Upload,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Phone,
  Layers,
  Award,
  Users,
  DollarSign,
  Search
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MobilePortalImportPageProps {
  onBack?: () => void;
}

const MOCK_RAW_PARSED = [
  {
    sr: "1",
    name: "Muhammad Abdul Rafay",
    mobile: "+923144685997",
    status: "Approved",
    remarks: "Token # 155",
    payment: "PKR 1,000 (Cash)",
    grade: "O Level",
    city: "Lahore",
    park: "Township / Gulberg",
  },
  {
    sr: "2",
    name: "Haider",
    mobile: "+923084204681",
    status: "Pending",
    remarks: "Samnabad Plaza",
    payment: "PKR 0",
    grade: "10th",
    city: "Lahore",
    park: "Samnabad",
  },
  {
    sr: "3",
    name: "Abdul Rehman",
    mobile: "+923304780728",
    status: "Pending",
    remarks: "Gulshan E Ravi H Block",
    payment: "PKR 0",
    grade: "12th",
    city: "Lahore",
    park: "Gulshan Ravi",
  },
  {
    sr: "4",
    name: "UMAIR JAVEID",
    mobile: "+923314370735",
    status: "Pending",
    remarks: "Wapda Town G5",
    payment: "PKR 0",
    grade: "10th",
    city: "Lahore",
    park: "Johar Town",
  },
];

export function MobilePortalImportPage({ onBack }: MobilePortalImportPageProps) {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const filteredRecords = MOCK_RAW_PARSED.filter((r) => {
    return (
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.mobile.includes(search) ||
      r.status.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleRunPipeline = () => {
    setIsExecuting(true);
    setTimeout(() => {
      setIsExecuting(false);
      toast.success("Successfully synchronized raw portal sheet across Admissions, Calling, Fees, and Park Attendance modules!");
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-foreground pb-28 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-6 pb-12 px-5 rounded-b-[2.5rem] shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

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
                پائپ لائن امپورٹ
              </h1>
              <p className="text-[11px] text-purple-200 font-medium">Raw Portal Data Import Desk</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-bold bg-white/10 px-3 py-1.5 rounded-full border border-white/15 backdrop-blur-md">
            <FileSpreadsheet className="size-3 text-amber-400" />
            <span>RegistrationRequests-06-08-2026.xls</span>
          </div>
        </div>
      </div>

      {/* ─── Metrics & Search ────────────────────────────────────────────── */}
      <div className="-mt-7 px-4 z-10 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-3xl bg-card border border-slate-200 dark:border-slate-800 shadow-md space-y-1"
          >
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Raw Applications</span>
            <div className="text-lg font-black text-purple-600 dark:text-purple-400">188 parsed</div>
            <p className="text-[10px] text-muted-foreground font-medium">All 40+ Fields Mapped</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-4 rounded-3xl bg-emerald-500 text-white shadow-md space-y-1"
          >
            <span className="text-[10px] uppercase font-bold text-emerald-100 tracking-wider">5 Modules Sync</span>
            <div className="text-lg font-black text-white">100% Ready</div>
            <p className="text-[10px] text-emerald-100/90 font-medium">Admissions to Attendance</p>
          </motion.div>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleRunPipeline}
          disabled={isExecuting}
          className="w-full bg-[#4B0A8F] hover:bg-[#380668] text-white font-bold h-12 rounded-2xl shadow-lg gap-2"
        >
          {isExecuting ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4 text-amber-400" />}
          Run Automated 5-Module Pipeline Sync
        </Button>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search parsed applicant or status..."
            className="pl-10 h-11 rounded-2xl bg-card border-slate-200 dark:border-slate-800 shadow-sm font-medium text-xs"
          />
        </div>

        {/* Applications List */}
        <div className="space-y-3">
          {filteredRecords.map((rec, idx) => (
            <motion.div
              key={rec.sr}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedRecord(rec)}
              className="p-4 rounded-3xl bg-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 cursor-pointer hover:border-purple-300 transition-all active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {rec.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-mono font-medium">{rec.mobile}</p>
                </div>

                <Badge
                  className={cn(
                    "font-bold text-[10px] uppercase",
                    rec.status === "Approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  )}
                >
                  {rec.status}
                </Badge>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
                <span className="text-purple-600 dark:text-purple-400">
                  {rec.remarks} • {rec.grade}
                </span>

                <ChevronRight className="size-4 text-slate-400" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ─── Detail Drawer ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedRecord && (
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

              <div className="space-y-1">
                <Badge variant="outline" className="font-mono text-xs font-bold">
                  Raw Record Sr. #{selectedRecord.sr}
                </Badge>
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {selectedRecord.name}
                </h2>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">Admissions Status</span>
                  <span>{selectedRecord.status} ({selectedRecord.remarks})</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">Fee Payment Pre-Logged</span>
                  <span>{selectedRecord.payment}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">Grade / Class</span>
                  <span>{selectedRecord.grade}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">Allocated Park</span>
                  <span>{selectedRecord.park}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedRecord(null)}
                  className="w-full rounded-2xl font-bold h-12"
                >
                  Close Record
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
