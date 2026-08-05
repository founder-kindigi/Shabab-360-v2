"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarCheck,
  Plus,
  Loader2,
  FileSpreadsheet,
  Download,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Phone,
  MessageSquare,
  Search,
  MapPin,
  Upload,
  Check,
  Building2,
  TrendingUp,
  BarChart3,
  Calendar,
  Layers,
  GraduationCap,
  ShieldCheck,
  Sliders,
  Lock,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StudentRosterItem = {
  id: string;
  name: string;
  phone: string;
  parkName: string;
  groupName: string;
  role: string;
  grade: string;
  age: number;
  status: "present" | "late" | "absent" | "leave" | "off" | "unmarked";
  attendanceRate: string;
};

type MurabbiRosterItem = {
  id: string;
  name: string;
  phone: string;
  parkName: string;
  role: string; // e.g. "Murabbi Lead", "Sports Lead", "Tadreeb Lead", "Media Lead"
  status: "present" | "late" | "absent" | "leave" | "off";
  mashawaraCount: string;
  delegatedBy: string | null;
};

type DryRunReport = {
  fileName: string;
  totalStudentsProcessed: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  parkSummaries: Array<{ name: string; studentCount: number }>;
  sampleStudents: Array<{
    parkName: string;
    name: string;
    phone: string;
    role: string;
    rate: string;
  }>;
};

const PARK_VENUES = [
  "All Parks",
  "Gulberg",
  "Gulshan Iqbal",
  "Griffin",
  "Johar Town",
  "Gulshan Ravi",
  "State Life",
];

const GROUP_OPTIONS = ["All Groups", "Group 1", "Group 2", "Group 3"];

const WHATSAPP_ABSENT_URDU = (name: string, date: string) =>
  `السلام علیکم ${name}! 👋\n\nامید ہے آپ خیریت سے ہوں گے۔ آج (${date}) کے اسپورٹس سیشن میں آپ کی غیر حاضری محسوس کی گئی۔\n\nصحت مند اور فریش ذہن کے لیے کھیل ہماری ترجیح ہے۔ اگلے سیشن میں اپنی شرکت یقینی بنائیں! 🏃‍♂️⚽\n*_ٹیم شباب 360_*`;

export function ParkAttendancePage() {
  const { data: session } = useSession();
  const userRole = (session?.user?.role || "super_admin").toLowerCase();
  const queryClient = useQueryClient();

  // Top-Level Flow Section Switcher (1. Murabbi Attendance | 2. Shabab Attendance)
  const [attendanceFlowMode, setAttendanceFlowMode] = useState<"shabab" | "murabbi">("shabab");

  // Filters & State for Shabab (Park -> Group -> Students)
  const [selectedParkTab, setSelectedParkTab] = useState("Gulberg");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("Group 1");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  // Pagination (10 records per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals state
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [delegateStaffName, setDelegateStaffName] = useState("");

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [dryRunReport, setDryRunReport] = useState<DryRunReport | null>(null);

  // Check if current user can mark Murabbi Attendance (Park Lead, City Head, Super Admin, or Delegated Staff)
  const isParkLeadOrHq = ["super_admin", "city_head", "park_lead"].includes(userRole);
  const [hasDelegatedAccess, setHasDelegatedAccess] = useState(true); // Demo mode default true for testing
  const canMarkMurabbi = isParkLeadOrHq || hasDelegatedAccess;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedParkTab, selectedGroupFilter, selectedDate, attendanceFlowMode]);

  // Mocked Shabab (Student) Attendance Roster
  const [shababRoster, setShababRoster] = useState<StudentRosterItem[]>([
    { id: "s1", name: "Hamza Shafiq", phone: "923001234567", parkName: "Gulberg", groupName: "Group 1", role: "Student", grade: "9th Class", age: 15, status: "present", attendanceRate: "85%" },
    { id: "s2", name: "Bilal Ahmed", phone: "923219876543", parkName: "Gulberg", groupName: "Group 1", role: "Student", grade: "Hafiz", age: 17, status: "present", attendanceRate: "90%" },
    { id: "s3", name: "Zubair Khan", phone: "923334567890", parkName: "Gulberg", groupName: "Group 1", role: "Student", grade: "10th Class", age: 16, status: "absent", attendanceRate: "75%" },
    { id: "s4", name: "Tariq Mahmood", phone: "923129876543", parkName: "Gulberg", groupName: "Group 2", role: "Student", grade: "2nd Year", age: 18, status: "present", attendanceRate: "94%" },
    { id: "s5", name: "Abdullah Riaz", phone: "923067891234", parkName: "Gulberg", groupName: "Group 2", role: "Student", grade: "9th Class", age: 15, status: "late", attendanceRate: "82%" },
    { id: "s6", name: "Saad Ali", phone: "923145678901", parkName: "Gulberg", groupName: "Group 3", role: "Student", grade: "Hafiz", age: 16, status: "present", attendanceRate: "91%" },
    { id: "s7", name: "Umer Farooq", phone: "923234567890", parkName: "Gulshan Iqbal", groupName: "Group 1", role: "Student", grade: "1st Year", age: 17, status: "present", attendanceRate: "88%" },
    { id: "s8", name: "Mohsin Raza", phone: "923456789012", parkName: "Griffin", groupName: "Group 1", role: "Student", grade: "10th Class", age: 16, status: "absent", attendanceRate: "70%" },
  ]);

  // Mocked Murabbi & Staff Separate Roster
  const [murabbiRoster, setMurabbiRoster] = useState<MurabbiRosterItem[]>([
    { id: "m1", name: "Hasnain Zafar", phone: "923214486762", parkName: "Gulberg", role: "Murabbi Lead", status: "present", mashawaraCount: "28/30", delegatedBy: null },
    { id: "m2", name: "Hanzala Tauseef", phone: "923047178171", parkName: "Gulberg", role: "Tadreeb Lead", status: "late", mashawaraCount: "26/30", delegatedBy: null },
    { id: "m3", name: "Ikram Meer", phone: "923004455667", parkName: "Gulberg", role: "Sports Lead", status: "present", mashawaraCount: "29/30", delegatedBy: null },
    { id: "m4", name: "Imran Amin", phone: "923112233445", parkName: "Gulberg", role: "Skills Muawin", status: "present", mashawaraCount: "27/30", delegatedBy: null },
    { id: "m5", name: "Basit Ahsan", phone: "923223344556", parkName: "Gulberg", role: "Park Admin", status: "present", mashawaraCount: "30/30", delegatedBy: null },
    { id: "m6", name: "Mohsin Iqbal", phone: "923150483023", parkName: "Griffin", role: "Media Lead", status: "present", mashawaraCount: "29/30", delegatedBy: null },
    { id: "m7", name: "Arslan Akram", phone: "923244668878", parkName: "Gulshan Iqbal", role: "Park Lead", status: "present", mashawaraCount: "30/30", delegatedBy: null },
  ]);

  // ── Import Mutations ───────────────────────────────────────────────
  const dryRunMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/admin/attendance/import?dryRun=true`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Dry-run validation failed" }));
        throw new Error(err.error || "Dry-run validation failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setDryRunReport(data.report);
      toast.success("Dry-run preview generated successfully!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const importExecuteMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/admin/attendance/import?dryRun=false`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Import execution failed" }));
        throw new Error(err.error || "Import execution failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Import complete! ${data.importedCount} attendance records reconciled.`);
      setShowImportModal(false);
      setImportFile(null);
      setDryRunReport(null);
      queryClient.invalidateQueries({ queryKey: ["attendance-events"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Toggle Shabab Student Status
  const updateShababStatus = (id: string, newStatus: StudentRosterItem["status"]) => {
    setShababRoster((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    );
    toast.success(`Marked student as ${newStatus.toUpperCase()}`);
  };

  // Toggle Murabbi Status
  const updateMurabbiStatus = (id: string, newStatus: MurabbiRosterItem["status"]) => {
    if (!canMarkMurabbi) {
      toast.error("Only Park Lead (or delegated staff) can mark Murabbi attendance!");
      return;
    }
    setMurabbiRoster((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
    );
    toast.success(`Marked Murabbi as ${newStatus.toUpperCase()}`);
  };

  // Delegate Access Handler
  const handleGrantDelegation = () => {
    if (!delegateStaffName.trim()) return;
    toast.success(`Granted Murabbi attendance marking access to ${delegateStaffName}`);
    setShowDelegateModal(false);
    setDelegateStaffName("");
  };

  // Filtered Shabab Roster (Park -> Group -> Student)
  const filteredShabab = useMemo(() => {
    return shababRoster.filter((s) => {
      const matchesSearch =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery);

      const matchesPark =
        selectedParkTab === "All Parks" || s.parkName.toLowerCase() === selectedParkTab.toLowerCase();

      const matchesGroup =
        selectedGroupFilter === "All Groups" || s.groupName.toLowerCase() === selectedGroupFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "all" || s.status === statusFilter;

      return matchesSearch && matchesPark && matchesGroup && matchesStatus;
    });
  }, [shababRoster, searchQuery, selectedParkTab, selectedGroupFilter, statusFilter]);

  // Paginated Shabab
  const totalPagesShabab = Math.ceil(filteredShabab.length / itemsPerPage) || 1;
  const paginatedShabab = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredShabab.slice(start, start + itemsPerPage);
  }, [filteredShabab, currentPage, itemsPerPage]);

  // Filtered Murabbi Roster (Park Filter)
  const filteredMurabbis = useMemo(() => {
    return murabbiRoster.filter((m) => {
      const matchesPark =
        selectedParkTab === "All Parks" || m.parkName.toLowerCase() === selectedParkTab.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.role.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPark && matchesSearch;
    });
  }, [murabbiRoster, selectedParkTab, searchQuery]);

  return (
    <div className="space-y-6 pb-20">
      {/* ── Header Action Bar ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
            Attendance Operations Hub
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Separate Murabbi Lead attendance & Park ➔ Group Shabab student attendance pipeline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-[140px] text-xs h-9 bg-background"
          />

          <Button
            onClick={() => setShowImportModal(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-semibold text-xs h-9 shadow-xs gap-1.5"
          >
            <FileSpreadsheet className="size-4" /> Import Excel
          </Button>
        </div>
      </div>

      {/* ── 2-Tier Attendance Flow Mode Switcher ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setAttendanceFlowMode("shabab")}
          className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
            attendanceFlowMode === "shabab"
              ? "border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm"
              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-300"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-purple-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                1. Shabab Student Attendance
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Park ➔ Halqa Group student roster. Marked by Park Lead, Park Admin, or Murabbi.
            </p>
          </div>
          {attendanceFlowMode === "shabab" && (
            <Badge className="bg-purple-600 text-white text-[10px]">Active Flow</Badge>
          )}
        </button>

        <button
          onClick={() => setAttendanceFlowMode("murabbi")}
          className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
            attendanceFlowMode === "murabbi"
              ? "border-amber-600 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm"
              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-300"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-amber-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                2. Separate Murabbi Attendance <Lock className="size-3.5 text-amber-600" />
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Murabbi & Staff attendance. Restricted access: Marked by Park Lead or Delegated Staff.
            </p>
          </div>
          {attendanceFlowMode === "murabbi" && (
            <Badge className="bg-amber-600 text-white text-[10px]">Active Flow</Badge>
          )}
        </button>
      </div>

      {/* ── FLOW 1: SHABAB STUDENT ATTENDANCE (PARK -> GROUP -> STUDENTS) ── */}
      {attendanceFlowMode === "shabab" && (
        <div className="space-y-6">
          {/* Step 1: Park & Group Hierarchy Selectors */}
          <Card className="border border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/10 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider flex items-center gap-2">
                <Layers className="size-4 text-purple-600" /> Shabab Pipeline Selector (Park ➔ Halqa Group)
              </h3>
              <Badge variant="outline" className="border-purple-300 text-purple-700 text-[10px]">
                Markable by Park Lead, Park Admin & Murabbi
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Park Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Step 1: Select Park Venue</label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {PARK_VENUES.map((park) => (
                    <button
                      key={park}
                      onClick={() => setSelectedParkTab(park)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        selectedParkTab === park
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 hover:border-purple-300"
                      }`}
                    >
                      {park}
                    </button>
                  ))}
                </div>
              </div>

              {/* Group Selector */}
              <div className="space-y-1 shrink-0">
                <label className="text-[11px] font-semibold text-muted-foreground">Step 2: Select Halqa Group</label>
                <div className="flex items-center gap-1.5">
                  {GROUP_OPTIONS.map((g) => (
                    <button
                      key={g}
                      onClick={() => setSelectedGroupFilter(g)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        selectedGroupFilter === g
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 hover:border-indigo-300"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Shabab Student Roster Table */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="p-4 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <CalendarCheck className="size-4 text-purple-600" /> Shabab Attendance Grid — {selectedParkTab} ({selectedGroupFilter})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Step 3: Mark student attendance for sports session on {selectedDate}.
                  </CardDescription>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search student or phone..."
                    className="pl-9 text-xs h-9 bg-background"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {paginatedShabab.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedShabab.map((student) => (
                    <div
                      key={student.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {student.name}
                          </span>
                          <Badge variant="outline" className="text-[10px] border-purple-200 text-purple-700">
                            {student.parkName}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {student.groupName}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] border-indigo-200 text-indigo-700">
                            <GraduationCap className="size-3 mr-1 inline" /> {student.grade} ({student.age}y)
                          </Badge>
                          <Badge className="text-[10px] bg-emerald-100 text-emerald-800">
                            {student.attendanceRate} Attendance
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                          <span className="flex items-center gap-1">
                            <Phone className="size-3 text-slate-400" />
                            {student.phone}
                          </span>
                        </div>
                      </div>

                      {/* Quick Attendance Marking Action Bar */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 border-r pr-2 border-slate-200 dark:border-slate-800">
                          <button
                            onClick={() => updateShababStatus(student.id, "present")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              student.status === "present"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            Present
                          </button>

                          <button
                            onClick={() => updateShababStatus(student.id, "late")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              student.status === "late"
                                ? "bg-amber-500 text-white shadow-xs"
                                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                            }`}
                          >
                            Late
                          </button>

                          <button
                            onClick={() => updateShababStatus(student.id, "absent")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              student.status === "absent"
                                ? "bg-rose-600 text-white shadow-xs"
                                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                            }`}
                          >
                            Absent
                          </button>

                          <button
                            onClick={() => updateShababStatus(student.id, "leave")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              student.status === "leave"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                            }`}
                          >
                            Leave
                          </button>
                        </div>

                        {student.phone && (
                          <a
                            href={`https://wa.me/${student.phone}?text=${encodeURIComponent(
                              WHATSAPP_ABSENT_URDU(student.name, selectedDate)
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                          >
                            <MessageSquare className="size-3" /> WA Absent Msg
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8">
                  <EmptyState
                    icon={CalendarCheck}
                    title="No Shabab students found"
                    description={`No students enrolled under ${selectedParkTab} - ${selectedGroupFilter}.`}
                  />
                </div>
              )}

              {/* 10 Records Per Page Pagination */}
              {filteredShabab.length > 0 && (
                <div className="p-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs bg-slate-50/40">
                  <div className="text-muted-foreground font-medium">
                    Showing Page {currentPage} of {totalPagesShabab} ({filteredShabab.length} students)
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="h-8 text-xs px-3 bg-background"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPagesShabab}
                      onClick={() => setCurrentPage((p) => Math.min(totalPagesShabab, p + 1))}
                      className="h-8 text-xs px-3 bg-background"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── FLOW 2: SEPARATE MURABBI ATTENDANCE (RESTRICTED ACCESS) ───── */}
      {attendanceFlowMode === "murabbi" && (
        <div className="space-y-6">
          <Card className="border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/10 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <ShieldCheck className="size-4 text-amber-600" /> Dedicated Murabbi & Staff Attendance Desk
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  Restricted workflow: Marked exclusively by <strong>Park Lead</strong> or staff explicitly granted delegation access.
                </p>
              </div>

              {isParkLeadOrHq && (
                <Button
                  onClick={() => setShowDelegateModal(true)}
                  variant="outline"
                  className="border-amber-300 text-amber-800 hover:bg-amber-100 font-semibold text-xs h-8 gap-1.5"
                >
                  <UserPlus className="size-3.5" /> Delegate Access
                </Button>
              )}
            </div>
          </Card>

          {/* Murabbi Roster Grid */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <UserCheck className="size-4 text-amber-600" /> Murabbi Leadership Attendance Roster — {selectedParkTab}
              </CardTitle>
              <CardDescription className="text-xs">
                Track sports session presence & Mashawara attendance for Murabbis, Sports Leads, and Muawins.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMurabbis.map((murabbi) => (
                  <div
                    key={murabbi.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {murabbi.name}
                        </span>
                        <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 text-[10px]">
                          {murabbi.role}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {murabbi.parkName}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          Mashawara: {murabbi.mashawaraCount}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                        <span className="flex items-center gap-1">
                          <Phone className="size-3 text-slate-400" />
                          {murabbi.phone}
                        </span>
                      </div>
                    </div>

                    {/* Murabbi Attendance Marking Action Bar */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => updateMurabbiStatus(murabbi.id, "present")}
                        disabled={!canMarkMurabbi}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          murabbi.status === "present"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        Present
                      </button>

                      <button
                        onClick={() => updateMurabbiStatus(murabbi.id, "late")}
                        disabled={!canMarkMurabbi}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          murabbi.status === "late"
                            ? "bg-amber-500 text-white shadow-xs"
                            : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                        }`}
                      >
                        Late
                      </button>

                      <button
                        onClick={() => updateMurabbiStatus(murabbi.id, "absent")}
                        disabled={!canMarkMurabbi}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          murabbi.status === "absent"
                            ? "bg-rose-600 text-white shadow-xs"
                            : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                        }`}
                      >
                        Absent
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Delegate Access Modal ─────────────────────────────────────── */}
      <Dialog open={showDelegateModal} onOpenChange={setShowDelegateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="size-5 text-amber-600" /> Delegate Murabbi Attendance Marking Access
            </DialogTitle>
            <DialogDescription className="text-xs">
              Grant temporary permission to a staff member to mark Murabbi attendance for this park.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label className="text-xs font-bold">Staff Member Name / Phone</Label>
            <Input
              value={delegateStaffName}
              onChange={(e) => setDelegateStaffName(e.target.value)}
              placeholder="e.g. Usman Akhtar (Park Admin)"
              className="text-xs h-9 bg-background"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelegateModal(false)} className="text-xs">
              Cancel
            </Button>
            <Button onClick={handleGrantDelegation} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold">
              Grant Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
