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
  Home,
  Hexagon,
  Info,
  MoreHorizontal,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ROLE_ALLOWED_SCREENS: Record<string, string[]> = {
  super_admin: [
    "splash", "login", "home", "parks", "info", "more", "park-detail", "inventory", "evaluation",
    "analysis", "admissions", "calling", "mashwara", "fees", "gamification", "certificates",
    "content-planner", "islah", "sync", "events", "knowledge-base", "procurement", "security-access",
    "portal-import", "alumni", "community", "teams", "custom-reports", "staff-directory", "audit-log",
    "notifications", "student-profile"
  ],
  program_admin: [
    "splash", "login", "home", "parks", "info", "more", "park-detail", "inventory", "evaluation",
    "analysis", "admissions", "calling", "mashwara", "fees", "gamification", "certificates",
    "content-planner", "islah", "sync", "events", "knowledge-base", "procurement", "security-access",
    "portal-import", "alumni", "community", "teams", "custom-reports", "staff-directory", "audit-log",
    "notifications", "student-profile"
  ],
  city_head: [
    "splash", "login", "home", "parks", "info", "more", "park-detail", "inventory", "evaluation",
    "analysis", "admissions", "calling", "mashwara", "fees", "gamification", "certificates",
    "content-planner", "islah", "sync", "events", "knowledge-base", "procurement",
    "alumni", "community", "teams", "custom-reports", "staff-directory",
    "notifications", "student-profile"
  ],
  park_lead: [
    "splash", "login", "home", "parks", "info", "more", "park-detail", "inventory", "evaluation",
    "analysis", "admissions", "calling", "mashwara", "fees", "gamification", "certificates",
    "content-planner", "islah", "sync", "events", "knowledge-base", "procurement",
    "community", "teams", "staff-directory", "student-profile"
  ],
  park_admin: [
    "splash", "login", "home", "parks", "info", "more", "park-detail", "inventory", "evaluation",
    "analysis", "admissions", "calling", "mashwara", "fees", "gamification", "certificates",
    "content-planner", "islah", "sync", "events", "knowledge-base", "procurement",
    "community", "teams", "staff-directory", "student-profile"
  ],
  murabbi: [
    "splash", "login", "home", "parks", "info", "more", "park-detail", "evaluation",
    "calling", "mashwara", "gamification", "certificates",
    "content-planner", "islah", "sync", "events", "knowledge-base",
    "community", "teams", "student-profile"
  ],
  student: [
    "splash", "login", "home", "info", "more",
    "gamification", "certificates", "content-planner", "islah",
    "events", "knowledge-base", "community", "student-profile"
  ],
  guardian: [
    "splash", "login", "home", "info", "more",
    "fees", "events", "knowledge-base", "community"
  ],
};

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
  const sessionInitialized = useRef(false);

  const effectiveRole = role || "student";

  const navigateTo = useCallback((target: ScreenId) => {
    const allowed = ROLE_ALLOWED_SCREENS[effectiveRole] || ["home", "info", "more"];
    if (allowed.includes(target)) {
      setScreen(target);
    } else {
      setScreen("home");
    }
  }, [effectiveRole]);

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

  const isStudentOrGuardian = effectiveRole === "student" || effectiveRole === "guardian";
  const appTabs = isStudentOrGuardian
    ? [
        { id: "home" as ScreenId, label: "Home", icon: Home },
        { id: "community" as ScreenId, label: "Community", icon: MessageSquare },
        { id: "info" as ScreenId, label: "Info", icon: Info },
        { id: "more" as ScreenId, label: "More", icon: MoreHorizontal },
      ]
    : APP_TABS;

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
                {screen === "more" && <MobileMorePage role={effectiveRole} onNavigate={(s: string) => navigateTo(s as ScreenId)} />}
                {screen === "analysis" && <MobileAnalysisPage onBack={() => navigateTo("more")} />}
                {screen === "admissions" && <MobileAdmissionsPage onBack={() => navigateTo("more")} />}
                {screen === "calling" && <MobileCallingPage onBack={() => navigateTo("more")} />}
                {screen === "mashwara" && <MobileMashwaraPage onBack={() => navigateTo("more")} />}
                {screen === "fees" && <MobileFeesPage onBack={() => navigateTo("more")} />}
                {screen === "gamification" && <MobileGamificationPage onBack={() => navigateTo("more")} />}
                {screen === "certificates" && <MobileCertificatesPage onBack={() => navigateTo("more")} />}
                {screen === "content-planner" && <MobileContentPlannerPage onBack={() => navigateTo("more")} />}
                {screen === "islah" && <IslahMamulatPage onBack={() => navigateTo("more")} />}
                {screen === "sync" && <SyncConflictsPage onBack={() => navigateTo("more")} />}
                {screen === "events" && <MobileEventsPage onBack={() => navigateTo("more")} />}
                {screen === "knowledge-base" && <MobileKnowledgeBasePage onBack={() => navigateTo("more")} />}
                {screen === "procurement" && <MobileProcurementPage onBack={() => navigateTo("more")} />}
                {screen === "security-access" && <MobileSecurityAccessPage onBack={() => navigateTo("more")} />}
                {screen === "portal-import" && <MobilePortalImportPage onBack={() => navigateTo("more")} />}
                {screen === "alumni" && <MobileAlumniPage onBack={() => navigateTo("more")} />}
                {screen === "community" && <MobileCommunityPage onBack={() => navigateTo("more")} />}
                {screen === "teams" && <MobileCollaborationTeamsPage onBack={() => navigateTo("more")} />}
                {screen === "custom-reports" && <MobileReportsBuilderPage onBack={() => navigateTo("more")} />}
                {screen === "staff-directory" && <MobileStaffDirectoryPage onBack={() => navigateTo("more")} />}
                {screen === "audit-log" && <MobileAuditLogPage onBack={() => navigateTo("more")} />}
                {screen === "notifications" && <MobileNotificationsPage onBack={() => navigateTo("more")} />}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* ─── Bottom Navigation ────────────────────────────── */}
          <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[460px] h-14 bg-white/98 dark:bg-[#120B24]/98 backdrop-blur-md border-t border-gray-100 dark:border-white/10 z-40 px-2 shadow-md flex items-center">
            <div className="flex items-center justify-around w-full">
              {appTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = screen === tab.id || 
                                 (tab.id === "parks" && ["park-detail", "inventory", "evaluation"].includes(screen)) ||
                                 (tab.id === "more" && [
                                   "analysis", "admissions", "calling", "mashwara", "fees", "gamification", 
                                   "certificates", "content-planner", "islah", "sync",
                                   "events", "knowledge-base", "procurement", "security-access", "portal-import",
                                   "alumni", "teams", "custom-reports", "staff-directory", "audit-log", "notifications",
                                   "student-profile"
                                 ].includes(screen));
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => navigateTo(tab.id)}
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
