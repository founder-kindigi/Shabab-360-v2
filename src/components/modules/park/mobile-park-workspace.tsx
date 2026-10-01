"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Users, BookOpen, ClipboardList, Layers, ArrowRight, CalendarX, RefreshCw } from "lucide-react";

export type ScopedParkNavInfo = {
  parkId: string;
  parkName: string;
  /** Null when the source endpoint does not return a real count. */
  murabbiCount: number | null;
  studentCount: number | null;
};

interface MobileParkWorkspaceProps {
  parkNav: ScopedParkNavInfo | null;
  onBack: () => void;
  onOpenAttendance: (park: ScopedParkNavInfo) => void;
}

/** Modules that exist in the legacy admin detail page but have no scoped screen yet. */
const UNAVAILABLE_MODULES = [
  { key: "Structure", icon: Users, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  { key: "Lessons", icon: BookOpen, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { key: "Planner", icon: ClipboardList, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
] as const;

/**
 * Scoped Park Lead / Park Admin workspace for the assigned park.
 *
 * It only ever targets the park selected in PwaApp state, and every attendance
 * entry point hands that park id back to PwaApp. Group and session facts come
 * from the server-scoped dashboard response; nothing is fabricated, and the
 * legacy generic admin detail page is never used as a stand-in.
 */
export function MobileParkWorkspace({ parkNav, onBack, onOpenAttendance }: MobileParkWorkspaceProps) {
  const [unavailable, setUnavailable] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["park-dashboard-real"],
    queryFn: async () => {
      const response = await fetch("/api/park/dashboard");
      if (!response.ok) throw new Error("Could not load park data");
      return response.json();
    },
    retry: false,
    staleTime: 30_000,
  });

  const groups: Array<{ id: string; name: string; totalParticipants?: number; latestProgress?: number; todayProgress?: number }> =
    data?.groupBreakdown ?? [];
  const cityName: string = data?.park?.cityName ?? "";
  const parkName = parkNav?.parkName || data?.park?.name || "Park";

  if (!parkNav?.parkId) {
    return (
      <div className="w-full max-w-[460px] mx-auto min-h-screen bg-background text-foreground flex flex-col">
        <div className="px-4 pt-5">
          <button onClick={onBack} aria-label="Back to parks" className="p-1 -ml-1 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-6" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <CalendarX className="size-8 text-muted-foreground" />
          <p className="text-sm font-bold text-foreground">No park selected</p>
          <p className="text-xs text-muted-foreground">Choose your assigned park from the Parks tab.</p>
        </div>
      </div>
    );
  }

  const park: ScopedParkNavInfo = parkNav;
  const sessionSummary = groups.length === 1 ? "1 group" : `${groups.length} groups`;

  return (
    <div className="w-full max-w-[460px] mx-auto flex flex-col min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 bg-card border-b border-border/70 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button onClick={onBack} aria-label="Back to parks" className="p-1 -ml-1 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-6" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Park workspace</p>
            <h1 className="text-lg font-extrabold text-foreground truncate">{parkName}</h1>
            {cityName ? <p className="text-xs text-muted-foreground truncate">{cityName}</p> : null}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Primary action */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-card via-card to-purple-50/50 dark:to-purple-950/20 border border-[#4B0A8F]/30 shadow-sm space-y-3">
          <div>
            <h2 className="text-sm font-black text-foreground">Group session attendance</h2>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{sessionSummary} in this park</p>
          </div>
          <button
            onClick={() => onOpenAttendance(park)}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#4B0A8F] to-[#D90429] hover:opacity-95 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <span>Open &amp; Mark Attendance Roster</span>
            <ArrowRight className="size-4" />
          </button>
        </div>

        {/* Modules */}
        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">Park Modules</h2>
          <div className="grid grid-cols-3 gap-2">
            {UNAVAILABLE_MODULES.map((module) => {
              const Icon = module.icon;
              return (
                <button
                  key={module.key}
                  onClick={() => setUnavailable(module.key)}
                  aria-label={`${module.key} (not available yet)`}
                  className="p-3 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all hover:bg-muted/40"
                >
                  <div className={`size-9 rounded-xl flex items-center justify-center ${module.color}`}>
                    <Icon className="size-4" />
                  </div>
                  <span className="text-[10px] font-bold text-foreground leading-tight">{module.key}</span>
                </button>
              );
            })}
          </div>
          {unavailable && (
            <p role="status" className="mt-2 text-xs font-medium text-muted-foreground">
              {unavailable} is not available yet.
            </p>
          )}
        </div>

        {/* Groups */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="size-4 text-[#4B0A8F] dark:text-purple-400" />
              Groups ({groups.length})
            </h3>
            {groups.length > 0 && (
              <button
                onClick={() => onOpenAttendance(park)}
                className="text-xs font-bold text-[#4B0A8F] dark:text-purple-400 hover:underline"
              >
                All Groups →
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="py-10 flex flex-col items-center gap-3 text-muted-foreground">
              <RefreshCw className="size-5 animate-spin" />
              <span className="text-sm">Loading park groups…</span>
            </div>
          ) : isError ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm font-bold text-rose-500">Could not load park groups</p>
              <button onClick={() => refetch()} className="px-4 py-2 rounded-xl bg-[#4B0A8F] text-white text-xs font-bold">Retry</button>
            </div>
          ) : groups.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No groups assigned to this park yet.</p>
          ) : (
            <div className="space-y-2.5">
              {groups.map((group) => {
                // Only a value the server actually returned is shown; a group with
                // no session is an explicit state, never a fabricated 0%.
                const rate =
                  typeof group.latestProgress === "number"
                    ? group.latestProgress
                    : typeof group.todayProgress === "number"
                      ? group.todayProgress
                      : null;
                const barColor = rate !== null && rate >= 75 ? "bg-emerald-500" : rate !== null && rate >= 50 ? "bg-amber-500" : "bg-rose-500";
                return (
                  <button
                    key={group.id}
                    onClick={() => onOpenAttendance(park)}
                    aria-label={`Open attendance for ${group.name}`}
                    className="w-full text-left p-3.5 rounded-2xl bg-card border border-border/70 hover:border-purple-300 dark:hover:border-purple-800/80 shadow-sm transition-all active:scale-[0.99] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-extrabold text-foreground">{group.name}</h4>
                        {typeof group.totalParticipants === "number" ? (
                          <p className="text-[11px] text-muted-foreground">{group.totalParticipants} Shabab</p>
                        ) : null}
                      </div>
                      {rate === null ? (
                        <span className="text-[10px] font-bold text-muted-foreground px-2 py-0.5 rounded-lg bg-muted">
                          No session
                        </span>
                      ) : (
                        <span className="text-xs font-black text-[#4B0A8F] dark:text-purple-300 px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950/60">
                          {rate}%
                        </span>
                      )}
                    </div>
                    {rate === null ? null : (
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${rate}%` }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
