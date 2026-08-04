"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileSplashPage } from "@/components/modules/auth/mobile-splash-page";
import { MobileLoginPage } from "@/components/modules/auth/mobile-login-page";
import { MobileAttendancePage } from "@/components/modules/park/mobile-attendance-page";
import { MobileMurabbiDashboard } from "@/components/modules/murabbi/mobile-murabbi-dashboard";
import { MobileParkDashboard } from "@/components/modules/park/mobile-park-dashboard";
import { MobileCityHeadDashboard } from "@/components/modules/city-head/mobile-city-head-dashboard";
import { MobileAdminDashboard } from "@/components/modules/admin/mobile-admin-dashboard";
import { MobileStudentDashboard } from "@/components/modules/student/mobile-student-dashboard";
import { MobileGuardianDashboard } from "@/components/modules/guardian/mobile-guardian-dashboard";
import { MobileCallingPage } from "@/components/modules/admin/mobile-calling-page";
import { MobileMashwaraPage } from "@/components/modules/admin/mobile-mashwara-page";
import { MobileEventsPage } from "@/components/modules/admin/mobile-events-page";
import { MobileContentPlannerPage } from "@/components/modules/content-planner/mobile-content-planner-page";
import { MobileAdmissionsPage } from "@/components/modules/admin/mobile-admissions-page";
import { MobileFeesPage } from "@/components/modules/admin/mobile-fees-page";
import {
  Home,
  CheckSquare,
  PhoneCall,
  CalendarCheck,
  User,
  BookOpen,
  DollarSign,
  LogOut,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Screen ID type ────────────────────────────────────────────────────────────
type ScreenId =
  | "splash"
  | "login"
  | "home"           // role-based dashboard
  | "attendance"
  | "calling"
  | "mashwara"
  | "events"
  | "planner"
  | "admissions"
  | "fees"
  | "profile";

// ─── Bottom nav tabs per role group ───────────────────────────────────────────
const ADMIN_TABS = [
  { id: "home" as ScreenId,       label: "Dashboard",  icon: Home },
  { id: "admissions" as ScreenId, label: "Admissions", icon: User },
  { id: "fees" as ScreenId,       label: "Fees",       icon: DollarSign },
  { id: "calling" as ScreenId,    label: "Calling",    icon: PhoneCall },
  { id: "events" as ScreenId,     label: "Events",     icon: CalendarCheck },
];

const PARK_TABS = [
  { id: "home" as ScreenId,       label: "Dashboard",  icon: Home },
  { id: "attendance" as ScreenId, label: "Attendance", icon: CheckSquare },
  { id: "mashwara" as ScreenId,   label: "Mashwara",   icon: CalendarCheck },
  { id: "planner" as ScreenId,    label: "Planner",    icon: BookOpen },
  { id: "calling" as ScreenId,    label: "Calling",    icon: PhoneCall },
];

const MURABBI_TABS = [
  { id: "home" as ScreenId,       label: "Dashboard",  icon: Home },
  { id: "attendance" as ScreenId, label: "Attendance", icon: CheckSquare },
  { id: "mashwara" as ScreenId,   label: "Mashwara",   icon: CalendarCheck },
  { id: "events" as ScreenId,     label: "Events",     icon: CalendarCheck },
  { id: "planner" as ScreenId,    label: "Planner",    icon: BookOpen },
];

const STUDENT_TABS = [
  { id: "home" as ScreenId,       label: "Dashboard",  icon: Home },
  { id: "attendance" as ScreenId, label: "Attendance", icon: CheckSquare },
  { id: "events" as ScreenId,     label: "Events",     icon: CalendarCheck },
];

const GUARDIAN_TABS = [
  { id: "home" as ScreenId,  label: "Dashboard", icon: Home },
  { id: "events" as ScreenId, label: "Events",   icon: CalendarCheck },
];

// ─── Role → home dashboard mapping ────────────────────────────────────────────
function getHomeDashboard(role: string): ScreenId {
  switch (role) {
    case "murabbi":                        return "home";
    case "park_lead":
    case "park_admin":                     return "home";
    case "city_head":                      return "home";
    case "super_admin":
    case "program_admin":                  return "home";
    case "student":                        return "home";
    case "guardian":                       return "home";
    default:                               return "home";
  }
}

function getTabsForRole(role: string) {
  switch (role) {
    case "super_admin":
    case "program_admin":
    case "city_head":   return ADMIN_TABS;
    case "park_lead":
    case "park_admin":  return PARK_TABS;
    case "murabbi":     return MURABBI_TABS;
    case "student":     return STUDENT_TABS;
    case "guardian":    return GUARDIAN_TABS;
    default:            return ADMIN_TABS;
  }
}

// ─── Loading screen ────────────────────────────────────────────────────────────
function PwaLoadingScreen() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#D90429] flex flex-col items-center justify-center gap-5">
      <div className="size-20 rounded-3xl bg-white/10 border border-white/20 p-2 shadow-2xl backdrop-blur-xl flex items-center justify-center">
        <img src="/shabab-logo.png" alt="Shabab 360" className="size-full object-contain" />
      </div>
      <Loader2 className="size-7 text-white/70 animate-spin" />
      <p className="text-xs text-purple-200 font-medium tracking-wide">Shabab 360</p>
    </div>
  );
}

// ─── Main PWA App component ────────────────────────────────────────────────────
export function PwaApp() {
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const role: string = user?.role ?? "";

  const [screen, setScreen]           = useState<ScreenId>("splash");
  const [rolePrefill, setRolePrefill] = useState("");
  const [navTabs, setNavTabs]         = useState(ADMIN_TABS);
  const sessionInitialized            = useRef(false);

  // Once session is known, decide initial screen
  useEffect(() => {
    if (status === "loading") return;
    if (sessionInitialized.current) return;
    sessionInitialized.current = true;

    if (session && user?.id && role) {
      // Already logged in — go straight to home
      setNavTabs(getTabsForRole(role));
      setScreen("home");
    } else {
      setScreen("splash");
    }
  }, [status, session, user, role]);

  // After role changes (login success) navigate home
  useEffect(() => {
    if (role) {
      setNavTabs(getTabsForRole(role));
      if (screen === "login" || screen === "splash") {
        setScreen("home");
      }
    }
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = useCallback(async () => {
    await signOut({ redirect: false });
    sessionInitialized.current = false;
    setScreen("splash");
  }, []);

  // ─── Loading state ───────────────────────────────────────────────────────
  if (status === "loading") return <PwaLoadingScreen />;

  // ─── Render the active screen ────────────────────────────────────────────
  const renderScreen = () => {
    // AUTH SCREENS (no bottom nav)
    if (screen === "splash") {
      return (
        <MobileSplashPage
          onContinue={() => setScreen("login")}
          onSelectRole={(r) => { setRolePrefill(r); setScreen("login"); }}
        />
      );
    }

    if (screen === "login") {
      return (
        <MobileLoginPage
          initialRolePrefill={rolePrefill}
          onBackToSplash={() => setScreen("splash")}
          onSuccess={() => setScreen("home")}
        />
      );
    }

    // APP SCREENS (show bottom nav)
    return (
      <div className="flex flex-col min-h-screen w-full bg-background text-foreground">
        {/* Active Screen */}
        <main className="flex-1 w-full pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full"
            >
              {/* HOME — role-specific dashboard */}
              {screen === "home" && role === "murabbi"                          && <MobileMurabbiDashboard />}
              {screen === "home" && (role === "park_lead" || role === "park_admin") && <MobileParkDashboard />}
              {screen === "home" && role === "city_head"                        && <MobileCityHeadDashboard />}
              {screen === "home" && (role === "super_admin" || role === "program_admin") && <MobileAdminDashboard />}
              {screen === "home" && role === "student"                          && <MobileStudentDashboard />}
              {screen === "home" && role === "guardian"                         && <MobileGuardianDashboard />}

              {/* OTHER SCREENS */}
              {screen === "attendance" && <MobileAttendancePage onBack={() => setScreen("home")} />}
              {screen === "calling"    && <MobileCallingPage />}
              {screen === "mashwara"   && <MobileMashwaraPage />}
              {screen === "events"     && <MobileEventsPage />}
              {screen === "planner"    && <MobileContentPlannerPage />}
              {screen === "admissions" && <MobileAdmissionsPage />}
              {screen === "fees"       && <MobileFeesPage />}

              {/* PROFILE / LOGOUT */}
              {screen === "profile" && (
                <div className="flex flex-col min-h-screen w-full bg-background items-center justify-center gap-6 px-6">
                  <div className="size-20 rounded-3xl bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] border border-white/20 p-1.5 shadow-2xl flex items-center justify-center">
                    <img src="/shabab-logo.png" alt="Shabab 360" className="size-full object-contain" />
                  </div>
                  <div className="text-center space-y-1">
                    <h2 className="text-lg font-extrabold text-foreground">{user?.name ?? "User"}</h2>
                    <p className="text-xs text-muted-foreground font-medium">{user?.email ?? ""}</p>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-[#4B0A8F]/10 text-[#4B0A8F] dark:text-purple-300 px-3 py-1 rounded-full border border-[#4B0A8F]/20 uppercase tracking-wider mt-2">
                      {role.replace("_", " ")}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 h-12 px-8 rounded-2xl bg-rose-600 text-white font-bold text-sm shadow-xl shadow-rose-600/25 hover:bg-rose-700 active:scale-95 transition-all"
                  >
                    <LogOut className="size-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ─── Glassmorphic Bottom Navigation ────────────────────────────── */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/85 backdrop-blur-xl border-t border-border/70 w-full shadow-2xl">
          <div className="flex items-center justify-around px-2 py-2 pb-safe">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = screen === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setScreen(tab.id)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all duration-200 relative min-w-[48px]",
                    isActive
                      ? "text-[#4B0A8F] dark:text-purple-300"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="pwa-active-tab"
                      className="absolute inset-0 bg-[#4B0A8F]/10 dark:bg-purple-400/15 rounded-2xl -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon className={cn("size-5", isActive && "stroke-[2.5px]")} />
                  <span className="text-[10px] font-bold tracking-tight">{tab.label}</span>
                </button>
              );
            })}
            {/* Profile / Logout always last */}
            <button
              onClick={() => setScreen("profile")}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all duration-200 relative min-w-[48px]",
                screen === "profile"
                  ? "text-[#4B0A8F] dark:text-purple-300"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {screen === "profile" && (
                <motion.div
                  layoutId="pwa-active-tab"
                  className="absolute inset-0 bg-[#4B0A8F]/10 dark:bg-purple-400/15 rounded-2xl -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <User className={cn("size-5", screen === "profile" && "stroke-[2.5px]")} />
              <span className="text-[10px] font-bold tracking-tight">Profile</span>
            </button>
          </div>
        </nav>
      </div>
    );
  };

  return <>{renderScreen()}</>;
}
