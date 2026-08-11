"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  Users,
  CheckCircle2,
  Phone,
  MessageSquare,
  Search,
  TrendingUp,
  Calendar,
  Layers,
  GraduationCap,
  ShieldCheck,
  Lock,
  UserCheck,
  UserPlus,
  AlertTriangle,
  Activity,
  MapPin,
  ChevronLeft,
  ChevronRight,
  UserMinus,
  Sparkles,
  Zap,
  Filter,
  Share2,
  Clock,
  XCircle,
  Check,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---
export type AttendanceStatus = "present" | "late" | "absent" | "leave" | "unmarked";

export type StudentRosterItem = {
  id: string;
  serial: number;
  name: string;
  phone: string;
  ownPhone: boolean;
  age: number | null;
  grade: string;
  parkName: string;
  groupName: string;
  status: AttendanceStatus;
  consecutiveAbsences: number;
};

export type MurabbiRosterItem = {
  id: string;
  serial: number;
  name: string;
  phone: string;
  parkName: string;
  roles: string[];
  status: AttendanceStatus;
};

// --- Mock Data ---
const PARKS_MOCK = [
  { name: "Gulberg", groups: ["Group 1 | Murabbi: Ikram", "Group 2 | Murabbi: Hanzala Tauseef", "Group 3 | Murabbi: Hasnain bhai"] },
  { name: "Gulshan Iqbal", groups: ["Group 1", "Group 2", "Group 3"] },
  { name: "Griffin", groups: ["Group 1", "Group 2"] },
  { name: "Johar Town", groups: ["Group 1", "Group 2"] },
  { name: "Gulshan Ravi", groups: ["Group 1", "Group 2"] },
  { name: "State Life", groups: ["Group 1"] },
];

const INITIAL_MURABBI_DATA: MurabbiRosterItem[] = [
  { id: "m1", serial: 1, name: "Umar Rohail", phone: "923051801847", parkName: "Gulberg", roles: ["Park Lead"], status: "present" },
  { id: "m2", serial: 2, name: "Hasnain Zafar", phone: "923060221997", parkName: "Gulberg", roles: ["Murabbi", "Tadreeb Muawin"], status: "present" },
  { id: "m3", serial: 3, name: "Hanzala Tauseef", phone: "923047178171", parkName: "Gulberg", roles: ["Murabbi", "Tadreeb Lead"], status: "present" },
  { id: "m4", serial: 4, name: "Ikram Meer", phone: "923364543324", parkName: "Gulberg", roles: ["Murabbi", "Skills Lead"], status: "present" },
  { id: "m5", serial: 5, name: "Imran Amin", phone: "923294368993", parkName: "Gulberg", roles: ["Sports Lead", "Muawin G12"], status: "present" },
  { id: "m6", serial: 6, name: "Hammad Raza", phone: "923220774124", parkName: "Gulberg", roles: ["Sports Muawin", "Muawin G13"], status: "late" },
  { id: "m7", serial: 7, name: "Basit Ahsan", phone: "923226720331", parkName: "Gulberg", roles: ["Park Admin", "Muawin G13"], status: "present" },
  { id: "m8", serial: 8, name: "Abdul Kabeer", phone: "923244190830", parkName: "Gulberg", roles: ["Media Lead", "Muawin G11"], status: "present" },
  { id: "m9", serial: 9, name: "Abdul Rehman Munir", phone: "923080114534", parkName: "Gulberg", roles: ["Skills Muawin"], status: "present" },
  { id: "m10", serial: 10, name: "Haseeb Ahmad", phone: "923114322095", parkName: "Gulberg", roles: ["Sports Officer"], status: "absent" },
  { id: "m11", serial: 11, name: "Abu Hurairah", phone: "", parkName: "Gulberg", roles: ["Sports Officer"], status: "present" },
  { id: "m12", serial: 12, name: "Abdullah Saif", phone: "923104362545", parkName: "Gulberg", roles: ["Murabbi"], status: "present" },
  { id: "m13", serial: 13, name: "Ameer Hamza", phone: "923247197841", parkName: "Gulberg", roles: ["Sports Officer"], status: "present" },
];

const INITIAL_STUDENT_DATA: StudentRosterItem[] = [
  { id: "s1", serial: 1, name: "Muhammad Umair", phone: "923274088002", ownPhone: false, age: 13, grade: "8th", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "present", consecutiveAbsences: 0 },
  { id: "s2", serial: 2, name: "Muhammad Ahmad", phone: "923001234567", ownPhone: false, age: 13, grade: "8th", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "present", consecutiveAbsences: 0 },
  { id: "s3", serial: 3, name: "Muhammad Umar", phone: "923002345678", ownPhone: false, age: 13, grade: "8th", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "late", consecutiveAbsences: 0 },
  { id: "s4", serial: 4, name: "Muhammad Shoaib", phone: "923003456789", ownPhone: false, age: 13, grade: "8th", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "present", consecutiveAbsences: 0 },
  { id: "s5", serial: 5, name: "M Abdullah Qureshi", phone: "923004567890", ownPhone: true, age: 14, grade: "9th", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "absent", consecutiveAbsences: 2 },
  { id: "s6", serial: 6, name: "M.Moosa", phone: "923005678901", ownPhone: false, age: 14, grade: "10th", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "present", consecutiveAbsences: 0 },
  { id: "s7", serial: 7, name: "Muhammad Abdullah Ahmad", phone: "923006789012", ownPhone: false, age: 14, grade: "9th", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "present", consecutiveAbsences: 0 },
  { id: "s8", serial: 8, name: "Muhammad Yousuf", phone: "923007890123", ownPhone: false, age: 14, grade: "9th", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "leave", consecutiveAbsences: 0 },
  { id: "s9", serial: 9, name: "Muhammad Huzaifa Saif", phone: "923234977806", ownPhone: true, age: 14, grade: "9th", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "absent", consecutiveAbsences: 3 },
  { id: "s10", serial: 10, name: "Muhammad Yusha", phone: "923334649728", ownPhone: false, age: 14, grade: "10th", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "present", consecutiveAbsences: 0 },
  { id: "s11", serial: 11, name: "Muaz Zakariya Majid", phone: "923334349783", ownPhone: false, age: 14, grade: "Hafiz", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "present", consecutiveAbsences: 0 },
  { id: "s12", serial: 12, name: "Muhammad Shaheer Shamsi", phone: "923004188623", ownPhone: false, age: 14, grade: "9th", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "present", consecutiveAbsences: 0 },
  { id: "s13", serial: 13, name: "Muhammad Umer Karamat", phone: "923214688055", ownPhone: true, age: 14, grade: "O Level", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "present", consecutiveAbsences: 0 },
];

export function ParkAttendancePage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "park_lead";

  // Flow & State
  const [activeFlow, setActiveFlow] = useState<"student" | "murabbi">("student");
  const [selectedPark, setSelectedPark] = useState("Gulberg");
  const [selectedGroup, setSelectedGroup] = useState("Group 1 | Murabbi: Ikram");
  const [selectedDate, setSelectedDate] = useState("2026-08-11");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Roster Datasets
  const [students, setStudents] = useState<StudentRosterItem[]>(INITIAL_STUDENT_DATA);
  const [murabbis, setMurabbis] = useState<MurabbiRosterItem[]>(INITIAL_MURABBI_DATA);

  // Bulk Selection & Modals
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [whatsappModalData, setWhatsappModalData] = useState<{ name: string; phone: string } | null>(null);
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);

  // Sync groups when park changes
  const parkInfo = useMemo(() => PARKS_MOCK.find((p) => p.name === selectedPark) || PARKS_MOCK[0], [selectedPark]);

  useEffect(() => {
    if (parkInfo.groups.length > 0) {
      setSelectedGroup(parkInfo.groups[0]);
    }
  }, [parkInfo]);

  // Handle status update
  const handleStudentStatusChange = (id: string, newStatus: AttendanceStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    );
    toast.success(`Updated attendance status to ${newStatus.toUpperCase()}`);
  };

  const handleMurabbiStatusChange = (id: string, newStatus: AttendanceStatus) => {
    setMurabbis((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
    );
    toast.success(`Updated Murabbi attendance to ${newStatus.toUpperCase()}`);
  };

  const handleMarkAllPresent = () => {
    if (activeFlow === "student") {
      setStudents((prev) => prev.map((s) => ({ ...s, status: "present" })));
      toast.success("Marked all students as PRESENT!");
    } else {
      setMurabbis((prev) => prev.map((m) => ({ ...m, status: "present" })));
      toast.success("Marked all Murabbis as PRESENT!");
    }
  };

  // Filtered Roster
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.phone.includes(searchQuery);
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [students, searchQuery, statusFilter]);

  const filteredMurabbis = useMemo(() => {
    return murabbis.filter((m) => {
      const matchSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.phone.includes(searchQuery);
      const matchStatus = statusFilter === "all" || m.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [murabbis, searchQuery, statusFilter]);

  // Pagination
  const totalItems = activeFlow === "student" ? filteredStudents.length : filteredMurabbis.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const paginatedMurabbis = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMurabbis.slice(start, start + itemsPerPage);
  }, [filteredMurabbis, currentPage]);

  // Statistics
  const stats = useMemo(() => {
    const currentDataset = activeFlow === "student" ? students : murabbis;
    const total = currentDataset.length;
    const present = currentDataset.filter((i) => i.status === "present").length;
    const late = currentDataset.filter((i) => i.status === "late").length;
    const absent = currentDataset.filter((i) => i.status === "absent").length;
    const leave = currentDataset.filter((i) => i.status === "leave").length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    const atRisk = students.filter((s) => s.consecutiveAbsences >= 2).length;

    return { total, present, late, absent, leave, rate, atRisk };
  }, [students, murabbis, activeFlow]);

  // WhatsApp Alert Generator
  const triggerWhatsappAlert = (name: string, phone: string) => {
    setWhatsappModalData({ name, phone });
  };

  const openWhatsappDirect = () => {
    if (!whatsappModalData) return;
    const text = encodeURIComponent(
      `السلام علیکم! آپ کا بیٹا ${whatsappModalData.name} آج شباب ۳۶۰ کے تربیتی سیشن میں غیر حاضر رہا۔ براہ کرم خیریت سے مطلع فرمائیں۔ جزاک اللہ خیر۔`
    );
    window.open(`https://wa.me/${whatsappModalData.phone}?text=${text}`, "_blank");
    setWhatsappModalData(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-1 pb-8 space-y-6">
      {/* ─── Hero Header & Action Bar ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-[#4B0A8F]/10 via-purple-500/5 to-transparent p-5 rounded-2xl border border-purple-200/60 dark:border-purple-900/40">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-[#4B0A8F] text-white gap-1 text-xs">
              <Zap className="size-3" /> Live Marking Desk
            </Badge>
            <Badge variant="outline" className="text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800 text-xs">
              {selectedPark} Park • {selectedGroup}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            Park Attendance & Operational Marking Studio
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mark daily cadet attendance, manage Murabbi staff presence, track consecutive absence alerts, and send instant Urdu WhatsApp dispatches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-36 text-xs h-9 bg-background border-slate-300 dark:border-slate-700"
          />

          <Button
            size="sm"
            onClick={handleMarkAllPresent}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1.5 shadow"
          >
            <CheckCircle2 className="size-4" />
            <span>Mark All Present</span>
          </Button>

          {userRole === "park_lead" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDelegateModalOpen(true)}
              className="text-xs h-9 gap-1.5 border-slate-300 dark:border-slate-700"
            >
              <UserPlus className="size-4 text-purple-600" />
              <span>Delegate Access</span>
            </Button>
          )}
        </div>
      </div>

      {/* ─── 4 Top KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Today's Session Scope
                </p>
                <h3 className="text-xl font-bold text-foreground mt-1">{selectedPark} Park</h3>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">
                  {selectedGroup}
                </p>
              </div>
              <div className="size-12 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <MapPin className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Live Attendance Rate
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{stats.rate}% Rate</h3>
                <div className="w-28 mt-2">
                  <Progress value={stats.rate} className="h-1.5" />
                </div>
              </div>
              <div className="size-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status Breakdown
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-[10px]">
                    {stats.present} P
                  </Badge>
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 text-[10px]">
                    {stats.late} L
                  </Badge>
                  <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 text-[10px]">
                    {stats.absent} A
                  </Badge>
                </div>
              </div>
              <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Activity className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Absence Risk Alerts
                </p>
                <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {stats.atRisk} At Risk
                </h3>
                <p className="text-xs text-muted-foreground mt-1">2+ Consecutive Absences</p>
              </div>
              <div className="size-12 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── DUAL ROSTER FLOW SWITCHER ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => { setActiveFlow("student"); setCurrentPage(1); }}
          className={cn(
            "p-4 rounded-2xl border text-left transition-all flex items-center justify-between shadow-sm",
            activeFlow === "student"
              ? "bg-gradient-to-br from-[#4B0A8F] to-indigo-700 text-white border-transparent shadow-purple-500/20"
              : "bg-card border-slate-200 dark:border-slate-800 text-foreground hover:border-purple-300"
          )}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <GraduationCap className="size-5" />
              <span className="font-bold text-base">Shabab Student Cadet Attendance</span>
            </div>
            <p className={cn("text-xs", activeFlow === "student" ? "text-purple-100" : "text-muted-foreground")}>
              Mark daily attendance for enrolled cadets across park groups.
            </p>
          </div>
          <Badge className={activeFlow === "student" ? "bg-white text-[#4B0A8F]" : "bg-purple-100 text-purple-700"}>
            {students.length} Cadets
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => { setActiveFlow("murabbi"); setCurrentPage(1); }}
          className={cn(
            "p-4 rounded-2xl border text-left transition-all flex items-center justify-between shadow-sm",
            activeFlow === "murabbi"
              ? "bg-gradient-to-br from-amber-600 to-orange-700 text-white border-transparent shadow-amber-500/20"
              : "bg-card border-slate-200 dark:border-slate-800 text-foreground hover:border-amber-300"
          )}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5" />
              <span className="font-bold text-base">Murabbi & Staff Attendance</span>
            </div>
            <p className={cn("text-xs", activeFlow === "murabbi" ? "text-amber-100" : "text-muted-foreground")}>
              Separate restricted attendance desk for Murabbis, Park Leads & Officers.
            </p>
          </div>
          <Badge className={activeFlow === "murabbi" ? "bg-white text-amber-800" : "bg-amber-100 text-amber-800"}>
            {murabbis.length} Staff
          </Badge>
        </button>
      </div>

      {/* ─── PARK & GROUP PILL SELECTORS ─── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-2">Select Park:</span>
          {PARKS_MOCK.map((park) => (
            <Button
              key={park.name}
              type="button"
              size="sm"
              variant={selectedPark === park.name ? "default" : "outline"}
              onClick={() => { setSelectedPark(park.name); setCurrentPage(1); }}
              className={cn(
                "h-8 text-xs font-semibold rounded-xl transition-all",
                selectedPark === park.name
                  ? "bg-[#4B0A8F] text-white shadow-sm"
                  : "border-slate-200 dark:border-slate-800 text-muted-foreground hover:text-foreground"
              )}
            >
              <MapPin className="size-3 mr-1" />
              {park.name}
            </Button>
          ))}
        </div>

        {activeFlow === "student" && parkInfo.groups.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-2">Select Group:</span>
            {parkInfo.groups.map((group) => (
              <Button
                key={group}
                type="button"
                size="sm"
                variant={selectedGroup === group ? "secondary" : "ghost"}
                onClick={() => { setSelectedGroup(group); setCurrentPage(1); }}
                className={cn(
                  "h-7 text-xs font-medium rounded-lg",
                  selectedGroup === group
                    ? "bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 font-bold"
                    : "text-muted-foreground"
                )}
              >
                {group}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* ─── SEARCH & STATUS FILTER BAR ─── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${activeFlow === "student" ? "cadet" : "staff"} name or phone...`}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-9 text-xs h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: "all", label: "All Statuses" },
            { id: "present", label: "Present" },
            { id: "late", label: "Late" },
            { id: "absent", label: "Absent" },
            { id: "leave", label: "Leave" },
          ].map((f) => (
            <Button
              key={f.id}
              type="button"
              variant={statusFilter === f.id ? "default" : "ghost"}
              size="sm"
              onClick={() => { setStatusFilter(f.id); setCurrentPage(1); }}
              className={cn("h-7 text-xs rounded-lg px-2.5", statusFilter === f.id ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold" : "text-muted-foreground")}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ─── ATTENDANCE ROSTER TABLE ─── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-muted-foreground font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12">#</th>
                <th className="py-3 px-4">{activeFlow === "student" ? "Cadet Name & Grade" : "Staff Name & Roles"}</th>
                <th className="py-3 px-4">Contact Phone</th>
                {activeFlow === "student" && <th className="py-3 px-4">Age / Grade</th>}
                <th className="py-3 px-4 text-center">Interactive Status Toggle</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-foreground">
              {activeFlow === "student" ? (
                paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No cadets found matching search query or filters.
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-muted-foreground font-semibold">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold text-xs">
                            {s.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-foreground">{s.name}</span>
                              {s.consecutiveAbsences >= 2 && (
                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 text-[9px] px-1 py-0">
                                  {s.consecutiveAbsences}x Absences Risk
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground">{s.groupName}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        {s.phone ? (
                          <div className="flex items-center gap-1">
                            <span>{s.phone}</span>
                            {s.ownPhone && <Badge variant="outline" className="text-[9px]">Own</Badge>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant="secondary" className="text-[10px]">
                          {s.grade || "Cadet"} ({s.age ? `${s.age} yrs` : "-"})
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleStudentStatusChange(s.id, "present")}
                            className={cn(
                              "h-7 text-[11px] font-bold px-2.5 rounded-lg transition-all",
                              s.status === "present"
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-400"
                            )}
                          >
                            Present
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleStudentStatusChange(s.id, "late")}
                            className={cn(
                              "h-7 text-[11px] font-bold px-2.5 rounded-lg transition-all",
                              s.status === "late"
                                ? "bg-amber-500 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700 dark:bg-slate-800 dark:text-slate-400"
                            )}
                          >
                            Late
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleStudentStatusChange(s.id, "absent")}
                            className={cn(
                              "h-7 text-[11px] font-bold px-2.5 rounded-lg transition-all",
                              s.status === "absent"
                                ? "bg-rose-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-700 dark:bg-slate-800 dark:text-slate-400"
                            )}
                          >
                            Absent
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleStudentStatusChange(s.id, "leave")}
                            className={cn(
                              "h-7 text-[11px] font-bold px-2.5 rounded-lg transition-all",
                              s.status === "leave"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 dark:bg-slate-800 dark:text-slate-400"
                            )}
                          >
                            Leave
                          </Button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => triggerWhatsappAlert(s.name, s.phone)}
                          className="h-7 text-[11px] text-emerald-700 border-emerald-300 dark:border-emerald-800 dark:text-emerald-400 gap-1"
                        >
                          <MessageSquare className="size-3" />
                          <span>WhatsApp</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                )
              ) : (
                paginatedMurabbis.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      No staff members found matching search query or filters.
                    </td>
                  </tr>
                ) : (
                  paginatedMurabbis.map((m, idx) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-muted-foreground font-semibold">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold text-xs">
                            {m.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-foreground">{m.name}</span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {m.roles.map((r) => (
                                <Badge key={r} className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 text-[9px] px-1 py-0">
                                  {r}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        {m.phone ? <span>{m.phone}</span> : <span className="text-muted-foreground">-</span>}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleMurabbiStatusChange(m.id, "present")}
                            className={cn(
                              "h-7 text-[11px] font-bold px-2.5 rounded-lg transition-all",
                              m.status === "present"
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-emerald-100 dark:bg-slate-800"
                            )}
                          >
                            Present
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleMurabbiStatusChange(m.id, "late")}
                            className={cn(
                              "h-7 text-[11px] font-bold px-2.5 rounded-lg transition-all",
                              m.status === "late"
                                ? "bg-amber-500 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-amber-100 dark:bg-slate-800"
                            )}
                          >
                            Late
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleMurabbiStatusChange(m.id, "absent")}
                            className={cn(
                              "h-7 text-[11px] font-bold px-2.5 rounded-lg transition-all",
                              m.status === "absent"
                                ? "bg-rose-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-rose-100 dark:bg-slate-800"
                            )}
                          >
                            Absent
                          </Button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => triggerWhatsappAlert(m.name, m.phone)}
                          className="h-7 text-[11px] text-slate-600"
                        >
                          <MessageSquare className="size-3 mr-1" /> Call Staff
                        </Button>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>

        {/* ─── PAGINATION FOOTER ─── */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-xs">
          <span className="text-muted-foreground">
            Showing {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
            {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2"
            >
              <ChevronLeft className="size-4" />
            </Button>

            <span className="px-2 font-medium text-foreground">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-2"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ─── URDU WHATSAPP ALERT MODAL ─── */}
      <Dialog open={!!whatsappModalData} onOpenChange={() => setWhatsappModalData(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <MessageSquare className="size-5 text-emerald-600" />
              Send Urdu WhatsApp Absentee Alert
            </DialogTitle>
            <DialogDescription className="text-xs">
              Dispatch pre-formatted Urdu notification to parent or cadet.
            </DialogDescription>
          </DialogHeader>

          {whatsappModalData && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 text-right font-semibold text-foreground text-sm leading-relaxed">
                "السلام علیکم! آپ کا بیٹا <span className="text-purple-600 font-bold">{whatsappModalData.name}</span> آج شباب ۳۶۰ کے تربیتی سیشن میں غیر حاضر رہا۔ براہ کرم خیریت سے مطلع فرمائیں۔ جزاک اللہ خیر۔"
              </div>

              <p className="text-muted-foreground text-[11px]">
                Recipient: <span className="font-bold text-foreground">{whatsappModalData.name}</span> ({whatsappModalData.phone})
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setWhatsappModalData(null)}>Cancel</Button>
            <Button onClick={openWhatsappDirect} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <MessageSquare className="size-4" /> Open WhatsApp Web
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DELEGATE ACCESS MODAL ─── */}
      <Dialog open={isDelegateModalOpen} onOpenChange={setIsDelegateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <UserPlus className="size-5 text-[#4B0A8F]" />
              Delegate Attendance Marking Access
            </DialogTitle>
            <DialogDescription className="text-xs">
              Grant temporary attendance marking permissions to a Murabbi or Sports Lead for {selectedPark} Park.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Select Delegate Staff Member</Label>
              <Select defaultValue="m3">
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose Murabbi..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="m3">Hanzala Tauseef (Murabbi & Tadreeb Lead)</SelectItem>
                  <SelectItem value="m4">Ikram Meer (Murabbi & Skills Lead)</SelectItem>
                  <SelectItem value="m5">Imran Amin (Sports Lead)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Delegation Expiry</Label>
              <Input type="date" defaultValue="2026-08-12" className="h-9 text-xs" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDelegateModalOpen(false)}>Cancel</Button>
            <Button onClick={() => { setIsDelegateModalOpen(false); toast.success("Delegation access granted successfully!"); }} className="bg-[#4B0A8F] text-white">
              Grant Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
