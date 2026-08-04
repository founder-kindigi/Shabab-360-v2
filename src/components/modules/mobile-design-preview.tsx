"use client";

import { useState } from "react";
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
  Sparkles,
  LogIn,
  CheckSquare,
  Users,
  TreePine,
  Building2,
  ShieldCheck,
  GraduationCap,
  HeartHandshake,
  PhoneCall,
  Calendar,
  CalendarCheck,
  BookOpen,
  UserPlus,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SCREENS = [
  { id: "splash",     label: "Splash",      icon: Sparkles },
  { id: "login",      label: "Login",        icon: LogIn },
  { id: "attendance", label: "Attendance",   icon: CheckSquare },
  { id: "murabbi",    label: "Murabbi",      icon: Users },
  { id: "park",       label: "Park Lead",    icon: TreePine },
  { id: "city",       label: "City Head",    icon: Building2 },
  { id: "admin",      label: "Admin HQ",     icon: ShieldCheck },
  { id: "student",    label: "Student",      icon: GraduationCap },
  { id: "guardian",   label: "Guardian",     icon: HeartHandshake },
  { id: "calling",    label: "Calling Desk", icon: PhoneCall },
  { id: "mashwara",   label: "Mashwara",     icon: Calendar },
  { id: "events",     label: "Events",       icon: CalendarCheck },
  { id: "planner",    label: "Planner",      icon: BookOpen },
  { id: "admissions", label: "Admissions",   icon: UserPlus },
  { id: "fees",       label: "Fees Desk",    icon: DollarSign },
] as const;

type ScreenId = (typeof SCREENS)[number]["id"];

export function MobileDesignPreview() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>("splash");
  const [rolePrefill, setRolePrefill] = useState("");

  return (
    // Outer wrapper fills 100vw × 100vh on every device
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground">
      {/* ─── Design Switcher Bar (reviewer-only, hidden on real PWA install) ─ */}
      <div className="sticky top-0 z-50 w-full bg-slate-950 border-b border-slate-800 shadow-xl">
        {/* Brand row */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <div className="size-8 rounded-xl overflow-hidden bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] border border-white/20 p-0.5 shrink-0">
            <img src="/shabab-logo.png" alt="Shabab 360" className="size-full object-contain" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-white leading-tight">Shabab 360 — PWA Preview</p>
            <p className="text-[10px] font-mono text-purple-400">design/shabab-brand-mobile-screens</p>
          </div>
        </div>

        {/* Scrollable screen tabs */}
        <div className="overflow-x-auto no-scrollbar px-3 pb-2">
          <div className="flex gap-1 min-w-max">
            {SCREENS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeScreen === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveScreen(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all active:scale-95",
                    isActive
                      ? "bg-[#4B0A8F] text-white shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  )}
                >
                  <Icon className="size-3.5 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Full-screen App Area — same mobile layout, full device width ── */}
      <main className="flex-1 w-full">
        {activeScreen === "splash" && (
          <MobileSplashPage
            onContinue={() => setActiveScreen("login")}
            onSelectRole={(r) => { setRolePrefill(r); setActiveScreen("login"); }}
          />
        )}
        {activeScreen === "login" && (
          <MobileLoginPage
            initialRolePrefill={rolePrefill}
            onBackToSplash={() => setActiveScreen("splash")}
            onSuccess={() => setActiveScreen("attendance")}
          />
        )}
        {activeScreen === "attendance" && (
          <MobileAttendancePage onBack={() => setActiveScreen("login")} />
        )}
        {activeScreen === "murabbi"    && <MobileMurabbiDashboard />}
        {activeScreen === "park"       && <MobileParkDashboard />}
        {activeScreen === "city"       && <MobileCityHeadDashboard />}
        {activeScreen === "admin"      && <MobileAdminDashboard />}
        {activeScreen === "student"    && <MobileStudentDashboard />}
        {activeScreen === "guardian"   && <MobileGuardianDashboard />}
        {activeScreen === "calling"    && <MobileCallingPage />}
        {activeScreen === "mashwara"   && <MobileMashwaraPage />}
        {activeScreen === "events"     && <MobileEventsPage />}
        {activeScreen === "planner"    && <MobileContentPlannerPage />}
        {activeScreen === "admissions" && <MobileAdmissionsPage />}
        {activeScreen === "fees"       && <MobileFeesPage />}
      </main>
    </div>
  );
}
