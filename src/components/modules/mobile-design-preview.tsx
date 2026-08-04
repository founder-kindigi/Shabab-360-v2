"use client";

import { useState } from "react";
import { MobileSplashPage } from "@/components/modules/auth/mobile-splash-page";
import { MobileLoginPage } from "@/components/modules/auth/mobile-login-page";
import { MobileAttendancePage } from "@/components/modules/park/mobile-attendance-page";
import { MobileMurabbiDashboard } from "@/components/modules/murabbi/mobile-murabbi-dashboard";
import { MobileParkDashboard } from "@/components/modules/park/mobile-park-dashboard";
import { Sparkles, LogIn, CheckSquare, Users, TreePine } from "lucide-react";

export function MobileDesignPreview() {
  const [activeScreen, setActiveScreen] = useState<"splash" | "login" | "attendance" | "murabbi" | "park">("splash");
  const [rolePrefill, setRolePrefill] = useState("");

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-white">
      {/* ─── Top Switcher Bar for Reviewers ───────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-[#4B0A8F] flex items-center justify-center font-bold text-amber-300 text-xs">
            ۳۶۰
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-100">Shabab 360 Mobile Review</h1>
            <p className="text-[10px] text-slate-400">Branch: <span className="text-purple-400 font-mono">design/shabab-brand-mobile-screens</span></p>
          </div>
        </div>

        {/* Screen Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar max-w-full">
          <button
            onClick={() => setActiveScreen("splash")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeScreen === "splash" ? "bg-[#4B0A8F] text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="size-3.5" />
            <span>1. Splash</span>
          </button>

          <button
            onClick={() => setActiveScreen("login")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeScreen === "login" ? "bg-[#4B0A8F] text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <LogIn className="size-3.5" />
            <span>2. Login</span>
          </button>

          <button
            onClick={() => setActiveScreen("attendance")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeScreen === "attendance" ? "bg-[#4B0A8F] text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <CheckSquare className="size-3.5" />
            <span>3. Attendance</span>
          </button>

          <button
            onClick={() => setActiveScreen("murabbi")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeScreen === "murabbi" ? "bg-[#4B0A8F] text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="size-3.5" />
            <span>4. Murabbi</span>
          </button>

          <button
            onClick={() => setActiveScreen("park")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeScreen === "park" ? "bg-[#4B0A8F] text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <TreePine className="size-3.5" />
            <span>5. Park Lead</span>
          </button>
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

            {activeScreen === "murabbi" && (
              <MobileMurabbiDashboard />
            )}

            {activeScreen === "park" && (
              <MobileParkDashboard />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
