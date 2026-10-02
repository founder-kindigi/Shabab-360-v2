"use client";
import Image from "next/image";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  TreePine,
  Users,
  TrendingUp,
  ChevronRight,
  BarChart3,
  Sun,
  Moon,
  Bell,
  PhoneCall,
  CalendarCheck,
  Package,
  UserPlus,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/theme-provider";

export interface CityHeadParkSelection {
  parkId: string;
  parkName: string;
  murabbiCount: number;
  studentCount: number;
}

export interface MobileCityHeadDashboardProps {
  onNavigate?: (screen: string) => void;
  onSelectPark?: (park: CityHeadParkSelection) => void;
}

/** Attendance aggregate returned by the City Head API. */
export interface CityHeadAttendanceTotals {
  present: number;
  late: number;
  absent: number;
  excused: number;
  attended: number;
  marked: number;
  eligible: number;
  rate: number | null;
}

export interface CityHeadDashboardData {
  city: { id: string; name: string; code: string };
  metrics: {
    parkCount: number;
    batchCount: number;
    groupCount: number;
    totalParticipants: number;
    totalStaff: number;
  };
  batches: Array<{ id: string; name: string }>;
  attendance7Day: CityHeadAttendanceTotals | null;
  parkBreakdown: Array<{
    id: string;
    name: string;
    participants: number;
    groups: number;
    murabbiCount: number;
    attendance: CityHeadAttendanceTotals | null;
  }>;
}

class CityDashboardError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "CityDashboardError";
    this.status = status;
  }
}

/**
 * The City Head portal reads only its own server-scoped endpoint. The city, its
 * parks and every figure come from that response; nothing is inferred on the
 * client and no `/api/admin/*` list is consulted.
 */
async function fetchCityDashboard(): Promise<CityHeadDashboardData> {
  const response = await fetch("/api/city-head/dashboard");
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new CityDashboardError(
      typeof body?.error === "string" ? body.error : "City data could not be loaded",
      response.status
    );
  }
  const payload = await response.json();
  return {
    city: payload.city,
    metrics: payload.metrics,
    // A missing list renders as an empty state, never as invented rows.
    batches: Array.isArray(payload.batches) ? payload.batches : [],
    parkBreakdown: Array.isArray(payload.parkBreakdown) ? payload.parkBreakdown : [],
    attendance7Day: payload.attendance7Day ?? null,
  };
}

/** Renders a real number, or a dash when the API truthfully has no value. */
function count(value: number | undefined): string {
  return typeof value === "number" ? String(value) : "—";
}

function rate(value: number | null | undefined): string {
  return typeof value === "number" ? `${value}%` : "—";
}

function rateDotClass(value: number | null | undefined): string {
  if (typeof value !== "number") return "bg-muted-foreground/40";
  if (value >= 75) return "bg-emerald-500";
  if (value >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

function BrandRow() {
  const { setTheme, resolvedTheme } = useTheme();
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="size-11 rounded-xl bg-white/10 border border-white/20 p-1.5 shadow-inner backdrop-blur-sm flex items-center justify-center shrink-0">
          <Image src="/logo-white.png" alt="Logo" width={160} height={160} className="size-full object-contain" />
        </div>
        <div>
          <span className="text-base font-black tracking-tight leading-none text-white">SHABAB 360</span>
          <p className="text-[10px] text-purple-200 font-bold uppercase tracking-widest mt-1">
            City Head Portal
          </p>
        </div>
      </div>
      <button
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        className="size-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white active:scale-95 transition-transform"
        title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {resolvedTheme === "dark" ? (
          <Sun className="size-4 text-amber-300" />
        ) : (
          <Moon className="size-4 text-purple-200" />
        )}
      </button>
    </div>
  );
}

function StatePanel({
  title,
  detail,
  onRetry,
  busy,
}: {
  title: string;
  detail?: string;
  onRetry?: () => void;
  busy?: boolean;
}) {
  return (
    <div className="w-full max-w-[460px] mx-auto flex flex-col min-h-screen bg-background text-foreground select-none">
      <div className="w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#D90429] pt-12 pb-6 rounded-b-[2.5rem] shadow-2xl px-5 text-white">
        <BrandRow />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 pb-24 text-center">
        {busy && <Loader2 className="size-7 text-[#4B0A8F] animate-spin" />}
        <p className="text-sm font-bold text-foreground">{title}</p>
        {detail && <p className="text-xs font-medium text-muted-foreground">{detail}</p>}
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold text-foreground shadow-sm active:scale-95 transition-transform"
          >
            <RefreshCw className="size-3.5" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

export function MobileCityHeadDashboard({ onNavigate, onSelectPark }: MobileCityHeadDashboardProps = {}) {
  const { data: session } = useSession();
  const { setTheme, resolvedTheme } = useTheme();

  const user = session?.user as { name?: string | null } | undefined;
  const userName = user?.name || "City Head";

  const handleNav = (screen: string) => {
    if (onNavigate) onNavigate(screen);
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<CityHeadDashboardData>({
    queryKey: ["city-head-dashboard"],
    queryFn: fetchCityDashboard,
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000,
  });

  if (isLoading) {
    return <StatePanel busy title="Loading city data..." />;
  }

  if (isError && error instanceof CityDashboardError && error.status === 403 && error.message === "No city assigned") {
    return (
      <StatePanel
        title="No city is assigned to your account."
        detail="A City Head account needs an active city assignment before this dashboard can show anything."
      />
    );
  }

  if (isError || !data) {
    return (
      <StatePanel
        title="City data could not be loaded."
        detail={error instanceof Error ? error.message : undefined}
        onRetry={() => { void refetch(); }}
        busy={isFetching}
      />
    );
  }

  const { city, metrics, batches, attendance7Day, parkBreakdown: parks } = data;

  const batchLabel = batches.length === 0
    ? "No active batch"
    : batches.length === 1
      ? batches[0].name
      : `${batches.length} batches`;

  const attendanceSummary = attendance7Day && attendance7Day.eligible > 0
    ? `${attendance7Day.attended} attended out of ${attendance7Day.eligible} eligible marks`
    : "No completed attendance data in the last 7 days";

  return (
    <div className="w-full max-w-[460px] mx-auto flex flex-col min-h-screen bg-background text-foreground pb-24 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#D90429] pt-12 pb-8 rounded-b-[2.5rem] shadow-2xl relative z-10 px-5 text-white">
        {/* Top row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-white/10 border border-white/20 p-1.5 shadow-inner backdrop-blur-sm flex items-center justify-center shrink-0">
              <Image src="/logo-white.png" alt="Logo" width={160} height={160} className="size-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tight leading-none text-white">SHABAB 360</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
                  {city.code}
                </span>
              </div>
              <p className="text-[10px] text-purple-200 font-bold uppercase tracking-widest mt-1">
                City Head Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="size-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white active:scale-95 transition-transform"
              title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="size-4 text-amber-300" />
              ) : (
                <Moon className="size-4 text-purple-200" />
              )}
            </button>
            {onNavigate && (
              <button
                onClick={() => handleNav("notifications")}
                className="size-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white relative active:scale-95 transition-transform"
                aria-label="Notifications"
              >
                <Bell className="size-4" />
                <span className="absolute top-1.5 right-1.5 size-2 bg-[#D90429] rounded-full border border-white"></span>
              </button>
            )}
          </div>
        </div>

        {/* City Info & Batch label */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h1 className="text-xl font-black text-white tracking-tight truncate" title={city.name}>
              {city.name}
            </h1>
            <p className="text-xs text-purple-200 font-medium mt-0.5">Director: {userName}</p>
            <p className="text-[11px] text-purple-200 font-medium mt-0.5">
              {count(metrics.groupCount)} groups · {count(metrics.totalStaff)} staff
            </p>
          </div>
          <span
            className="flex items-center gap-1.5 bg-white/15 border border-white/20 px-3 py-1.5 rounded-full text-white text-xs font-bold backdrop-blur-md shrink-0"
            title="Active batches in this city"
          >
            {batchLabel}
          </span>
        </div>

        {/* 3 Glassmorphic KPI Pills */}
        <div className="grid grid-cols-3 gap-2.5 w-full">
          <div className="bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <TreePine className="size-4 text-purple-200 mb-1" />
            <span className="text-xl font-black text-white">{count(metrics.parkCount)}</span>
            <span className="text-[9px] font-bold text-purple-200 uppercase tracking-wider">Parks</span>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <Users className="size-4 text-purple-200 mb-1" />
            <span className="text-xl font-black text-white">{count(metrics.totalParticipants)}</span>
            <span className="text-[9px] font-bold text-purple-200 uppercase tracking-wider">Shabab</span>
          </div>

          <div
            className="bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-sm flex flex-col items-center justify-center text-center"
            title={attendanceSummary}
          >
            <TrendingUp className="size-4 text-emerald-300 mb-1" />
            <span className="text-xl font-black text-white">{rate(attendance7Day?.rate)}</span>
            <span className="text-[9px] font-bold text-purple-200 uppercase tracking-wider">7-Day Rate</span>
          </div>
        </div>
      </div>

      {/* ─── Content Body ────────────────────────────────────────────────── */}
      <div className="px-5 pt-6 space-y-5">
        {/* Quick Management Actions */}
        {onNavigate && (
          <div>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
              City Command
            </h2>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleNav("mashwara")}
                className="p-3 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all hover:bg-muted/40"
              >
                <div className="size-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <CalendarCheck className="size-4" />
                </div>
                <span className="text-[10px] font-bold text-foreground leading-tight">Mashwara</span>
              </button>

              <button
                onClick={() => handleNav("calling")}
                className="p-3 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all hover:bg-muted/40"
              >
                <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <PhoneCall className="size-4" />
                </div>
                <span className="text-[10px] font-bold text-foreground leading-tight">Calling</span>
              </button>

              <button
                onClick={() => handleNav("inventory")}
                className="p-3 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all hover:bg-muted/40"
              >
                <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Package className="size-4" />
                </div>
                <span className="text-[10px] font-bold text-foreground leading-tight">Central Store</span>
              </button>

              <button
                onClick={() => handleNav("admissions")}
                className="p-3 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all hover:bg-muted/40"
              >
                <div className="size-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <UserPlus className="size-4" />
                </div>
                <span className="text-[10px] font-bold text-foreground leading-tight">Admissions</span>
              </button>
            </div>
          </div>
        )}

        {/* ─── Parks Performance Ranking ─────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <BarChart3 className="size-4 text-[#4B0A8F] dark:text-purple-400" />
              Parks Performance Ranking ({parks.length})
            </h3>
            {onNavigate && (
              <button
                onClick={() => handleNav("parks")}
                className="text-xs font-bold text-[#4B0A8F] dark:text-purple-400 hover:underline"
              >
                View All →
              </button>
            )}
          </div>

          <p className="text-[11px] font-medium text-muted-foreground">{attendanceSummary}</p>

          {parks.length === 0 ? (
            <div className="p-4 rounded-2xl bg-card border border-border/70 text-center">
              <p className="text-sm font-bold text-foreground">No parks in this city yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Parks appear here once they are added to the assigned city.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {parks.map((park, index) => (
                <motion.div
                  key={park.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  onClick={
                    onSelectPark
                      ? () => onSelectPark({
                          parkId: park.id,
                          parkName: park.name,
                          murabbiCount: park.murabbiCount,
                          studentCount: park.participants,
                        })
                      : undefined
                  }
                  className={cn(
                    "p-3.5 rounded-2xl bg-card border border-border/70 hover:border-purple-300 dark:hover:border-purple-800/80 shadow-sm transition-all flex items-center justify-between gap-3",
                    onSelectPark && "cursor-pointer active:scale-[0.99]"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-[#4B0A8F] dark:text-purple-300 font-extrabold text-xs flex items-center justify-center shrink-0 border border-purple-200/50 dark:border-purple-800/40">
                      #{index + 1}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-extrabold text-foreground truncate">{park.name}</h4>
                        <span className={cn("size-2 rounded-full shrink-0", rateDotClass(park.attendance?.rate))} />
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {count(park.murabbiCount)} Murabbis • {count(park.participants)} Shabab • {count(park.groups)} groups
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-black text-foreground">{rate(park.attendance?.rate)}</span>
                      <p className="text-[10px] text-muted-foreground">7-Day</p>
                    </div>
                    {onSelectPark && <ChevronRight className="size-4 text-muted-foreground" />}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
