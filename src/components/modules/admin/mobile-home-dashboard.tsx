"use client";
import Image from "next/image";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Bell, MapPin, Users, CheckCircle2, Loader2, Calendar, TrendingUp, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/theme-provider";
import { formatPKT } from "@/lib/timezone";
import { AttendanceChart } from "@/components/shared/attendance-chart";

type ViewMode = "today" | "trend";
type AudienceMode = "student" | "murabbi";

function displayDate(value?: string | null): string | null {
  if (!value) return null;
  const formatted = formatPKT(value, "dd MMM yyyy");
  return formatted === "—" ? null : formatted;
}

async function fetchAnalytics() {
  // No range parameters: the server derives the period from the active Batch
  // start date through the latest class session that has attendance data.
  const res = await fetch("/api/admin/home-analytics");
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

interface LatestSession {
  date: string;
  attended: number;
  total: number;
  rate: number | null;
}

interface TodayRow {
  key: string;
  name: string;
  session: LatestSession | null;
}

interface PeriodRow {
  key: string;
  name: string;
  attended: number;
  total: number;
  rate: number | null;
}

function toSession(raw: any): LatestSession | null {
  if (!raw?.date) return null;
  return {
    date: raw.date,
    attended: raw.attended ?? 0,
    total: raw.total ?? 0,
    rate: raw.rate ?? null,
  };
}

/** Shared period rows. Each row keeps its own real eligible-opportunity denominator. */
function AttendanceRows({ rows }: { rows: PeriodRow[] }) {
  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center justify-between py-1">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "size-2.5 rounded-full",
                row.rate === null ? "bg-muted-foreground/40" : row.rate >= 80 ? "bg-emerald-500" : row.rate >= 50 ? "bg-amber-500" : "bg-rose-500"
              )}
            />
            <div>
              <p className="text-sm font-bold text-foreground">{row.name}</p>
              <p className="text-xs font-medium text-muted-foreground">
                {row.attended} attended out of {row.total} eligible marks
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-black text-foreground">
              {row.rate === null ? "—" : `${row.rate}%`}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MobileHomeDashboard() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const { setTheme, resolvedTheme } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("student");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-home-analytics"],
    queryFn: () => fetchAnalytics(),
  });

  const parks: any[] = data?.parks ?? [];
  const byMurabbi: any[] = data?.byMurabbi ?? [];
  const daily: any[] = data?.daily ?? [];
  const multiBatch = data?.multiBatch === true;
  const hasCompletedSession = data?.hasCompletedSession === true;
  const periodStart = displayDate(data?.periodStart);
  const periodEnd = displayDate(data?.periodEnd);
  const periodLabel = periodStart && periodEnd ? `${periodStart} to ${periodEnd}` : null;

  // Today: the latest real class session per park (never a fabricated zero day).
  const todayRows: TodayRow[] = useMemo(() => {
    if (audienceMode === "student") {
      return parks.map((park) => ({ key: park.id, name: park.name, session: toSession(park.latestSession) }));
    }
    return byMurabbi.map((murabbi) => ({ key: `${murabbi.id}-${murabbi.groupId}`, name: murabbi.name, session: toSession(murabbi.latestSession) }));
  }, [parks, byMurabbi, audienceMode]);

  // Trend: the period aggregate for the selected audience.
  const periodRows: PeriodRow[] = useMemo(() => {
    if (audienceMode === "student") {
      return parks.map((park) => ({
        key: park.id,
        name: park.name,
        // `attended`/`total` are the endpoint's own rate numerator and eligible
        // denominator, so a row always agrees with its percentage.
        attended: park.attended ?? 0,
        total: park.total ?? 0,
        rate: park.attendancePercentage ?? park.rate ?? null,
      }));
    }
    return byMurabbi.map((murabbi) => ({
      key: `${murabbi.id}-${murabbi.groupId}`,
      name: murabbi.name,
      attended: murabbi.attended ?? 0,
      total: murabbi.total ?? 0,
      rate: murabbi.rate ?? null,
    }));
  }, [parks, byMurabbi, audienceMode]);

  const sessionsWithData = todayRows.filter((row) => row.session !== null);
  const latestRowDate = sessionsWithData.length > 0
    ? sessionsWithData.map((row) => row.session!.date).sort().slice(-1)[0]
    : null;

  // Header figures come from the most recent real session across the parks.
  const parkLatestDate = parks.map((park: any) => park.latestSession?.date).filter(Boolean).sort().slice(-1)[0] ?? null;
  const presentInLatestSession = parkLatestDate === null
    ? null
    : parks
      .filter((park: any) => park.latestSession?.date === parkLatestDate)
      .reduce((total: number, park: any) => total + (park.latestSession?.attended ?? 0), 0);

  const overall = data?.attendance ?? null;
  const eligibleMarks = overall && typeof overall.total === "number" ? overall.total : null;
  const marked = overall && typeof overall.total === "number" && typeof overall.unmarked === "number"
    ? overall.total - overall.unmarked
    : null;

  const chartData = daily.map((day: any) => ({ date: day.date, present: day.present ?? 0, late: day.late ?? 0, absent: day.absent ?? 0 }));
  const chartEmpty = chartData.length === 0;

  const batchCount = data?.batches?.length ?? 0;
  const batchChipLabel = data?.batch?.name ?? (multiBatch ? "All active batches" : "Batch");
  const heading = viewMode === "trend"
    ? multiBatch
      ? "All active batches"
      : periodLabel ? `Batch attendance · ${periodLabel}` : "Batch attendance"
    : latestRowDate
      ? `Latest class attendance · ${displayDate(latestRowDate)}`
      : "Latest class attendance";

  return (
    <div className="w-full max-w-[460px] mx-auto flex flex-col min-h-screen w-full bg-background pb-24">
      {/* ─── Header Section ───────────────────────────────────────────────── */}
      <div className="w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#D90429] pt-14 pb-8 rounded-b-[2.5rem] shadow-2xl relative z-10 px-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-white/10 border border-white/20 p-2 shadow-inner backdrop-blur-sm">
              <Image src="/logo-white.png" alt="Shabab 360" width={160} height={160} className="size-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight leading-none">SHABAB</h1>
              <p className="text-[10px] text-purple-200 font-bold uppercase tracking-widest mt-1">
                Revolutionary Youth Training Program
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="size-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white active:scale-95 transition-transform"
              title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="size-5 text-amber-300" />
              ) : (
                <Moon className="size-5 text-purple-200" />
              )}
            </button>
            <button className="size-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white relative">
              <Bell className="size-5" />
              <span className="absolute top-2 right-2 size-2.5 bg-[#D90429] rounded-full border border-white"></span>
            </button>
          </div>
        </div>

        {/* Batch Dropdown */}
        <div className="mb-6">
          <button className="flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-2 rounded-full text-white text-sm font-bold backdrop-blur-md">
            {batchChipLabel} <span className="opacity-70">▼</span>
          </button>
        </div>

        {/* Stats Row — real figures for the latest recorded class session */}
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <MapPin className="size-5 text-purple-200 mb-1" />
            <span className="text-2xl font-black text-white">{data ? data.totalParks : "—"}</span>
            <span className="text-[10px] font-bold text-purple-200 uppercase tracking-wider">Parks</span>
          </div>
          <div className="flex-1 bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <Users className="size-5 text-purple-200 mb-1" />
            <span className="text-2xl font-black text-white">{data ? data.totalStudents : "—"}</span>
            <span className="text-[10px] font-bold text-purple-200 uppercase tracking-wider">Students</span>
          </div>
          <div className="flex-1 bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="size-5 text-[#D90429] mb-1" />
            <span className="text-2xl font-black text-white">{presentInLatestSession ?? "—"}</span>
            <span className="text-[10px] font-bold text-purple-200 uppercase tracking-wider">Present</span>
          </div>
        </div>
      </div>

      {/* ─── Analytics Section ────────────────────────────────────────────── */}
      <div className="px-5 pt-8 pb-4">
        <h2 className="text-xl font-extrabold text-foreground mb-4">Analytics</h2>

        <div className="bg-card border border-border rounded-3xl shadow-sm p-1">
          {/* Toggle buttons */}
          <div className="flex bg-muted rounded-2xl p-1 mb-4">
            <button
              onClick={() => setViewMode("today")}
              aria-pressed={viewMode === "today"}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all",
                viewMode === "today" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              )}
            >
              <Calendar className="size-4" />
              Today
            </button>
            <button
              onClick={() => setViewMode("trend")}
              aria-pressed={viewMode === "trend"}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all",
                viewMode === "trend" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              )}
            >
              <TrendingUp className="size-4" />
              Trend
            </button>
          </div>

          <div className="px-4 pb-4">
            <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wider">
              {heading}
            </h3>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="size-8 text-[#4B0A8F] animate-spin mb-2" />
                <p className="text-sm text-muted-foreground font-medium">Loading analytics...</p>
              </div>
            ) : error ? (
              <div className="py-10 text-center">
                <p className="text-sm text-rose-500 font-bold">Failed to load analytics</p>
              </div>
            ) : viewMode === "today" ? (
              todayRows.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground font-medium">
                    {audienceMode === "student"
                      ? "No park is in scope for this view"
                      : "No Murabbi is assigned in scope for this view"}
                  </p>
                </div>
              ) : sessionsWithData.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground font-medium">
                    No class session was recorded in this period.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayRows.map((row) => (
                    <div key={row.key} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "size-2.5 rounded-full",
                            row.session === null
                              ? "bg-muted-foreground/40"
                              : row.session.rate === null
                                ? "bg-muted-foreground/40"
                                : row.session.rate >= 80
                                  ? "bg-emerald-500"
                                  : row.session.rate >= 50
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                          )}
                        />
                        <div>
                          <p className="text-sm font-bold text-foreground">{row.name}</p>
                          <p className="text-xs font-medium text-muted-foreground">
                            {row.session === null
                              ? "No class session recorded"
                              : `${displayDate(row.session.date)} · ${row.session.attended} attended out of ${row.session.total} eligible marks`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-foreground">
                          {row.session === null || row.session.rate === null ? "—" : `${row.session.rate}%`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : multiBatch ? (
              <div className="space-y-4">
                <p className="text-xs font-medium text-muted-foreground">
                  {`${batchCount} active batches are in scope, so no single-batch period or trend chart is shown.`}
                </p>
                {overall && (
                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 space-y-1">
                    <p className="text-xs font-bold text-foreground">All active batches</p>
                    <p className="text-xs font-medium text-muted-foreground">
                      {`Overall attendance: ${overall.attended} attended out of ${eligibleMarks ?? 0} eligible marks (${overall.rate ?? 0}%)`}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">
                      {marked === null || !eligibleMarks ? "Marked: —" : `Marked: ${marked}/${eligibleMarks} (${Math.round((marked / eligibleMarks) * 100)}%)`}
                    </p>
                  </div>
                )}
                {periodRows.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground font-medium py-4">
                    {audienceMode === "student"
                      ? "No park is in scope for this view"
                      : "No Murabbi is assigned in scope for this view"}
                  </p>
                ) : (
                  <AttendanceRows rows={periodRows} />
                )}
              </div>
            ) : !hasCompletedSession || chartEmpty ? (
              <div className="py-10 text-center space-y-1">
                <p className="text-sm text-muted-foreground font-medium">
                  No completed class session with attendance data yet.
                </p>
                <p className="text-xs text-muted-foreground">
                  The trend appears once a class session has recorded attendance.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div role="img" aria-label={`Attendance by day, ${periodLabel ?? ""}`.trim()}>
                  <AttendanceChart data={chartData} height={200} />
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  {`Only days with a recorded class session are plotted (${chartData.length} session day${chartData.length === 1 ? "" : "s"}${periodLabel ? ` between ${periodLabel}` : ""}).`}
                </p>
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 space-y-1">
                  <p className="text-xs font-bold text-foreground">Period summary</p>
                  <p className="text-xs font-medium text-muted-foreground">Dates: {periodLabel ?? "—"}</p>
                  <p className="text-xs font-medium text-muted-foreground">
                    Overall attendance: {overall ? `${overall.attended} attended out of ${eligibleMarks ?? 0} eligible marks (${overall.rate ?? 0}%)` : "—"}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">
                    Marked: {marked === null || !eligibleMarks ? "—" : `${marked}/${eligibleMarks} (${Math.round((marked / eligibleMarks) * 100)}%)`}
                  </p>
                </div>
                {periodRows.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground font-medium py-4">
                    {audienceMode === "student"
                      ? "No park is in scope for this view"
                      : "No Murabbi is assigned in scope for this view"}
                  </p>
                ) : (
                  <AttendanceRows rows={periodRows} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Bottom Toggle ────────────────────────────────────────────────── */}
      <div className="px-5 mt-auto pb-4">
        <div className="flex bg-muted rounded-full p-1 max-w-xs mx-auto">
          <button
            onClick={() => setAudienceMode("student")}
            aria-pressed={audienceMode === "student"}
            className={cn(
              "flex-1 py-2 rounded-full text-xs font-bold transition-all",
              audienceMode === "student" ? "bg-white text-[#4B0A8F] shadow-sm" : "text-muted-foreground"
            )}
          >
            Students
          </button>
          <button
            onClick={() => setAudienceMode("murabbi")}
            aria-pressed={audienceMode === "murabbi"}
            className={cn(
              "flex-1 py-2 rounded-full text-xs font-bold transition-all",
              audienceMode === "murabbi" ? "bg-white text-[#4B0A8F] shadow-sm" : "text-muted-foreground"
            )}
          >
            Murabbis
          </button>
        </div>
      </div>
    </div>
  );
}
