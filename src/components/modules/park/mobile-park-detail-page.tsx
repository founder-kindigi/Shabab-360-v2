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
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-1 -ml-1 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-[#1F0860]">{parkNav.parkName}</h1>
          </div>
          <Badge variant="secondary" className="bg-[#4B0A8F]/10 text-[#4B0A8F] hover:bg-[#4B0A8F]/20 font-semibold">
            Main admin
          </Badge>
        </div>
        <p className="text-sm text-gray-500 font-medium pl-8">
          {parkNav.murabbiCount} murabbis · {parkNav.studentCount} students
        </p>

        {/* Pill Nav */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "bg-gradient-to-r from-[#1F0860] to-[#4B0A8F] text-white shadow-md"
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
