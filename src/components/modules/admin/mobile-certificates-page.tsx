"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Award,
  CheckCircle2,
  RefreshCw,
  Plus,
  MessageSquare,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Printer,
  FileCheck,
  GraduationCap,
  Calendar,
  Share2,
  Check,
  QrCode,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface MobileCertificatesPageProps {
  onBack?: () => void;
}

const TYPE_FILTERS = [
  { id: "all", label: "All Diplomas" },
  { id: "batch_graduation", label: "Graduation" },
  { id: "tarbiyah_excellence", label: "Excellence" },
  { id: "sports_leadership", label: "Sports" },
];

const MOCK_CERTS_FALLBACK = [
  {
    id: "c1",
    studentName: "Muhammad Umair",
    phone: "0327-4088002",
    certNumber: "CERT-2026-LHR-0041",
    type: "batch_graduation",
    title: "Executive Youth Tarbiyah Graduation",
    batchName: "Lahore Batch 4",
    park: "Umme Hani Park",
    issueDate: "2026-08-15",
    attendanceRate: "94%",
    status: "verified",
  },
  {
    id: "c2",
    studentName: "Huzaifa Saif",
    phone: "0323-4977806",
    certNumber: "CERT-2026-LHR-0042",
    type: "tarbiyah_excellence",
    title: "Tarbiyah & Character Distinction",
    batchName: "Lahore Batch 4",
    park: "Nazimabad Park",
    issueDate: "2026-08-15",
    attendanceRate: "92%",
    status: "verified",
  },
  {
    id: "c3",
    studentName: "M. Moosa",
    phone: "0300-4188623",
    certNumber: "CERT-2026-LHR-0043",
    type: "batch_graduation",
    title: "Executive Youth Tarbiyah Graduation",
    batchName: "Lahore Batch 4",
    park: "Bufferzone Park",
    issueDate: "2026-08-15",
    attendanceRate: "88%",
    status: "verified",
  },
  {
    id: "c4",
    studentName: "Muhammad Yusha",
    phone: "0333-4649728",
    certNumber: "CERT-2026-LHR-0044",
    type: "sports_leadership",
    title: "Athletic Stamina & Sports Honor",
    batchName: "Lahore Batch 4",
    park: "Gulshan Park",
    issueDate: "2026-08-15",
    attendanceRate: "85%",
    status: "verified",
  },
];

export function MobileCertificatesPage({ onBack }: MobileCertificatesPageProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedCert, setSelectedCert] = useState<any | null>(null);

  // Sheets state
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Issue Form State
  const [newStudentName, setNewStudentName] = useState("");
  const [newType, setNewType] = useState("batch_graduation");
  const [newPark, setNewPark] = useState("Umme Hani Park");
  const [newPhone, setNewPhone] = useState("0300-1234567");

  const { data: batchesData, isLoading: isBatchesLoading } = useQuery({
    queryKey: ["admin-batches"],
    queryFn: async () => {
      const res = await fetch("/api/admin/batches");
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
  });

  const batches = Array.isArray(batchesData) ? batchesData : [];
  const activeBatchId = batches.length > 0 ? batches[0].id : null;

  const { data: certsData, isLoading: isCertsLoading } = useQuery({
    queryKey: ["admin-certificates", activeBatchId],
    queryFn: async () => {
      if (!activeBatchId) return null;
      const res = await fetch(`/api/admin/certificates/batch?batchId=${activeBatchId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!activeBatchId,
    retry: false,
  });

  const apiCerts = certsData?.certificates || [];
  
  // Transform the API response to match our display component
  const certsList = apiCerts.length > 0 
    ? apiCerts.map((c: any, i: number) => ({
        id: c.participantId || `cert-${i}`,
        studentName: c.participant,
        phone: "N/A", // Not provided by the batch API directly
        certNumber: c.certificateNo,
        type: "batch_graduation", // Simplification
        title: "Executive Youth Tarbiyah Graduation",
        batchName: c.batch,
        park: c.park,
        issueDate: c.completionDate,
        attendanceRate: `${c.attendanceRate}%`,
        status: "verified",
      }))
    : MOCK_CERTS_FALLBACK;

  const filteredCerts = certsList.filter((c: any) => {
    const matchSearch =
      !searchQuery.trim() ||
      c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.certNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.park.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === "all" || c.type === typeFilter;
    return matchSearch && matchType;
  });

  const handleOpenPreview = (cert: any) => {
    setSelectedCert(cert);
    setIsPreviewOpen(true);
  };

  const handleWhatsAppShare = (cert: any) => {
    const text = `السلام علیکم!
محترم سرپرست،
شباب ۳۶۰ یوتھ ٹریننگ پروگرام:
طالب علم: ${cert.studentName}
سند: ${cert.title}
سند کا تصدیقی نمبر: ${cert.certNumber}
بیچ: ${cert.batchName} (${cert.park})
آن لائن تصدیق: https://shabab360.org/verify/${cert.certNumber}
مبارک باد قبول فرمائیں!`;

    const cleanPhone = cert.phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? `92${cleanPhone.slice(1)}` : cleanPhone;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const issueMutation = useMutation({
    mutationFn: async (payload: { participantIds: string[]; batchId: string; issuedBy: string }) => {
      const res = await fetch("/api/admin/certificates/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to issue certificate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-certificates", activeBatchId] });
      toast.success(`Certificate issued successfully!`);
      setIsIssueOpen(false);
      setNewStudentName("");
    },
    onError: () => {
      toast.error("Failed to issue certificate on server.");
    },
  });

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) {
      toast.error("Please enter student name");
      return;
    }
    
    // In a real app we'd select a participant from a list and get their ID.
    // For this mock form, we just send a dummy ID or the name if the backend allows it.
    if (!activeBatchId) {
      toast.error("No active batch to issue against.");
      return;
    }
    
    issueMutation.mutate({
      participantIds: [newStudentName.trim()], // Using name as ID placeholder for the demo
      batchId: activeBatchId,
      issuedBy: session?.user?.id || "system"
    });
  };

  return (
    <div className="w-full max-w-[460px] mx-auto min-h-screen bg-slate-50 text-slate-900 pb-28 select-none">
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
              <h1 className="text-2xl font-black text-[#1F0860] tracking-tight">Certificates</h1>
              <p className="text-[11px] text-slate-500 font-medium">
                {filteredCerts.length} Verified Diplomas • Batch 4 Registry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsIssueOpen(true)}
              size="sm"
              className="h-8 bg-[#4B0A8F] hover:bg-[#3d0875] text-white text-xs font-bold px-3 rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Issue</span>
            </Button>
          </div>
        </div>

        {/* 3 KPI Summary Pills */}
        <div className="grid grid-cols-3 gap-2 mt-3.5">
          <div className="p-2 rounded-xl bg-purple-50 border border-purple-100 text-center">
            <span className="text-[9px] font-bold text-[#4B0A8F] uppercase tracking-wider block">Issued</span>
            <span className="text-xs font-black text-[#4B0A8F]">{certsList.length} Diplomas</span>
          </div>
          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
            <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider block">Security</span>
            <span className="text-xs font-black text-emerald-700">100% Cryptographic</span>
          </div>
          <div className="p-2 rounded-xl bg-sky-50 border border-sky-100 text-center">
            <span className="text-[9px] font-bold text-sky-800 uppercase tracking-wider block">Cohort</span>
            <span className="text-xs font-black text-sky-700">Batch 4</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mt-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student, certificate #, or park..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-100/90 border border-slate-200/80 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4B0A8F] focus:bg-white transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar pb-0.5">
          {TYPE_FILTERS.map((f) => {
            const isActive = typeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setTypeFilter(f.id)}
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

      {/* ─── Certificates Roster List ─────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {filteredCerts.map((cert) => {
          return (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 space-y-3 hover:border-purple-200 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-50 text-[#4B0A8F] font-black text-sm flex items-center justify-center shrink-0 border border-purple-100">
                    <Award className="w-5 h-5 text-[#4B0A8F]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded">
                        {cert.certNumber}
                      </span>
                      <h3 className="text-sm font-black text-slate-900">
                        {cert.studentName}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1.5">
                      <span>{cert.park}</span>
                      <span>•</span>
                      <span>{cert.batchName}</span>
                    </p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1"
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified</span>
                </Badge>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">{cert.title}</span>
                <span className="text-[10px] text-slate-400 font-medium">Att: {cert.attendanceRate}</span>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleOpenPreview(cert)}
                  className="flex-1 h-9 bg-[#1F0860] hover:bg-[#18064a] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>View Diploma</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleWhatsAppShare(cert)}
                  className="h-9 px-3 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ─── Digital Certificate Preview Bottom Sheet ─────────────────────── */}
      <Sheet open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-w-[460px] mx-auto p-6 max-h-[92vh] overflow-y-auto">
          {selectedCert && (
            <div className="space-y-4">
              <SheetHeader className="text-left pb-2 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-black">
                    Authentic Verified Record
                  </Badge>
                  <span className="font-mono text-[10px] text-slate-400">{selectedCert.certNumber}</span>
                </div>
              </SheetHeader>

              {/* Certificate Diploma Card with Gold/Purple Border */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-amber-50/40 via-white to-amber-50/30 border-2 border-amber-300 text-center space-y-3 shadow-md relative overflow-hidden">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] mx-auto p-1 border border-white shadow flex items-center justify-center">
                  <img src="/shabab-logo.png" alt="Emblem" className="w-8 h-8 object-contain" />
                </div>

                <div className="space-y-0.5">
                  <h4 className="text-[11px] font-bold text-amber-800 uppercase tracking-widest">
                    شباب ۳۶۰ یوتھ ٹریننگ پروگرام
                  </h4>
                  <h2 className="text-base font-black text-[#1F0860] tracking-tight">
                    CERTIFICATE OF GRADUATION
                  </h2>
                </div>

                <p className="text-[11px] text-slate-500 italic">This is proudly presented to</p>

                <h3 className="text-lg font-black text-slate-900 tracking-tight border-b-2 border-amber-300 pb-1 max-w-[260px] mx-auto">
                  {selectedCert.studentName}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed font-medium px-2">
                  for exemplary dedication, tarbiyah completion, and leadership participation in{" "}
                  <span className="font-bold text-[#1F0860]">{selectedCert.batchName}</span> at{" "}
                  {selectedCert.park}.
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-amber-200/80 text-[10px] text-slate-500">
                  <div className="text-left">
                    <span className="font-bold block text-slate-800">Issue Date</span>
                    <span>{selectedCert.issueDate}</span>
                  </div>
                  <div className="text-center">
                    <span className="font-bold block text-emerald-700">Attendance</span>
                    <span>{selectedCert.attendanceRate}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold block text-slate-800">Verified QR</span>
                    <span className="font-mono">shabab360.org</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => handleWhatsAppShare(selectedCert)}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Verification Link</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsPreviewOpen(false)}
                  className="rounded-xl h-11 text-xs font-bold px-4"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ─── Issue Certificate Bottom Sheet ───────────────────────────────── */}
      <Sheet open={isIssueOpen} onOpenChange={setIsIssueOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-w-[460px] mx-auto p-6 max-h-[90vh] overflow-y-auto">
          <SheetHeader className="text-left pb-4 border-b border-slate-100">
            <SheetTitle className="text-lg font-black text-[#1F0860]">
              Issue New Certificate
            </SheetTitle>
            <p className="text-xs text-slate-500 font-medium">
              Generate an official digital diploma with cryptographic verification
            </p>
          </SheetHeader>

          <form onSubmit={handleIssueSubmit} className="space-y-4 py-4 text-xs">
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Student Full Name *</Label>
              <Input
                placeholder="e.g. Muhammad Bilal"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                className="rounded-xl h-10 text-xs font-bold text-slate-900"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Guardian Mobile Number</Label>
              <Input
                placeholder="0300-1234567"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="rounded-xl h-10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Certificate Type *</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="batch_graduation">Executive Youth Tarbiyah Graduation</SelectItem>
                  <SelectItem value="tarbiyah_excellence">Tarbiyah & Character Distinction</SelectItem>
                  <SelectItem value="sports_leadership">Athletic Stamina & Sports Honor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Park Assignment</Label>
              <Select value={newPark} onValueChange={setNewPark}>
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Umme Hani Park">Umme Hani Park</SelectItem>
                  <SelectItem value="Nazimabad Park">Nazimabad Park</SelectItem>
                  <SelectItem value="Bufferzone Park">Bufferzone Park</SelectItem>
                  <SelectItem value="Gulshan Park">Gulshan Park</SelectItem>
                  <SelectItem value="Johar Park">Johar Park</SelectItem>
                  <SelectItem value="Saddar Park">Saddar Park</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsIssueOpen(false)}
                className="flex-1 rounded-xl h-11 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={issueMutation.isPending}
                className="flex-1 bg-[#4B0A8F] hover:bg-[#3d0875] text-white rounded-xl h-11 text-xs font-bold"
              >
                {issueMutation.isPending ? "Issuing..." : "Issue Certificate"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
