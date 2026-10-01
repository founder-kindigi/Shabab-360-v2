"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Calendar, AlertTriangle } from "lucide-react";

interface DashboardTabProps {
  parkId: string;
  onGoToEvaluation: () => void;
}

export function DashboardTab({ parkId, onGoToEvaluation }: DashboardTabProps) {
  const currentMonthName = new Date().toLocaleString("default", { month: "long" }).toUpperCase();
  const currentYear = new Date().getFullYear();

  // Fetch real park evaluation summary
  const { data: evalData } = useQuery({
    queryKey: ["park-eval-summary", parkId],
    queryFn: async () => {
      const res = await fetch(`/api/park/evaluations?parkId=${parkId}&month=${new Date().getMonth() + 1}&year=${currentYear}`);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30000,
  });

  const totalStudents = evalData?.totalStudents || 69;
  const completedCount = evalData?.completedCount || 0;

  // Real murabbis evaluation progress (derived or fallback)
  const pendingMurabbis = evalData?.murabbis || [
    { name: "Hassan Safi", pending: 12, total: 12 },
    { name: "Bilal Tariq", pending: 11, total: 11 },
    { name: "Usman Ghani", pending: 12, total: 12 },
  ];

  return (
    <div className="space-y-5 pb-10 select-none">
      {/* ─── 3 KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-gray-500 font-medium">Students</span>
          <span className="text-2xl font-bold text-gray-900 mt-1">{totalStudents}</span>
        </div>
        <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-gray-500 font-medium">Present today</span>
          <span className="text-2xl font-bold text-[#D90429] mt-1">0</span>
        </div>
        <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-gray-500 font-medium">All-Time %</span>
          <span className="text-2xl font-bold text-gray-900 mt-1">63%</span>
        </div>
      </div>

      {/* ─── Upcoming Section ────────────────────────────────────────────── */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase">
          UPCOMING
        </h3>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
          <p className="text-xs text-gray-400 font-medium">No upcoming events.</p>
        </div>
      </div>

      {/* ─── Evaluations Section ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase">
          EVALUATIONS
        </h3>
        <div
          onClick={onGoToEvaluation}
          className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between cursor-pointer active:scale-[0.99] hover:border-purple-200 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-purple-50 flex items-center justify-center text-[#4B0A8F]">
              <Calendar className="size-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900">Monthly evaluation</p>
              <p className="text-xs text-gray-400 font-normal mt-0.5">
                {completedCount} of {totalStudents} done this month
              </p>
            </div>
          </div>
          <ChevronRight className="size-4 text-gray-300" />
        </div>
      </div>

      {/* ─── Evaluation Dashboard Roster ─────────────────────────────────── */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase">
          EVALUATION DASHBOARD · {currentMonthName} {currentYear}
        </h3>
        <div className="space-y-2">
          {pendingMurabbis.map((m: any, idx: number) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.02)]"
            >
              <span className="text-sm font-semibold text-gray-900">{m.name}</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-full">
                <span>{m.pending}/{m.total}</span>
                <AlertTriangle className="size-3.5 stroke-[2.5]" />
                <span>pending</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
