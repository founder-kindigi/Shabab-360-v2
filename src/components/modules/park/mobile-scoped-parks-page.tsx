"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2, MapPin, TreePine } from "lucide-react";

export type ScopedParkNavInfo = {
  parkId: string;
  parkName: string;
  murabbiCount: number;
  studentCount: number;
};

interface MobileScopedParksPageProps {
  onParkSelect: (park: ScopedParkNavInfo) => void;
}

export function MobileScopedParksPage({ onParkSelect }: MobileScopedParksPageProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["park-dashboard-real"],
    queryFn: async () => {
      const response = await fetch("/api/park/dashboard");
      if (!response.ok) throw new Error("Could not load assigned park");
      return response.json();
    },
    staleTime: 30_000,
  });

  const park = data?.park;
  const groupCount = data?.groupBreakdown?.length ?? 0;
  const studentCount = data?.recentSummary?.totalParticipants ?? 0;

  return (
    <div className="w-full max-w-[460px] mx-auto min-h-screen bg-[#f8f9fa] dark:bg-[#0c0817] text-slate-900 dark:text-slate-100 pb-28">
      <header className="px-5 pt-8 pb-5 bg-white dark:bg-[#180E30] border-b border-gray-100 dark:border-white/10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Parks</h1>
        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Your assigned park</p>
      </header>

      <div className="px-4 pt-4">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center gap-3 text-gray-400">
            <Loader2 className="size-6 animate-spin" />
            <span className="text-sm">Loading your park...</span>
          </div>
        ) : isError ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-rose-600">Could not load your park.</p>
            <button onClick={() => refetch()} className="mt-3 px-4 py-2 rounded-xl bg-[#4B0A8F] text-white text-xs font-bold">Retry</button>
          </div>
        ) : !park?.id ? (
          <div className="py-12 text-center text-gray-500 dark:text-slate-400">
            <TreePine className="size-8 mx-auto mb-3 opacity-60" />
            <p className="text-sm font-semibold">No park assigned</p>
            <p className="mt-1 text-xs">Contact your administrator to assign a park.</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onParkSelect({ parkId: park.id, parkName: park.name, murabbiCount: groupCount, studentCount })}
            className="w-full text-left bg-white dark:bg-[#180E30] rounded-2xl p-4 border border-gray-100 dark:border-white/10 shadow-sm flex items-center justify-between active:scale-[0.99] hover:border-purple-200 dark:hover:border-purple-500/40 transition-all"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="size-11 rounded-xl bg-gradient-to-br from-[#27084D] to-[#600C60] flex items-center justify-center text-white font-bold text-sm shrink-0">
                {park.name?.charAt(0)?.toUpperCase() ?? "P"}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">{park.name}</h2>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-400 truncate flex items-center gap-1">
                  <MapPin className="size-3 shrink-0" />{park.cityName || "Assigned park"} · {groupCount} groups · {studentCount} Shabab
                </p>
              </div>
            </div>
            <ChevronRight className="size-4 text-gray-300 dark:text-gray-500 shrink-0 ml-3" />
          </button>
        )}
      </div>
    </div>
  );
}
