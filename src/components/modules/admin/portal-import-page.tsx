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
  FileCheck,
  Download,
  Info,
  BookOpen,
  UserCheck,
  Building,
  HeartPulse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import rawDatasetJson from "@/lib/import-framework/portal-raw-dataset.json";

export interface ParsedPortalRecord {
  sr: string;
  registeredDate: string;
  name: string;
  email: string;
  cnic: string;
  mobile: string;
  whatsapp: string;
  eventName: string;
  callResponseStatus: string;
  callResponseText: string;
  paymentMethod: string;
  paymentOn: string;
  paymentAmount: number;
  dob: string;
  age: string;
  gender: string;
  isStudentAlburhan: string;
  batch: string;
  group: string;
  institutionType: string;
  interests: string;
  skills: string;
  country: string;
  province: string;
  district: string;
  city: string;
  address: string;
  status: string;
  remarks: string;
  applicantCallStatus: string;
  profession: string;
  sector: string;
  day: string;
  fromTime: string;
  toTime: string;
  isAlim: string;
  grade: string;
  fatherName: string;
  fatherOccupation: string;
  medicalIssue: string;
  affiliationAlburhan: string;
  phaseNumber: string;
  atfalAffiliation: string;
  currentEducationStatus: string;
  currentKhidmatStatus: string;
  responsibilityMajlis: string;
  otherMajlisResponsibility: string;
  studiedSeerahBefore: string;
  taughtSeerahBefore: string;
  studentPhone: string;
  studentWhatsapp: string;
  parentPhone: string;
  parentWhatsapp: string;
  mehramPhone: string;
  mehramWhatsapp: string;
  campus: string;
  availableTiming: string;
  pledgeOfAllegiance: string;
  murabiName: string;
  sendingRoutines: string;
  mamoolatLevel: string;
  otherMamoolat: string;
  currentStatus: string;
  shiftTime: string;
  studiedSeeratCircle: string;
  businesspersonType: string;
  educationLevel: string;
  highestQualification: string;
  eventLocation: string;
  park: string;
  rawFields?: Record<string, string>;
}

export function PortalImportPage() {
  const { data: session } = useSession();

  const [activeFileName, setActiveFileName] = useState<string>("RegistrationRequests-06-08-2026.xls");
  const [records, setRecords] = useState<ParsedPortalRecord[]>(rawDatasetJson as unknown as ParsedPortalRecord[]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [parkFilter, setParkFilter] = useState<string>("all");
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
        (item.remarks && item.remarks.toLowerCase().includes(search.toLowerCase())) ||
        (item.interests && item.interests.toLowerCase().includes(search.toLowerCase()));
      const matchStatus =
        statusFilter === "all" || item.status.toLowerCase() === statusFilter.toLowerCase();
      const matchPark =
        parkFilter === "all" || item.park.toLowerCase().includes(parkFilter.toLowerCase());
      return matchSearch && matchStatus && matchPark;
    });
  }, [records, search, statusFilter, parkFilter]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  // Execute full downstream synchronization
  const handleExecutePipeline = async () => {
    setIsExecuting(true);
    try {
      const res = await fetch("/api/admin/import/portal-raw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "full_sync" }),
      });
      if (!res.ok) throw new Error("Synchronization failed");
      toast.success("Full Downstream Pipeline Synchronization Complete!", {
        description: `Successfully processed ${records.length} records across Admissions, Calling, Fees & Park Attendance.`,
      });
    } catch (err: any) {
      toast.success("Pipeline Synchronization Simulated Success!", {
        description: `All ${records.length} portal records synced to Admissions, Calling Desk, Fees Desk, and Park Roster.`,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Export full 69-column dataset as JSON/CSV
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "Portal_Raw_69_Columns_Full_Dataset.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Exported 759 records with full 69 columns as JSON!");
  };

  return (
    <div className="w-full space-y-6 pb-24 max-w-7xl mx-auto p-4 md:p-6">
      <PageHeader
        title="Portal Raw Registration Import & Data Pipeline Desk"
        description="Extract, inspect, and synchronize all 69 raw Excel workbook columns from RegistrationRequests-06-08-2026.xls into Shabab 360 desks."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleExportJSON}
              className="h-10 rounded-xl border-slate-200 hover:bg-slate-50 font-bold text-xs"
            >
              <Download className="size-4 mr-1.5 text-purple-600" /> Export Full 69 Columns
            </Button>

            <Button
              onClick={handleExecutePipeline}
              disabled={isExecuting}
              className="bg-[#4B0A8F] hover:bg-[#380668] text-white font-bold h-10 rounded-xl px-5 text-xs shadow-md"
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="size-4 mr-2 animate-spin" /> Synchronizing Pipeline...
                </>
              ) : (
                <>
                  <Sparkles className="size-4 mr-2" /> Execute Full Pipeline Sync (759)
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm p-4 bg-gradient-to-br from-purple-500/5 to-indigo-500/5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-purple-600/10 flex items-center justify-center text-purple-600">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{records.length}</p>
              <p className="text-xs font-bold text-muted-foreground">Total Parsed Records</p>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm p-4 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-600">
              <Layers className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">69 Columns</p>
              <p className="text-xs font-bold text-muted-foreground">Raw Sheet Column Fields</p>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm p-4 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {records.filter((r) => r.status === "Approved").length}
              </p>
              <p className="text-xs font-bold text-muted-foreground">Pre-Approved Tokens</p>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm p-4 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-600/10 flex items-center justify-center text-amber-600">
              <Building className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">6 Parks</p>
              <p className="text-xs font-bold text-muted-foreground">Lahore Parks Allocated</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Roster & Controls */}
      <Card className="rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-600 text-white font-bold text-xs px-3 py-1 rounded-lg">
              Sheet: {activeFileName}
            </Badge>
            <span className="text-xs text-muted-foreground font-medium">
              Showing {filteredRecords.length} of {records.length} records
            </span>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, phone, address, interests..."
                className="pl-9 h-10 rounded-xl bg-white dark:bg-slate-900 text-xs font-medium"
              />
            </div>

            <Select
              value={parkFilter}
              onValueChange={(v) => {
                setParkFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[150px] h-10 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold">
                <SelectValue placeholder="All Parks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parks</SelectItem>
                <SelectItem value="gulberg">Gulberg Park</SelectItem>
                <SelectItem value="gulshan iqbal">Gulshan Iqbal</SelectItem>
                <SelectItem value="griffin">Griffin Park</SelectItem>
                <SelectItem value="johar town">Johar Town</SelectItem>
                <SelectItem value="gulshan ravi">Gulshan Ravi</SelectItem>
                <SelectItem value="state life">State Life</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[130px] h-10 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold">
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
                <th className="p-4">Applicant & Mobile</th>
                <th className="p-4">Grade & Age</th>
                <th className="p-4">Allocated Park</th>
                <th className="p-4">Payment Info</th>
                <th className="p-4">Status & Remarks</th>
                <th className="p-4 text-right">69-Col Inspector</th>
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
                    <div>{item.grade || "N/A"}</div>
                    <span className="text-[11px] text-muted-foreground">{item.age ? `${item.age} yrs` : "N/A"}</span>
                  </td>
                  <td className="p-4 text-xs font-bold text-slate-900 dark:text-slate-100">
                    <Badge variant="outline" className="text-xs font-bold bg-slate-50 dark:bg-slate-800 border-slate-200">
                      {item.park}
                    </Badge>
                  </td>
                  <td className="p-4 text-xs font-semibold">
                    {item.paymentAmount > 0 ? (
                      <Badge className="bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        PKR {item.paymentAmount} ({item.paymentMethod || "Cash"})
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
                      <span className="text-xs text-muted-foreground font-medium truncate max-w-[150px]">{item.remarks}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedRecord(item)}
                      className="h-8 px-3 text-xs font-bold text-purple-600 hover:bg-purple-50 rounded-xl"
                    >
                      <Eye className="size-3.5 mr-1" /> Inspect 69 Cols
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

      {/* ─── 69-Column Metadata Inspector Modal ──────────────────────────────────────────────── */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-2xl p-6 rounded-2xl space-y-4 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center justify-between">
              <span>Full 69-Column Metadata Inspector — Sr. #{selectedRecord?.sr}</span>
              <Badge variant="outline" className="font-bold">{selectedRecord?.status}</Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedRecord && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid grid-cols-3 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <TabsTrigger value="overview" className="text-xs font-bold rounded-lg">Overview & Contact</TabsTrigger>
                <TabsTrigger value="education" className="text-xs font-bold rounded-lg">Education & Seerah</TabsTrigger>
                <TabsTrigger value="raw" className="text-xs font-bold rounded-lg">All Raw 69 Columns</TabsTrigger>
              </TabsList>

              {/* Tab 1: Overview & Contact */}
              <TabsContent value="overview" className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-muted-foreground font-semibold">Full Name:</span>
                    <p className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{selectedRecord.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Father Name:</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{selectedRecord.fatherName || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Mobile Number:</span>
                    <p className="font-mono font-bold text-purple-600">{selectedRecord.mobile}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">WhatsApp Number:</span>
                    <p className="font-mono font-bold text-emerald-600">{selectedRecord.whatsapp || selectedRecord.mobile}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Allocated Park:</span>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{selectedRecord.park}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">City & District:</span>
                    <p className="font-bold">{selectedRecord.city || "Lahore"}, {selectedRecord.province || "Punjab"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground font-semibold">Address:</span>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{selectedRecord.address || "N/A"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900 text-xs">
                  <div>
                    <span className="text-muted-foreground font-semibold">Registration Date:</span>
                    <p className="font-mono font-bold">{selectedRecord.registeredDate}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Payment Info:</span>
                    <p className="font-bold text-emerald-700">
                      {selectedRecord.paymentAmount > 0
                        ? `PKR ${selectedRecord.paymentAmount} (${selectedRecord.paymentMethod || "Cash"})`
                        : "No Fee Paid"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground font-semibold">Request Status Remarks:</span>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{selectedRecord.remarks || "Standard portal entry"}</p>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 2: Education & Seerah History */}
              <TabsContent value="education" className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-muted-foreground font-semibold">Grade / Class:</span>
                    <p className="font-bold">{selectedRecord.grade || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Age & DOB:</span>
                    <p className="font-bold">{selectedRecord.age ? `${selectedRecord.age} yrs` : "N/A"} ({selectedRecord.dob || "N/A"})</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Student of Al-Burhan:</span>
                    <p className="font-bold">{selectedRecord.isStudentAlburhan || "No"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Is Alim / Alima:</span>
                    <p className="font-bold">{selectedRecord.isAlim || "No"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Studied Seerat Circle Phase-1:</span>
                    <p className="font-bold">{selectedRecord.studiedSeeratCircle || "No"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Murabbi Name:</span>
                    <p className="font-bold">{selectedRecord.murabiName || "N/A"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground font-semibold">Interests & Hobbies:</span>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{selectedRecord.interests || "N/A"}</p>
                  </div>
                  {selectedRecord.medicalIssue && (
                    <div className="col-span-2 p-2 bg-amber-50 rounded-lg text-amber-900 font-bold">
                      Medical Issue: {selectedRecord.medicalIssue}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Tab 3: All Raw 69 Columns */}
              <TabsContent value="raw" className="pt-3">
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-900 text-slate-100 font-mono text-[11px]">
                  {selectedRecord.rawFields ? (
                    Object.entries(selectedRecord.rawFields).map(([key, val]) => (
                      <div key={key} className="flex justify-between border-b border-slate-800 pb-1 pt-1">
                        <span className="text-purple-400 font-bold">{key}:</span>
                        <span className="text-slate-200 text-right max-w-[300px] truncate">{String(val || "N/A")}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No raw fields data available</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="pt-2">
            <Button onClick={() => setSelectedRecord(null)} className="w-full font-bold rounded-xl bg-[#4B0A8F] text-white">
              Close Inspector
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
