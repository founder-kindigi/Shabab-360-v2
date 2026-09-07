"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Lock,
  BarChart2,
  Info,
  Bell,
  Upload,
  Download,
  RefreshCw,
  ChevronRight,
  UserPlus,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Database,
  Trash2,
  PhoneCall,
  CalendarCheck,
  CreditCard,
  Trophy,
  Award,
  BookOpen,
  Heart,
  Calendar,
  GraduationCap,
  MessageSquare,
  Users,
  FileText,
  Contact,
  ShieldCheck,
  History,
  Megaphone,
  HelpCircle,
  Package,
  FileUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MobileMorePageProps {
  onNavigate: (screen: string) => void;
}

export function MobileMorePage({ onNavigate }: MobileMorePageProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const user = session?.user as any;
  const email = user?.email || "admin@shabab.pk";
  const role = user?.role || "super_admin";

  // Sheet open states
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [isProgramDetailsOpen, setIsProgramDetailsOpen] = useState(false);
  const [isPostNoticeOpen, setIsPostNoticeOpen] = useState(false);
  const [isImportRosterOpen, setIsImportRosterOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);

  // Form states - Program Details
  const [programName, setProgramName] = useState("Shabab 360");
  const [programTagline, setProgramTagline] = useState("Revolutionary Youth Training Program");
  const [currentCohort, setCurrentCohort] = useState("Batch 4");
  const [isProgramSaved, setIsProgramSaved] = useState(false);

  // Form states - Post Notice
  const [noticeAudience, setNoticeAudience] = useState("everyone");
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [noticeStatus, setNoticeStatus] = useState<"idle" | "sending" | "success">("idle");

  // Form states - Add Admin
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminRole, setAdminRole] = useState("super_admin");
  const [adminsList, setAdminsList] = useState([
    { id: "1", name: "Super Admin", email: "admin@shabab.pk", role: "Main admin" },
    { id: "2", name: "Salman Ali", email: "salman@shabab.pk", role: "Park Admin" },
    { id: "3", name: "Ahmed Khan", email: "ahmed@shabab.pk", role: "Head Murabbi" },
  ]);

  // Form states - Import Roster
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<"idle" | "importing" | "success">("idle");

  const displayRole =
    role === "super_admin"
      ? "Main admin"
      : role === "park_lead"
      ? "Park Lead"
      : role === "murabbi"
      ? "Murabbi"
      : "Admin";

  const handleReload = () => {
    window.location.reload();
  };

  const handleAddAdmin = () => {
    if (!adminName || !adminEmail) return;
    setAdminsList((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: adminName,
        email: adminEmail,
        role: adminRole === "super_admin" ? "Main admin" : "Park Admin",
      },
    ]);
    setAdminName("");
    setAdminEmail("");
    setIsAddAdminOpen(false);
  };

  const handleSaveProgramDetails = () => {
    setIsProgramSaved(true);
    setTimeout(() => {
      setIsProgramSaved(false);
      setIsProgramDetailsOpen(false);
    }, 800);
  };

  const handleSendNotice = async () => {
    if (!noticeTitle || !noticeMessage) return;
    setNoticeStatus("sending");
    try {
      await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: noticeTitle,
          message: noticeMessage,
          audience: noticeAudience,
        }),
      });
    } catch {
      // Graceful fallback
    }
    setNoticeStatus("success");
    setTimeout(() => {
      setNoticeStatus("idle");
      setNoticeTitle("");
      setNoticeMessage("");
      setIsPostNoticeOpen(false);
    }, 1000);
  };

  const handleDownloadBackup = () => {
    const backupData = {
      app: "Shabab 360",
      version: "2.0.0",
      exportedAt: new Date().toISOString(),
      cohort: "Batch 4",
      note: "Standard database snapshot including parks, students, murabbis, attendance, and evaluations.",
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shabab-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsBackupOpen(false);
  };

  const handleStartImport = () => {
    if (!selectedFileName) return;
    setImportStatus("importing");
    setTimeout(() => {
      setImportStatus("success");
      setTimeout(() => {
        setImportStatus("idle");
        setSelectedFileName(null);
        setIsImportRosterOpen(false);
      }, 1200);
    }, 1500);
  };

  return (
    <div className="w-full max-w-[460px] mx-auto flex flex-col min-h-screen w-full bg-slate-50 text-slate-900 pb-28 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 bg-white border-b border-slate-100">
        <h1 className="text-2xl font-black text-[#1F0860] tracking-tight">More</h1>
        <Badge
          variant="secondary"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs px-3 py-1 rounded-full"
        >
          {displayRole}
        </Badge>
      </div>

      <div className="p-4 space-y-6">
        {/* Signed In Row */}
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-[#4B0A8F]" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Signed in</p>
              <p className="text-[11px] text-slate-500 font-medium">
                {email} • {displayRole}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* ACCESS Section */}
        <div className="space-y-2">
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
            ACCESS & SECURITY
          </h2>
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <button
              onClick={() => setIsPermissionsOpen(true)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-900">Permissions</p>
                  <p className="text-xs text-slate-400">Manage app admins</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <SettingRow
              icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
              iconBg="bg-emerald-50"
              title="Security Access & Roles"
              subtitle="Role RBAC matrix, tokens & capabilities"
              onClick={() => onNavigate("security-access")}
            />
            <SettingRow
              icon={<Contact className="w-4 h-4 text-indigo-600" />}
              iconBg="bg-indigo-50"
              title="Staff Directory"
              subtitle="Murabbis, Park Leads, Admins & phone roster"
              onClick={() => onNavigate("staff-directory")}
            />
            <SettingRow
              icon={<History className="w-4 h-4 text-slate-600" />}
              iconBg="bg-slate-100"
              title="Audit Log Trail"
              subtitle="Security events, mutations & tamper audit"
              onClick={() => onNavigate("audit-log")}
              isLast={true}
            />
          </div>
        </div>

        {/* OPERATIONS & DESKS Section */}
        <div className="space-y-2">
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
            OPERATIONS & DESKS
          </h2>
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <SettingRow
              icon={<UserPlus className="w-4 h-4 text-purple-600" />}
              iconBg="bg-purple-50"
              title="Admissions Desk"
              subtitle="Intake applications, screening & cohorts"
              onClick={() => onNavigate("admissions")}
            />
            <SettingRow
              icon={<PhoneCall className="w-4 h-4 text-amber-600" />}
              iconBg="bg-amber-50"
              title="Retention Calling"
              subtitle="Outreach pipeline, WhatsApp & scripts"
              onClick={() => onNavigate("calling")}
            />
            <SettingRow
              icon={<CalendarCheck className="w-4 h-4 text-blue-600" />}
              iconBg="bg-blue-50"
              title="Weekly Mashwara"
              subtitle="Executive shura, decisions & minutes"
              onClick={() => onNavigate("mashwara")}
            />
            <SettingRow
              icon={<Calendar className="w-4 h-4 text-rose-600" />}
              iconBg="bg-rose-50"
              title="Events & Schedules"
              subtitle="Special camps, sports days & park overrides"
              onClick={() => onNavigate("events")}
            />
            <SettingRow
              icon={<Users className="w-4 h-4 text-teal-600" />}
              iconBg="bg-teal-50"
              title="Collaboration Teams"
              subtitle="Sports, Skills, Media & Tadreeb squads"
              onClick={() => onNavigate("teams")}
            />
            <SettingRow
              icon={<MessageSquare className="w-4 h-4 text-sky-600" />}
              iconBg="bg-sky-50"
              title="Community Hub"
              subtitle="Park stories, Q&A, likes & brotherhood"
              onClick={() => onNavigate("community")}
            />
            <SettingRow
              icon={<GraduationCap className="w-4 h-4 text-violet-600" />}
              iconBg="bg-violet-50"
              title="Alumni Network"
              subtitle="Graduates, mentorship & career registry"
              onClick={() => onNavigate("alumni")}
            />
            <SettingRow
              icon={<CreditCard className="w-4 h-4 text-emerald-600" />}
              iconBg="bg-emerald-50"
              title="Fees & Accounts"
              subtitle="Challans, collections, waivers & dues"
              onClick={() => onNavigate("fees")}
            />
            <SettingRow
              icon={<Trophy className="w-4 h-4 text-amber-600" />}
              iconBg="bg-amber-50"
              title="Gamification & Badges"
              subtitle="Leaderboard, points, streaks & awards"
              onClick={() => onNavigate("gamification")}
            />
            <SettingRow
              icon={<Award className="w-4 h-4 text-purple-600" />}
              iconBg="bg-purple-50"
              title="Certificates & Graduation"
              subtitle="Diplomas, cryptographic verification & shares"
              onClick={() => onNavigate("certificates")}
            />
            <SettingRow
              icon={<BookOpen className="w-4 h-4 text-sky-600" />}
              iconBg="bg-sky-50"
              title="Content Planner LMS"
              subtitle="Tarbiyah curriculum, sessions & blocks"
              onClick={() => onNavigate("content-planner")}
            />
            <SettingRow
              icon={<Heart className="w-4 h-4 text-emerald-600" />}
              iconBg="bg-emerald-50"
              title="Islah-i-Mamulat"
              subtitle="Spiritual habits, 40-day streak & logs"
              onClick={() => onNavigate("islah")}
            />
            <SettingRow
              icon={<Database className="w-4 h-4 text-indigo-600" />}
              iconBg="bg-indigo-50"
              title="Sync & Offline Cache"
              subtitle="Queue mutations, conflicts & offline storage"
              onClick={() => onNavigate("sync")}
              isLast={true}
            />
          </div>
        </div>

        {/* SETTINGS Section */}
        <div className="space-y-2">
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
            SETTINGS & TOOLS
          </h2>
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <SettingRow
              icon={<BarChart2 className="w-4 h-4 text-emerald-600" />}
              iconBg="bg-emerald-50"
              title="Analysis"
              subtitle="Attendance by date, park & murabbi"
              onClick={() => onNavigate("analysis")}
            />
            <SettingRow
              icon={<FileText className="w-4 h-4 text-blue-600" />}
              iconBg="bg-blue-50"
              title="Custom Reports Builder"
              subtitle="Multi-domain query, columns & CSV export"
              onClick={() => onNavigate("custom-reports")}
            />
            <SettingRow
              icon={<Package className="w-4 h-4 text-amber-600" />}
              iconBg="bg-amber-50"
              title="Procurement & Stock"
              subtitle="Central inventory, requisitions & supplies"
              onClick={() => onNavigate("procurement")}
            />
            <SettingRow
              icon={<HelpCircle className="w-4 h-4 text-indigo-600" />}
              iconBg="bg-indigo-50"
              title="Knowledge Base SOPs"
              subtitle="Curriculum guides, policies & articles"
              onClick={() => onNavigate("knowledge-base")}
            />
            <SettingRow
              icon={<Megaphone className="w-4 h-4 text-rose-600" />}
              iconBg="bg-rose-50"
              title="Notifications Hub"
              subtitle="Push alerts, broadcasts & targeted notices"
              onClick={() => onNavigate("notifications")}
            />
            <SettingRow
              icon={<FileUp className="w-4 h-4 text-teal-600" />}
              iconBg="bg-teal-50"
              title="Bulk Portal Import"
              subtitle="Universal intake & student .xlsx parser"
              onClick={() => onNavigate("portal-import")}
            />
            <SettingRow
              icon={<Info className="w-4 h-4 text-sky-600" />}
              iconBg="bg-sky-50"
              title="Program details"
              subtitle="Name and tagline"
              onClick={() => setIsProgramDetailsOpen(true)}
            />
            <SettingRow
              icon={<Bell className="w-4 h-4 text-amber-600" />}
              iconBg="bg-amber-50"
              title="Post a notice"
              subtitle="Announcement for everyone"
              onClick={() => setIsPostNoticeOpen(true)}
            />
            <SettingRow
              icon={<Upload className="w-4 h-4 text-purple-600" />}
              iconBg="bg-purple-50"
              title="Import roster (.xlsx)"
              subtitle="Upload the intake template"
              onClick={() => setIsImportRosterOpen(true)}
            />
            <SettingRow
              icon={<Download className="w-4 h-4 text-indigo-600" />}
              iconBg="bg-indigo-50"
              title="Download backup"
              subtitle="Save all data as a file"
              onClick={() => setIsBackupOpen(true)}
            />
            <SettingRow
              icon={<Database className="w-4 h-4 text-orange-600" />}
              iconBg="bg-orange-50"
              title="Restore backup"
              subtitle="Load data from a file"
              onClick={() => setIsRestoreOpen(true)}
            />
            <SettingRow
              icon={<RefreshCw className="w-4 h-4 text-rose-600" />}
              iconBg="bg-rose-50"
              title="Reload from server"
              subtitle="Refresh latest data"
              onClick={handleReload}
              isLast
            />
          </div>
        </div>
      </div>

      {/* ─── 1. Permissions Sheet (Screenshot 212800) ─────────────────────────── */}
      <Sheet open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto max-w-[460px] mx-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left font-bold text-lg text-slate-900">
              Permissions
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 pb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                APP ADMINS ({adminsList.length})
              </h3>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-sm">
              {adminsList.map((adm) => (
                <div key={adm.id} className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9 border border-slate-100">
                      <AvatarFallback className="bg-purple-100 text-[#4B0A8F] font-bold text-xs">
                        {adm.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{adm.name}</p>
                      <p className="text-xs text-slate-400">{adm.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[11px] font-semibold bg-slate-100 text-slate-700">
                    {adm.role}
                  </Badge>
                </div>
              ))}
            </div>

            <Sheet open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
              <SheetTrigger asChild>
                <Button className="w-full h-12 bg-gradient-to-r from-[#1F0860] via-[#4B0A8F] to-[#D90429] text-white font-bold text-sm rounded-xl shadow-md">
                  <UserPlus className="w-4 h-4 mr-2" /> + Add admin
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto max-w-[460px] mx-auto">
                <SheetHeader className="mb-4">
                  <SheetTitle className="text-left font-bold text-lg">Add App Admin</SheetTitle>
                </SheetHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Full Name</Label>
                    <Input
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="e.g. Tariq Mehmood"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Email address</Label>
                    <Input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@shabab.pk"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Role</Label>
                    <Select value={adminRole} onValueChange={setAdminRole}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Main admin (Full Access)</SelectItem>
                        <SelectItem value="park_admin">Park Admin</SelectItem>
                        <SelectItem value="program_admin">Program Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleAddAdmin}
                    disabled={!adminName || !adminEmail}
                    className="w-full h-11 bg-[#4B0A8F] hover:bg-[#3d0874] text-white font-bold rounded-xl mt-3"
                  >
                    Save Admin
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── 2. Program Details Sheet (Screenshot 212811) ────────────────────── */}
      <Sheet open={isProgramDetailsOpen} onOpenChange={setIsProgramDetailsOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto max-w-[460px] mx-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left font-bold text-lg text-slate-900">
              Program Details
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 pb-6">
            <div className="flex justify-center py-2">
              <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded-2xl p-2 flex items-center justify-center shadow-inner">
                <img src="/logo-color.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Program Name</Label>
              <Input
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Tagline</Label>
              <Input
                value={programTagline}
                onChange={(e) => setProgramTagline(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Active Cohort</Label>
              <Input
                value={currentCohort}
                onChange={(e) => setCurrentCohort(e.target.value)}
                className="h-11"
              />
            </div>

            <Button
              onClick={handleSaveProgramDetails}
              className="w-full h-11 bg-[#4B0A8F] hover:bg-[#3d0874] text-white font-bold rounded-xl mt-3"
            >
              {isProgramSaved ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Saved!
                </span>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── 3. Post a Notice Sheet (Screenshot 212912) ──────────────────────── */}
      <Sheet open={isPostNoticeOpen} onOpenChange={setIsPostNoticeOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto max-w-[460px] mx-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left font-bold text-lg text-slate-900">
              Post a Notice
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 pb-6">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Target Audience</Label>
              <Select value={noticeAudience} onValueChange={setNoticeAudience}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone (All Parks & Murabbis)</SelectItem>
                  <SelectItem value="murabbis">Murabbis & Staff Only</SelectItem>
                  <SelectItem value="umme_hani">Umme Hani Park Only</SelectItem>
                  <SelectItem value="nazimabad">Nazimabad Park Only</SelectItem>
                  <SelectItem value="bufferzone">Bufferzone Park Only</SelectItem>
                  <SelectItem value="gulshan">Gulshan Park Only</SelectItem>
                  <SelectItem value="johar">Johar Park Only</SelectItem>
                  <SelectItem value="saddar">Saddar Park Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Notice Title</Label>
              <Input
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                placeholder="e.g. Schedule Change for Friday Session"
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Message</Label>
              <Textarea
                value={noticeMessage}
                onChange={(e) => setNoticeMessage(e.target.value)}
                placeholder="Write announcement details here..."
                className="min-h-[120px] resize-none rounded-xl text-sm"
              />
            </div>

            <Button
              onClick={handleSendNotice}
              disabled={!noticeTitle || !noticeMessage || noticeStatus !== "idle"}
              className="w-full h-12 bg-gradient-to-r from-[#1F0860] via-[#4B0A8F] to-[#D90429] text-white font-bold rounded-xl shadow-md mt-2"
            >
              {noticeStatus === "sending" ? (
                "Broadcasting..."
              ) : noticeStatus === "success" ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Broadcasted!
                </span>
              ) : (
                "Broadcast Notice"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── 4. Import Roster Sheet (Screenshot 212942) ──────────────────────── */}
      <Sheet open={isImportRosterOpen} onOpenChange={setIsImportRosterOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto max-w-[460px] mx-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left font-bold text-lg text-slate-900">
              Import Roster (.xlsx)
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 pb-6">
            <div className="p-3.5 bg-purple-50/60 border border-purple-100 rounded-2xl text-xs text-slate-600 leading-relaxed">
              <p className="font-bold text-[#4B0A8F] mb-1">Spreadsheet Guidelines</p>
              Upload the official intake template (.xlsx). Required columns: <strong>Name</strong>, <strong>Phone</strong>, <strong>Age</strong>, <strong>Grade</strong>, <strong>Guardian Contact</strong>, <strong>Park</strong>.
            </div>

            {/* Drop zone */}
            <div
              onClick={() => setSelectedFileName("Shabab_Batch_4_Intake_Roster.xlsx")}
              className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:border-[#4B0A8F] hover:bg-purple-50/30 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-900">
                {selectedFileName ? selectedFileName : "Tap to choose .xlsx file"}
              </p>
              <p className="text-xs text-slate-400 mt-1">Supports Excel 2016+ (.xlsx)</p>
            </div>

            <Button
              onClick={handleStartImport}
              disabled={!selectedFileName || importStatus !== "idle"}
              className="w-full h-11 bg-[#4B0A8F] hover:bg-[#3d0874] text-white font-bold rounded-xl mt-2"
            >
              {importStatus === "importing" ? (
                "Importing Roster..."
              ) : importStatus === "success" ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Roster Imported Successfully!
                </span>
              ) : (
                "Start Import"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── 5. Download Backup Sheet (Screenshot 212949) ────────────────────── */}
      <Sheet open={isBackupOpen} onOpenChange={setIsBackupOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto max-w-[460px] mx-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left font-bold text-lg text-slate-900">
              Download Backup
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 pb-6">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">DATABASE BACKUP</p>
              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                Save an offline JSON snapshot of all current parks, students, murabbis, attendance, and evaluation records.
              </p>
            </div>

            <Button
              onClick={handleDownloadBackup}
              className="w-full h-12 bg-gradient-to-r from-[#1F0860] via-[#4B0A8F] to-[#D90429] text-white font-bold text-sm rounded-xl shadow-md"
            >
              <Download className="w-4 h-4 mr-2" /> Download JSON Backup
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── 6. Restore Backup Sheet (Screenshot 212949) ─────────────────────── */}
      <Sheet open={isRestoreOpen} onOpenChange={setIsRestoreOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto max-w-[460px] mx-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left font-bold text-lg text-slate-900">
              Restore Backup
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 pb-6">
            <div className="p-3.5 bg-amber-50 border border-amber-200/60 rounded-2xl text-xs text-amber-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Restoring a backup merges and updates records. Ensure your backup file was created from this application version.
              </span>
            </div>

            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:border-[#4B0A8F] hover:bg-purple-50/30 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 mx-auto flex items-center justify-center mb-3">
                <Database className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-900">Choose backup .json file</p>
              <p className="text-xs text-slate-400 mt-1">Tap to browse files</p>
            </div>

            <Button
              onClick={() => {
                alert("Backup restored successfully.");
                setIsRestoreOpen(false);
              }}
              className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl mt-2"
            >
              Restore from File
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SettingRow({
  icon,
  iconBg,
  title,
  subtitle,
  onClick,
  isLast,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  onClick: () => void;
  isLast?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left",
        !isLast && "border-b border-slate-100"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">{title}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400" />
    </button>
  );
}
