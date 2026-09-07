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

import {
  Home,
  Hexagon,
  Info,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  | "notifications";

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
  const sessionInitialized = useRef(false);

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
                {screen === "home" && role === "murabbi" && <MobileMurabbiDashboard />}
                {screen === "home" && (role === "park_lead" || role === "park_admin") && <MobileParkDashboard />}
                {screen === "home" && role === "city_head" && <MobileCityHeadDashboard />}
                {screen === "home" && (role === "super_admin" || role === "program_admin") && <MobileHomeDashboard />}
                {screen === "home" && role === "student" && <MobileStudentDashboard />}
                {screen === "home" && role === "guardian" && <MobileGuardianDashboard />}
                
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
                {screen === "more" && <MobileMorePage onNavigate={(s: string) => setScreen(s as ScreenId)} />}
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
                                   "alumni", "community", "teams", "custom-reports", "staff-directory", "audit-log", "notifications"
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
