"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart } from "@/components/shared/bar-chart";
import { DonutChart } from "@/components/shared/donut-chart";
import {
  BarChart3,
  CalendarDays,
  TrendingUp,
  Building2,
  TreePine,
  Activity,
  Users,
  ClipboardCheck,
  Calendar,
  Banknote,
  Coins,
  PieChart,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────

type ReportType = "attendance-overview" | "city-comparison" | "park-comparison" | "trend";
type DaysPreset = 7 | 14 | 30 | 60 | 90;

interface OverviewData {
  totalEvents: number;
  totalRecords: number;
  overallRate: number;
  activeParticipants: number;
  totalFeesCollected: number;
  dailyRates: { date: string; rate: number; marked: number; total: number }[];
  statusDistribution: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    unmarked: number;
  };
  dayOfWeekBreakdown: {
    day: string;
    dayIndex: number;
    avgRate: number;
    events: number;
  }[];
  cityAttendanceRates: {
    cityId: string;
    cityName: string;
    rate: number;
    totalRecords: number;
    attended: number;
  }[];
}

interface ParkFeeData {
  parkId: string;
  parkName: string;
  cityName: string;
  totalCollected: number;
}

interface CityStat {
  cityId: string;
  name: string;
  parksCount: number;
  totalParticipants: number;
  totalEvents: number;
  avgRate: number;
  topPark: string;
}

interface ParkStat {
  parkId: string;
  name: string;
  totalParticipants: number;
  groups: number;
  totalEvents: number;
  avgRate: number;
}

interface WeekTrend {
  weekStart: string;
  rate: number;
  events: number;
  records: number;
}

// ── Constants ──────────────────────────────────────────────────

const DAYS_PRESETS: { value: DaysPreset; label: string }[] = [
  { value: 7, label: "7 Days" },
  { value: 14, label: "14 Days" },
  { value: 30, label: "30 Days" },
  { value: 60, label: "60 Days" },
  { value: 90, label: "90 Days" },
];

// Pakistan week starts Saturday. JS getDay(): 0=Sun,1=Mon,...,5=Fri,6=Sat
const PKT_DOW_ORDER = [6, 0, 1, 2, 3, 4, 5]; // Sat, Sun, Mon, Tue, Wed, Thu, Fri
const PKT_DOW_LABELS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
const PKT_DOW_FULL = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DOW_LABELS = PKT_DOW_LABELS;
const DOW_FULL = PKT_DOW_FULL;

const STATUS_COLORS: Record<string, { bg: string; darkBg: string; label: string }> = {
  present: { bg: "bg-[#22c55e]", darkBg: "dark:bg-[#16a34a]", label: "Present" },
  absent: { bg: "bg-[#ef4444]", darkBg: "dark:bg-[#dc2626]", label: "Absent" },
  late: { bg: "bg-[#f59e0b]", darkBg: "dark:bg-[#d97706]", label: "Late" },
  excused: { bg: "bg-[#8b5cf6]", darkBg: "dark:bg-[#7c3aed]", label: "Excused" },
  unmarked: { bg: "bg-gray-300", darkBg: "dark:bg-gray-600", label: "Unmarked" },
};

function rateColor(rate: number): string {
  if (rate >= 80) return "bg-[#22c55e]";
  if (rate >= 50) return "bg-[#f59e0b]";
  return "bg-[#ef4444]";
}

function rateTextColor(rate: number): string {
  if (rate >= 80) return "text-[#22c55e]";
  if (rate >= 50) return "text-[#f59e0b]";
  return "text-[#ef4444]";
}

function rateBgColor(rate: number): string {
  if (rate >= 80) return "bg-[#22c55e]/10";
  if (rate >= 50) return "bg-[#f59e0b]/10";
  return "bg-[#ef4444]/10";
}

// ── Animation variants ─────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

// ── Sub-components ─────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, children }: {
  icon: typeof BarChart3;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  children?: React.ReactNode;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="relative overflow-hidden">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className={`text-2xl md:text-3xl font-bold ${color || "text-[#4B0A8F] dark:text-[#8A40B0]"} truncate`}>{value}</p>
              {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
              {children}
            </div>
            <div className="flex items-center justify-center size-10 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086080] shrink-0 ml-2">
              <Icon className="size-5 text-[#4B0A8F] dark:text-[#8A40B0]" />
            </div>
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4B0A8F] via-[#A0006B] to-[#FF0015]" />
      </Card>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-4 md:p-6 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-16" />
      </CardContent>
    </Card>
  );
}

function SectionSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-48 w-full" />
      </CardContent>
    </Card>
  );
}

// ── Daily Bar Chart (Pure CSS) ─────────────────────────────────

function DailyBarChart({ data }: { data: OverviewData["dailyRates"] }) {
  const maxRate = Math.max(...data.map((d) => d.rate), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="size-4 text-[#A0006B]" />
          Daily Attendance Rate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-[3px] h-48 md:h-56">
          {data.map((d) => {
            const h = Math.max((d.rate / 100) * 100, 2);
            return (
              <div
                key={d.date}
                className="flex-1 min-w-0 group relative"
                title={`${format(parseISO(d.date), "dd MMM")}: ${d.rate}%`}
              >
                <div
                  className={`w-full rounded-t-sm transition-all duration-200 hover:opacity-80 ${rateColor(d.rate)}`}
                  style={{ height: `${h}%` }}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                  <div className="bg-popover text-popover-foreground text-[10px] px-1.5 py-0.5 rounded shadow-md border whitespace-nowrap">
                    {format(parseISO(d.date), "dd MMM")}: {d.rate}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Labels */}
        <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
          {data.length > 0 && (
            <>
              <span>{format(parseISO(data[0].date), "dd MMM")}</span>
              <span>{format(parseISO(data[Math.floor(data.length / 2)].date), "dd MMM")}</span>
              {data.length > 1 && <span>{format(parseISO(data[data.length - 1].date), "dd MMM")}</span>}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Status Distribution Bar ────────────────────────────────────

function StatusDistribution({ dist }: { dist: OverviewData["statusDistribution"] }) {
  const total = dist.present + dist.absent + dist.late + dist.excused + dist.unmarked;
  if (total === 0) return null;

  const segments = [
    { key: "present", value: dist.present },
    { key: "absent", value: dist.absent },
    { key: "late", value: dist.late },
    { key: "excused", value: dist.excused },
    { key: "unmarked", value: dist.unmarked },
  ].filter((s) => s.value > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ClipboardCheck className="size-4 text-[#A0006B]" />
          Status Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex h-6 rounded-md overflow-hidden">
          {segments.map((seg) => (
            <div
              key={seg.key}
              className={`${STATUS_COLORS[seg.key].bg} ${STATUS_COLORS[seg.key].darkBg} transition-all duration-300`}
              style={{ width: `${(seg.value / total) * 100}%` }}
              title={`${STATUS_COLORS[seg.key].label}: ${seg.value} (${Math.round((seg.value / total) * 100)}%)`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {segments.map((seg) => (
            <div key={seg.key} className="flex items-center gap-1.5 text-xs">
              <span className={`inline-block size-2.5 rounded-sm ${STATUS_COLORS[seg.key].bg} ${STATUS_COLORS[seg.key].darkBg}`} />
              <span className="text-muted-foreground">{STATUS_COLORS[seg.key].label}:</span>
              <span className="font-medium">{seg.value.toLocaleString()}</span>
              <span className="text-muted-foreground">({Math.round((seg.value / total) * 100)}%)</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Day-of-Week Heatmap (Pakistan Week) ────────────────────────

function DayOfWeekHeatmap({ data }: { data: OverviewData["dayOfWeekBreakdown"] }) {
  // Build lookup by JS dayIndex (0=Sun..6=Sat)
  const dowMap = new Map(data.map((d) => [d.dayIndex, d]));
  const maxRate = Math.max(...data.map((d) => d.avgRate), 1);

  // Helper: rate → background color
  const cellBg = (rate: number, hasData: boolean) => {
    if (!hasData) return "bg-muted/40 dark:bg-muted/20";
    if (rate >= 80) return "bg-[#22c55e]/15 dark:bg-[#22c55e]/20";
    if (rate >= 60) return "bg-[#22c55e]/8 dark:bg-[#22c55e]/10";
    if (rate >= 40) return "bg-[#f59e0b]/12 dark:bg-[#f59e0b]/15";
    if (rate >= 20) return "bg-[#f59e0b]/8 dark:bg-[#f59e0b]/10";
    return "bg-[#ef4444]/12 dark:bg-[#ef4444]/15";
  };

  const cellBorder = (rate: number, hasData: boolean) => {
    if (!hasData) return "border-border/40";
    if (rate >= 80) return "border-[#22c55e]/30";
    if (rate >= 50) return "border-[#f59e0b]/30";
    return "border-[#ef4444]/30";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="size-4 text-[#A0006B]" />
          Attendance by Day of Week
        </CardTitle>
        <CardDescription className="text-xs">Pakistan week — Saturday to Friday</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {PKT_DOW_ORDER.map((jsDayIdx, displayIdx) => {
            const info = dowMap.get(jsDayIdx);
            const rate = info?.avgRate || 0;
            const hasData = !!info;
            return (
              <div
                key={PKT_DOW_LABELS[displayIdx]}
                className={`
                  rounded-xl border p-2 sm:p-3 flex flex-col items-center justify-center gap-0.5 min-h-[72px] sm:min-h-[88px]
                  transition-all duration-200 hover:scale-[1.03]
                  ${cellBg(rate, hasData)}
                  ${cellBorder(rate, hasData)}
                `}
              >
                <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {PKT_DOW_LABELS[displayIdx]}
                </span>
                {hasData ? (
                  <>
                    <span className={`text-base sm:text-xl font-bold tabular-nums leading-tight ${rateTextColor(rate)}`}>
                      {rate}%
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                      {info.events} event{info.events !== 1 ? "s" : ""}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground/60 mt-1">—</span>
                )}
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-[#22c55e]/30 border border-[#22c55e]/40" /> High (≥80%)</span>
          <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-[#f59e0b]/25 border border-[#f59e0b]/40" /> Medium</span>
          <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-[#ef4444]/25 border border-[#ef4444]/40" /> Low (&lt;50%)</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Status Distribution Donut ──────────────────────────────────

function StatusDonut({ dist }: { dist: OverviewData["statusDistribution"] }) {
  const total = dist.present + dist.absent + dist.late + dist.excused + dist.unmarked;
  if (total === 0) return null;

  const segments = [
    { label: "Present", value: dist.present, color: "#22c55e" },
    { label: "Absent", value: dist.absent, color: "#ef4444" },
    { label: "Late", value: dist.late, color: "#f59e0b" },
    { label: "Excused", value: dist.excused, color: "#8b5cf6" },
    { label: "Unmarked", value: dist.unmarked, color: "#9ca3af" },
  ].filter((s) => s.value > 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <PieChart className="size-4 text-[#A0006B]" />
          Status Distribution
        </CardTitle>
        <CardDescription className="text-xs">Overall attendance status breakdown</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-4">
        <DonutChart
          segments={segments}
          size={180}
          strokeWidth={32}
          centerLabel="Total Records"
          centerValue={total.toLocaleString()}
        />
      </CardContent>
    </Card>
  );
}

// ── Attendance by City Bar Chart ───────────────────────────────

function CityAttendanceChart({ data }: { data: OverviewData["cityAttendanceRates"] }) {
  if (data.length === 0) return null;

  const chartData = data.map((c) => ({
    label: c.cityName,
    value: Math.round(c.rate * 10) / 10,
  }));

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Building2 className="size-4 text-[#A0006B]" />
          Attendance by City
        </CardTitle>
        <CardDescription className="text-xs">Average attendance rate per city</CardDescription>
      </CardHeader>
      <CardContent>
        <BarChart
          data={chartData}
          height={180}
          barColor="#4B0A8F"
          showValues={true}
          valueFormatter={(val) => `${val}%`}
        />
      </CardContent>
    </Card>
  );
}

// ── Fee Collection by Park (Horizontal Bar Chart) ──────────────

function FeeByParkChart({ data }: { data: ParkFeeData[] }) {
  if (data.length === 0) return null;
  const maxVal = Math.max(...data.map((d) => d.totalCollected), 1);

  const formatPKR = (val: number) => {
    if (val >= 100000) return `${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toLocaleString();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Banknote className="size-4 text-[#A0006B]" />
          Fee Collection by Park
        </CardTitle>
        <CardDescription className="text-xs">Top 10 parks by total fees collected (PKR)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
          {data.map((park) => {
            const pct = (park.totalCollected / maxVal) * 100;
            return (
              <div key={park.parkId} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="min-w-0">
                    <span className="text-sm font-medium truncate block max-w-[200px]">{park.parkName}</span>
                    <span className="text-[10px] text-muted-foreground">{park.cityName}</span>
                  </div>
                  <span className="text-sm font-bold text-[#A0006B] dark:text-[#D64D9E] ml-2 tabular-nums whitespace-nowrap">
                    PKR {formatPKR(park.totalCollected)}
                  </span>
                </div>
                <div className="h-5 bg-muted rounded-md overflow-hidden">
                  <motion.div
                    className="h-full rounded-md bg-gradient-to-r from-[#A0006B] to-[#D64D9E] transition-all duration-500 group-hover:opacity-80"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── City Comparison Table & Chart ──────────────────────────────

function CityComparisonContent() {
  const { data: cities, isLoading, error } = useQuery<CityStat[]>({
    queryKey: ["reports", "city-comparison"],
    queryFn: () => fetch("/api/admin/reports?type=city-comparison").then((r) => r.json()),
  });

  if (error) return <EmptyState icon={BarChart3} title="Error loading data" description="Could not load city comparison data." />;
  if (isLoading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <SectionSkeleton key={i} />)}</div>;
  if (!cities || cities.length === 0) return <EmptyState icon={Building2} title="No data" description="No city data available for the selected period." />;

  const maxRate = Math.max(...cities.map((c) => c.avgRate), 1);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      {/* Bar Chart - desktop */}
      <motion.div variants={itemVariants}>
        <Card className="hidden md:block">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="size-4 text-[#A0006B]" />
              City Attendance Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cities.map((city) => (
                <div key={city.cityId} className="flex items-center gap-3">
                  <div className="w-28 text-sm font-medium text-right truncate">{city.name}</div>
                  <div className="flex-1 h-7 bg-muted rounded-md overflow-hidden">
                    <div
                      className={`h-full rounded-md transition-all duration-500 ${rateColor(city.avgRate)}`}
                      style={{ width: `${(city.avgRate / 100) * 100}%` }}
                    />
                  </div>
                  <div className={`w-12 text-sm font-bold text-right ${rateTextColor(city.avgRate)}`}>{city.avgRate}%</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {cities.map((city) => (
          <motion.div key={city.cityId} variants={itemVariants}>
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{city.name}</h3>
                  <span className={`text-lg font-bold ${rateTextColor(city.avgRate)}`}>{city.avgRate}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${rateColor(city.avgRate)}`}
                    style={{ width: `${(city.avgRate / 100) * 100}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Parks</p>
                    <p className="text-sm font-semibold">{city.parksCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Participants</p>
                    <p className="text-sm font-semibold">{city.totalParticipants}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Events</p>
                    <p className="text-sm font-semibold">{city.totalEvents}</p>
                  </div>
                </div>
                {city.topPark && (
                  <p className="text-[11px] text-muted-foreground">
                    Top Park: <span className="font-medium text-foreground">{city.topPark}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Table - desktop */}
      <motion.div variants={itemVariants}>
        <Card className="hidden md:block">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Detailed City Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">City</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Parks</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Participants</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Events</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Avg Rate</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Top Park</th>
                  </tr>
                </thead>
                <tbody>
                  {cities.map((city) => (
                    <tr key={city.cityId} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-2.5 px-3 font-medium">{city.name}</td>
                      <td className="py-2.5 px-3 text-center">{city.parksCount}</td>
                      <td className="py-2.5 px-3 text-center">{city.totalParticipants}</td>
                      <td className="py-2.5 px-3 text-center">{city.totalEvents}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant="outline" className={`${rateBgColor(city.avgRate)} ${rateTextColor(city.avgRate)} border-0 font-semibold`}>
                          {city.avgRate}%
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground truncate max-w-[150px]">{city.topPark || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ── Park Comparison Content ────────────────────────────────────

function ParkComparisonContent({ days }: { days: DaysPreset }) {
  const [selectedCity, setSelectedCity] = useState<string>("");

  const { data: cities } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["cities-for-reports"],
    queryFn: () => fetch("/api/admin/cities").then((r) => r.json()),
  });

  const { data: parks, isLoading, error } = useQuery<ParkStat[]>({
    queryKey: ["reports", "park-comparison", selectedCity, days],
    queryFn: () =>
      fetch(`/api/admin/reports?type=park-comparison&cityId=${selectedCity}&days=${days}`).then(
        (r) => r.json()
      ),
    enabled: !!selectedCity,
  });

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <label className="text-sm font-medium text-muted-foreground block mb-2">Select City</label>
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Choose a city..." />
              </SelectTrigger>
              <SelectContent>
                {cities?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </motion.div>

      {!selectedCity && (
        <EmptyState
          icon={TreePine}
          title="Select a City"
          description="Choose a city above to view park-level comparison."
        />
      )}

      {selectedCity && error && (
        <EmptyState icon={BarChart3} title="Error" description="Could not load park data." />
      )}

      {selectedCity && isLoading && (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <SectionSkeleton key={i} />)}</div>
      )}

      {selectedCity && !isLoading && parks && parks.length === 0 && (
        <EmptyState icon={TreePine} title="No parks" description="No parks with attendance data found." />
      )}

      {selectedCity && !isLoading && parks && parks.length > 0 && (
        <>
          {/* Bar chart - desktop */}
          <motion.div variants={itemVariants}>
            <Card className="hidden md:block">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TreePine className="size-4 text-[#A0006B]" />
                  Park Attendance Rates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {parks.map((park) => (
                    <div key={park.parkId} className="flex items-center gap-3">
                      <div className="w-32 text-sm font-medium text-right truncate">{park.name}</div>
                      <div className="flex-1 h-7 bg-muted rounded-md overflow-hidden">
                        <div
                          className={`h-full rounded-md transition-all duration-500 ${rateColor(park.avgRate)}`}
                          style={{ width: `${(park.avgRate / 100) * 100}%` }}
                        />
                      </div>
                      <div className={`w-12 text-sm font-bold text-right ${rateTextColor(park.avgRate)}`}>
                        {park.avgRate}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {parks.map((park) => (
              <motion.div key={park.parkId} variants={itemVariants}>
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">{park.name}</h3>
                      <span className={`text-lg font-bold ${rateTextColor(park.avgRate)}`}>{park.avgRate}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${rateColor(park.avgRate)}`}
                        style={{ width: `${(park.avgRate / 100) * 100}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Groups</p>
                        <p className="text-sm font-semibold">{park.groups}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Participants</p>
                        <p className="text-sm font-semibold">{park.totalParticipants}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Events</p>
                        <p className="text-sm font-semibold">{park.totalEvents}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Table - desktop */}
          <motion.div variants={itemVariants}>
            <Card className="hidden md:block">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Detailed Park Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Park</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground">Groups</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground">Participants</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground">Events</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground">Avg Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parks.map((park) => (
                        <tr key={park.parkId} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="py-2.5 px-3 font-medium">{park.name}</td>
                          <td className="py-2.5 px-3 text-center">{park.groups}</td>
                          <td className="py-2.5 px-3 text-center">{park.totalParticipants}</td>
                          <td className="py-2.5 px-3 text-center">{park.totalEvents}</td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge variant="outline" className={`${rateBgColor(park.avgRate)} ${rateTextColor(park.avgRate)} border-0 font-semibold`}>
                              {park.avgRate}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

// ── Weekly Trend Content ───────────────────────────────────────

function WeeklyTrendContent() {
  const { data: weeks, isLoading, error } = useQuery<WeekTrend[]>({
    queryKey: ["reports", "trend"],
    queryFn: () => fetch("/api/admin/reports?type=trend").then((r) => r.json()),
  });

  if (error) return <EmptyState icon={BarChart3} title="Error loading data" description="Could not load trend data." />;
  if (isLoading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <SectionSkeleton key={i} />)}</div>;
  if (!weeks || weeks.length === 0) return <EmptyState icon={TrendingUp} title="No data" description="No weekly trend data available." />;

  const maxRate = Math.max(...weeks.map((w) => w.rate), 1);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      {/* CSS Line chart */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="size-4 text-[#A0006B]" />
              Weekly Attendance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Area chart using SVG for the line, pure CSS for bars */}
            <div className="space-y-4">
              {/* Bar representation */}
              <div className="flex items-end gap-2 h-48">
                {weeks.map((w) => {
                  const h = Math.max((w.rate / 100) * 100, 2);
                  return (
                    <div
                      key={w.weekStart}
                      className="flex-1 group relative"
                      title={`Week of ${format(parseISO(w.weekStart), "dd MMM yyyy")}: ${w.rate}%`}
                    >
                      <div
                        className={`w-full rounded-t-md transition-all duration-300 hover:opacity-80 ${rateColor(w.rate)}`}
                        style={{ height: `${h}%` }}
                      />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                        <div className="bg-popover text-popover-foreground text-[10px] px-1.5 py-0.5 rounded shadow-md border whitespace-nowrap">
                          {w.rate}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* X-axis labels */}
              <div className="flex justify-between text-[10px] text-muted-foreground">
                {weeks.length > 0 && (
                  <>
                    <span>{format(parseISO(weeks[0].weekStart), "dd MMM")}</span>
                    <span>{format(parseISO(weeks[weeks.length - 1].weekStart), "dd MMM")}</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Data table */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Weekly Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Week Starting</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Attendance Rate</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Events</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Records</th>
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((w) => (
                    <tr key={w.weekStart} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-2.5 px-3 font-medium">{format(parseISO(w.weekStart), "dd MMM yyyy")}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant="outline" className={`${rateBgColor(w.rate)} ${rateTextColor(w.rate)} border-0 font-semibold`}>
                          {w.rate}%
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">{w.events}</td>
                      <td className="py-2.5 px-3 text-center">{w.records.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ── Attendance Overview Content ────────────────────────────────

function OverviewContent({ days }: { days: DaysPreset }) {
  const { data, isLoading, error } = useQuery<OverviewData>({
    queryKey: ["reports", "attendance-overview", days],
    queryFn: () => fetch(`/api/admin/reports?type=attendance-overview&days=${days}`).then((r) => r.json()),
  });

  const { data: parkFees, isLoading: feesLoading } = useQuery<ParkFeeData[]>({
    queryKey: ["reports", "fee-by-park"],
    queryFn: () => fetch("/api/admin/reports?type=fee-by-park").then((r) => r.json()),
  });

  const formatPKR = (val: number) => {
    if (val >= 10000000) return `PKR ${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `PKR ${(val / 100000).toFixed(1)} L`;
    if (val >= 1000) return `PKR ${(val / 1000).toFixed(1)} K`;
    return `PKR ${val.toLocaleString()}`;
  };

  if (error) return <EmptyState icon={BarChart3} title="Error loading data" description="Could not load attendance overview." />;
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SectionSkeleton />
          <SectionSkeleton />
        </div>
        <SectionSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SectionSkeleton />
          <SectionSkeleton />
        </div>
      </div>
    );
  }
  if (!data) return <EmptyState icon={BarChart3} title="No data" description="No attendance data available for the selected period." />;

  const cityRates = data.cityAttendanceRates || [];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      {/* Quick Stats Row — 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard icon={CalendarDays} label="Total Events" value={data.totalEvents} sub="in selected period" color="text-[#4B0A8F] dark:text-[#8A40B0]" />
        <StatCard icon={TrendingUp} label="Avg Attendance Rate" value={`${data.overallRate}%`} sub={`${data.totalRecords.toLocaleString()} records`}>
          {/* Mini sparkline from daily rates */}
          {data.dailyRates.length > 1 && (
            <div className="mt-2 flex items-end gap-[2px] h-5">
              {data.dailyRates.slice(-14).map((d) => {
                const h = Math.max((d.rate / 100) * 100, 4);
                return (
                  <div
                    key={d.date}
                    className="flex-1 min-w-0 rounded-t-sm opacity-60"
                    style={{
                      height: `${h}%`,
                      backgroundColor: d.rate >= 70 ? "#22c55e" : d.rate >= 40 ? "#f59e0b" : "#ef4444",
                    }}
                  />
                );
              })}
            </div>
          )}
        </StatCard>
        <StatCard icon={Users} label="Active Participants" value={data.activeParticipants} sub="across all groups" color="text-[#A0006B] dark:text-[#D64D9E]" />
        <StatCard icon={Coins} label="Total Fee Collected" value={formatPKR(data.totalFeesCollected || 0)} sub="in selected period" color="text-[#A0006B] dark:text-[#D64D9E]" />
      </div>

      {/* 2-col: Daily Trend + Day-of-Week Heatmap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.dailyRates.length > 0 ? (
          <motion.div variants={itemVariants}>
            <DailyBarChart data={data.dailyRates} />
          </motion.div>
        ) : (
          <motion.div variants={itemVariants}>
            <EmptyState icon={BarChart3} title="No daily data" description="No attendance events found in the selected period." />
          </motion.div>
        )}

        {data.dayOfWeekBreakdown.length > 0 ? (
          <motion.div variants={itemVariants}>
            <DayOfWeekHeatmap data={data.dayOfWeekBreakdown} />
          </motion.div>
        ) : (
          <SectionSkeleton />
        )}
      </div>

      {/* 2-col: City Attendance BarChart + Status Distribution Donut */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cityRates.length > 0 ? (
          <motion.div variants={itemVariants}>
            <CityAttendanceChart data={cityRates} />
          </motion.div>
        ) : (
          <SectionSkeleton />
        )}

        <motion.div variants={itemVariants}>
          <StatusDonut dist={data.statusDistribution} />
        </motion.div>
      </div>

      {/* Fee Collection by Park — full width */}
      {feesLoading ? (
        <SectionSkeleton />
      ) : parkFees && parkFees.length > 0 ? (
        <motion.div variants={itemVariants}>
          <FeeByParkChart data={parkFees} />
        </motion.div>
      ) : null}

      {/* Status Distribution Bar (legacy — kept as supplementary) */}
      <motion.div variants={itemVariants}>
        <StatusDistribution dist={data.statusDistribution} />
      </motion.div>
    </motion.div>
  );
}

// ── Main Reports Page ──────────────────────────────────────────

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportType>("attendance-overview");
  const [days, setDays] = useState<DaysPreset>(30);

  const handleTabChange = useCallback((val: string) => {
    setActiveTab(val as ReportType);
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive attendance analytics and city/park comparison insights."
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="attendance-overview" className="text-xs sm:text-sm">
            <BarChart3 className="size-3.5 sm:size-4 mr-1.5 hidden sm:inline-block" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="city-comparison" className="text-xs sm:text-sm">
            <Building2 className="size-3.5 sm:size-4 mr-1.5 hidden sm:inline-block" />
            Cities
          </TabsTrigger>
          <TabsTrigger value="park-comparison" className="text-xs sm:text-sm">
            <TreePine className="size-3.5 sm:size-4 mr-1.5 hidden sm:inline-block" />
            Parks
          </TabsTrigger>
          <TabsTrigger value="trend" className="text-xs sm:text-sm">
            <TrendingUp className="size-3.5 sm:size-4 mr-1.5 hidden sm:inline-block" />
            Trend
          </TabsTrigger>
        </TabsList>

        {/* Filter bar */}
        <Card className="mb-4">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground mr-1">
                <CalendarDays className="size-3.5 inline-block mr-1" />
                Period:
              </span>
              {DAYS_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={days === preset.value ? "default" : "outline"}
                  size="sm"
                  className={`h-7 text-xs ${
                    days === preset.value
                      ? "bg-[#4B0A8F] hover:bg-[#3A0870] text-white"
                      : "hover:bg-[#F3ECF6] dark:hover:bg-[#1F086080]"
                  }`}
                  onClick={() => setDays(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <TabsContent value="attendance-overview" className="mt-0">
              <OverviewContent days={days} />
            </TabsContent>

            <TabsContent value="city-comparison" className="mt-0">
              <CityComparisonContent />
            </TabsContent>

            <TabsContent value="park-comparison" className="mt-0">
              <ParkComparisonContent days={days} />
            </TabsContent>

            <TabsContent value="trend" className="mt-0">
              <WeeklyTrendContent />
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}