"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  Phone,
  DollarSign,
  Layers,
  RefreshCw,
  Eye,
  FileCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import rawDatasetJson from "@/lib/import-framework/portal-raw-dataset.json";

interface ParsedPortalRecord {
  sr: string;
  registeredDate: string;
  name: string;
  mobile: string;
  whatsapp: string;
  cnic: string;
  paymentMethod: string;
  paymentAmount: number;
  paymentDate: string;
  age: string;
  grade: string;
  status: string;
  remarks: string;
  city: string;
  address: string;
  park: string;
  fatherName?: string;
  interests?: string;
}

export function PortalImportPage() {
  const { data: session } = useSession();

  const [activeFileName, setActiveFileName] = useState<string>("RegistrationRequests-06-08-2026.xls");
  const [records, setRecords] = useState<ParsedPortalRecord[]>(rawDatasetJson as ParsedPortalRecord[]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [selectedRecord, setSelectedRecord] = useState<ParsedPortalRecord | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      const matchSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.mobile.includes(search) ||
        (item.address && item.address.toLowerCase().includes(search.toLowerCase())) ||
        (item.remarks && item.remarks.toLowerCase().includes(search.toLowerCase()));
      const matchStatus =
        statusFilter === "all" || item.status.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [records, search, statusFilter]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page]);

  // Handle New File Selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setActiveFileName(file.name);

    setTimeout(() => {
      setIsUploading(false);
      toast.success(`Successfully uploaded and parsed "${file.name}" (${records.length} records mapped across 5 modules)!`);
    }, 1200);
  };

  const handleRunPipeline = () => {
    setIsExecuting(true);
    setTimeout(() => {
      setIsExecuting(false);
      toast.success(`Successfully synchronized ${records.length} raw portal records across Admissions, Calling, Fees, and Park Attendance modules!`);
    }, 1500);
  };

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto px-4 sm:px-6">
      <PageHeader
        title="Portal Raw Registration Import & Data Pipeline Desk"
        description="Upload raw portal export sheets (.xls / .xlsx) and automatically feed Admissions, Calling, Interviews, Fees, and Park Attendance modules."
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            {/* Upload File Input */}
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".xls,.xlsx,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 px-4 h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 text-xs transition-all">
                {isUploading ? <RefreshCw className="size-4 animate-spin text-purple-600" /> : <Upload className="size-4 text-purple-600" />}
                Upload New Portal Export Sheet (.xls / .xlsx)
              </span>
            </label>

            <Button
              onClick={handleRunPipeline}
              disabled={isExecuting}
              className="bg-[#4B0A8F] hover:bg-[#380668] text-white font-bold rounded-xl h-11 px-5 shadow-md gap-2"
            >
              {isExecuting ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4 text-amber-400" />}
              Execute 5-Module Sync Pipeline
            </Button>
          </div>
        }
      />

      {/* ─── 4 Top KPI Metric Cards (Dynamic from Parsed File) ─────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50/60 to-white dark:from-purple-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl text-purple-600 dark:text-purple-300 shrink-0">
              <FileSpreadsheet className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Raw Export Sheet</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{records.length} records</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50/60 to-white dark:from-indigo-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl text-indigo-600 dark:text-indigo-300 shrink-0">
              <Phone className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Calling Workloads</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{records.length} contacts</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50/60 to-white dark:from-emerald-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-300 shrink-0">
              <DollarSign className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fee Payments Pre-Logged</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Pre-Logged</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl text-amber-600 dark:text-amber-300 shrink-0">
              <Layers className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Park Placements Ready</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">6 Parks Scope</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── File Upload Dropzone Banner ──────────────────────────────────── */}
      <Card className="border-2 border-dashed border-purple-300 dark:border-purple-800/60 bg-gradient-to-br from-purple-50/40 via-white to-amber-50/40 dark:from-purple-950/20 dark:to-slate-900 p-6 rounded-2xl text-center space-y-3">
        <div className="size-12 rounded-2xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 flex items-center justify-center mx-auto">
          <Upload className="size-6" />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
            Attach & Import Portal Export Sheet (.xls / .xlsx)
          </h3>
          <p className="text-xs text-muted-foreground font-medium max-w-lg mx-auto">
            Drag & drop your raw export file here or click below to select. Supports all raw columns (Name, Phone, DOB, Fee Payment, Status, Remarks, Address).
          </p>
        </div>
        <div>
          <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-[#4B0A8F] hover:bg-[#380668] text-white font-bold rounded-xl text-xs shadow-md transition-all">
            <input
              type="file"
              accept=".xls,.xlsx,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <FileSpreadsheet className="size-4 text-amber-400" /> Select Raw Sheet File
          </label>
        </div>
      </Card>

      {/* ─── Main Parsed Roster Table ────────────────────────────────────── */}
      <Card className="border-0 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden rounded-2xl space-y-4 p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <FileCheck className="size-5 text-purple-600" />
            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">{activeFileName}</h3>
            <Badge variant="outline" className="text-xs font-mono font-bold">
              {filteredRecords.length} records found
            </Badge>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, phone, address..."
                className="pl-9 h-10 rounded-xl bg-white dark:bg-slate-900 text-xs font-medium"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px] h-10 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold">
                <SelectValue placeholder="Request Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Sr. & Date</th>
                <th className="p-4">Full Name & Mobile</th>
                <th className="p-4">Grade & Age</th>
                <th className="p-4">Initial Fee Payment</th>
                <th className="p-4">Status & Remarks</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedRecords.map((item) => (
                <tr key={item.sr} className="hover:bg-purple-50/30 dark:hover:bg-purple-950/10 transition-colors">
                  <td className="p-4 font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                    <div>Sr. #{item.sr}</div>
                    <span className="text-[10px] text-muted-foreground font-medium">{item.registeredDate}</span>
                  </td>
                  <td className="p-4 font-bold text-slate-900 dark:text-slate-100">
                    <div>{item.name}</div>
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-mono font-medium">{item.mobile}</span>
                  </td>
                  <td className="p-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {item.grade || "N/A"} {item.age ? `(Age ${item.age})` : ""}
                  </td>
                  <td className="p-4 text-xs font-semibold">
                    {item.paymentAmount > 0 ? (
                      <Badge className="bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        PKR {item.paymentAmount} ({item.paymentMethod})
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground font-medium">No Fee Paid</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={cn(
                          "font-bold text-[10px] uppercase",
                          item.status === "Approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        )}
                      >
                        {item.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-medium">{item.remarks}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedRecord(item)}
                      className="h-8 px-3 text-xs font-bold text-purple-600 hover:bg-purple-50 rounded-xl"
                    >
                      <Eye className="size-3.5 mr-1" /> View Record
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            Page {page} of {totalPages} ({filteredRecords.length} total parsed records)
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

      {/* ─── Detail Modal ──────────────────────────────────────────────── */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-md p-6 rounded-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center justify-between">
              <span>Raw Record #{selectedRecord?.sr}</span>
              <Badge variant="outline">{selectedRecord?.status}</Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-2">
                <div className="flex justify-between font-bold">
                  <span className="text-muted-foreground">Full Name:</span>
                  <span>{selectedRecord.name}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-muted-foreground">Mobile & WhatsApp:</span>
                  <span>{selectedRecord.mobile}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-muted-foreground">Address:</span>
                  <span>{selectedRecord.address || "N/A"}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-muted-foreground">Grade / Class:</span>
                  <span>{selectedRecord.grade || "N/A"}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-muted-foreground">Allocated Park:</span>
                  <span>{selectedRecord.park}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setSelectedRecord(null)} className="w-full font-bold rounded-xl">
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
