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
  Smartphone,
  Maximize2
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileDesignPreview() {
  const [activeScreen, setActiveScreen] = useState<
    "splash" | "login" | "attendance" | "murabbi" | "park" | "city" | "admin" | "student" | "guardian" | "calling" | "mashwara" | "events" | "planner" | "admissions" | "fees"
  >("splash");
  const [rolePrefill, setRolePrefill] = useState("");
  const [viewMode, setViewMode] = useState<"frame" | "full">("frame");

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white select-none">
      {/* ─── Top Switcher Bar for Reviewers ───────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 py-2 flex flex-col md:flex-row items-center justify-between gap-2 shadow-xl">
        <div className="flex items-center justify-between w-full md:w-auto gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] border border-white/20 p-0.5 flex items-center justify-center overflow-hidden">
              <img src="/shabab-logo.png" alt="Shabab Logo" className="size-full object-contain" />
            </div>
            <div>
              <h1 className="text-xs font-extrabold text-slate-100">Shabab 360 Mobile Suite</h1>
              <p className="text-[10px] text-slate-400">100% Responsive Mobile-First View</p>
            </div>
          </div>

          {/* Viewport Toggle (Frame vs Full Responsive) */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode("frame")}
              title="Phone Mockup Frame"
              className={cn(
                "p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all",
                viewMode === "frame" ? "bg-[#4B0A8F] text-white shadow-md" : "text-slate-400 hover:text-white"
              )}
            >
              <Smartphone className="size-3.5" />
              <span className="hidden sm:inline">Mockup Frame</span>
            </button>
            <button
              onClick={() => setViewMode("full")}
              title="Full Responsive Device View"
              className={cn(
                "p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all",
                viewMode === "full" ? "bg-[#4B0A8F] text-white shadow-md" : "text-slate-400 hover:text-white"
              )}
            >
              <Maximize2 className="size-3.5" />
              <span className="hidden sm:inline">Full Screen</span>
            </button>
          </div>
        </div>

        {/* Screen Tabs Header */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar w-full md:w-auto">
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
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                  isActive ? "bg-[#4B0A8F] text-white shadow-md" : "text-slate-400 hover:text-white"
                )}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Active Screen Container ──────────────────────────────────────── */}
      <div className={cn(
        "flex-1 flex justify-center transition-all",
        viewMode === "frame" ? "items-center p-2 sm:p-6 bg-slate-950/80" : "items-start w-full bg-background"
      )}>
        <div className={cn(
          "w-full bg-background text-foreground transition-all",
          viewMode === "frame"
            ? "max-w-[420px] min-h-[812px] sm:rounded-[2.5rem] shadow-2xl border-0 sm:border-4 border-slate-700/60 overflow-hidden relative"
            : "max-w-md mx-auto min-h-screen"
        )}>
          {/* Speaker Notch (Mockup Frame Mode Only) */}
          {viewMode === "frame" && (
            <div className="hidden sm:flex absolute top-0 left-1/2 -translate-x-1/2 w-36 h-5 bg-slate-950 rounded-b-2xl z-40 items-center justify-center pointer-events-none">
              <div className="w-12 h-1 bg-slate-800 rounded-full" />
            </div>
          )}

          {/* Active Screen View */}
          <div className={cn(viewMode === "frame" ? "sm:pt-3" : "pt-0")}>
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
