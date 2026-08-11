"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
  CheckCircle2,
  Phone,
  MessageSquare,
  Search,
  TrendingUp,
  GraduationCap,
  ShieldCheck,
  UserPlus,
  AlertTriangle,
  Activity,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Zap,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Calendar as CalendarIcon,
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
  { id: "m5", serial: 5, name: "Imran Amin", phone: "923294368993", parkName: "Gulberg", roles: ["Sports Lead"], status: "present" },
  { id: "m6", serial: 6, name: "Hammad Raza", phone: "923220774124", parkName: "Gulberg", roles: ["Sports Muawin"], status: "late" },
  { id: "m7", serial: 7, name: "Basit Ahsan", phone: "923226720331", parkName: "Gulberg", roles: ["Park Admin"], status: "present" },
  { id: "m8", serial: 8, name: "Abdul Kabeer", phone: "923244190830", parkName: "Gulberg", roles: ["Media Lead"], status: "present" },
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
  const userAssignedPark = (session?.user as any)?.parkName || "Gulberg";

  // Check if role is authorized to switch parks (City Lead / Super Admin)
  const canSwitchParks = userRole === "city_head" || userRole === "super_admin" || userRole === "admin";

  // Flow & View State
  const [activeTab, setActiveTab] = useState<"students" | "staff">("students");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid"); // DEFAULT CARD GRID
  const [selectedPark, setSelectedPark] = useState(canSwitchParks ? "Gulberg" : userAssignedPark);
  const [selectedGroup, setSelectedGroup] = useState("Group 1 | Murabbi: Ikram");
  const [selectedDate, setSelectedDate] = useState("2026-08-11");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showSummaryDrawer, setShowSummaryDrawer] = useState(false); // COLLAPSED BY DEFAULT FOR FAST MARKING
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const itemsPerPage = 10;

  // Datasets
  const [students, setStudents] = useState<StudentRosterItem[]>(INITIAL_STUDENT_DATA);
  const [murabbis, setMurabbis] = useState<MurabbiRosterItem[]>(INITIAL_MURABBI_DATA);

  // Modals
  const [whatsappModalData, setWhatsappModalData] = useState<{ name: string; phone: string } | null>(null);
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);

  const parkInfo = useMemo(() => PARKS_MOCK.find((p) => p.name === selectedPark) || PARKS_MOCK[0], [selectedPark]);

  useEffect(() => {
    if (parkInfo.groups.length > 0) {
      setSelectedGroup(parkInfo.groups[0]);
    }
  }, [parkInfo]);

  // Quick Status Updaters
  const handleStudentStatusChange = (id: string, newStatus: AttendanceStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    );
    toast.success(`Marked ${newStatus.toUpperCase()}`);
  };

  const handleMurabbiStatusChange = (id: string, newStatus: AttendanceStatus) => {
    setMurabbis((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
    );
    toast.success(`Marked Staff ${newStatus.toUpperCase()}`);
  };

  const handleMarkAllPresent = () => {
    if (activeTab === "students") {
      setStudents((prev) => prev.map((s) => ({ ...s, status: "present" })));
      toast.success("Marked all students PRESENT!");
    } else {
      setMurabbis((prev) => prev.map((m) => ({ ...m, status: "present" })));
      toast.success("Marked all staff PRESENT!");
    }
  };

  // Filtered Datasets
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
  const totalItems = activeTab === "students" ? filteredStudents.length : filteredMurabbis.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const paginatedMurabbis = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMurabbis.slice(start, start + itemsPerPage);
  }, [filteredMurabbis, currentPage]);

  // Metrics
  const stats = useMemo(() => {
    const dataset = activeTab === "students" ? students : murabbis;
    const total = dataset.length;
    const present = dataset.filter((i) => i.status === "present").length;
    const late = dataset.filter((i) => i.status === "late").length;
    const absent = dataset.filter((i) => i.status === "absent").length;
    const leave = dataset.filter((i) => i.status === "leave").length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    const atRisk = students.filter((s) => s.consecutiveAbsences >= 2).length;

    return { total, present, late, absent, leave, rate, atRisk };
  }, [students, murabbis, activeTab]);

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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-1 pb-28 sm:pb-12 space-y-4">
      {/* ─── STICKY OPERATIONAL HEADER (DATE → GROUP → MARK) ─── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">Attendance</h1>
              <Badge variant="outline" className="text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800 font-bold">
                {selectedPark} Park
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.present} / {stats.total} Marked Present ({stats.rate}% Rate)
            </p>
          </div>

          <div className="flex items-center gap-2">
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
          </div>
        </div>

        {/* Multi-Park Switcher (ONLY VISIBLE FOR CITY HEAD / ADMIN) */}
        {canSwitchParks && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-muted-foreground mr-1">Park:</span>
            {PARKS_MOCK.map((park) => (
              <button
                key={park.name}
                type="button"
                onClick={() => { setSelectedPark(park.name); setCurrentPage(1); }}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
                  selectedPark === park.name
                    ? "bg-[#4B0A8F] text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
                )}
              >
                {park.name}
              </button>
            ))}
          </div>
        )}

        {/* Group Selector Pills (IMMEDIATELY ACCESSIBLE) */}
        {activeTab === "students" && parkInfo.groups.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-muted-foreground mr-1">Select Group:</span>
            {parkInfo.groups.map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => { setSelectedGroup(group); setCurrentPage(1); }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                  selectedGroup === group
                    ? "bg-purple-100 text-purple-950 dark:bg-purple-950 dark:text-purple-300 font-bold border border-purple-300 dark:border-purple-800"
                    : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
                )}
              >
                {group}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── TABS & COMPACT ANALYTICS TOGGLE ─── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Main Roster Tabs (Students vs Staff) */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => { setActiveTab("students"); setCurrentPage(1); }}
            className={cn(
              "flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
              activeTab === "students"
                ? "bg-white dark:bg-slate-900 text-purple-900 dark:text-purple-300 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <GraduationCap className="size-4" />
            <span>Students ({students.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("staff"); setCurrentPage(1); }}
            className={cn(
              "flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
              activeTab === "staff"
                ? "bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-300 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ShieldCheck className="size-4" />
            <span>Staff ({murabbis.length})</span>
          </button>
        </div>

        <div className="flex items-center justify-between w-full sm:w-auto gap-2">
          {/* Collapsible Analytics Toggle Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSummaryDrawer(!showSummaryDrawer)}
            className="h-8 text-xs gap-1.5 text-muted-foreground"
          >
            <BarChart2 className="size-3.5" />
            <span>{showSummaryDrawer ? "Hide Summary" : "Summary & Risk Alerts"}</span>
            {showSummaryDrawer ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </Button>

          {/* View Mode Toggle: Grid Cards (Default) vs Table */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all px-2",
                viewMode === "grid"
                  ? "bg-white dark:bg-slate-900 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="size-3.5" />
              <span>Cards</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "p-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all px-2",
                viewMode === "table"
                  ? "bg-white dark:bg-slate-900 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="size-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── COLLAPSIBLE ANALYTICS DRAWER ─── */}
      {showSummaryDrawer && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border shadow-sm">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Attendance Rate</p>
            <h4 className="text-lg font-bold text-foreground mt-1">{stats.rate}%</h4>
            <Progress value={stats.rate} className="h-1 mt-1.5" />
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border shadow-sm">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Status Counts</p>
            <div className="flex items-center gap-1 mt-1.5">
              <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">{stats.present} P</Badge>
              <Badge className="bg-amber-100 text-amber-800 text-[10px]">{stats.late} L</Badge>
              <Badge className="bg-rose-100 text-rose-800 text-[10px]">{stats.absent} A</Badge>
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border shadow-sm">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Absence Risk</p>
            <h4 className="text-lg font-bold text-amber-600 mt-1">{stats.atRisk} Cadets</h4>
            <p className="text-[10px] text-muted-foreground">2+ Consecutive Absences</p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border shadow-sm">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Delegation</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDelegateModalOpen(true)}
              className="h-7 text-[11px] w-full mt-1.5"
            >
              Delegate Access
            </Button>
          </div>
        </div>
      )}

      {/* ─── SEARCH & QUICK FILTER PILLS ─── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${activeTab === "students" ? "student" : "staff"} name...`}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-9 text-xs h-9 bg-white dark:bg-slate-900"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {[
            { id: "all", label: "All" },
            { id: "present", label: "Present" },
            { id: "late", label: "Late" },
            { id: "absent", label: "Absent" },
            { id: "leave", label: "Leave" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => { setStatusFilter(f.id); setCurrentPage(1); }}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
                statusFilter === f.id
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── MAIN ATTENDANCE CARD GRID (PRIMARY OPERATIONAL VIEW) ─── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeTab === "students" ? (
            paginatedStudents.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground bg-white dark:bg-slate-900 rounded-2xl border p-8">
                No students found matching search filter.
              </div>
            ) : (
              paginatedStudents.map((s) => (
                <Card
                  key={s.id}
                  className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden bg-white dark:bg-slate-900"
                >
                  {/* Status Strip */}
                  <div
                    className={cn(
                      "h-1.5 w-full absolute top-0 left-0",
                      s.status === "present"
                        ? "bg-emerald-500"
                        : s.status === "late"
                        ? "bg-amber-500"
                        : s.status === "absent"
                        ? "bg-rose-500"
                        : s.status === "leave"
                        ? "bg-blue-500"
                        : "bg-slate-300 dark:bg-slate-700"
                    )}
                  />

                  <div className="flex items-start justify-between gap-2 mt-1">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold text-sm">
                        {s.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{s.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[10px]">
                            {s.grade || "Cadet"} ({s.age ? `${s.age} yrs` : "-"})
                          </Badge>
                          {s.consecutiveAbsences >= 2 && (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9px] px-1 py-0">
                              {s.consecutiveAbsences}x Risk
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => triggerWhatsappAlert(s.name, s.phone)}
                      className="size-8 p-0 rounded-lg text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50"
                      title="Send WhatsApp Alert"
                    >
                      <MessageSquare className="size-4" />
                    </Button>
                  </div>

                  {/* 4-State Quick Action Buttons */}
                  <div className="grid grid-cols-4 gap-1.5 mt-3.5">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleStudentStatusChange(s.id, "present")}
                      className={cn(
                        "h-8 text-[11px] font-bold rounded-lg transition-all px-0",
                        s.status === "present"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-emerald-100 dark:bg-slate-800 dark:text-slate-300"
                      )}
                    >
                      Present
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleStudentStatusChange(s.id, "late")}
                      className={cn(
                        "h-8 text-[11px] font-bold rounded-lg transition-all px-0",
                        s.status === "late"
                          ? "bg-amber-500 text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-amber-100 dark:bg-slate-800 dark:text-slate-300"
                      )}
                    >
                      Late
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleStudentStatusChange(s.id, "absent")}
                      className={cn(
                        "h-8 text-[11px] font-bold rounded-lg transition-all px-0",
                        s.status === "absent"
                          ? "bg-rose-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-rose-100 dark:bg-slate-800 dark:text-slate-300"
                      )}
                    >
                      Absent
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleStudentStatusChange(s.id, "leave")}
                      className={cn(
                        "h-8 text-[11px] font-bold rounded-lg transition-all px-0",
                        s.status === "leave"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-blue-100 dark:bg-slate-800 dark:text-slate-300"
                      )}
                    >
                      Leave
                    </Button>
                  </div>
                </Card>
              ))
            )
          ) : (
            paginatedMurabbis.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground bg-white dark:bg-slate-900 rounded-2xl border p-8">
                No staff members found.
              </div>
            ) : (
              paginatedMurabbis.map((m) => (
                <Card
                  key={m.id}
                  className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden bg-white dark:bg-slate-900"
                >
                  <div
                    className={cn(
                      "h-1.5 w-full absolute top-0 left-0",
                      m.status === "present"
                        ? "bg-emerald-500"
                        : m.status === "late"
                        ? "bg-amber-500"
                        : m.status === "absent"
                        ? "bg-rose-500"
                        : "bg-slate-300 dark:bg-slate-700"
                    )}
                  />

                  <div className="flex items-start justify-between gap-2 mt-1">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold text-sm">
                        {m.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{m.name}</h4>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {m.roles.map((r) => (
                            <Badge key={r} className="bg-amber-100 text-amber-800 dark:bg-amber-950 text-[9px] px-1 py-0">
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => triggerWhatsappAlert(m.name, m.phone)}
                      className="size-8 p-0 text-slate-600"
                    >
                      <Phone className="size-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 mt-3.5">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleMurabbiStatusChange(m.id, "present")}
                      className={cn(
                        "h-8 text-[11px] font-bold rounded-lg transition-all",
                        m.status === "present"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-emerald-100 dark:bg-slate-800"
                      )}
                    >
                      Present
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleMurabbiStatusChange(m.id, "late")}
                      className={cn(
                        "h-8 text-[11px] font-bold rounded-lg transition-all",
                        m.status === "late"
                          ? "bg-amber-500 text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-amber-100 dark:bg-slate-800"
                      )}
                    >
                      Late
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleMurabbiStatusChange(m.id, "absent")}
                      className={cn(
                        "h-8 text-[11px] font-bold rounded-lg transition-all",
                        m.status === "absent"
                          ? "bg-rose-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-rose-100 dark:bg-slate-800"
                      )}
                    >
                      Absent
                    </Button>
                  </div>
                </Card>
              ))
            )
          )}
        </div>
      ) : (
        /* TABLE VIEW OPTION */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-muted-foreground font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4">{activeTab === "students" ? "Student Name" : "Staff Name"}</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  {activeTab === "students" && <th className="py-3 px-4">Grade</th>}
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeTab === "students" ? (
                  paginatedStudents.map((s, idx) => (
                    <tr key={s.id}>
                      <td className="py-3 px-4">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold">{s.name}</td>
                      <td className="py-3 px-4 font-mono">{s.phone || "-"}</td>
                      <td className="py-3 px-4">{s.grade}</td>
                      <td className="py-3 px-4 text-center"><Badge>{s.status}</Badge></td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="outline" size="sm" onClick={() => triggerWhatsappAlert(s.name, s.phone)}>
                          WhatsApp
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  paginatedMurabbis.map((m, idx) => (
                    <tr key={m.id}>
                      <td className="py-3 px-4">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold">{m.name}</td>
                      <td className="py-3 px-4 font-mono">{m.phone}</td>
                      <td className="py-3 px-4 text-center"><Badge>{m.status}</Badge></td>
                      <td className="py-3 px-4 text-right"><Button variant="ghost" size="sm">Call</Button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── PAGINATION FOOTER ─── */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-sm">
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

      {/* ─── URDU WHATSAPP MODAL ─── */}
      <Dialog open={!!whatsappModalData} onOpenChange={() => setWhatsappModalData(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <MessageSquare className="size-5 text-emerald-600" />
              Send Urdu WhatsApp Absentee Alert
            </DialogTitle>
          </DialogHeader>

          {whatsappModalData && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border text-right font-semibold text-foreground text-sm leading-relaxed">
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
              Delegate Attendance Access
            </DialogTitle>
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDelegateModalOpen(false)}>Cancel</Button>
            <Button onClick={() => { setIsDelegateModalOpen(false); toast.success("Delegation access granted!"); }} className="bg-[#4B0A8F] text-white">
              Grant Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
