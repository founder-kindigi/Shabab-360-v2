"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProtoSplash } from "./screens/auth/proto-splash";
import { ProtoLogin } from "./screens/auth/proto-login";
import { ProtoForgotPassword } from "./screens/auth/proto-forgot-password";

import { ProtoHqDashboard } from "./screens/hq/proto-hq-dashboard";
import { ProtoHqCities } from "./screens/hq/proto-hq-cities";
import { ProtoHqAdmissions } from "./screens/hq/proto-hq-admissions";
import { ProtoHqReports } from "./screens/hq/proto-hq-reports";
import { ProtoHqAnnouncements } from "./screens/hq/proto-hq-announcements";
import { ProtoHqAccessMatrix } from "./screens/hq/proto-hq-access-matrix";
import { ProtoHqAuditLog } from "./screens/hq/proto-hq-audit-log";
import { ProtoHqTeams } from "./screens/hq/proto-hq-teams";
import { ProtoHqStudentsDirectory } from "./screens/hq/proto-hq-students-directory";
import { ProtoHqGuardiansDirectory } from "./screens/hq/proto-hq-guardians-directory";

import { ProtoCityDashboard } from "./screens/city/proto-city-dashboard";
import { ProtoCityAdmissions } from "./screens/city/proto-city-admissions";
import { ProtoCityCallingDesk } from "./screens/city/proto-city-calling";
import { ProtoCityMashwara } from "./screens/city/proto-city-mashwara";
import { ProtoCityPeople } from "./screens/city/proto-city-people";
import { ProtoCityEvents } from "./screens/city/proto-city-events";
import { ProtoCityFinance } from "./screens/city/proto-city-finance";

import { ProtoParkDashboard } from "./screens/park/proto-park-dashboard";
import { ProtoAttendanceSession } from "./screens/park/proto-park-attendance";
import { ProtoParkRoster } from "./screens/park/proto-park-roster";
import { ProtoTeamAttendance } from "./screens/park/proto-team-attendance";
import { ProtoParkMashwara } from "./screens/park/proto-park-mashwara";

import { ProtoMurabbiDashboard } from "./screens/murabbi/proto-murabbi-dashboard";
import { ProtoMurabbiRoster } from "./screens/murabbi/proto-murabbi-roster";
import { ProtoMurabbiSessionPlan } from "./screens/murabbi/proto-murabbi-session-plan";
import { ProtoMurabbiTraining } from "./screens/murabbi/proto-murabbi-training";

import { ProtoGuardianDashboard } from "./screens/guardian/proto-guardian-dashboard";
import { ProtoGuardianAttendance } from "./screens/guardian/proto-guardian-attendance";
import { ProtoGuardianNotices } from "./screens/guardian/proto-guardian-notices";
import { ProtoGuardianFees } from "./screens/guardian/proto-guardian-fees";

import { ProtoStudentDashboard } from "./screens/student/proto-student-dashboard";
import { ProtoStudentAttendance } from "./screens/student/proto-student-attendance";
import { ProtoStudentSchedule } from "./screens/student/proto-student-schedule";
import { ProtoStudentResources } from "./screens/student/proto-student-resources";
import { ProtoStudentProfile } from "./screens/student/proto-student-profile";

import {
  ShieldCheck,
  Building2,
  Trees,
  UserCheck,
  HeartHandshake,
  GraduationCap,
  LogOut,
  ChevronDown,
  Sparkles,
  Layers,
  KeyRound,
  FileSpreadsheet,
  Users2,
  Users,
  Contact,
  Grid,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ProtoRole =
  | "hq"
  | "city_head"
  | "park_lead"
  | "murabbi"
  | "guardian"
  | "student";

const ROLES: { id: ProtoRole; label: string; icon: any; defaultScreen: string }[] = [
  { id: "hq", label: "Program HQ", icon: ShieldCheck, defaultScreen: "hq-dashboard" },
  { id: "city_head", label: "City Head", icon: Building2, defaultScreen: "city-dashboard" },
  { id: "park_lead", label: "Park Lead", icon: Trees, defaultScreen: "park-dashboard" },
  { id: "murabbi", label: "Murabbi", icon: UserCheck, defaultScreen: "murabbi-dashboard" },
  { id: "guardian", label: "Guardian", icon: HeartHandshake, defaultScreen: "guardian-dashboard" },
  { id: "student", label: "Shabab / Student", icon: GraduationCap, defaultScreen: "student-dashboard" },
];

const ALL_PROTOTYPE_SCREENS = [
  { group: "HQ / Super Admin", items: [
    { id: "hq-dashboard", label: "National HQ Dashboard" },
    { id: "hq-cities", label: "Cities & City Heads" },
    { id: "hq-admissions", label: "Admissions Oversight" },
    { id: "hq-access-matrix", label: "Access & Role Matrix" },
    { id: "hq-audit-log", label: "System Audit Logs" },
    { id: "hq-teams", label: "Collaboration Teams" },
    { id: "hq-students", label: "Shabab Directory" },
    { id: "hq-guardians", label: "Guardians Directory" },
    { id: "hq-reports", label: "National Reports" },
    { id: "hq-announcements", label: "Announcements" },
  ]},
  { group: "City Operations", items: [
    { id: "city-dashboard", label: "City Dashboard" },
    { id: "city-admissions", label: "Admissions Pipeline" },
    { id: "city-calling", label: "Calling Desk" },
    { id: "city-mashwara", label: "Weekly Mashwara" },
    { id: "city-people", label: "People & Staff" },
    { id: "city-events", label: "Events & Calendar" },
    { id: "city-finance", label: "City Finance" },
  ]},
  { group: "Park & Attendance", items: [
    { id: "park-dashboard", label: "Park Dashboard" },
    { id: "park-attendance", label: "Mark Attendance (Offline Ready)" },
    { id: "park-roster", label: "Park Shabab & Families" },
    { id: "park-team-attendance", label: "Team Attendance" },
    { id: "park-mashwara", label: "Park Mashwara" },
  ]},
  { group: "Murabbi Mentor", items: [
    { id: "murabbi-dashboard", label: "Murabbi Dashboard" },
    { id: "murabbi-roster", label: "Assigned Group Roster" },
    { id: "murabbi-session-plan", label: "Session Content Plan" },
    { id: "murabbi-training", label: "Murabbi Training Resources" },
  ]},
  { group: "Guardian & Family", items: [
    { id: "guardian-dashboard", label: "Guardian Dashboard" },
    { id: "guardian-attendance", label: "Child Attendance" },
    { id: "guardian-notices", label: "Notices & Consent" },
    { id: "guardian-fees", label: "Fee Receipts" },
  ]},
  { group: "Shabab Student", items: [
    { id: "student-dashboard", label: "Student Dashboard" },
    { id: "student-attendance", label: "My Attendance" },
    { id: "student-schedule", label: "Schedule & Events" },
    { id: "student-resources", label: "Class Resources" },
    { id: "student-profile", label: "Student Profile" },
  ]},
];

export function PrototypeApp() {
  const [currentRole, setCurrentRole] = useState<ProtoRole>("hq");
  const [activeScreen, setActiveScreen] = useState<string>("splash");
  const [showRoleSelector, setShowRoleSelector] = useState<boolean>(false);
  const [showScreenDrawer, setShowScreenDrawer] = useState<boolean>(false);
  const [isLoggedOut, setIsLoggedOut] = useState<boolean>(true);

  const handleRoleChange = (roleId: ProtoRole) => {
    setCurrentRole(roleId);
    const roleDef = ROLES.find((r) => r.id === roleId);
    if (roleDef) {
      setActiveScreen(roleDef.defaultScreen);
    }
    setIsLoggedOut(false);
    setShowRoleSelector(false);
  };

  const handleNavigate = (screen: string) => {
    if (screen === "login" || screen === "splash") {
      setIsLoggedOut(true);
    } else {
      setIsLoggedOut(false);
    }
    setActiveScreen(screen);
    setShowScreenDrawer(false);
  };

  const renderActiveScreen = () => {
    // Auth screens
    if (isLoggedOut || activeScreen === "splash") {
      return <ProtoSplash onContinue={() => setActiveScreen("login")} />;
    }
    if (activeScreen === "login") {
      return (
        <ProtoLogin
          onSuccess={() => {
            const roleDef = ROLES.find((r) => r.id === currentRole);
            setActiveScreen(roleDef?.defaultScreen || "hq-dashboard");
            setIsLoggedOut(false);
          }}
          onBackToSplash={() => setActiveScreen("splash")}
          onForgotPassword={() => setActiveScreen("forgot-password")}
        />
      );
    }
    if (activeScreen === "forgot-password") {
      return <ProtoForgotPassword onBackToLogin={() => setActiveScreen("login")} />;
    }

    // HQ Screens
    if (activeScreen === "hq-dashboard") return <ProtoHqDashboard onNavigate={handleNavigate} />;
    if (activeScreen === "hq-cities") return <ProtoHqCities onNavigate={handleNavigate} />;
    if (activeScreen === "hq-admissions") return <ProtoHqAdmissions onNavigate={handleNavigate} />;
    if (activeScreen === "hq-access-matrix") return <ProtoHqAccessMatrix onNavigate={handleNavigate} />;
    if (activeScreen === "hq-audit-log") return <ProtoHqAuditLog onNavigate={handleNavigate} />;
    if (activeScreen === "hq-teams") return <ProtoHqTeams onNavigate={handleNavigate} />;
    if (activeScreen === "hq-students") return <ProtoHqStudentsDirectory onNavigate={handleNavigate} />;
    if (activeScreen === "hq-guardians") return <ProtoHqGuardiansDirectory onNavigate={handleNavigate} />;
    if (activeScreen === "hq-reports") return <ProtoHqReports onNavigate={handleNavigate} />;
    if (activeScreen === "hq-announcements") return <ProtoHqAnnouncements onNavigate={handleNavigate} />;

    // City Head Screens
    if (activeScreen === "city-dashboard") return <ProtoCityDashboard onNavigate={handleNavigate} />;
    if (activeScreen === "city-admissions") return <ProtoCityAdmissions onNavigate={handleNavigate} />;
    if (activeScreen === "city-calling") return <ProtoCityCallingDesk onNavigate={handleNavigate} />;
    if (activeScreen === "city-mashwara") return <ProtoCityMashwara onNavigate={handleNavigate} />;
    if (activeScreen === "city-people") return <ProtoCityPeople onNavigate={handleNavigate} />;
    if (activeScreen === "city-events") return <ProtoCityEvents onNavigate={handleNavigate} />;
    if (activeScreen === "city-finance") return <ProtoCityFinance onNavigate={handleNavigate} />;

    // Park Screens
    if (activeScreen === "park-dashboard") return <ProtoParkDashboard onNavigate={handleNavigate} />;
    if (activeScreen === "park-attendance") return <ProtoAttendanceSession onNavigate={handleNavigate} />;
    if (activeScreen === "park-roster") return <ProtoParkRoster onNavigate={handleNavigate} />;
    if (activeScreen === "park-team-attendance") return <ProtoTeamAttendance onNavigate={handleNavigate} />;
    if (activeScreen === "park-mashwara") return <ProtoParkMashwara onNavigate={handleNavigate} />;

    // Murabbi Screens
    if (activeScreen === "murabbi-dashboard") return <ProtoMurabbiDashboard onNavigate={handleNavigate} />;
    if (activeScreen === "murabbi-roster") return <ProtoMurabbiRoster onNavigate={handleNavigate} />;
    if (activeScreen === "murabbi-session-plan") return <ProtoMurabbiSessionPlan onNavigate={handleNavigate} />;
    if (activeScreen === "murabbi-training") return <ProtoMurabbiTraining onNavigate={handleNavigate} />;

    // Guardian Screens
    if (activeScreen === "guardian-dashboard") return <ProtoGuardianDashboard onNavigate={handleNavigate} />;
    if (activeScreen === "guardian-attendance") return <ProtoGuardianAttendance onNavigate={handleNavigate} />;
    if (activeScreen === "guardian-notices") return <ProtoGuardianNotices onNavigate={handleNavigate} />;
    if (activeScreen === "guardian-fees") return <ProtoGuardianFees onNavigate={handleNavigate} />;

    // Student Screens
    if (activeScreen === "student-dashboard") return <ProtoStudentDashboard onNavigate={handleNavigate} />;
    if (activeScreen === "student-attendance") return <ProtoStudentAttendance onNavigate={handleNavigate} />;
    if (activeScreen === "student-schedule") return <ProtoStudentSchedule onNavigate={handleNavigate} />;
    if (activeScreen === "student-resources") return <ProtoStudentResources onNavigate={handleNavigate} />;
    if (activeScreen === "student-profile") return <ProtoStudentProfile onNavigate={handleNavigate} />;

    // Fallback
    return <ProtoHqDashboard onNavigate={handleNavigate} />;
  };

  const activeRoleObj = ROLES.find((r) => r.id === currentRole);
  const ActiveRoleIcon = activeRoleObj?.icon || ShieldCheck;

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground">
      {/* ─── Prototype Control Header ─────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#1F0860] border-b border-purple-800/60 text-white shadow-xl px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 bg-[#D90429] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
            <Sparkles className="size-3" /> PROTOTYPE
          </span>
          <span className="text-xs font-bold text-purple-200 hidden md:inline">
            Shabab 360 Full System (31 Screens)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* All Screens Drawer Button */}
          <button
            onClick={() => { setShowScreenDrawer(!showScreenDrawer); setShowRoleSelector(false); }}
            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xs font-bold px-2.5 py-1.5 rounded-xl border border-white/20 text-purple-200"
          >
            <Grid className="size-3.5" />
            <span className="hidden sm:inline">All Screens</span>
          </button>

          {/* Role Switcher Pill */}
          <button
            onClick={() => { setShowRoleSelector(!showRoleSelector); setShowScreenDrawer(false); }}
            className="flex items-center gap-1.5 bg-[#4B0A8F] hover:bg-[#4B0A8F]/80 active:scale-95 transition-all text-xs font-bold px-3 py-1.5 rounded-xl border border-purple-400/30 text-white shadow-md"
          >
            <ActiveRoleIcon className="size-3.5 text-purple-200" />
            <span>{activeRoleObj?.label}</span>
            <ChevronDown className="size-3.5 text-purple-300" />
          </button>

          {/* Reset / Splash button */}
          <button
            onClick={() => handleNavigate("splash")}
            title="Reset to Splash"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-500/30 text-rose-300 border border-white/10 active:scale-95 transition-all"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </header>

      {/* Role Selector Modal Dropdown */}
      <AnimatePresence>
        {showRoleSelector && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-12 right-3 z-50 bg-[#1F0860] border border-purple-500/30 rounded-2xl p-2 shadow-2xl w-64 space-y-1"
          >
            <div className="px-2 py-1 text-[10px] font-bold text-purple-300 uppercase tracking-wider">
              Switch Role Workspace
            </div>
            {ROLES.map((r) => {
              const Icon = r.icon;
              const isCurrent = r.id === currentRole;
              return (
                <button
                  key={r.id}
                  onClick={() => handleRoleChange(r.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left",
                    isCurrent
                      ? "bg-[#4B0A8F] text-white shadow-lg"
                      : "text-purple-200 hover:bg-white/10"
                  )}
                >
                  <Icon className={cn("size-4", isCurrent ? "text-white" : "text-purple-300")} />
                  <span className="flex-1">{r.label}</span>
                  {isCurrent && <span className="size-2 rounded-full bg-[#D90429]" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* All Screens Drawer Dropdown */}
      <AnimatePresence>
        {showScreenDrawer && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-12 right-3 z-50 bg-[#1F0860] border border-purple-500/30 rounded-2xl p-3 shadow-2xl w-80 max-h-[80vh] overflow-y-auto no-scrollbar space-y-3"
          >
            <div className="flex items-center justify-between border-b border-purple-800/60 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="size-4 text-purple-300" /> All 31 System Screens
              </span>
              <span className="text-[10px] font-extrabold bg-[#D90429] px-2 py-0.5 rounded-full text-white">
                Live Prototype
              </span>
            </div>
            {ALL_PROTOTYPE_SCREENS.map((group) => (
              <div key={group.group} className="space-y-1">
                <div className="text-[10px] font-black text-purple-300 uppercase tracking-wider px-1">
                  {group.group}
                </div>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between",
                      activeScreen === item.id
                        ? "bg-[#4B0A8F] text-white font-bold"
                        : "text-purple-100 hover:bg-white/10"
                    )}
                  >
                    <span>{item.label}</span>
                    {activeScreen === item.id && <span className="size-1.5 rounded-full bg-[#D90429]" />}
                  </button>
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Screen Container */}
      <main className="flex-1 w-full relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="w-full min-h-full"
          >
            {renderActiveScreen()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
