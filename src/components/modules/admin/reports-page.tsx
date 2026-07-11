"use client";

import { useState, useCallback, useMemo } from "react";
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
import { ExportButton } from "@/components/shared/export-button";
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
  Printer,
  Loader2,
  UserCheck,
  UserPlus,
  MapPin,
  AlertTriangle,
  Clock,
  Target,
  ShieldX,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import {
  AttendanceReportPrint,
  type AttendanceReportData,
} from "@/components/shared/attendance-report-print";

// ── Types ──────────────────────────────────────────────────────

type ReportType = "attendance-overview" | "city-comparison" | "park-comparison" | "trend" | "printable-report" | "fee-collection" | "registration" | "staff";
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

interface FeeReportSummary {
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  previousPeriod: number;
  changePercent: number;
}

interface FeeReportData {
  summary: FeeReportSummary;
  groupedBy: string;
  data: Array<{ label: string; value: number; key?: string; count?: number }>;
  currency: string;
}

interface RegistrationData {
  monthlyRegistrations: Array<{ label: string; value: number }>;
  genderDistribution: Array<{ gender: string; count: number }>;
  stateDistribution: Array<{ state: string; count: number }>;
  cityDistribution: Array<{ cityId: string; cityName: string; count: number }>;
  totalParticipants: number;
}

interface StaffReportData {
  staffByRole: Array<{ role: string; count: number }>;
  staffGrowth: Array<{ label: string; value: number }>;
  assignmentCoverage: { totalParks: number; parksWithStaff: number; coveragePercent: number };
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
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

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  program_admin: "Program Admin",
  city_head: "City Head",
  park_admin: "Park Admin",
  park_lead: "Park Lead",
  murabbi: "Murabbi",
  guardian: "Guardian",
};

const ROLE_CHART_COLORS = [
  "#4B0A8F", "#A0006B", "#6B20A0", "#8A40B0", "#2A0C8F", "#E0002A", "#6B5A7A",
];

const FEE_METHOD_COLORS = ["#4B0A8F", "#A0006B", "#22c55e", "#f59e0b"];
const FEE_TYPE_COLORS = ["#4B0A8F", "#A0006B", "#6B20A0"];
const GENDER_COLORS: Record<string, string> = { male: "#4B0A8F", female: "#A0006B", unknown: "#9ca3af" };
const STATE_COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#6b7280"];

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

function formatPKR(val: number): string {
  if (val >= 10000000) return `PKR ${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `PKR ${(val / 100000).toFixed(1)} L`;
  if (val >= 1000) return `PKR ${(val / 1000).toFixed(1)} K`;
  return `PKR ${val.toLocaleString()}`;
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
  const dowMap = new Map(data.map((d) => [d.dayIndex, d]));
  const maxRate = Math.max(...data.map((d) => d.avgRate), 1);

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

  const formatPKRShort = (val: number) => {
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
                    PKR {formatPKRShort(park.totalCollected)}
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
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="size-4 text-[#A0006B]" />
              City Attendance Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cities.map((city) => (
                <div key={city.cityId} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-sm font-medium">{city.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{city.parksCount} parks · {city.totalParticipants} participants</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${rateTextColor(city.avgRate)}`}>{city.avgRate}%</span>
                      {city.topPark && <span className="text-[10px] text-muted-foreground hidden sm:inline">Top: {city.topPark}</span>}
                    </div>
                  </div>
                  <div className="h-6 bg-muted rounded-md overflow-hidden">
                    <div
                      className={`h-full rounded-md transition-all duration-500 ${rateColor(city.avgRate)} group-hover:opacity-80`}
                      style={{ width: `${(city.avgRate / 100) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ── Park Comparison Content ────────────────────────────────────

function ParkComparisonContent({ days }: { days: DaysPreset }) {
  const [selectedCity, setSelectedCity] = useState("");
  const { data: cities } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ["cities-for-park-comparison"],
    queryFn: () => fetch("/api/admin/cities").then((r) => r.json()),
  });

  const { data: parks, isLoading, error } = useQuery<ParkStat[]>({
    queryKey: ["reports", "park-comparison", selectedCity, days],
    queryFn: () => fetch(`/api/admin/reports?type=park-comparison&cityId=${selectedCity}&days=${days}`).then((r) => r.json()),
    enabled: !!selectedCity,
  });

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground shrink-0">
                <Building2 className="size-3.5 inline-block mr-1" />
                Select City:
              </span>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue placeholder="Choose a city..." />
                </SelectTrigger>
                <SelectContent>
                  {cities?.data?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {!selectedCity && (
        <EmptyState icon={TreePine} title="Select a city" description="Choose a city above to view park-level attendance comparison." />
      )}

      {isLoading && selectedCity && (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <SectionSkeleton key={i} />)}</div>
      )}

      {error && <EmptyState icon={BarChart3} title="Error" description="Could not load park comparison data." />}

      {selectedCity && !isLoading && parks && parks.length === 0 && (
        <EmptyState icon={TreePine} title="No parks" description="No parks with attendance data found." />
      )}

      {selectedCity && !isLoading && parks && parks.length > 0 && (
        <>
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

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="size-4 text-[#A0006B]" />
              Weekly Attendance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard icon={CalendarDays} label="Total Events" value={data.totalEvents} sub="in selected period" color="text-[#4B0A8F] dark:text-[#8A40B0]" />
        <StatCard icon={TrendingUp} label="Avg Attendance Rate" value={`${data.overallRate}%`} sub={`${data.totalRecords.toLocaleString()} records`}>
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

      {feesLoading ? (
        <SectionSkeleton />
      ) : parkFees && parkFees.length > 0 ? (
        <motion.div variants={itemVariants}>
          <FeeByParkChart data={parkFees} />
        </motion.div>
      ) : null}

      <motion.div variants={itemVariants}>
        <StatusDistribution dist={data.statusDistribution} />
      </motion.div>
    </motion.div>
  );
}

// ── Printable Attendance Report Tab ────────────────────────────

function PrintableReportTab() {
  const [cityId, setCityId] = useState("");
  const [parkId, setParkId] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [reportData, setReportData] = useState<AttendanceReportData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const { data: cities } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ["cities-for-print-report"],
    queryFn: () => fetch("/api/admin/cities").then((r) => r.json()),
  });

  const { data: parks } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ["parks-for-print-report", cityId],
    queryFn: () =>
      fetch(`/api/admin/parks${cityId ? `?cityId=${cityId}` : ""}`).then((r) => r.json()),
  });

  async function generateReport() {
    setPrintOpen(true);
    setReportLoading(true);
    setReportData(null);
    try {
      const params = new URLSearchParams();
      if (cityId) params.set("cityId", cityId);
      if (parkId) params.set("parkId", parkId);
      if (dateFrom) params.set("from", format(dateFrom, "yyyy-MM-dd"));
      if (dateTo) params.set("to", format(dateTo, "yyyy-MM-dd"));
      const res = await fetch(`/api/admin/reports/attendance-report?${params}`);
      if (res.ok) {
        const json = await res.json();
        setReportData(json);
      }
    } catch {
      /* silently fail */
    } finally {
      setReportLoading(false);
    }
  }

  const hasFilters = cityId || parkId || dateFrom || dateTo;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardCheck className="size-4 text-[#A0006B]" />
              Attendance Report Generator
            </CardTitle>
            <CardDescription className="text-xs">
              Select filters and generate a printable attendance report with detailed records.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">City</label>
                <Select value={cityId} onValueChange={(v) => { setCityId(v); setParkId(""); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities?.data?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Park</label>
                <Select value={parkId} onValueChange={setParkId} disabled={!cityId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Parks" />
                  </SelectTrigger>
                  <SelectContent>
                    {parks?.data?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">From</label>
                <Popover open={fromOpen} onOpenChange={setFromOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarDays className="size-3.5 mr-2 text-muted-foreground" />
                      {dateFrom ? format(dateFrom, "dd MMM yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarUI
                      mode="single"
                      selected={dateFrom}
                      onSelect={(d) => { setDateFrom(d); setFromOpen(false); }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">To</label>
                <Popover open={toOpen} onOpenChange={setToOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarDays className="size-3.5 mr-2 text-muted-foreground" />
                      {dateTo ? format(dateTo, "dd MMM yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarUI
                      mode="single"
                      selected={dateTo}
                      onSelect={(d) => { setDateTo(d); setToOpen(false); }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                {hasFilters ? "Filters applied" : "Showing all data"}
              </p>
              <Button
                onClick={generateReport}
                className="bg-[#4B0A8F] hover:bg-[#3A0870] text-white gap-2"
              >
                <Printer className="size-4" />
                Generate &amp; Print
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={printOpen} onOpenChange={(v) => { if (!v) setPrintOpen(false); }}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto p-0">
          {reportLoading && (
            <div className="flex items-center justify-center py-20 gap-3">
              <Loader2 className="size-5 animate-spin text-[#4B0A8F]" />
              <span className="text-sm text-muted-foreground">Generating report...</span>
            </div>
          )}
          {!reportLoading && reportData && (
            <AttendanceReportPrint
              report={reportData}
              onClose={() => setPrintOpen(false)}
            />
          )}
          {!reportLoading && !reportData && (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-muted-foreground">Failed to load report data.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════
// NEW TAB: Fee Collection Report
// ══════════════════════════════════════════════════════════════

function FeeCollectionTab() {
  const [groupBy, setGroupBy] = useState<string>("month");

  const { data: monthData, isLoading: monthLoading } = useQuery<FeeReportData>({
    queryKey: ["fee-report", "month"],
    queryFn: () => fetch("/api/admin/reports/fee-report?groupBy=month").then((r) => r.json()),
  });

  const { data: methodData, isLoading: methodLoading } = useQuery<FeeReportData>({
    queryKey: ["fee-report", "method"],
    queryFn: () => fetch("/api/admin/reports/fee-report?groupBy=method").then((r) => r.json()),
  });

  const { data: typeData, isLoading: typeLoading } = useQuery<FeeReportData>({
    queryKey: ["fee-report", "type"],
    queryFn: () => fetch("/api/admin/reports/fee-report?groupBy=type").then((r) => r.json()),
  });

  const summary = monthData?.summary;
  const isLoading = monthLoading || methodLoading || typeLoading;

  // Export data for CSV
  const monthlyExportData = useMemo(() =>
    (monthData?.data ?? []).map(d => ({ Month: d.label, Collected: d.value, Transactions: d.count || 0 })),
    [monthData],
  );

  const methodExportData = useMemo(() =>
    (methodData?.data ?? []).map(d => ({ Method: d.label, Amount: d.value })),
    [methodData],
  );

  const typeExportData = useMemo(() =>
    (typeData?.data ?? []).map(d => ({ "Fee Type": d.label, Amount: d.value })),
    [typeData],
  );

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
      </div>
    );
  }

  const methodSegments = (methodData?.data ?? []).map((d, i) => ({
    label: d.label,
    value: d.value,
    color: FEE_METHOD_COLORS[i % FEE_METHOD_COLORS.length],
  }));

  const typeSegments = (typeData?.data ?? []).map((d, i) => ({
    label: d.label,
    value: d.value,
    color: FEE_TYPE_COLORS[i % FEE_TYPE_COLORS.length],
  }));

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={Coins}
          label="Total Collected"
          value={formatPKR(summary?.totalCollected || 0)}
          sub={summary?.changePercent !== undefined ? `${summary.changePercent >= 0 ? "+" : ""}${summary.changePercent}% vs prev period` : undefined}
          color="text-[#22c55e]"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={formatPKR(summary?.totalPending || 0)}
          color="text-[#f59e0b]"
        />
        <StatCard
          icon={AlertTriangle}
          label="Overdue"
          value={formatPKR(summary?.totalOverdue || 0)}
          color="text-[#ef4444]"
        />
        <StatCard
          icon={TrendingUp}
          label="Previous Period"
          value={formatPKR(summary?.previousPeriod || 0)}
          color="text-[#6B20A0]"
        />
      </div>

      {/* Monthly Collection Trend */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="size-4 text-[#A0006B]" />
                Monthly Collection Trend
              </CardTitle>
              <CardDescription className="text-xs mt-1">Fee collection amount per month</CardDescription>
            </div>
            <ExportButton
              data={monthlyExportData}
              filename="fee-collection-monthly"
              columns={[{ key: "Month", header: "Month" }, { key: "Collected", header: "Collected (PKR)" }, { key: "Transactions", header: "Transactions" }]}
              className="ml-2"
            />
          </CardHeader>
          <CardContent>
            <BarChart
              data={(monthData?.data ?? []).map(d => ({ label: d.label, value: d.value }))}
              height={200}
              barColor="#A0006B"
              showValues={false}
              valueFormatter={(v) => formatPKR(v)}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Payment Method & Fee Type donuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PieChart className="size-4 text-[#A0006B]" />
                  Payment Method
                </CardTitle>
                <CardDescription className="text-xs mt-1">Breakdown by collection method</CardDescription>
              </div>
              <ExportButton
                data={methodExportData}
                filename="fee-collection-by-method"
                columns={[{ key: "Method", header: "Method" }, { key: "Amount", header: "Amount (PKR)" }]}
              />
            </CardHeader>
            <CardContent className="flex items-center justify-center py-4">
              {methodSegments.length > 0 ? (
                <DonutChart
                  segments={methodSegments}
                  size={180}
                  strokeWidth={32}
                  centerLabel="Methods"
                  centerValue={String(methodSegments.length)}
                />
              ) : (
                <EmptyState icon={PieChart} title="No data" description="No payment method data." />
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Banknote className="size-4 text-[#A0006B]" />
                  Fee Type Breakdown
                </CardTitle>
                <CardDescription className="text-xs mt-1">By tuition, admission, and other fees</CardDescription>
              </div>
              <ExportButton
                data={typeExportData}
                filename="fee-collection-by-type"
                columns={[{ key: "Fee Type", header: "Fee Type" }, { key: "Amount", header: "Amount (PKR)" }]}
              />
            </CardHeader>
            <CardContent className="flex items-center justify-center py-4">
              {typeSegments.length > 0 ? (
                <DonutChart
                  segments={typeSegments}
                  size={180}
                  strokeWidth={32}
                  centerLabel="Types"
                  centerValue={String(typeSegments.length)}
                />
              ) : (
                <EmptyState icon={Banknote} title="No data" description="No fee type data." />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════
// NEW TAB: Registration Report
// ══════════════════════════════════════════════════════════════

function RegistrationTab() {
  const { data, isLoading, error } = useQuery<RegistrationData>({
    queryKey: ["reports", "registration-report"],
    queryFn: () => fetch("/api/admin/reports?type=registration-report").then((r) => r.json()),
  });

  const exportData = useMemo(() =>
    data?.cityDistribution.map(c => ({ City: c.cityName, Participants: c.count })) ?? [],
    [data],
  );

  const stateExportData = useMemo(() =>
    data?.stateDistribution.map(s => ({ State: s.state, Count: s.count })) ?? [],
    [data],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SectionSkeleton />
          <SectionSkeleton />
        </div>
        <SectionSkeleton />
      </div>
    );
  }
  if (error) return <EmptyState icon={BarChart3} title="Error" description="Could not load registration data." />;
  if (!data) return <EmptyState icon={UserPlus} title="No data" description="No registration data available." />;

  const genderSegments = data.genderDistribution.map((g) => ({
    label: g.gender.charAt(0).toUpperCase() + g.gender.slice(1),
    value: g.count,
    color: GENDER_COLORS[g.gender] || "#9ca3af",
  }));

  const stateSegments = data.stateDistribution.map((s, i) => ({
    label: s.state.charAt(0).toUpperCase() + s.state.slice(1),
    value: s.count,
    color: STATE_COLORS[i % STATE_COLORS.length],
  }));

  const cityChartData = data.cityDistribution.map((c) => ({
    label: c.cityName,
    value: c.count,
  }));

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      {/* Summary */}
      <motion.div variants={itemVariants}>
        <StatCard
          icon={UserPlus}
          label="Total Registrations (12mo)"
          value={data.totalParticipants}
          color="text-[#4B0A8F] dark:text-[#8A40B0]"
        />
      </motion.div>

      {/* Monthly registrations bar chart */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="size-4 text-[#A0006B]" />
              New Registrations Per Month
            </CardTitle>
            <CardDescription className="text-xs">Monthly participant registration trend</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              data={data.monthlyRegistrations}
              height={200}
              barColor="#6B20A0"
              showValues={true}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Gender & State donuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="size-4 text-[#A0006B]" />
                Gender Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-4">
              {genderSegments.length > 0 ? (
                <DonutChart
                  segments={genderSegments}
                  size={180}
                  strokeWidth={32}
                  centerLabel="Total"
                  centerValue={String(data.totalParticipants)}
                />
              ) : (
                <EmptyState icon={Users} title="No data" description="No gender data." />
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="size-4 text-[#A0006B]" />
                  State Distribution
                </CardTitle>
              </div>
              <ExportButton
                data={stateExportData}
                filename="registration-by-state"
                columns={[{ key: "State", header: "State" }, { key: "Count", header: "Count" }]}
              />
            </CardHeader>
            <CardContent className="flex items-center justify-center py-4">
              {stateSegments.length > 0 ? (
                <DonutChart
                  segments={stateSegments}
                  size={180}
                  strokeWidth={32}
                  centerLabel="States"
                  centerValue={String(stateSegments.length)}
                />
              ) : (
                <EmptyState icon={Activity} title="No data" description="No state data." />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* City-wise distribution */}
      {cityChartData.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="size-4 text-[#A0006B]" />
                  City-wise Distribution
                </CardTitle>
                <CardDescription className="text-xs mt-1">Registrations per city</CardDescription>
              </div>
              <ExportButton
                data={exportData}
                filename="registration-by-city"
                columns={[{ key: "City", header: "City" }, { key: "Participants", header: "Participants" }]}
              />
            </CardHeader>
            <CardContent>
              <BarChart
                data={cityChartData}
                height={200}
                barColor="#4B0A8F"
                showValues={true}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════
// NEW TAB: Staff Report
// ══════════════════════════════════════════════════════════════

function StaffReportTab() {
  const { data, isLoading, error } = useQuery<StaffReportData>({
    queryKey: ["reports", "staff-report"],
    queryFn: () => fetch("/api/admin/reports?type=staff-report").then((r) => r.json()),
  });

  const exportData = useMemo(() =>
    data?.staffByRole.map(r => ({ Role: ROLE_LABELS[r.role] || r.role, Count: r.count })) ?? [],
    [data],
  );

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
      </div>
    );
  }
  if (error) return <EmptyState icon={BarChart3} title="Error" description="Could not load staff report data." />;
  if (!data) return <EmptyState icon={UserCheck} title="No data" description="No staff data available." />;

  const roleSegments = data.staffByRole.map((r, i) => ({
    label: ROLE_LABELS[r.role] || r.role,
    value: r.count,
    color: ROLE_CHART_COLORS[i % ROLE_CHART_COLORS.length],
  }));

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard icon={Users} label="Total Staff" value={data.totalStaff} color="text-[#4B0A8F] dark:text-[#8A40B0]" />
        <StatCard icon={UserCheck} label="Active Staff" value={data.activeStaff} color="text-[#22c55e]" />
        <StatCard icon={ShieldX} label="Inactive Staff" value={data.inactiveStaff} color="text-[#ef4444]" />
        <StatCard
          icon={Target}
          label="Park Coverage"
          value={`${data.assignmentCoverage.coveragePercent}%`}
          sub={`${data.assignmentCoverage.parksWithStaff}/${data.assignmentCoverage.totalParks} parks`}
          color="text-[#A0006B] dark:text-[#D64D9E]"
        />
      </div>

      {/* Role breakdown & Growth */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PieChart className="size-4 text-[#A0006B]" />
                  Staff by Role
                </CardTitle>
                <CardDescription className="text-xs mt-1">Role distribution</CardDescription>
              </div>
              <ExportButton
                data={exportData}
                filename="staff-by-role"
                columns={[{ key: "Role", header: "Role" }, { key: "Count", header: "Count" }]}
              />
            </CardHeader>
            <CardContent className="flex items-center justify-center py-4">
              {roleSegments.length > 0 ? (
                <DonutChart
                  segments={roleSegments}
                  size={180}
                  strokeWidth={32}
                  centerLabel="Roles"
                  centerValue={String(roleSegments.length)}
                />
              ) : (
                <EmptyState icon={Users} title="No data" description="No staff role data." />
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="size-4 text-[#A0006B]" />
                Staff Growth Over Time
              </CardTitle>
              <CardDescription className="text-xs">New staff added per month</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChart
                data={data.staffGrowth}
                height={200}
                barColor="#6B20A0"
                showValues={true}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Assignment coverage card */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="size-4 text-[#A0006B]" />
              Assignment Coverage
            </CardTitle>
            <CardDescription className="text-xs">How many parks have active staff assigned</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{data.assignmentCoverage.parksWithStaff} of {data.assignmentCoverage.totalParks} parks</span>
                  <span className={`text-sm font-bold ${data.assignmentCoverage.coveragePercent >= 80 ? "text-[#22c55e]" : data.assignmentCoverage.coveragePercent >= 50 ? "text-[#f59e0b]" : "text-[#ef4444]"}`}>
                    {data.assignmentCoverage.coveragePercent}%
                  </span>
                </div>
                <div className="h-6 bg-muted rounded-md overflow-hidden">
                  <motion.div
                    className={`h-full rounded-md transition-all duration-500 ${
                      data.assignmentCoverage.coveragePercent >= 80 ? "bg-[#22c55e]" :
                      data.assignmentCoverage.coveragePercent >= 50 ? "bg-[#f59e0b]" : "bg-[#ef4444]"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${data.assignmentCoverage.coveragePercent}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                {data.assignmentCoverage.parksWithStaff < data.assignmentCoverage.totalParks && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {data.assignmentCoverage.totalParks - data.assignmentCoverage.parksWithStaff} parks without active staff assignments
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
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
        description="Comprehensive attendance analytics and organization-wide insights."
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-8 mb-4">
          <TabsTrigger value="attendance-overview" className="text-[10px] sm:text-sm">
            <BarChart3 className="size-3.5 sm:size-4 mr-1 hidden sm:inline-block" />
            <span className="hidden md:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="fee-collection" className="text-[10px] sm:text-sm">
            <Banknote className="size-3.5 sm:size-4 mr-1 hidden sm:inline-block" />
            <span className="hidden md:inline">Fees</span>
          </TabsTrigger>
          <TabsTrigger value="registration" className="text-[10px] sm:text-sm">
            <UserPlus className="size-3.5 sm:size-4 mr-1 hidden sm:inline-block" />
            <span className="hidden md:inline">Registration</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="text-[10px] sm:text-sm">
            <UserCheck className="size-3.5 sm:size-4 mr-1 hidden sm:inline-block" />
            <span className="hidden md:inline">Staff</span>
          </TabsTrigger>
          <TabsTrigger value="city-comparison" className="text-[10px] sm:text-sm">
            <Building2 className="size-3.5 sm:size-4 mr-1 hidden sm:inline-block" />
            <span className="hidden md:inline">Cities</span>
          </TabsTrigger>
          <TabsTrigger value="park-comparison" className="text-[10px] sm:text-sm">
            <TreePine className="size-3.5 sm:size-4 mr-1 hidden sm:inline-block" />
            <span className="hidden md:inline">Parks</span>
          </TabsTrigger>
          <TabsTrigger value="trend" className="text-[10px] sm:text-sm">
            <TrendingUp className="size-3.5 sm:size-4 mr-1 hidden sm:inline-block" />
            <span className="hidden md:inline">Trend</span>
          </TabsTrigger>
          <TabsTrigger value="printable-report" className="text-[10px] sm:text-sm">
            <Printer className="size-3.5 sm:size-4 mr-1 hidden sm:inline-block" />
            <span className="hidden md:inline">Report</span>
          </TabsTrigger>
        </TabsList>

        {/* Filter bar — only for attendance-related tabs */}
        {["attendance-overview", "city-comparison", "park-comparison", "trend"].includes(activeTab) && (
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
        )}

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

            <TabsContent value="fee-collection" className="mt-0">
              <FeeCollectionTab />
            </TabsContent>

            <TabsContent value="registration" className="mt-0">
              <RegistrationTab />
            </TabsContent>

            <TabsContent value="staff" className="mt-0">
              <StaffReportTab />
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

            <TabsContent value="printable-report" className="mt-0">
              <PrintableReportTab />
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}

