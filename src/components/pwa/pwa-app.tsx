"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

// Existing components
import { MobileSplashPage } from "@/components/modules/auth/mobile-splash-page";
import { MobileLoginPage } from "@/components/modules/auth/mobile-login-page";
import { MobileMurabbiDashboard } from "@/components/modules/murabbi/mobile-murabbi-dashboard";
import { MobileParkDashboard } from "@/components/modules/park/mobile-park-dashboard";
import { MobileCityHeadDashboard } from "@/components/modules/city-head/mobile-city-head-dashboard";
import { MobileStudentDashboard } from "@/components/modules/student/mobile-student-dashboard";
import { MobileGuardianDashboard } from "@/components/modules/guardian/mobile-guardian-dashboard";

// New components (to be implemented)
import { MobileParksPage } from "@/components/modules/park/mobile-parks-page";
import { MobileParkDetailPage } from "@/components/modules/park/mobile-park-detail-page";
import { MobileInventoryPage } from "@/components/modules/park/mobile-inventory-page";
import { MobileEvaluationPage } from "@/components/modules/park/mobile-evaluation-page";
import { MobileInfoPage } from "@/components/modules/mobile-info-page";
import { MobileMorePage } from "@/components/modules/admin/mobile-more-page";
import { MobileAnalysisPage } from "@/components/modules/admin/mobile-analysis-page";
import { MobileHomeDashboard } from "@/components/modules/admin/mobile-home-dashboard";
import { MobileAdmissionsPage } from "@/components/modules/admin/mobile-admissions-page";
import { MobileCallingPage } from "@/components/modules/admin/mobile-calling-page";
import { MobileMashwaraPage } from "@/components/modules/admin/mobile-mashwara-page";
import { MobileFeesPage } from "@/components/modules/admin/mobile-fees-page";
import { MobileGamificationPage } from "@/components/modules/admin/mobile-gamification-page";
import { MobileCertificatesPage } from "@/components/modules/admin/mobile-certificates-page";
import { MobileContentPlannerPage } from "@/components/modules/content-planner/mobile-content-planner-page";
import { IslahMamulatPage } from "@/components/modules/admin/islah-mamulat-page";
import { SyncConflictsPage } from "@/components/modules/admin/sync-conflicts-page";
import { MobileEventsPage } from "@/components/modules/admin/mobile-events-page";
import { MobileKnowledgeBasePage } from "@/components/modules/admin/mobile-knowledge-base-page";
import { MobileProcurementPage } from "@/components/modules/admin/mobile-procurement-page";
import { MobileSecurityAccessPage } from "@/components/modules/admin/mobile-security-access-page";
import { MobilePortalImportPage } from "@/components/modules/admin/mobile-portal-import-page";
import { MobileAlumniPage } from "@/components/modules/admin/mobile-alumni-page";
import { MobileCommunityPage } from "@/components/modules/admin/mobile-community-page";
import { MobileCollaborationTeamsPage } from "@/components/modules/admin/mobile-collaboration-teams-page";
import { MobileReportsBuilderPage } from "@/components/modules/admin/mobile-reports-builder-page";
import { MobileStaffDirectoryPage } from "@/components/modules/admin/mobile-staff-directory-page";
import { MobileAuditLogPage } from "@/components/modules/admin/mobile-audit-log-page";
import { MobileNotificationsPage } from "@/components/modules/admin/mobile-notifications-page";
import { MobileStudentProfileView } from "@/components/modules/student/mobile-student-profile-view";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  Home,
  Hexagon,
  Info,
  MoreHorizontal,
  Loader2,
  Sparkles,
  UserPlus,
  PhoneCall,
  CalendarCheck,
  Calendar,
  Users,
  MessageSquare,
  GraduationCap,
  CreditCard,
  Trophy,
  Award,
  BookOpen,
  Heart,
  Database,
  Package,
  ShieldCheck,
  Contact,
  History,
  Megaphone,
  HelpCircle,
  BarChart2,
  FileSpreadsheet,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MODULE_GROUPS = [
  {
    title: "Operations & Admissions",
    modules: [
      { id: "admissions", label: "Admissions Desk", desc: "Intake & cohorts", icon: UserPlus, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/40" },
      { id: "calling", label: "Retention Calling", desc: "Outreach pipeline", icon: PhoneCall, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40" },
      { id: "inventory", label: "Central Store", desc: "Master equipment", icon: Package, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
      { id: "procurement", label: "Procurement", desc: "Supplies & orders", icon: Package, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40" },
    ],
  },
  {
    title: "Leadership & Governance",
    modules: [
      { id: "mashwara", label: "Weekly Mashwara", desc: "Executive shura", icon: CalendarCheck, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40" },
      { id: "events", label: "Events & Camps", desc: "Special schedules", icon: Calendar, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/40" },
      { id: "teams", label: "Collaboration Teams", desc: "Sports & Media", icon: Users, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-950/40" },
      { id: "custom-reports", label: "Reports Builder", desc: "Analytics & export", icon: BarChart2, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/40" },
    ],
  },
  {
    title: "Tarbiyah & Shabab",
    modules: [
      { id: "student-profile", label: "Shabab Profile", desc: "Shabab 6-tab profile", icon: UserCheck, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/40" },
      { id: "islah", label: "Islah-i-Mamulat", desc: "Fajr & Quran habits", icon: Heart, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
      { id: "content-planner", label: "Tarbiyah LMS", desc: "Curriculum planner", icon: BookOpen, color: "text-sky-600", bg: "bg-sky-50 dark:bg-sky-950/40" },
      { id: "gamification", label: "Badges & Points", desc: "Shabab ranks", icon: Trophy, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40" },
      { id: "certificates", label: "Certificates", desc: "Graduation awards", icon: Award, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/40" },
      { id: "alumni", label: "Alumni Network", desc: "Graduates registry", icon: GraduationCap, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/40" },
      { id: "community", label: "Community Hub", desc: "Brotherhood & news", icon: MessageSquare, color: "text-sky-600", bg: "bg-sky-50 dark:bg-sky-950/40" },
    ],
  },
  {
    title: "Finance & Administration",
    modules: [
      { id: "fees", label: "Fees & Accounts", desc: "Challans & vouchers", icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
      { id: "security-access", label: "Security & Roles", desc: "RBAC capabilities", icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
      { id: "staff-directory", label: "Staff Directory", desc: "Murabbis & leads", icon: Contact, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
      { id: "audit-log", label: "Audit Log Trail", desc: "Security events", icon: History, color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800" },
      { id: "notifications", label: "Notifications", desc: "Alert broadcasts", icon: Megaphone, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/40" },
      { id: "portal-import", label: "Portal Import", desc: "759 intake dataset", icon: FileSpreadsheet, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40" },
      { id: "knowledge-base", label: "Knowledge Base", desc: "SOPs & manuals", icon: HelpCircle, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/40" },
      { id: "sync", label: "Offline Sync", desc: "Cache & mutations", icon: Database, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
    ],
  },
];

// ─── Screen ID type ────────────────────────────────────────────────────────────
type ScreenId =
  | "splash"
  | "login"
  | "home"
  | "parks"
  | "info"
  | "more"
  | "park-detail"
  | "inventory"
  | "evaluation"
  | "analysis"
  | "admissions"
  | "calling"
  | "mashwara"
  | "fees"
  | "gamification"
  | "certificates"
  | "content-planner"
  | "islah"
  | "sync"
  | "events"
  | "knowledge-base"
  | "procurement"
  | "security-access"
  | "portal-import"
  | "alumni"
  | "community"
  | "teams"
  | "custom-reports"
  | "staff-directory"
  | "audit-log"
  | "notifications"
  | "student-profile";

export type ParkNav = {
  parkId: string;
  parkName: string;
  murabbiCount: number;
  studentCount: number;
} | null;

// ─── Universal Bottom Nav Tabs ──────────────────────────────────────────────────
const APP_TABS = [
  { id: "home" as ScreenId,  label: "Home",  icon: Home },
  { id: "parks" as ScreenId, label: "Parks", icon: Hexagon },
  { id: "info" as ScreenId,  label: "Info",  icon: Info },
  { id: "more" as ScreenId,  label: "More",  icon: MoreHorizontal },
];

function PwaLoadingScreen() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#D90429] flex flex-col items-center justify-center gap-5">
      <div className="size-20 rounded-3xl bg-white/10 border border-white/20 p-2 shadow-2xl backdrop-blur-xl flex items-center justify-center">
        <img src="/logo-white.png" alt="Logo" className="size-full object-contain" />
      </div>
      <Loader2 className="size-7 text-white/70 animate-spin" />
    </div>
  );
}

// ─── Main PWA App component ────────────────────────────────────────────────────
export function PwaApp() {
  const sessionResult = useSession() || { data: null, status: "unauthenticated" };
  const { data: session, status } = sessionResult;
  const user = session?.user as any;
  const role: string = user?.role ?? "";

  const [screen, setScreen] = useState<ScreenId>("splash");
  const [parkNav, setParkNav] = useState<ParkNav>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [selectedParticipantName, setSelectedParticipantName] = useState<string | null>(null);
  const [simulatedRole, setSimulatedRole] = useState<string | null>(null);
  const [isModuleSheetOpen, setIsModuleSheetOpen] = useState(false);
  const sessionInitialized = useRef(false);

  const effectiveRole = simulatedRole || role || "super_admin";

  // Once session is known, decide initial screen
  useEffect(() => {
    if (status === "loading") return;
    if (sessionInitialized.current) return;
    sessionInitialized.current = true;

    if (session && user?.id && role) {
      setScreen("home");
    } else {
      setScreen("splash");
    }
  }, [status, session, user, role]);

  // After role changes (login success) navigate home
  useEffect(() => {
    if (role) {
      if (screen === "login" || screen === "splash") {
        setScreen("home");
      }
    }
  }, [role, screen]);

  // ─── Loading state ───────────────────────────────────────────────────────
  if (status === "loading") return <PwaLoadingScreen />;

  // ─── Render the active screen ────────────────────────────────────────────
  const renderScreen = () => {
    // AUTH SCREENS (no bottom nav)
    if (screen === "splash") {
      return (
        <div className="min-h-screen w-full bg-[#f0f2f5] dark:bg-[#0c0817] flex justify-center">
          <div className="w-full max-w-[460px] min-h-screen shadow-2xl relative flex flex-col border-x border-gray-200/80">
            <MobileSplashPage onContinue={() => setScreen("login")} />
          </div>
        </div>
      );
    }

    if (screen === "login") {
      return (
        <div className="min-h-screen w-full bg-[#f0f2f5] dark:bg-[#0c0817] flex justify-center">
          <div className="w-full max-w-[460px] min-h-screen shadow-2xl relative flex flex-col border-x border-gray-200/80">
            <MobileLoginPage
              onBackToSplash={() => setScreen("splash")}
              onSuccess={() => setScreen("home")}
            />
          </div>
        </div>
      );
    }

    // APP SCREENS (show bottom nav)
    return (
      <div className="min-h-screen w-full bg-[#f0f2f5] dark:bg-[#0c0817] flex justify-center selection:bg-purple-500 selection:text-white">
        <div className="w-full max-w-[460px] min-h-screen bg-white dark:bg-[#120B24] shadow-2xl relative flex flex-col border-x border-gray-200/80 dark:border-white/10">
          {/* ─── Role Switcher Bar (Available for easy multi-role testing) ──────────── */}
          <div className="bg-[#180A40] text-white px-3 py-2 border-b border-purple-500/20 z-30 sticky top-0 backdrop-blur-md">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
              <span className="text-[10px] font-extrabold text-purple-300 uppercase tracking-wider shrink-0 mr-1">
                Preview Role:
              </span>
              {[
                { id: null, label: "HQ Admin" },
                { id: "city_head", label: "City Head" },
                { id: "park_lead", label: "Park Lead" },
                { id: "murabbi", label: "Murabbi" },
                { id: "student", label: "Student" },
                { id: "guardian", label: "Guardian" },
              ].map((r) => {
                const isSelected = simulatedRole === r.id || (simulatedRole === null && r.id === null);
                return (
                  <button
                    key={r.label}
                    onClick={() => {
                      setSimulatedRole(r.id);
                      if (screen !== "home") setScreen("home");
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 transition-all active:scale-95",
                      isSelected
                        ? "bg-gradient-to-r from-[#4B0A8F] to-[#D90429] text-white shadow-sm ring-1 ring-white/30"
                        : "bg-white/10 hover:bg-white/20 text-purple-200"
                    )}
                  >
                    {r.label}
                  </button>
                );
              })}

              <button
                onClick={() => setIsModuleSheetOpen(true)}
                className="px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 bg-amber-400 text-purple-950 hover:bg-amber-300 active:scale-95 transition-all shadow-sm flex items-center gap-1 ml-1"
                title="Launch any operational module"
              >
                <Sparkles className="size-3" />
                <span>All Modules</span>
              </button>
            </div>

            {simulatedRole && (
              <div className="mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between text-[11px] text-amber-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Simulating <strong>{simulatedRole.replace("_", " ").toUpperCase()}</strong> view
                </span>
                <button
                  onClick={() => setSimulatedRole(null)}
                  className="text-[10px] font-bold underline text-amber-200 hover:text-white"
                >
                  Reset to Admin
                </button>
              </div>
            )}
          </div>

          {/* Active Screen */}
          <main className="flex-1 w-full pb-20 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={screen}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="w-full"
              >
                {/* HOME — role-specific dashboard */}
                {screen === "home" && effectiveRole === "murabbi" && (
                  <MobileMurabbiDashboard onNavigate={(s) => setScreen(s as ScreenId)} />
                )}
                {screen === "home" && (effectiveRole === "park_lead" || effectiveRole === "park_admin") && (
                  <MobileParkDashboard
                    onNavigate={(s) => setScreen(s as ScreenId)}
                    onSelectPark={(park) => {
                      setParkNav(park);
                      setScreen("park-detail");
                    }}
                  />
                )}
                {screen === "home" && effectiveRole === "city_head" && (
                  <MobileCityHeadDashboard
                    onNavigate={(s) => setScreen(s as ScreenId)}
                    onSelectPark={(park) => {
                      setParkNav(park);
                      setScreen("park-detail");
                    }}
                  />
                )}
                {screen === "home" && (effectiveRole === "super_admin" || effectiveRole === "program_admin") && (
                  <MobileHomeDashboard />
                )}
                {screen === "home" && effectiveRole === "student" && (
                  <MobileStudentDashboard onNavigate={(s) => setScreen(s as ScreenId)} />
                )}
                {screen === "home" && effectiveRole === "guardian" && (
                  <MobileGuardianDashboard onNavigate={(s) => setScreen(s as ScreenId)} />
                )}
                {screen === "home" &&
                  !["murabbi", "park_lead", "park_admin", "city_head", "super_admin", "program_admin", "student", "guardian"].includes(
                    effectiveRole
                  ) && <MobileHomeDashboard />}
                
                {/* NEW SCREENS */}
                {screen === "parks" && (
                  <MobileParksPage 
                    onParkSelect={(park) => { 
                      setParkNav(park); 
                      setScreen("park-detail"); 
                    }}
                    onSelectInventory={() => setScreen("inventory")}
                  />
                )}
                {screen === "park-detail" && (
                  <MobileParkDetailPage 
                    parkNav={parkNav} 
                    onBack={() => setScreen("parks")} 
                    onGoToEvaluation={() => setScreen("evaluation")}
                    onSelectStudent={(studentId, studentName) => {
                      setSelectedParticipantId(studentId);
                      setSelectedParticipantName(studentName || null);
                      setScreen("student-profile");
                    }}
                  />
                )}
                {screen === "student-profile" && (
                  <MobileStudentProfileView
                    participantId={selectedParticipantId}
                    participantName={selectedParticipantName}
                    effectiveRole={effectiveRole}
                    onBack={() => {
                      if (effectiveRole === "student") {
                        setScreen("home");
                      } else if (parkNav) {
                        setScreen("park-detail");
                      } else {
                        setScreen("more");
                      }
                    }}
                    onSelectParticipant={(id, name) => {
                      setSelectedParticipantId(id);
                      setSelectedParticipantName(name);
                    }}
                  />
                )}
                {screen === "evaluation" && (
                  <MobileEvaluationPage
                    parkId={parkNav?.parkId || ""}
                    parkName={parkNav?.parkName || "Park"}
                    onBack={() => setScreen("park-detail")}
                  />
                )}
                {screen === "inventory" && <MobileInventoryPage onBack={() => setScreen("parks")} />}
                {screen === "info" && <MobileInfoPage />}
                {screen === "more" && <MobileMorePage role={effectiveRole} onNavigate={(s: string) => setScreen(s as ScreenId)} />}
                {screen === "analysis" && <MobileAnalysisPage onBack={() => setScreen("more")} />}
                {screen === "admissions" && <MobileAdmissionsPage onBack={() => setScreen("more")} />}
                {screen === "calling" && <MobileCallingPage onBack={() => setScreen("more")} />}
                {screen === "mashwara" && <MobileMashwaraPage onBack={() => setScreen("more")} />}
                {screen === "fees" && <MobileFeesPage onBack={() => setScreen("more")} />}
                {screen === "gamification" && <MobileGamificationPage onBack={() => setScreen("more")} />}
                {screen === "certificates" && <MobileCertificatesPage onBack={() => setScreen("more")} />}
                {screen === "content-planner" && <MobileContentPlannerPage onBack={() => setScreen("more")} />}
                {screen === "islah" && <IslahMamulatPage onBack={() => setScreen("more")} />}
                {screen === "sync" && <SyncConflictsPage onBack={() => setScreen("more")} />}
                {screen === "events" && <MobileEventsPage onBack={() => setScreen("more")} />}
                {screen === "knowledge-base" && <MobileKnowledgeBasePage onBack={() => setScreen("more")} />}
                {screen === "procurement" && <MobileProcurementPage onBack={() => setScreen("more")} />}
                {screen === "security-access" && <MobileSecurityAccessPage onBack={() => setScreen("more")} />}
                {screen === "portal-import" && <MobilePortalImportPage onBack={() => setScreen("more")} />}
                {screen === "alumni" && <MobileAlumniPage onBack={() => setScreen("more")} />}
                {screen === "community" && <MobileCommunityPage onBack={() => setScreen("more")} />}
                {screen === "teams" && <MobileCollaborationTeamsPage onBack={() => setScreen("more")} />}
                {screen === "custom-reports" && <MobileReportsBuilderPage onBack={() => setScreen("more")} />}
                {screen === "staff-directory" && <MobileStaffDirectoryPage onBack={() => setScreen("more")} />}
                {screen === "audit-log" && <MobileAuditLogPage onBack={() => setScreen("more")} />}
                {screen === "notifications" && <MobileNotificationsPage onBack={() => setScreen("more")} />}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* ─── All Modules Launcher Dialog ──────────────────────── */}
          <Dialog open={isModuleSheetOpen} onOpenChange={setIsModuleSheetOpen}>
            <DialogContent className="max-w-[420px] max-h-[85vh] overflow-y-auto p-0 rounded-3xl bg-white dark:bg-[#120B24] border-purple-500/20 shadow-2xl">
              <div className="bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#D90429] p-5 text-white">
                <DialogHeader className="text-left space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-amber-300 text-[10px] font-bold tracking-wider uppercase backdrop-blur-md w-fit">
                    <Sparkles className="size-3" />
                    Universal Tester Access
                  </div>
                  <DialogTitle className="text-xl font-black tracking-tight text-white">
                    All Modules Launcher
                  </DialogTitle>
                  <DialogDescription className="text-xs text-purple-200">
                    Jump into any of the 22 operational desks directly for testing.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-4 space-y-5">
                {MODULE_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground px-1">
                      {group.title}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {group.modules.map((mod) => {
                        const Icon = mod.icon;
                        return (
                          <button
                            key={mod.id}
                            onClick={() => {
                              setIsModuleSheetOpen(false);
                              setScreen(mod.id as ScreenId);
                            }}
                            className="flex items-start gap-2.5 p-2.5 rounded-xl border border-border/50 bg-card hover:bg-purple-500/5 active:scale-98 transition-all text-left group"
                          >
                            <div className={cn("p-2 rounded-lg shrink-0", mod.bg)}>
                              <Icon className={cn("size-4", mod.color)} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 truncate">
                                {mod.label}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {mod.desc}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* ─── Bottom Navigation ────────────────────────────── */}
          <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[460px] bg-white/98 dark:bg-[#120B24]/98 backdrop-blur-md border-t border-gray-100 dark:border-white/10 z-40 px-2 py-1.5 shadow-md">
            <div className="flex items-center justify-around w-full">
              {APP_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = screen === tab.id || 
                                 (tab.id === "parks" && ["park-detail", "inventory", "evaluation"].includes(screen)) ||
                                 (tab.id === "more" && [
                                   "analysis", "admissions", "calling", "mashwara", "fees", "gamification", 
                                   "certificates", "content-planner", "islah", "sync",
                                   "events", "knowledge-base", "procurement", "security-access", "portal-import",
                                   "alumni", "community", "teams", "custom-reports", "staff-directory", "audit-log", "notifications",
                                   "student-profile"
                                 ].includes(screen));
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setScreen(tab.id)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 relative min-w-0 flex-1",
                      isActive
                        ? "text-[#180A40] dark:text-purple-300 font-bold"
                        : "text-gray-400 hover:text-gray-600 font-medium"
                    )}
                  >
                    <Icon className={cn("size-5", isActive && "stroke-[2.5px] text-[#180A40] dark:text-purple-300")} />
                    <span className="text-[10px] tracking-tight">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    );
  };

  return <>{renderScreen()}</>;
}
