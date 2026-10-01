"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useSession } from "next-auth/react";

import { DashboardTab } from "./tabs/dashboard-tab";
import { AttendanceTab } from "./tabs/attendance-tab";
import { LessonsTab } from "./tabs/lessons-tab";
import { StructureTab } from "./tabs/structure-tab";
import { PlannerTab } from "./tabs/planner-tab";

type ParkNav = {
  parkId: string;
  parkName: string;
  /** Null when the source endpoint does not return a real count. */
  murabbiCount: number | null;
  studentCount: number | null;
} | null;

interface MobileParkDetailPageProps {
  parkNav: ParkNav;
  onBack: () => void;
  onGoToEvaluation?: () => void;
  onSelectStudent?: (studentId: string, studentName?: string) => void;
}

/** Roles that have reviewed admin access to this multi-tab park detail screen. */
const ADMIN_ROLES = new Set(["super_admin", "program_admin", "city_head"]);

const TABS = ["Dashboard", "Attendance", "Lessons", "Structure", "Planner"] as const;
type TabType = typeof TABS[number];

export function MobileParkDetailPage({
  parkNav,
  onBack,
  onGoToEvaluation,
  onSelectStudent,
}: MobileParkDetailPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>("Dashboard");
  const { data: session } = useSession();
  const user = session?.user as { role?: string; roleLabel?: string | null } | undefined;
  const role: string = user?.role ?? "";
  const roleLabel: string | null = user?.roleLabel ?? null;

  if (!parkNav) return null;

  // Park Leads and Park Admins have their own scoped Parks workspace
  // (`park-workspace`) and must never see this generic multi-tab admin page or be
  // bounced back to a dashboard from here. Murabbi and Muawin likewise have
  // dedicated role-scoped screens.
  if (!ADMIN_ROLES.has(role)) {
    return (
      <div className="w-full max-w-[460px] mx-auto flex flex-col min-h-screen bg-white items-center justify-center gap-4 px-8 text-center">
        <p className="text-sm font-bold text-gray-700">Park detail unavailable</p>
        <p className="text-xs text-gray-400">
          This view is not available for your role. Use your home screen or Parks tab instead.
        </p>
        <button
          onClick={onBack}
          className="mt-2 px-4 py-2 rounded-xl bg-[#4B0A8F] text-white text-xs font-bold"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[460px] mx-auto flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              aria-label="Back to parks"
              className="p-1 -ml-1 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="size-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">{parkNav.parkName}</h1>
          </div>
          {roleLabel ? (
            <span className="text-[11px] font-semibold text-[#15803d] bg-[#f0fdf4] border border-[#bbf7d0] px-2.5 py-0.5 rounded-full">
              {roleLabel}
            </span>
          ) : null}
        </div>
        {typeof parkNav.murabbiCount === "number" || typeof parkNav.studentCount === "number" ? (
          <p className="text-xs text-gray-400 font-medium pl-7 mt-0.5">
            {[
              typeof parkNav.murabbiCount === "number" ? `${parkNav.murabbiCount} murabbis` : null,
              typeof parkNav.studentCount === "number" ? `${parkNav.studentCount} students` : null,
            ]
              .filter((part): part is string => part !== null)
              .join(" · ")}
          </p>
        ) : null}

        {/* 5-Tab Pill Nav */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab
                  ? "bg-[#180A40] text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 flex-1">
        {activeTab === "Dashboard" && (
          <DashboardTab
            parkId={parkNav.parkId}
            onGoToEvaluation={onGoToEvaluation || (() => {})}
          />
        )}
        {activeTab === "Attendance" && <AttendanceTab parkId={parkNav.parkId} />}
        {activeTab === "Lessons" && <LessonsTab parkId={parkNav.parkId} />}
        {activeTab === "Structure" && (
          <StructureTab parkId={parkNav.parkId} onSelectStudent={onSelectStudent} />
        )}
        {activeTab === "Planner" && <PlannerTab parkId={parkNav.parkId} />}
      </div>
    </div>
  );
}
