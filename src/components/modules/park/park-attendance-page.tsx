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

const GROUP_OPTIONS = ["All Groups", "Murabbi & Staff", "Group 1", "Group 2", "Group 3"];

const WHATSAPP_ABSENT_URDU = (name: string, date: string) =>
  `السلام علیکم ${name}! 👋\n\nامید ہے آپ خیریت سے ہوں گے۔ آج (${date}) کے اسپورٹس سیشن میں آپ کی غیر حاضری محسوس کی گئی۔\n\nصحت مند اور فریش ذہن کے لیے کھیل ہماری ترجیح ہے۔ اگلے سیشن میں اپنی شرکت یقینی بنائیں! 🏃‍♂️⚽\n*_ٹیم شباب 360_*`;

export function ParkAttendancePage() {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();
  const queryClient = useQueryClient();

  // Active Main Tab
  const [activeMainTab, setActiveMainTab] = useState("roster");

  // Filters & State
  const [selectedParkTab, setSelectedParkTab] = useState("All Parks");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("All Groups");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  // Pagination (10 records per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals state
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [dryRunReport, setDryRunReport] = useState<DryRunReport | null>(null);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedParkTab, selectedGroupFilter, selectedDate]);

  // Mocked Real Student Roster Data from Excel (277 Active Students)
  const [rosterData, setRosterData] = useState<StudentRosterItem[]>([
    { id: "1", name: "Hasnain Zafar", phone: "923214486762", parkName: "Gulberg", groupName: "Murabbi & Staff", role: "Murabbi Lead", grade: "University", age: 24, status: "present", attendanceRate: "96%" },
    { id: "2", name: "Hanzala Tauseef", phone: "923047178171", parkName: "Gulberg", groupName: "Murabbi & Staff", role: "Tadreeb Lead", grade: "University", age: 23, status: "late", attendanceRate: "88%" },
    { id: "3", name: "Mohsin Iqbal", phone: "923150483023", parkName: "Griffin", groupName: "Murabbi & Staff", role: "Media Lead", grade: "2nd Year", age: 20, status: "present", attendanceRate: "92%" },
    { id: "4", name: "Arslan Akram", phone: "923244668878", parkName: "Gulshan Iqbal", groupName: "Group 1", role: "Group Lead", grade: "1st Year", age: 19, status: "present", attendanceRate: "100%" },
    { id: "5", name: "Usman Akhtar", phone: "923424716182", parkName: "Gulberg", groupName: "Group 1", role: "Tadreeb Muawin", grade: "10th Class", age: 16, status: "present", attendanceRate: "90%" },
    { id: "6", name: "Hamza Shafiq", phone: "923001234567", parkName: "Johar Town", groupName: "Group 2", role: "Student", grade: "9th Class", age: 15, status: "absent", attendanceRate: "75%" },
    { id: "7", name: "Bilal Ahmed", phone: "923219876543", parkName: "Gulshan Ravi", groupName: "Group 2", role: "Student", grade: "Hafiz", age: 17, status: "present", attendanceRate: "85%" },
    { id: "8", name: "Zubair Khan", phone: "923334567890", parkName: "State Life", groupName: "Group 3", role: "Student", grade: "10th Class", age: 16, status: "leave", attendanceRate: "80%" },
    { id: "9", name: "Tariq Mahmood", phone: "923129876543", parkName: "Gulberg", groupName: "Group 3", role: "Student", grade: "2nd Year", age: 18, status: "present", attendanceRate: "94%" },
    { id: "10", name: "Abdullah Riaz", phone: "923067891234", parkName: "Griffin", groupName: "Group 1", role: "Student", grade: "9th Class", age: 15, status: "absent", attendanceRate: "68%" },
    { id: "11", name: "Saad Ali", phone: "923145678901", parkName: "Gulshan Iqbal", groupName: "Group 2", role: "Student", grade: "Hafiz", age: 16, status: "present", attendanceRate: "91%" },
    { id: "12", name: "Umer Farooq", phone: "923234567890", parkName: "Johar Town", groupName: "Group 3", role: "Student", grade: "1st Year", age: 17, status: "late", attendanceRate: "82%" },
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

  // Toggle Marking State
  const updateStudentStatus = (id: string, newStatus: StudentRosterItem["status"]) => {
    setRosterData((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    );
    toast.success(`Marked as ${newStatus.toUpperCase()}`);
  };

  // Filtered Roster
  const filteredRoster = useMemo(() => {
    return rosterData.filter((s) => {
      const matchesSearch =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery) ||
        s.grade.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPark =
        selectedParkTab === "All Parks" || s.parkName.toLowerCase() === selectedParkTab.toLowerCase();

      const matchesGroup =
        selectedGroupFilter === "All Groups" || s.groupName.toLowerCase() === selectedGroupFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "all" || s.status === statusFilter;

      return matchesSearch && matchesPark && matchesGroup && matchesStatus;
    });
  }, [rosterData, searchQuery, selectedParkTab, selectedGroupFilter, statusFilter]);

  // Paginated Roster (10 records per page)
  const totalPages = Math.ceil(filteredRoster.length / itemsPerPage) || 1;
  const paginatedRoster = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRoster.slice(start, start + itemsPerPage);
  }, [filteredRoster, currentPage, itemsPerPage]);

  // Metrics Calculation
  const metrics = useMemo(() => {
    const total = rosterData.length;
    let present = 0;
    let absent = 0;
    let late = 0;

    for (const s of rosterData) {
      if (s.status === "present") present++;
      else if (s.status === "late") late++;
      else if (s.status === "absent") absent++;
    }

    const rate = total > 0 ? `${Math.round(((present + late) / total) * 100)}%` : "100%";
    return { total, present, late, absent, rate };
  }, [rosterData]);

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = ["Student Name", "Mobile Phone", "Park Venue", "Group / Halqa", "Role", "Class / Grade", "Session Status", "Attendance Rate %"];
    const rows = filteredRoster.map((s) => [
      `"${s.name}"`,
      `"${s.phone}"`,
      `"${s.parkName}"`,
      `"${s.groupName}"`,
      `"${s.role}"`,
      `"${s.grade}"`,
      `"${s.status}"`,
      `"${s.attendanceRate}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_roster_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Attendance roster exported successfully!");
  };

  return (
    <div className="space-y-6 pb-20">
      {/* ── Header Action Bar ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
            Attendance & Park Operations Desk
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Real-time sports session attendance, Murabbi Mashawara logs, class-wise stats, and Batch 4 workbook reconciliation.
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
            onClick={handleExportCSV}
            variant="outline"
            className="border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300 font-semibold text-xs h-9 gap-1.5"
          >
            <Download className="size-4" /> CSV
          </Button>

          <Button
            onClick={() => setShowImportModal(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-semibold text-xs h-9 shadow-md gap-1.5"
          >
            <FileSpreadsheet className="size-4" />
            Import Excel
          </Button>
        </div>
      </div>

      {/* ── Main Multi-Tab Navigation Hub ────────────────────────────── */}
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl flex flex-wrap gap-1">
          <TabsTrigger value="roster" className="text-xs font-bold gap-1.5 px-4">
            <CalendarCheck className="size-4 text-purple-600" /> Park Roster & Marking
          </TabsTrigger>
          <TabsTrigger value="comparison" className="text-xs font-bold gap-1.5 px-4">
            <BarChart3 className="size-4 text-emerald-600" /> Park Comparison & Class Stats
          </TabsTrigger>
          <TabsTrigger value="trend" className="text-xs font-bold gap-1.5 px-4">
            <TrendingUp className="size-4 text-indigo-600" /> Monthly Trend
          </TabsTrigger>
          <TabsTrigger value="mashawara" className="text-xs font-bold gap-1.5 px-4">
            <ShieldCheck className="size-4 text-amber-600" /> Murabbi Mashawara Log
          </TabsTrigger>
          <TabsTrigger value="weekends" className="text-xs font-bold gap-1.5 px-4">
            <Sliders className="size-4 text-slate-600" /> OFF Weekends Calendar
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: PARK ROSTER & MARKING GRID ─────────────────────── */}
        <TabsContent value="roster" className="space-y-6">
          {/* KPI Analytics Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border border-purple-100 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/50 to-indigo-50/30 dark:from-purple-950/20 dark:to-indigo-950/10">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                    Total Active Students
                  </p>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                    {metrics.total}
                  </h3>
                </div>
                <div className="size-11 rounded-2xl bg-purple-600/10 text-purple-600 flex items-center justify-center">
                  <Users className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-emerald-100 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Attendance Rate %
                  </p>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                    {metrics.rate}
                  </h3>
                </div>
                <div className="size-11 rounded-2xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-amber-100 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Present & Late
                  </p>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                    {metrics.present + metrics.late}
                  </h3>
                </div>
                <div className="size-11 rounded-2xl bg-amber-600/10 text-amber-600 flex items-center justify-center">
                  <Clock className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-rose-100 dark:border-rose-900/50 bg-gradient-to-br from-rose-50/50 to-red-50/30 dark:from-rose-950/20 dark:to-red-950/10">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                    Absents Requiring Outreach
                  </p>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                    {metrics.absent}
                  </h3>
                </div>
                <div className="size-11 rounded-2xl bg-rose-600/10 text-rose-600 flex items-center justify-center">
                  <XCircle className="size-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Park Venue & Group Filter Bar */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-purple-600" />
                <span className="text-xs font-bold uppercase tracking-wider">Park Venue:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {PARK_VENUES.map((park) => (
                    <button
                      key={park}
                      onClick={() => setSelectedParkTab(park)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                        selectedParkTab === park
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-300"
                      }`}
                    >
                      {park}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Layers className="size-4 text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wider">Halqa Group:</span>
                <Select value={selectedGroupFilter} onValueChange={setSelectedGroupFilter}>
                  <SelectTrigger className="w-[140px] text-xs h-8 bg-background">
                    <SelectValue placeholder="All Groups" />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUP_OPTIONS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Attendance Roster Table */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <CalendarCheck className="size-4 text-purple-600" /> Session Marking Roster Grid
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Mark attendance for sports sessions, view age & educational grade, and trigger WhatsApp reminders.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search student, class, or phone..."
                      className="pl-9 text-xs h-9 bg-background"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px] text-xs h-9 bg-background">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="leave">Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {paginatedRoster.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedRoster.map((student) => (
                    <div
                      key={student.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {student.name}
                          </span>
                          <Badge variant="outline" className="text-[10px] border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300">
                            {student.parkName}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {student.groupName}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] border-indigo-200 text-indigo-700">
                            <GraduationCap className="size-3 mr-1 inline" /> {student.grade} ({student.age}y)
                          </Badge>
                          <Badge className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {student.attendanceRate} Attendance
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                          <span className="flex items-center gap-1">
                            <Phone className="size-3 text-slate-400" />
                            {student.phone}
                          </span>
                          <span>Role: <strong>{student.role}</strong></span>
                        </div>
                      </div>

                      {/* Quick Attendance Marking Action Bar */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 border-r pr-2 border-slate-200 dark:border-slate-800">
                          <button
                            onClick={() => updateStudentStatus(student.id, "present")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              student.status === "present"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                            }`}
                          >
                            Present
                          </button>

                          <button
                            onClick={() => updateStudentStatus(student.id, "late")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              student.status === "late"
                                ? "bg-amber-500 text-white shadow-xs"
                                : "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                            }`}
                          >
                            Late
                          </button>

                          <button
                            onClick={() => updateStudentStatus(student.id, "absent")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              student.status === "absent"
                                ? "bg-rose-600 text-white shadow-xs"
                                : "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                            }`}
                          >
                            Absent
                          </button>

                          <button
                            onClick={() => updateStudentStatus(student.id, "leave")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              student.status === "leave"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300"
                            }`}
                          >
                            Leave
                          </button>
                        </div>

                        {student.phone && (
                          <>
                            <a
                              href={`tel:${student.phone}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors"
                            >
                              <Phone className="size-3" /> Call
                            </a>

                            <a
                              href={`https://wa.me/${student.phone}?text=${encodeURIComponent(
                                WHATSAPP_ABSENT_URDU(student.name, selectedDate)
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors"
                            >
                              <MessageSquare className="size-3" /> WA
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8">
                  <EmptyState
                    icon={CalendarCheck}
                    title="No attendance records found"
                    description="Import Shabab Batch 4 workbook or change filter criteria."
                  />
                </div>
              )}

              {/* Pagination Controls */}
              {filteredRoster.length > 0 && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs bg-slate-50/40 dark:bg-slate-900/20">
                  <div className="text-muted-foreground font-medium">
                    Showing <strong>{Math.min((currentPage - 1) * itemsPerPage + 1, filteredRoster.length)}</strong> to{" "}
                    <strong>{Math.min(currentPage * itemsPerPage, filteredRoster.length)}</strong> of <strong>{filteredRoster.length}</strong> candidates
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

                    <div className="px-3 py-1 bg-white dark:bg-slate-800 border rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200">
                      Page {currentPage} of {totalPages}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="h-8 text-xs px-3 bg-background"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: PARK COMPARISON & CLASS STATS ──────────────────── */}
        <TabsContent value="comparison" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Park Comparison Card */}
            <Card className="border border-slate-200 dark:border-slate-800">
              <CardHeader className="p-4 pb-2 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BarChart3 className="size-4 text-emerald-600" /> Comparative Park Attendance Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {[
                  { name: "Gulberg Park", total: 121, rate: 88, color: "bg-emerald-600" },
                  { name: "Gulshan Iqbal Park", total: 98, rate: 92, color: "bg-purple-600" },
                  { name: "Griffin Ground", total: 62, rate: 85, color: "bg-indigo-600" },
                  { name: "Johar Town Park", total: 88, rate: 79, color: "bg-amber-500" },
                  { name: "Gulshan Ravi Park", total: 76, rate: 81, color: "bg-blue-600" },
                  { name: "State Life Park", total: 42, rate: 84, color: "bg-teal-600" },
                ].map((p) => (
                  <div key={p.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>{p.name} ({p.total} Students)</span>
                      <span className="text-emerald-700 dark:text-emerald-400">{p.rate}% Attendance</span>
                    </div>
                    <Progress value={p.rate} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Class-Wise Educational Statistics Card */}
            <Card className="border border-slate-200 dark:border-slate-800">
              <CardHeader className="p-4 pb-2 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <GraduationCap className="size-4 text-purple-600" /> Educational Grade Breakdown (Batch 4)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {[
                  { grade: "Hafiz-e-Quran", count: 48, rate: "91%" },
                  { grade: "9th / 10th Class", count: 112, rate: "84%" },
                  { grade: "1st Year / 2nd Year", count: 74, rate: "86%" },
                  { grade: "Graduation / University", count: 43, rate: "94%" },
                ].map((g) => (
                  <div key={g.grade} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs">
                    <div className="font-bold">{g.grade}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{g.count} Students</Badge>
                      <Badge className="bg-purple-100 text-purple-800 text-[10px] font-bold">{g.rate} Attended</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB 3: MONTHLY TREND ───────────────────────────────────── */}
        <TabsContent value="trend">
          <Card className="border border-slate-200 dark:border-slate-800">
            <CardHeader className="p-4 pb-2 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="size-4 text-indigo-600" /> Monthly Attendance Progression (May 2026 – Apr 2027)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {[
                  { month: "May 2026", rate: "88%" },
                  { month: "Jun 2026", rate: "91%" },
                  { month: "Jul 2026", rate: "85%" },
                  { month: "Aug 2026", rate: "89%" },
                  { month: "Sep 2026", rate: "92%" },
                  { month: "Oct 2026", rate: "87%" },
                ].map((m) => (
                  <div key={m.month} className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-900 text-center space-y-1">
                    <div className="text-[11px] font-semibold text-muted-foreground">{m.month}</div>
                    <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{m.rate}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 4: MURABBI MASHAWARA LOG ───────────────────────────── */}
        <TabsContent value="mashawara">
          <Card className="border border-slate-200 dark:border-slate-800">
            <CardHeader className="p-4 pb-2 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="size-4 text-amber-600" /> Weekly Murabbi & Staff Mashawara Log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="divide-y text-xs">
                {[
                  { name: "Hasnain Zafar", role: "Murabbi Lead", park: "Gulberg", attended: 28, rate: "93%" },
                  { name: "Hanzala Tauseef", role: "Tadreeb Lead", park: "Gulberg", attended: 26, rate: "87%" },
                  { name: "Mohsin Iqbal", role: "Media Lead", park: "Griffin", attended: 29, rate: "97%" },
                  { name: "Arslan Akram", role: "Park Lead", park: "Gulshan Iqbal", attended: 30, rate: "100%" },
                ].map((m) => (
                  <div key={m.name} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{m.name}</span>
                      <span className="text-muted-foreground ml-2">({m.role} • {m.park})</span>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800 font-bold">{m.attended}/30 Sessions ({m.rate})</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 5: OFF WEEKENDS CALENDAR ───────────────────────────── */}
        <TabsContent value="weekends">
          <Card className="border border-slate-200 dark:border-slate-800">
            <CardHeader className="p-4 pb-2 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sliders className="size-4 text-slate-600" /> Global OFF Weekend & Holiday Calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <p className="text-xs text-muted-foreground">
                Dates marked as <strong>OFF</strong> automatically apply across all 6 parks to exclude sports session attendance calculations.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {["2026-05-10 (Sunday)", "2026-05-24 (Eid Holiday)", "2026-06-14 (Summer Break)", "2026-07-05 (Exam Week)"].map((d) => (
                  <Badge key={d} variant="outline" className="text-xs py-1 px-3 border-rose-200 text-rose-700 bg-rose-50/50">
                    ⚪ {d}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Excel Import Modal ───────────────────────────────────────── */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <FileSpreadsheet className="size-5 text-emerald-600" /> Import Shabab Batch 4 Attendance Workbook
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload <code className="bg-muted px-1 py-0.5 rounded text-purple-700">Shabab_Batch_4_Attendance (1).xlsx</code> to reconcile attendance stats across all 6 parks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 rounded-xl p-6 text-center bg-slate-50/50 dark:bg-slate-900/30 transition-colors">
              <input
                type="file"
                accept=".xlsx"
                id="attendance-excel-input"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImportFile(file);
                    setDryRunReport(null);
                    dryRunMutation.mutate(file);
                  }
                }}
              />

              <label htmlFor="attendance-excel-input" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Upload className="size-6" />
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {importFile ? importFile.name : "Click or drag Shabab_Batch_4_Attendance (.xlsx) file here"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Supports sheets: Gulberg, Gulshan Iqbal, Griffin, Johar Town, Gulshan Ravi, State Life.
                  </p>
                </div>
              </label>
            </div>

            {dryRunMutation.isPending && (
              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 flex items-center justify-center gap-3 text-purple-700 dark:text-purple-300 text-xs font-semibold">
                <Loader2 className="size-4 animate-spin" /> Analyzing attendance workbook...
              </div>
            )}

            {dryRunReport && (
              <Card className="border border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" /> Attendance Dry-Run Reconciliation
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-3 text-xs">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-background/80 p-2 rounded-lg border">
                      <div className="text-[10px] text-muted-foreground">Total Students</div>
                      <div className="text-base font-black">{dryRunReport.totalStudentsProcessed}</div>
                    </div>

                    <div className="bg-background/80 p-2 rounded-lg border">
                      <div className="text-[10px] font-semibold text-emerald-600">P/L Markings</div>
                      <div className="text-base font-black text-emerald-600">{dryRunReport.presentCount}</div>
                    </div>

                    <div className="bg-background/80 p-2 rounded-lg border">
                      <div className="text-[10px] font-semibold text-rose-600">Absents</div>
                      <div className="text-base font-black text-rose-600">{dryRunReport.absentCount}</div>
                    </div>

                    <div className="bg-background/80 p-2 rounded-lg border">
                      <div className="text-[10px] font-semibold text-slate-600">Parks Found</div>
                      <div className="text-base font-black">{dryRunReport.parkSummaries.length}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportModal(false)} className="text-xs">
              Cancel
            </Button>

            {dryRunReport && (
              <Button
                onClick={() => importFile && importExecuteMutation.mutate(importFile)}
                disabled={importExecuteMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2"
              >
                {importExecuteMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Check className="size-4" /> Import Attendance Data
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
