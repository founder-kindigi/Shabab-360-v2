"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  UserMinus
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---
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
  status: "present" | "late" | "absent" | "leave" | "off" | "unmarked";
};

export type MurabbiRosterItem = {
  id: string;
  serial: number;
  name: string;
  phone: string;
  parkName: string;
  roles: string[];
  status: "present" | "late" | "absent" | "leave" | "off" | "unmarked";
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
  { id: "m1", serial: 1, name: "Umar Rohail", phone: "923051801847", parkName: "Gulberg", roles: ["Park Lead"], status: "unmarked" },
  { id: "m2", serial: 2, name: "Hasnain Zafar", phone: "923060221997", parkName: "Gulberg", roles: ["Murabbi", "Tadreeb Muawin"], status: "unmarked" },
  { id: "m3", serial: 3, name: "Hanzala Tauseef", phone: "923047178171", parkName: "Gulberg", roles: ["Murabbi", "Tadreeb Lead"], status: "unmarked" },
  { id: "m4", serial: 4, name: "Ikram Meer", phone: "923364543324", parkName: "Gulberg", roles: ["Murabbi", "Skills Lead"], status: "unmarked" },
  { id: "m5", serial: 5, name: "Imran Amin", phone: "923294368993", parkName: "Gulberg", roles: ["Sports Lead", "Muawin G12"], status: "unmarked" },
  { id: "m6", serial: 6, name: "Hammad Raza", phone: "923220774124", parkName: "Gulberg", roles: ["Sports Muawin", "Muawin G13"], status: "unmarked" },
  { id: "m7", serial: 7, name: "Basit Ahsan", phone: "923226720331", parkName: "Gulberg", roles: ["Park Admin", "Muawin G13"], status: "unmarked" },
  { id: "m8", serial: 8, name: "Abdul Kabeer", phone: "923244190830", parkName: "Gulberg", roles: ["Media Lead", "Muawin G11"], status: "unmarked" },
  { id: "m9", serial: 9, name: "Abdul Rehman Munir", phone: "923080114534", parkName: "Gulberg", roles: ["Skills Muawin"], status: "unmarked" },
  { id: "m10", serial: 10, name: "Haseeb Ahmad", phone: "923114322095", parkName: "Gulberg", roles: ["Sports Officer"], status: "unmarked" },
  { id: "m11", serial: 11, name: "Abu Hurairah", phone: "", parkName: "Gulberg", roles: ["Sports Officer"], status: "unmarked" },
  { id: "m12", serial: 12, name: "Abdullah Saif", phone: "923104362545", parkName: "Gulberg", roles: ["Murabbi"], status: "unmarked" },
  { id: "m13", serial: 13, name: "Ameer Hamza", phone: "923247197841", parkName: "Gulberg", roles: ["Sports Officer"], status: "unmarked" },
];

const INITIAL_STUDENT_DATA: StudentRosterItem[] = [
  { id: "s1", serial: 1, name: "Muhammad Umair", phone: "923274088002", ownPhone: false, age: 13, grade: "8th", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "unmarked" },
  { id: "s2", serial: 2, name: "Muhammad Ahmad", phone: "", ownPhone: false, age: 13, grade: "8th", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "unmarked" },
  { id: "s3", serial: 3, name: "Muhammad Umar", phone: "", ownPhone: false, age: 13, grade: "8th", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "unmarked" },
  { id: "s4", serial: 4, name: "Muhammad Shoaib", phone: "", ownPhone: false, age: 13, grade: "8th", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "unmarked" },
  { id: "s5", serial: 5, name: "M Abdullah Qureshi", phone: "", ownPhone: false, age: 14, grade: "9th", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "unmarked" },
  { id: "s6", serial: 6, name: "M.Moosa", phone: "", ownPhone: false, age: 14, grade: "10th", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "unmarked" },
  { id: "s7", serial: 7, name: "Muhammad Abdullah Ahmad", phone: "", ownPhone: false, age: 14, grade: "9th", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "unmarked" },
  { id: "s8", serial: 8, name: "Muhammad Yousuf", phone: "", ownPhone: false, age: 14, grade: "9th", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "unmarked" },
  { id: "s9", serial: 9, name: "Muhammad Huzaifa Saif", phone: "923234977806", ownPhone: false, age: 14, grade: "9th", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "unmarked" },
  { id: "s10", serial: 10, name: "Muhammad Yusha", phone: "923334649728", ownPhone: false, age: 14, grade: "10th", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "unmarked" },
  { id: "s11", serial: 11, name: "Muaz Zakariya Majid", phone: "923334349783", ownPhone: false, age: 14, grade: "Hafiz", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "unmarked" },
  { id: "s12", serial: 12, name: "Muhammad Shaheer Shamsi", phone: "923004188623", ownPhone: false, age: 14, grade: "9th", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "unmarked" },
  { id: "s13", serial: 13, name: "Muhammad Umer Karamat", phone: "923214688055", ownPhone: true, age: 14, grade: "O Level", parkName: "Gulberg", groupName: "Group 1 | Murabbi: Ikram", status: "unmarked" },
];

const WHATSAPP_ABSENT_URDU = (name: string, date: string) =>
  `السلام علیکم ${name}! 👋\n\nامید ہے آپ خیریت سے ہوں گے۔ آج (${date}) کے اسپورٹس سیشن میں آپ کی غیر حاضری محسوس کی گئی۔\n\nصحت مند اور فریش ذہن کے لیے کھیل ہماری ترجیح ہے۔ اگلے سیشن میں اپنی شرکت یقینی بنائیں! 🏃‍♂️⚽\n*_ٹیم شباب 360_*`;

// --- UI Components ---
export function ParkAttendancePage() {
  const { data: session } = useSession();
  const userRole = (session?.user?.role || "super_admin").toLowerCase();

  const [activeFlow, setActiveFlow] = useState<"shabab" | "murabbi">("shabab");
  const [selectedPark, setSelectedPark] = useState("Gulberg");
  const [selectedGroup, setSelectedGroup] = useState(PARKS_MOCK[0].groups[0]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Data States
  const [studentRoster, setStudentRoster] = useState<StudentRosterItem[]>(INITIAL_STUDENT_DATA);
  const [murabbiRoster, setMurabbiRoster] = useState<MurabbiRosterItem[]>(INITIAL_MURABBI_DATA);

  // Modals
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [delegateStaffName, setDelegateStaffName] = useState("");

  const isParkLeadOrHq = ["super_admin", "city_head", "park_lead"].includes(userRole);
  const [hasDelegatedAccess, setHasDelegatedAccess] = useState(true); // default true for demo
  const canMarkMurabbi = isParkLeadOrHq || hasDelegatedAccess;

  // Reset page & filters when switching park/flow
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedPark, selectedGroup, activeFlow]);

  // Handle Park Switch (also update default group)
  const handleParkSelect = (parkName: string) => {
    setSelectedPark(parkName);
    const parkObj = PARKS_MOCK.find(p => p.name === parkName);
    if (parkObj && parkObj.groups.length > 0) {
      setSelectedGroup(parkObj.groups[0]);
    }
  };

  const updateStudentStatus = (id: string, newStatus: StudentRosterItem["status"]) => {
    setStudentRoster(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    toast.success(`Marked student as ${newStatus.toUpperCase()}`);
  };

  const updateMurabbiStatus = (id: string, newStatus: MurabbiRosterItem["status"]) => {
    if (!canMarkMurabbi) {
      toast.error("Only Park Lead or Delegated Staff can mark Murabbi attendance!");
      return;
    }
    setMurabbiRoster(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
    toast.success(`Marked staff as ${newStatus.toUpperCase()}`);
  };

  const handleGrantDelegation = () => {
    if (!delegateStaffName.trim()) return;
    toast.success(`Granted Murabbi attendance access to ${delegateStaffName}`);
    setShowDelegateModal(false);
    setDelegateStaffName("");
  };

  const activeParkGroups = useMemo(() => {
    return PARKS_MOCK.find(p => p.name === selectedPark)?.groups || [];
  }, [selectedPark]);

  // Filtering for Shabab
  const filteredStudents = useMemo(() => {
    return studentRoster.filter(s => {
      const matchSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.phone.includes(searchQuery);
      const matchPark = s.parkName === selectedPark;
      const matchGroup = s.groupName === selectedGroup;
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      return matchSearch && matchPark && matchGroup && matchStatus;
    });
  }, [studentRoster, searchQuery, selectedPark, selectedGroup, statusFilter]);

  const totalPagesShabab = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage, itemsPerPage]);

  // Filtering for Murabbi
  const filteredMurabbis = useMemo(() => {
    return murabbiRoster.filter(m => {
      const matchSearch = !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.roles.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchPark = m.parkName === selectedPark;
      return matchSearch && matchPark;
    });
  }, [murabbiRoster, searchQuery, selectedPark]);

  const totalPagesMurabbi = Math.max(1, Math.ceil(filteredMurabbis.length / itemsPerPage));
  const paginatedMurabbis = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMurabbis.slice(start, start + itemsPerPage);
  }, [filteredMurabbis, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto px-4 sm:px-6">
      
      {/* --- Top Action & Title Bar --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400">
            Attendance Operations Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Manage daily park sessions, staff presence, and Shabab engagement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-9 h-10 w-[160px] rounded-xl border-slate-200 bg-white/50 backdrop-blur-sm dark:bg-slate-900/50 dark:border-slate-800 shadow-sm focus-visible:ring-primary font-medium"
            />
          </div>
        </div>
      </div>

      {/* --- 4 KPI Dashboard Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-100 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
              <CalendarCheck className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Today's Sessions</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">14</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-100 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
              <Activity className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Overall Attendance</p>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">82%</h3>
                <span className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-md">
                  <TrendingUp className="size-3 mr-0.5" /> +4%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50/50 to-white dark:from-rose-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-100 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-rose-100 dark:bg-rose-900/40 rounded-xl text-rose-600 dark:text-rose-400 shrink-0">
              <UserMinus className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Absence Alerts</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">12 <span className="text-sm font-medium text-muted-foreground">students</span></h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-100 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
              <MapPin className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Active Parks</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">6 <span className="text-sm font-medium text-muted-foreground">/ 6</span></h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- 2-Tier Flow Switcher --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <button
            onClick={() => setActiveFlow("shabab")}
            className={cn(
              "w-full p-5 rounded-2xl border-2 text-left transition-all duration-300 relative overflow-hidden group",
              activeFlow === "shabab"
                ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30 shadow-md"
                : "border-transparent bg-white dark:bg-slate-900 shadow-sm hover:shadow-md ring-1 ring-slate-200 dark:ring-slate-800"
            )}
          >
            <div className={cn(
              "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-purple-500/5 to-transparent",
              activeFlow === "shabab" && "opacity-100"
            )} />
            <div className="relative z-10 flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-2 rounded-lg",
                    activeFlow === "shabab" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  )}>
                    <Users className="size-5" />
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Shabab Student Attendance</h3>
                </div>
                <p className="text-sm text-muted-foreground pl-11">
                  Mark daily attendance for students mapped to Parks and Groups.
                </p>
              </div>
              {activeFlow === "shabab" && (
                <CheckCircle2 className="size-6 text-purple-600 shrink-0" />
              )}
            </div>
          </button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <button
            onClick={() => setActiveFlow("murabbi")}
            className={cn(
              "w-full p-5 rounded-2xl border-2 text-left transition-all duration-300 relative overflow-hidden group",
              activeFlow === "murabbi"
                ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 shadow-md"
                : "border-transparent bg-white dark:bg-slate-900 shadow-sm hover:shadow-md ring-1 ring-slate-200 dark:ring-slate-800"
            )}
          >
            <div className={cn(
              "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-amber-500/5 to-transparent",
              activeFlow === "murabbi" && "opacity-100"
            )} />
            <div className="relative z-10 flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-2 rounded-lg",
                    activeFlow === "murabbi" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  )}>
                    <ShieldCheck className="size-5" />
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    Staff & Murabbi Attendance
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 border-amber-200">
                      <Lock className="size-3 mr-1" /> Restricted
                    </Badge>
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground pl-11">
                  Exclusive roster for Park Leads and designated delegates.
                </p>
              </div>
              {activeFlow === "murabbi" && (
                <CheckCircle2 className="size-6 text-amber-600 shrink-0" />
              )}
            </div>
          </button>
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {/* =========================================================
            FLOW 1: SHABAB ATTENDANCE
            ========================================================= */}
        {activeFlow === "shabab" && (
          <motion.div
            key="shabab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Context Header */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-purple-100 dark:border-purple-900/50 rounded-2xl p-5 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                
                {/* Park Selector */}
                <div className="space-y-2 flex-1">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-purple-600" /> Select Park Venue
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {PARKS_MOCK.map((park) => (
                      <button
                        key={park.name}
                        onClick={() => handleParkSelect(park.name)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
                          selectedPark === park.name
                            ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                        )}
                      >
                        {park.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Group Selector */}
                {activeParkGroups.length > 0 && (
                  <div className="space-y-2 flex-1 lg:max-w-md">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                      <Layers className="size-3.5 text-indigo-600" /> Select Halqa Group
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {activeParkGroups.map((g) => (
                        <button
                          key={g}
                          onClick={() => setSelectedGroup(g)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
                            selectedGroup === g
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Grid */}
            <Card className="border-0 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden rounded-2xl">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Users className="size-5 text-purple-600" />
                    Students in {selectedGroup}
                  </h2>
                  <p className="text-sm text-muted-foreground font-medium">
                    {selectedPark} • Mark attendance for today's session
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search students..."
                      className="pl-9 w-full sm:w-[250px] bg-white dark:bg-slate-800 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedStudents.length > 0 ? (
                  paginatedStudents.map((student) => (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={student.id}
                      className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* Left: Info */}
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold shrink-0">
                          {student.serial}
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
                              {student.name}
                            </h4>
                            {student.age && (
                              <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] uppercase font-bold">
                                {student.age} yrs
                              </Badge>
                            )}
                            {student.grade && (
                              <Badge variant="outline" className="border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-400 text-[10px] font-bold">
                                <GraduationCap className="size-3 mr-1 inline" /> {student.grade}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                            {student.phone ? (
                              <span className="flex items-center gap-1.5">
                                <Phone className="size-3.5 text-slate-400" />
                                {student.phone}
                                {student.ownPhone && (
                                  <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 ml-1">Own</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-xs">No phone provided</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end pl-14 lg:pl-0">
                        <div className="flex bg-slate-100/50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                          {(["present", "late", "absent", "leave"] as const).map((status) => {
                            const colors = {
                              present: "hover:bg-emerald-100 hover:text-emerald-700 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm",
                              late: "hover:bg-amber-100 hover:text-amber-700 data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-sm",
                              absent: "hover:bg-rose-100 hover:text-rose-700 data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow-sm",
                              leave: "hover:bg-blue-100 hover:text-blue-700 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm",
                            };
                            return (
                              <button
                                key={status}
                                data-state={student.status === status ? "active" : "inactive"}
                                onClick={() => updateStudentStatus(student.id, status)}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize text-slate-500",
                                  colors[status]
                                )}
                              >
                                {status}
                              </button>
                            );
                          })}
                        </div>

                        {student.status === "absent" && student.phone && (
                          <motion.a
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            href={`https://wa.me/${student.phone}?text=${encodeURIComponent(
                              WHATSAPP_ABSENT_URDU(student.name, selectedDate)
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#25D366]/10 text-[#075E54] hover:bg-[#25D366]/20 border border-[#25D366]/30 transition-colors"
                          >
                            <MessageSquare className="size-4" /> Message
                          </motion.a>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-16">
                    <EmptyState
                      icon={CalendarCheck}
                      title="No Students Found"
                      description={`No matching students in ${selectedGroup} for ${selectedPark}.`}
                    />
                  </div>
                )}
              </div>

              {/* Pagination */}
              {filteredStudents.length > 0 && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 rounded-b-2xl">
                  <p className="text-sm text-muted-foreground font-medium">
                    Showing <span className="text-slate-900 dark:text-slate-100 font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900 dark:text-slate-100 font-bold">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span> of <span className="text-slate-900 dark:text-slate-100 font-bold">{filteredStudents.length}</span> students
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 w-8 rounded-lg"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <div className="text-sm font-bold px-2">{currentPage} / {totalPagesShabab}</div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.min(totalPagesShabab, p + 1))}
                      disabled={currentPage === totalPagesShabab}
                      className="h-8 w-8 rounded-lg"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* =========================================================
            FLOW 2: MURABBI ATTENDANCE (RESTRICTED)
            ========================================================= */}
        {activeFlow === "murabbi" && (
          <motion.div
            key="murabbi"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Context Header */}
            <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-amber-600" /> Filter by Park Venue
                    </Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {PARKS_MOCK.map((park) => (
                        <button
                          key={park.name}
                          onClick={() => setSelectedPark(park.name)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
                            selectedPark === park.name
                              ? "bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                          )}
                        >
                          {park.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {isParkLeadOrHq && (
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <Button
                      onClick={() => setShowDelegateModal(true)}
                      className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 font-bold rounded-xl h-10 px-5 gap-2 shadow-sm"
                    >
                      <UserPlus className="size-4" /> Delegate Access
                    </Button>
                    <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                      <Lock className="size-3" /> Protected by Role Check
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Main Grid */}
            <Card className="border-0 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden rounded-2xl">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <UserCheck className="size-5 text-amber-600" />
                    Staff Roster
                  </h2>
                  <p className="text-sm text-muted-foreground font-medium">
                    {selectedPark} • Mark attendance for Park Leads, Murabbis & Staff
                  </p>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search staff..."
                    className="pl-9 w-full sm:w-[250px] bg-white dark:bg-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedMurabbis.length > 0 ? (
                  paginatedMurabbis.map((murabbi) => (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={murabbi.id}
                      className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-colors group"
                    >
                      {/* Left: Info */}
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold shrink-0">
                          {murabbi.serial}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
                              {murabbi.name}
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {murabbi.roles.map((role, idx) => (
                              <Badge key={idx} variant="secondary" className="bg-amber-100/50 text-amber-800 border border-amber-200/50 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800 text-[10px] font-bold">
                                {role}
                              </Badge>
                            ))}
                          </div>
                          {murabbi.phone && (
                            <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                              <span className="flex items-center gap-1.5">
                                <Phone className="size-3.5 text-slate-400" />
                                {murabbi.phone}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end pl-14 lg:pl-0">
                        <div className="flex bg-slate-100/50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                          {(["present", "late", "absent", "leave", "off"] as const).map((status) => {
                            const colors = {
                              present: "hover:bg-emerald-100 hover:text-emerald-700 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm",
                              late: "hover:bg-amber-100 hover:text-amber-700 data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-sm",
                              absent: "hover:bg-rose-100 hover:text-rose-700 data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow-sm",
                              leave: "hover:bg-blue-100 hover:text-blue-700 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm",
                              off: "hover:bg-slate-200 hover:text-slate-700 data-[state=active]:bg-slate-600 data-[state=active]:text-white data-[state=active]:shadow-sm",
                            };
                            return (
                              <button
                                key={status}
                                disabled={!canMarkMurabbi}
                                data-state={murabbi.status === status ? "active" : "inactive"}
                                onClick={() => updateMurabbiStatus(murabbi.id, status)}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed",
                                  colors[status]
                                )}
                              >
                                {status}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-16">
                    <EmptyState
                      icon={ShieldCheck}
                      title="No Staff Found"
                      description={`No staff listed for ${selectedPark}.`}
                    />
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Delegate Modal --- */}
      <Dialog open={showDelegateModal} onOpenChange={setShowDelegateModal}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-0 rounded-2xl shadow-2xl">
          <div className="p-6 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl font-extrabold flex items-center gap-3 text-slate-900 dark:text-white">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-900/50 rounded-xl text-amber-600">
                  <UserPlus className="size-5" />
                </div>
                Delegate Access
              </DialogTitle>
              <DialogDescription className="text-sm font-medium mt-2">
                Temporarily authorize a staff member (e.g. Park Admin) to mark staff attendance for {selectedPark}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Select Staff Member</Label>
                <Select value={delegateStaffName} onValueChange={setDelegateStaffName}>
                  <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Choose a staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {INITIAL_MURABBI_DATA.filter(m => m.parkName === selectedPark).map(staff => (
                      <SelectItem key={staff.id} value={staff.name}>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{staff.name}</span>
                          <span className="text-xs text-muted-foreground">({staff.roles[0]})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/50 dark:border-amber-900/50 flex items-start gap-3">
                <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300 leading-relaxed">
                  Delegation expires at midnight. The selected staff member will be able to mark Murabbi & Staff attendance for {selectedPark} today.
                </p>
              </div>
            </div>

            <DialogFooter className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-5 sm:justify-between">
              <Button variant="ghost" onClick={() => setShowDelegateModal(false)} className="rounded-xl font-bold">
                Cancel
              </Button>
              <Button onClick={handleGrantDelegation} className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold px-6 shadow-sm shadow-amber-600/20">
                Grant Access
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
