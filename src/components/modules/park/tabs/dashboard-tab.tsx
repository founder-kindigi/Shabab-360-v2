"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar } from "lucide-react";

export function DashboardTab({
  parkId,
  onGoToEvaluation,
}: {
  parkId: string;
  onGoToEvaluation: () => void;
}) {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["park-dashboard", parkId],
    queryFn: async () => {
      // Mock or fetch logic
      const res = await fetch(`/api/park/dashboard?parkId=${parkId}`);
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
    // Default to mock data if API doesn't exist
    initialData: {
      studentsCount: 69,
      presentToday: 0,
      allTimePercent: 63,
      evaluations: { done: 0, total: 69, month: "SEPTEMBER 2026" },
      pendingMurabbis: [{ name: "Hassan Safi", pending: 12, total: 12 }],
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center bg-gray-50 rounded-xl p-3 border border-gray-100">
          <span className="text-sm text-gray-500 font-medium">Students</span>
          <span className="text-2xl font-bold text-[#1F0860]">
            {dashboard.studentsCount}
          </span>
        </div>
        <div className="flex flex-col items-center bg-gray-50 rounded-xl p-3 border border-gray-100">
          <span className="text-sm text-gray-500 font-medium">Present today</span>
          <span className="text-2xl font-bold text-[#D90429]">
            {dashboard.presentToday}
          </span>
        </div>
        <div className="flex flex-col items-center bg-gray-50 rounded-xl p-3 border border-gray-100">
          <span className="text-sm text-gray-500 font-medium">All-Time %</span>
          <span className="text-2xl font-bold text-[#4B0A8F]">
            {dashboard.allTimePercent}%
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-400 tracking-wider">UPCOMING</h3>
        <Card className="border-dashed shadow-none bg-gray-50/50">
          <CardContent className="p-4 flex items-center justify-center text-sm text-gray-500">
            No upcoming events.
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-400 tracking-wider">EVALUATIONS</h3>
        <Card
          className="cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
          onClick={onGoToEvaluation}
        >
          <CardContent className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-[#4B0A8F]/10 p-2 rounded-lg">
                <Calendar className="w-5 h-5 text-[#4B0A8F]" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Monthly evaluation</p>
                <p className="text-sm text-gray-500">
                  {dashboard.evaluations.done} of {dashboard.evaluations.total} done this month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-400 tracking-wider uppercase">
          EVALUATION DASHBOARD · {dashboard.evaluations.month}
        </h3>
        <div className="space-y-2">
          {dashboard.pendingMurabbis.map((m: any, idx: number) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50/30"
            >
              <span className="font-medium text-gray-900">{m.name}</span>
              <div className="flex items-center gap-1.5 text-sm font-medium text-[#D90429]">
                <span>
                  {m.pending}/{m.total}
                </span>
                <AlertCircle className="w-4 h-4" />
                <span>pending</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
