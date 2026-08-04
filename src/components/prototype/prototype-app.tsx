"use client";

import { useState, useEffect } from "react";
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
import { ProtoCityEvents as CityEvents } from "./screens/city/proto-city-events";
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

import { ProtoInventoryList } from "./screens/inventory/proto-inventory-list";
import { ProtoInventoryRequests } from "./screens/inventory/proto-inventory-requests";
import { ProtoPublicHome } from "./screens/public/proto-public-home";
import { ProtoPublicApplication } from "./screens/public/proto-public-application";
import { ProtoCallingDetail } from "./screens/calling/proto-calling-detail";
import { ProtoCertificates } from "./screens/certificates/proto-certificates";
import { ProtoResourcesLibrary } from "./screens/library/proto-resources-library";
import { ProtoSafetyMedical } from "./screens/safety/proto-safety-medical";

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
  Grid,
  Smartphone,
  Monitor,
  Tablet,
  Maximize2,
  Wifi,
  Battery,
  Signal,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ProtoRole =
  | "hq"
  | "city_head"
  | "park_lead"
  | "murabbi"
  | "guardian"
  | "student"
  | "public";

export type DeviceMode = "iphone" | "pixel" | "tablet" | "full";

const ROLES: { id: ProtoRole; label: string; icon: any; defaultScreen: string }[] = [
  { id: "hq", label: "Program HQ", icon: ShieldCheck, defaultScreen: "hq-dashboard" },
  { id: "city_head", label: "City Head", icon: Building2, defaultScreen: "city-dashboard" },
  { id: "park_lead", label: "Park Lead", icon: Trees, defaultScreen: "park-dashboard" },
  { id: "murabbi", label: "Murabbi", icon: UserCheck, defaultScreen: "murabbi-dashboard" },
  { id: "guardian", label: "Guardian", icon: HeartHandshake, defaultScreen: "guardian-dashboard" },
  { id: "student", label: "Shabab / Student", icon: GraduationCap, defaultScreen: "student-dashboard" },
  { id: "public", label: "Public Website", icon: Sparkles, defaultScreen: "public-home" },
];

const ALL_PROTOTYPE_SCREENS = [
  { group: "Public Website & Admissions", items: [
    { id: "public-home", label: "Shabab Alburhan Public Website" },
    { id: "public-application", label: "Candidate Application Form" },
  ]},
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
  { group: "City Operations & Calling Desk", items: [
    { id: "city-dashboard", label: "City Dashboard" },
    { id: "city-admissions", label: "Admissions Pipeline" },
    { id: "city-calling", label: "Calling Desk" },
    { id: "calling-detail", label: "Calling Lead Interaction Detail" },
    { id: "city-mashwara", label: "Weekly Mashwara" },
    { id: "city-people", label: "People & Staff" },
    { id: "city-events", label: "Events & Calendar" },
    { id: "city-finance", label: "City Finance" },
  ]},
  { group: "Park Operations & Inventory", items: [
    { id: "park-dashboard", label: "Park Dashboard" },
    { id: "park-attendance", label: "Mark Attendance (Offline Ready)" },
    { id: "park-roster", label: "Park Shabab & Families" },
    { id: "park-team-attendance", label: "Team Attendance" },
    { id: "park-mashwara", label: "Park Mashwara" },
    { id: "inventory-list", label: "Equipment & Inventory Catalog" },
    { id: "inventory-requests", label: "Procurement Requests" },
  ]},
  { group: "Murabbi Mentor", items: [
    { id: "murabbi-dashboard", label: "Murabbi Dashboard" },
    { id: "murabbi-roster", label: "Assigned Group Roster" },
    { id: "murabbi-session-plan", label: "Session Content Plan" },
    { id: "murabbi-training", label: "Murabbi Training Resources" },
  ]},
  { group: "Guardian & Safety", items: [
    { id: "guardian-dashboard", label: "Guardian Dashboard" },
    { id: "guardian-attendance", label: "Child Attendance" },
    { id: "guardian-notices", label: "Notices & Consent" },
    { id: "guardian-fees", label: "Fee Receipts" },
    { id: "safety-medical", label: "Safety & Emergency Profile" },
  ]},
  { group: "Shabab Student & Learning", items: [
    { id: "student-dashboard", label: "Student Dashboard" },
    { id: "student-attendance", label: "My Attendance" },
    { id: "student-schedule", label: "Schedule & Events" },
    { id: "student-resources", label: "Class Resources" },
    { id: "resources-library", label: "Online Resource Library" },
    { id: "certificates", label: "Graduation Certificates" },
    { id: "student-profile", label: "Student Profile" },
  ]},
];

export function PrototypeApp() {
  const [currentRole, setCurrentRole] = useState<ProtoRole>("hq");
  const [activeScreen, setActiveScreen] = useState<string>("splash");
  const [showRoleSelector, setShowRoleSelector] = useState<boolean>(false);
  const [showScreenDrawer, setShowScreenDrawer] = useState<boolean>(false);
  const [isLoggedOut, setIsLoggedOut] = useState<boolean>(true);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("iphone");
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileDevice(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

    // Public screens
    if (activeScreen === "public-home") return <ProtoPublicHome onNavigate={handleNavigate} />;
    if (activeScreen === "public-application") return <ProtoPublicApplication onNavigate={handleNavigate} />;

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
    if (activeScreen === "city-[#city-calling]") return <ProtoCityCallingDesk onNavigate={handleNavigate} />;
    if (activeScreen === "city-calling") return <ProtoCityCallingDesk onNavigate={handleNavigate} />;
    if (activeScreen === "calling-detail") return <ProtoCallingDetail onNavigate={handleNavigate} />;
    if (activeScreen === "city-mashwara") return <ProtoCityMashwara onNavigate={handleNavigate} />;
    if (activeScreen === "city-people") return <ProtoCityPeople onNavigate={handleNavigate} />;
    if (activeScreen === "city-events") return <CityEvents onNavigate={handleNavigate} />;
    if (activeScreen === "city-finance") return <ProtoCityFinance onNavigate={handleNavigate} />;

    // Park & Inventory Screens
    if (activeScreen === "park-dashboard") return <ProtoParkDashboard onNavigate={handleNavigate} />;
    if (activeScreen === "park-attendance") return <ProtoAttendanceSession onNavigate={handleNavigate} />;
    if (activeScreen === "park-roster") return <ProtoParkRoster onNavigate={handleNavigate} />;
    if (activeScreen === "park-team-attendance") return <ProtoTeamAttendance onNavigate={handleNavigate} />;
    if (activeScreen === "park-mashwara") return <ProtoParkMashwara onNavigate={handleNavigate} />;
    if (activeScreen === "inventory-list") return <ProtoInventoryList onNavigate={handleNavigate} />;
    if (activeScreen === "inventory-requests") return <ProtoInventoryRequests onNavigate={handleNavigate} />;

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
    if (activeScreen === "safety-medical") return <ProtoSafetyMedical onNavigate={handleNavigate} />;

    // Student & Learning Screens
    if (activeScreen === "student-dashboard") return <ProtoStudentDashboard onNavigate={handleNavigate} />;
    if (activeScreen === "student-attendance") return <ProtoStudentAttendance onNavigate={handleNavigate} />;
    if (activeScreen === "student-schedule") return <ProtoStudentSchedule onNavigate={handleNavigate} />;
    if (activeScreen === "student-resources") return <ProtoStudentResources onNavigate={handleNavigate} />;
    if (activeScreen === "resources-library") return <ProtoResourcesLibrary onNavigate={handleNavigate} />;
    if (activeScreen === "certificates") return <ProtoCertificates onNavigate={handleNavigate} />;
    if (activeScreen === "student-profile") return <ProtoStudentProfile onNavigate={handleNavigate} />;

    // Fallback
    return <ProtoHqDashboard onNavigate={handleNavigate} />;
  };

  const activeRoleObj = ROLES.find((r) => r.id === currentRole);
  const ActiveRoleIcon = activeRoleObj?.icon || ShieldCheck;

  // Calculate container width based on device mode
  const getDeviceWidthClass = () => {
    if (isMobileDevice || deviceMode === "full") return "w-full";
    if (deviceMode === "iphone") return "max-w-[430px] w-full";
    if (deviceMode === "pixel") return "max-w-[412px] w-full";
    if (deviceMode === "tablet") return "max-w-[768px] w-full";
    return "max-w-[430px] w-full";
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#0D0524] text-foreground font-sans select-none overflow-x-hidden">
      {/* ─── Top Studio Bar (Desktop & Mobile) ─────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#1F0860]/95 backdrop-blur-md border-b border-purple-800/60 text-white shadow-2xl px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 bg-[#D90429] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
            <Sparkles className="size-3" /> PROTOTYPE STUDIO
          </span>
          <span className="text-xs font-bold text-purple-200 hidden lg:inline">
            Shabab 360 Full System (39 Screens)
          </span>
        </div>

        {/* Device Switcher Pills (Desktop only) */}
        {!isMobileDevice && (
          <div className="hidden md:flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setDeviceMode("iphone")}
              className={cn(
                "flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all",
                deviceMode === "iphone"
                  ? "bg-[#4B0A8F] text-white shadow-md"
                  : "text-purple-300 hover:text-white"
              )}
              title="iPhone 15 Pro Frame (430px)"
            >
              <Smartphone className="size-3.5" /> iPhone
            </button>
            <button
              onClick={() => setDeviceMode("pixel")}
              className={cn(
                "flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all",
                deviceMode === "pixel"
                  ? "bg-[#4B0A8F] text-white shadow-md"
                  : "text-purple-300 hover:text-white"
              )}
              title="Android Pixel Frame (412px)"
            >
              <Smartphone className="size-3.5" /> Pixel
            </button>
            <button
              onClick={() => setDeviceMode("tablet")}
              className={cn(
                "flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all",
                deviceMode === "tablet"
                  ? "bg-[#4B0A8F] text-white shadow-md"
                  : "text-purple-300 hover:text-white"
              )}
              title="iPad / Tablet Frame (768px)"
            >
              <Tablet className="size-3.5" /> Tablet
            </button>
            <button
              onClick={() => setDeviceMode("full")}
              className={cn(
                "flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all",
                deviceMode === "full"
                  ? "bg-[#4B0A8F] text-white shadow-md"
                  : "text-purple-300 hover:text-white"
              )}
              title="Full Responsive Desktop View"
            >
              <Monitor className="size-3.5" /> Full Width
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {/* All Screens Drawer Button */}
          <button
            onClick={() => { setShowScreenDrawer(!showScreenDrawer); setShowRoleSelector(false); }}
            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xs font-bold px-2.5 py-1.5 rounded-xl border border-white/20 text-purple-200"
          >
            <Grid className="size-3.5" />
            <span className="hidden sm:inline">39 Screens</span>
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
                <Layers className="size-4 text-purple-300" /> All 39 System Screens
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

      {/* ─── Main Content Area with Desktop Phone Shell ───────────────────────── */}
      <main className="flex-1 w-full relative flex items-center justify-center p-0 md:p-6 bg-gradient-to-br from-[#0F0428] via-[#1F0860] to-[#0A031B]">
        
        {/* Desktop Side Info Sidebar (visible on large screens when framed) */}
        {!isMobileDevice && deviceMode !== "full" && (
          <aside className="hidden xl:flex flex-col gap-4 w-72 p-4 text-white text-xs font-medium bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl mr-6 shrink-0">
            <div className="flex items-center gap-2 font-bold text-sm border-b border-white/10 pb-2 text-purple-200">
              <ActiveRoleIcon className="size-5 text-[#D90429]" />
              <span>{activeRoleObj?.label} Workspace</span>
            </div>
            <div className="space-y-2">
              <p className="text-purple-300 font-semibold uppercase text-[10px] tracking-wider">Current Screen</p>
              <p className="text-sm font-bold bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">{activeScreen}</p>
            </div>
            <div className="space-y-2 pt-2 border-t border-white/10">
              <p className="text-purple-300 font-semibold uppercase text-[10px] tracking-wider">Role Capabilities</p>
              <ul className="space-y-1.5 text-[11px] text-purple-200">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-400" /> Full operational access</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-400" /> Mobile-first responsive UI</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-400" /> Touch target optimized</li>
              </ul>
            </div>
            <div className="mt-auto pt-4 border-t border-white/10 text-[10px] text-purple-300/70 text-center">
              Shabab 360 v2.0 • Lahore Batch 4
            </div>
          </aside>
        )}

        {/* Center Device Frame Container */}
        <div
          className={cn(
            "transition-all duration-300 ease-in-out relative flex flex-col",
            getDeviceWidthClass(),
            !isMobileDevice && deviceMode !== "full"
              ? "my-auto rounded-[42px] border-[10px] border-slate-900 bg-background shadow-[0_0_60px_rgba(75,10,143,0.5)] overflow-hidden min-h-[850px] max-h-[92vh]"
              : "min-h-screen bg-background"
          )}
        >
          {/* Virtual Phone Hardware Notch & Status Bar (Only in Framed Desktop Mode) */}
          {!isMobileDevice && deviceMode !== "full" && (
            <div className="w-full bg-[#1F0860] text-white px-6 pt-3 pb-1 flex items-center justify-between shrink-0 select-none z-30 border-b border-purple-900/50">
              <span className="text-xs font-bold tracking-tight">09:41</span>
              {/* iPhone Dynamic Island / Notch */}
              <div className="w-24 h-4 bg-black rounded-full flex items-center justify-center gap-1.5 px-2">
                <div className="size-2 rounded-full bg-slate-800" />
                <div className="size-1.5 rounded-full bg-[#D90429]" />
              </div>
              <div className="flex items-center gap-1.5 text-white/80">
                <Signal className="size-3" />
                <Wifi className="size-3" />
                <Battery className="size-3.5 fill-current" />
              </div>
            </div>
          )}

          {/* Active Prototype Screen Canvas */}
          <div className="flex-1 w-full overflow-y-auto no-scrollbar relative flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeScreen}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="w-full min-h-full flex-1 flex flex-col"
              >
                {renderActiveScreen()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Phone Bottom Home Bar (Only in Framed Desktop Mode) */}
          {!isMobileDevice && deviceMode !== "full" && (
            <div className="w-full bg-background py-2 flex items-center justify-center shrink-0 border-t border-border/40 z-30">
              <div className="w-32 h-1 bg-foreground/30 rounded-full" />
            </div>
          )}
        </div>

        {/* Right Desktop Quick Shortcuts Sidebar (visible on large screens when framed) */}
        {!isMobileDevice && deviceMode !== "full" && (
          <aside className="hidden xl:flex flex-col gap-3 w-64 p-4 text-white text-xs font-medium bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl ml-6 shrink-0">
            <p className="text-purple-300 font-bold uppercase text-[10px] tracking-wider border-b border-white/10 pb-2">
              Quick Role Switch
            </p>
            {ROLES.map((r) => {
              const Icon = r.icon;
              const isCurrent = r.id === currentRole;
              return (
                <button
                  key={r.id}
                  onClick={() => handleRoleChange(r.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left border",
                    isCurrent
                      ? "bg-[#4B0A8F] text-white border-purple-400/50 shadow-lg"
                      : "bg-white/5 text-purple-200 border-white/5 hover:bg-white/10"
                  )}
                >
                  <Icon className={cn("size-4", isCurrent ? "text-white" : "text-purple-300")} />
                  <span className="flex-1">{r.label}</span>
                </button>
              );
            })}
          </aside>
        )}
      </main>
    </div>
  );
}
