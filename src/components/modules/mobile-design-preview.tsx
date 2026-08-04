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
import { Sparkles, LogIn, CheckSquare, Users, TreePine, Building2, ShieldCheck, GraduationCap, HeartHandshake, PhoneCall, Calendar, CalendarCheck, BookOpen, UserPlus, DollarSign } from "lucide-react";

export function MobileDesignPreview() {
  const [activeScreen, setActiveScreen] = useState<
    "splash" | "login" | "attendance" | "murabbi" | "park" | "city" | "admin" | "student" | "guardian" | "calling" | "mashwara" | "events" | "planner" | "admissions" | "fees"
  >("splash");
  const [rolePrefill, setRolePrefill] = useState("");

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-white">
      {/* ─── Top Switcher Bar for Reviewers ───────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-2 shrink-0">
          <div className="size-8 rounded-xl bg-[#4B0A8F] flex items-center justify-center font-bold text-amber-300 text-xs">
            ۳۶۰
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-100">Shabab 360 Mobile Review</h1>
            <p className="text-[10px] text-slate-400">Branch: <span className="text-purple-400 font-mono">design/shabab-brand-mobile-screens</span></p>
          </div>
        </div>

        {/* Screen Tabs */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar max-w-full">
          {[
            { id: "splash", label: "1. Splash", icon: Sparkles },
            { id: "login", label: "2. Login", icon: LogIn },
            { id: "attendance", label: "3. Attendance", icon: CheckSquare },
            { id: "murabbi", label: "4. Murabbi", icon: Users },
            { id: "park", label: "5. Park Lead", icon: TreePine },
            { id: "city", label: "6. City Head", icon: Building2 },
            { id: "admin", label: "7. Admin HQ", icon: ShieldCheck },
            { id: "student", label: "8. Student", icon: GraduationCap },
            { id: "guardian", label: "9. Guardian", icon: HeartHandshake },
            { id: "calling", label: "10. Calling Desk", icon: PhoneCall },
            { id: "mashwara", label: "11. Mashwara", icon: Calendar },
            { id: "events", label: "12. Events", icon: CalendarCheck },
            { id: "planner", label: "13. Planner", icon: BookOpen },
            { id: "admissions", label: "14. Admissions", icon: UserPlus },
            { id: "fees", label: "15. Fees Desk", icon: DollarSign },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeScreen === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveScreen(tab.id as any)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive ? "bg-[#4B0A8F] text-white shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Mobile Device Frame Viewport ─────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 bg-slate-950/60">
        <div className="w-full max-w-[410px] min-h-[780px] bg-background text-foreground rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-slate-700/60 relative">
          {/* Speaker Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-5 bg-slate-950 rounded-b-2xl z-40 flex items-center justify-center">
            <div className="w-12 h-1 bg-slate-800 rounded-full" />
          </div>

          {/* Active Screen Rendering */}
          <div className="pt-2">
            {activeScreen === "splash" && (
              <MobileSplashPage
                onContinue={() => setActiveScreen("login")}
                onSelectRole={(r) => {
                  setRolePrefill(r);
                  setActiveScreen("login");
                }}
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

            {activeScreen === "murabbi" && <MobileMurabbiDashboard />}
            {activeScreen === "park" && <MobileParkDashboard />}
            {activeScreen === "city" && <MobileCityHeadDashboard />}
            {activeScreen === "admin" && <MobileAdminDashboard />}
            {activeScreen === "student" && <MobileStudentDashboard />}
            {activeScreen === "guardian" && <MobileGuardianDashboard />}
            {activeScreen === "calling" && <MobileCallingPage />}
            {activeScreen === "mashwara" && <MobileMashwaraPage />}
            {activeScreen === "events" && <MobileEventsPage />}
            {activeScreen === "planner" && <MobileContentPlannerPage />}
            {activeScreen === "admissions" && <MobileAdmissionsPage />}
            {activeScreen === "fees" && <MobileFeesPage />}
          </div>
        </div>
      </div>
    </div>
  );
}
