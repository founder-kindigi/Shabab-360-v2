"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { DashboardTab } from "./tabs/dashboard-tab";
import { AttendanceTab } from "./tabs/attendance-tab";
import { LessonsTab } from "./tabs/lessons-tab";
import { StructureTab } from "./tabs/structure-tab";
import { PlannerTab } from "./tabs/planner-tab";

type ParkNav = {
  parkId: string;
  parkName: string;
  murabbiCount: number;
  studentCount: number;
} | null;

interface MobileParkDetailPageProps {
  parkNav: ParkNav;
  onBack: () => void;
  onGoToEvaluation?: () => void;
}

const TABS = ["Dashboard", "Attendance", "Lessons", "Structure", "Planner"] as const;
type TabType = typeof TABS[number];

export function MobileParkDetailPage({ parkNav, onBack, onGoToEvaluation }: MobileParkDetailPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>("Dashboard");

  if (!parkNav) return null;

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
          <span className="text-[11px] font-semibold text-[#15803d] bg-[#f0fdf4] border border-[#bbf7d0] px-2.5 py-0.5 rounded-full">
            Main admin
          </span>
        </div>
        <p className="text-xs text-gray-400 font-medium pl-7 mt-0.5">
          {parkNav.murabbiCount} murabbis · {parkNav.studentCount} students
        </p>

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
        {activeTab === "Structure" && <StructureTab parkId={parkNav.parkId} />}
        {activeTab === "Planner" && <PlannerTab parkId={parkNav.parkId} />}
      </div>
    </div>
  );
}
