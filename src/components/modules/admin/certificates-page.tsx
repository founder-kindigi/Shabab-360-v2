"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Award,
  CheckCircle2,
  Plus,
  Search,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  Printer,
  ShieldCheck,
  FileCheck,
  SearchCode
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CertificateRecord {
  id: string;
  studentName: string;
  phone: string;
  certNumber: string;
  type: "batch_graduation" | "tarbiyah_excellence" | "sports_mvp";
  batchName: string;
  issueDate: string;
  status: "verified";
}

const MOCK_CERTS: CertificateRecord[] = [
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
  {
    id: "c4",
    studentName: "Muhammad Yusha",
    phone: "923334649728",
    certNumber: "CERT-2026-LHR-0044",
    type: "sports_mvp",
    batchName: "Lahore Batch 4",
    issueDate: "2026-08-01",
    status: "verified",
  },
];

export function CertificatesPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState<"roster" | "verify">("roster");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [selectedCert, setSelectedCert] = useState<CertificateRecord | null>(null);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [verifyInput, setVerifyInput] = useState("CERT-2026-LHR-0041");
  const [verifiedResult, setVerifiedResult] = useState<CertificateRecord | null>(null);

  const { data: apiCerts } = useQuery({
    queryKey: ["admin-certificates"],
    queryFn: () => fetch("/api/admin/certificates").then((r) => r.json()),
  });

  const certs = MOCK_CERTS;

  const filteredCerts = useMemo(() => {
    return certs.filter((item) => {
      const matchSearch =
        !search ||
        item.studentName.toLowerCase().includes(search.toLowerCase()) ||
        item.certNumber.toLowerCase().includes(search.toLowerCase()) ||
        item.phone.includes(search);
      const matchType = typeFilter === "all" || item.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [certs, search, typeFilter]);

  const totalPages = Math.ceil(filteredCerts.length / pageSize) || 1;
  const paginatedCerts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCerts.slice(start, start + pageSize);
  }, [filteredCerts, page]);

  const openWhatsAppCert = (item: CertificateRecord) => {
    const msg = `السلام علیکم!
محترم سرپرست،
شباب 360 لاہور بیچ 4 کی ڈگری و سند:
طالب علم: ${item.studentName}
سند کا نمبر: ${item.certNumber}
بیچ: ${item.batchName}
آن لائن تصدیق: https://shabab360.org/verify/${item.certNumber}
مبارک ہو!`;
    window.open(`https://wa.me/${item.phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto px-4 sm:px-6">
      <PageHeader
        title="Certificates, Graduation & Awards Desk"
        description="Generate automated graduation certificates, verify certificate serial numbers, and dispatch printable PDFs via WhatsApp."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => setGenerateModalOpen(true)}
              className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white font-bold rounded-xl h-11 px-5 shadow-md gap-2"
            >
              <Plus className="size-5" />
              Generate Batch Certificates
            </Button>
          </div>
        }
      />

      {/* ─── 4 Top KPI Metric Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl text-amber-600 dark:text-amber-300 shrink-0">
              <Award className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Certificates Issued</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{certs.length} certificates</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50/60 to-white dark:from-emerald-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-300 shrink-0">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Verified Serials</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">100% Authentic</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50/60 to-white dark:from-purple-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl text-purple-600 dark:text-purple-300 shrink-0">
              <Sparkles className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Batch Scope</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Lahore Batch 4</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50/60 to-white dark:from-indigo-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl text-indigo-600 dark:text-indigo-300 shrink-0">
              <MessageSquare className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">WhatsApp Sent</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">58 sent</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Main Tabs Switcher ────────────────────────────────────────── */}
      <Tabs defaultValue="roster" value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <TabsList className="bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
            <TabsTrigger value="roster" className="rounded-lg font-bold text-xs sm:text-sm px-4">
              <Award className="size-4 mr-2" /> Issued Certificates Roster
            </TabsTrigger>
            <TabsTrigger value="verify" className="rounded-lg font-bold text-xs sm:text-sm px-4">
              <SearchCode className="size-4 mr-2" /> Serial Verification Portal
            </TabsTrigger>
          </TabsList>

          {activeTab === "roster" && (
            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search student or serial..."
                  className="pl-9 h-10 rounded-xl bg-white dark:bg-slate-900 text-xs font-medium"
                />
              </div>

              <Select
                value={typeFilter}
                onValueChange={(v) => {
                  setTypeFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px] h-10 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold">
                  <SelectValue placeholder="Certificate Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="batch_graduation">Batch Graduation</SelectItem>
                  <SelectItem value="tarbiyah_excellence">Tarbiyah Excellence</SelectItem>
                  <SelectItem value="sports_mvp">Sports MVP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* ─── Tab 1: Issued Certificates Roster ──────────────────────────── */}
        <TabsContent value="roster" className="space-y-4 m-0">
          <Card className="border-0 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Certificate Serial</th>
                    <th className="p-4">Student & Contact</th>
                    <th className="p-4">Batch</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Issue Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedCerts.map((item) => (
                    <tr key={item.id} className="hover:bg-purple-50/30 dark:hover:bg-purple-950/10 transition-colors">
                      <td className="p-4 font-mono font-bold text-xs text-purple-600 dark:text-purple-400">
                        {item.certNumber}
                      </td>
                      <td className="p-4 font-bold text-slate-900 dark:text-slate-100">
                        <div>{item.studentName}</div>
                        <span className="text-xs text-muted-foreground font-medium">{item.phone}</span>
                      </td>
                      <td className="p-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {item.batchName}
                      </td>
                      <td className="p-4">
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold text-[10px] uppercase">
                          {item.type.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="p-4 text-xs font-medium text-slate-600">
                        {item.issueDate}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedCert(item)}
                            className="h-8 px-2 text-xs font-bold text-purple-600 dark:text-purple-300 hover:bg-purple-50"
                          >
                            <Eye className="size-3.5 mr-1" /> View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openWhatsAppCert(item)}
                            className="h-8 px-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50"
                          >
                            <MessageSquare className="size-3.5 mr-1" /> WhatsApp
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                Page {page} of {totalPages} ({filteredCerts.length} total certificates)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 text-xs font-bold rounded-lg"
                >
                  <ChevronLeft className="size-4 mr-1" /> Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 text-xs font-bold rounded-lg"
                >
                  Next <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ─── Tab 2: Serial Verification Portal ───────────────────────────── */}
        <TabsContent value="verify" className="space-y-4 m-0">
          <Card className="border-0 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 space-y-4 rounded-2xl max-w-xl mx-auto text-center">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-2xl text-amber-600 w-fit mx-auto">
              <ShieldCheck className="size-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black">Certificate Authenticity Verification</h3>
              <p className="text-xs text-muted-foreground">Enter a certificate serial number to verify its tamper-proof authenticity.</p>
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                placeholder="e.g. CERT-2026-LHR-0041"
                className="h-11 rounded-xl font-mono text-xs font-bold text-center uppercase"
              />
              <Button
                onClick={() => {
                  const found = certs.find((c) => c.certNumber.toLowerCase() === verifyInput.trim().toLowerCase());
                  if (found) {
                    setVerifiedResult(found);
                    toast.success("Certificate Verified Authentic!");
                  } else {
                    setVerifiedResult(null);
                    toast.error("Certificate Serial Not Found or Invalid");
                  }
                }}
                className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white font-bold h-11 px-6 rounded-xl shrink-0"
              >
                Verify Serial
              </Button>
            </div>

            {verifiedResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-left space-y-2 text-xs"
              >
                <div className="flex justify-between font-bold text-emerald-800 dark:text-emerald-300">
                  <span>Status: Authentic & Verified</span>
                  <Badge className="bg-emerald-600 text-white">Valid</Badge>
                </div>
                <div className="flex justify-between text-muted-foreground font-medium">
                  <span>Student Name:</span>
                  <span className="font-bold text-foreground">{verifiedResult.studentName}</span>
                </div>
                <div className="flex justify-between text-muted-foreground font-medium">
                  <span>Batch:</span>
                  <span>{verifiedResult.batchName}</span>
                </div>
              </motion.div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Digital Certificate Preview Modal ──────────────────────────── */}
      <Dialog open={!!selectedCert} onOpenChange={(open) => !open && setSelectedCert(null)}>
        <DialogContent className="max-w-md p-6 rounded-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center justify-between">
              <span>Digital Graduation Certificate</span>
              <Badge variant="outline" className="font-mono text-xs">{selectedCert?.certNumber}</Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedCert && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 via-white to-amber-50 dark:from-purple-950/30 dark:via-slate-900 dark:to-slate-900 border-2 border-amber-300 text-center space-y-3 shadow-inner">
              <Badge className="bg-amber-400 text-amber-950 font-black text-xs uppercase px-3 py-1">
                Official Graduation Certificate
              </Badge>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100">{selectedCert.studentName}</div>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                Has successfully completed the 8-week {selectedCert.batchName} curriculum in Sports, Life Skills, and Tarbiyah Ethics.
              </p>
            </div>
          )}

          <DialogFooter>
            {selectedCert && (
              <Button
                onClick={() => openWhatsAppCert(selectedCert)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-2"
              >
                <MessageSquare className="size-4" /> Share via WhatsApp
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
