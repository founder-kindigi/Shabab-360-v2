"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Plus,
  Search,
  MessageSquare,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Printer,
  FileCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MobileCertificatesPageProps {
  onBack?: () => void;
}

const MOCK_MOBILE_CERTS = [
  {
    id: "c1",
    studentName: "Muhammad Umair",
    phone: "923274088002",
    certNumber: "CERT-2026-LHR-0041",
    type: "batch_graduation",
    batchName: "Lahore Batch 4",
    issueDate: "2026-08-01",
    status: "verified",
  },
  {
    id: "c2",
    studentName: "Muhammad Huzaifa Saif",
    phone: "923234977806",
    certNumber: "CERT-2026-LHR-0042",
    type: "tarbiyah_excellence",
    batchName: "Lahore Batch 4",
    issueDate: "2026-08-01",
    status: "verified",
  },
  {
    id: "c3",
    studentName: "M.Moosa",
    phone: "923004188623",
    certNumber: "CERT-2026-LHR-0043",
    type: "batch_graduation",
    batchName: "Lahore Batch 4",
    issueDate: "2026-08-01",
    status: "verified",
  },
];

export function MobileCertificatesPage({ onBack }: MobileCertificatesPageProps) {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [selectedCert, setSelectedCert] = useState<any | null>(null);

  // ─── Real DB Query ─────────────────────────────────────────────────────
  const { data: certsData, isLoading } = useQuery({
    queryKey: ["mobile-certificates"],
    queryFn: async () => {
      const res = await fetch("/api/admin/certificates");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000,
  });

  const filteredCerts = MOCK_MOBILE_CERTS.filter((c) => {
    return (
      !search ||
      c.studentName.toLowerCase().includes(search.toLowerCase()) ||
      c.certNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    );
  });

  const openWhatsAppCert = (cert: any) => {
    const text = `السلام علیکم!
محترم سرپرست،
شباب 360 فارغ التحصیل کی ڈگری و سند:
طالب علم: ${cert.studentName}
سند کا نمبر: ${cert.certNumber}
بیچ: ${cert.batchName}
تصدیق شدہ لنکس: https://shabab360.org/verify/${cert.certNumber}
مبارک ہو!`;
    window.open(`https://wa.me/${cert.phone}?text=${encodeURIComponent(text)}`, "_blank");
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
                اسناد و فراغت
              </h1>
              <p className="text-[11px] text-purple-200 font-medium">Graduation & Certificates Desk</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-bold bg-white/10 px-3 py-1.5 rounded-full border border-white/15 backdrop-blur-md">
            {isLoading ? (
              <RefreshCw className="size-3 animate-spin text-purple-300" />
            ) : (
              <Award className="size-3 text-amber-400" />
            )}
            <span>Lahore Batch 4</span>
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
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Certificates Issued</span>
            <div className="text-lg font-black text-purple-600 dark:text-purple-400">{MOCK_MOBILE_CERTS.length} graduates</div>
            <p className="text-[10px] text-muted-foreground font-medium">Lahore Batch 4</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-4 rounded-3xl bg-emerald-500 text-white shadow-md space-y-1"
          >
            <span className="text-[10px] uppercase font-bold text-emerald-100 tracking-wider">Serial Verifications</span>
            <div className="text-lg font-black text-white">100% Verified</div>
            <p className="text-[10px] text-emerald-100/90 font-medium">Tamper-Proof QR</p>
          </motion.div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or certificate serial..."
            className="pl-10 h-11 rounded-2xl bg-card border-slate-200 dark:border-slate-800 shadow-sm font-medium text-xs"
          />
        </div>

        {/* Certificates List */}
        <div className="space-y-3">
          {filteredCerts.map((cert, idx) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedCert(cert)}
              className="p-4 rounded-3xl bg-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 cursor-pointer hover:border-purple-300 transition-all active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {cert.studentName}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-mono font-medium">{cert.certNumber}</p>
                </div>

                <Badge className="bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                  Verified
                </Badge>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">{cert.batchName}</span>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      openWhatsAppCert(cert);
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

      {/* ─── Certificate Detail Drawer ───────────────────────────────────── */}
      <AnimatePresence>
        {selectedCert && (
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
                  <Award className="size-5 text-amber-500" /> Graduation Certificate
                </h2>
                <Badge variant="outline" className="font-mono text-xs font-bold">
                  {selectedCert.certNumber}
                </Badge>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-slate-900 border border-purple-200 dark:border-purple-800 text-center space-y-2">
                <div className="text-xs uppercase font-bold text-purple-600">Certificate of Completion</div>
                <div className="text-lg font-black text-slate-900 dark:text-slate-100">{selectedCert.studentName}</div>
                <p className="text-xs text-muted-foreground font-medium">Has successfully completed the 8-week {selectedCert.batchName} curriculum in Sports, Life Skills, and Tarbiyah Ethics.</p>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => openWhatsAppCert(selectedCert)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl h-12 gap-2"
                >
                  <MessageSquare className="size-4" /> Share Certificate via WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedCert(null)}
                  className="w-full rounded-2xl font-bold h-12"
                >
                  Close Certificate
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
