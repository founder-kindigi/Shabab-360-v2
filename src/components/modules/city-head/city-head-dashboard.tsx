"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { motion, type Variants } from "framer-motion";
import { DataCard } from "@/components/layout/data-card";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AttendanceChart } from "@/components/shared/attendance-chart";
import { BarChart } from "@/components/shared/bar-chart";
import { ActivityFeed } from "@/components/shared/activity-feed";
import { toPKT, formatPKT } from "@/lib/timezone";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  TreePine,
  CalendarCheck,
  Users,
  TrendingUp,
  Layers,
  MapPin,
  Building2,
  Activity,
  Plus,
  Pencil,
  Trash2,
  Lock,
  BarChart3,
  CircleDot,
  ChevronRight,
  Wallet,
  Eye,
  ClipboardList,
  UserCog,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

type TrendPoint = { date: string; present: number; late: number; absent: number };

type DashboardData = {
  city: { id: string; name: string; code: string };
  metrics: {
    parkCount: number;
    batchCount: number;
    groupCount: number;
    totalParticipants: number;
    totalStaff: number;
    attendanceRate7Day: number;
    todayAttendanceRate: number;
  };
  todayDate: string;
  todayEvents: Array<{
    id: string;
    title: string;
    groupName: string;
    parkName: string;
    isClosed: boolean;
    participantCount: number;
    markedCount: number;
    progress: number;
    closedAt: string | null;
    closedByName: string | null;
  }>;
  parkBreakdown: Array<{
    id: string;
    name: string;
    participants: number;
    groups: number;
    sevenDayRate: number;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    userName: string;
    createdAt: string;
  }>;
  trend14Day: TrendPoint[];
  feesOverview: {
    totalCollectedThisMonth: number;
    totalPendingFees: number;
  };
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

function progressColor(pct: number) {
  if (pct >= 80) return "bg-[#4B0A8F]";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function progressTextColor(pct: number) {
  if (pct >= 80) return "text-[#4B0A8F] dark:text-[#8A40B0]";
  if (pct >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getGreeting(): string {
  const hour = toPKT(new Date()).getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatPKTDate(): string {
  const d = toPKT(new Date());
  return d.toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── Component ───────────────────────────────────────────────────────────────

export function CityHeadDashboard() {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();
  const userName = session?.user?.name || "City Head";

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["city-head-dashboard"],
    queryFn: () =>
      fetch("/api/city-head/dashboard").then((r) => {
        if (!r.ok) throw new Error("Failed to load dashboard");
        return r.json();
      }),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  // ── Error State ──
  if (error || !data) {
    return (
      <EmptyState
        icon={Building2}
        title="Could not load dashboard"
        description="There was an error loading city data. Please try again."
      />
    );
  }

  const { city, metrics, todayEvents, parkBreakdown, trend14Day, feesOverview } =
    data;

  // Bar chart data for park comparison
  const parkChartData = parkBreakdown.map((p) => ({
    label: p.name,
    value: p.sevenDayRate,
  }));

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── 1. Greeting Banner ── */}
      <motion.div variants={fadeUp}>
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#2A0C8F] via-[#A0006B] to-[#FF0015] px-5 py-5 md:px-6 md:py-6 text-white shadow-lg">
          <div className="absolute -top-6 -right-6 size-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -right-4 size-16 rounded-full bg-white/5" />
          <div className="absolute top-1/2 -right-10 size-20 rounded-full bg-white/5" />

          <div className="relative">
            <p className="text-white/80 text-sm font-medium">
              Assalamu Alaikum, {userName}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1">
              {city.name}
            </h1>
            <div className="flex items-center gap-1.5 mt-1.5 text-white/70 text-sm">
              <MapPin className="size-3.5" />
              <span>City Head Dashboard</span>
              <span className="mx-1">&middot;</span>
              <Badge className="bg-white/20 text-white border-0 text-[10px] hover:bg-white/25">
                {city.code}
              </Badge>
            </div>
            <p className="text-white/50 text-xs mt-2">
              {formatPKTDate()}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── 2. Metric Cards (2x2) ── */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 sm:gap-4">
        <DataCard
          title="Total Parks"
          value={metrics.parkCount}
          icon={TreePine}
          variant="brand"
        />
        <DataCard
          title="Total Shabab"
          value={metrics.totalParticipants}
          icon={Users}
          variant="violet"
        />
        <DataCard
          title="Active Batches"
          value={metrics.batchCount}
          icon={Layers}
          variant="sky"
        />
        <DataCard
          title="Today's Attendance"
          value={`${metrics.todayAttendanceRate}%`}
          icon={CalendarCheck}
          variant={
            metrics.todayAttendanceRate >= 80
              ? "brand"
              : metrics.todayAttendanceRate >= 50
                ? "amber"
                : "rose"
          }
        />
      </motion.div>

      {/* ── 3. Quick Actions ── */}
      <motion.div variants={fadeUp} className="space-y-3">
        <h3 className="text-sm font-semibold">Quick Actions</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          <Card
            className="cursor-pointer overflow-hidden border-border hover:border-[#D4B8E3] dark:hover:border-[#2A0C8F99] transition-colors"
            onClick={() => navigateTo("admin-parks")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086099] shrink-0">
                <Eye className="size-4.5 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">View All Parks</p>
                <p className="text-[10px] text-muted-foreground">
                  {parkBreakdown.length} parks in your city
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer overflow-hidden border-border hover:border-[#D4B8E3] dark:hover:border-[#2A0C8F99] transition-colors"
            onClick={() => navigateTo("admin-attendance-events")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086099] shrink-0">
                <ClipboardList className="size-4.5 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">View Attendance</p>
                <p className="text-[10px] text-muted-foreground">
                  {todayEvents.length} sessions today
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer overflow-hidden border-border hover:border-[#D4B8E3] dark:hover:border-[#2A0C8F99] transition-colors sm:col-span-1"
            onClick={() => navigateTo("admin-users")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086099] shrink-0">
                <UserCog className="size-4.5 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Manage Staff</p>
                <p className="text-[10px] text-muted-foreground">
                  {metrics.totalStaff} staff members
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ── 4. Park Comparison Bar Chart ── */}
      <motion.div variants={fadeUp}>
        <Card className="overflow-hidden border-border">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Park Attendance Comparison</h3>
              <Badge variant="outline" className="text-[10px] font-normal">
                7-Day Rate
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Attendance rate per park</p>
            {parkChartData.length > 0 ? (
              <BarChart
                data={parkChartData}
                height={140}
                barColor="#4B0A8F"
                showValues
                valueFormatter={(val) => `${val}%`}
              />
            ) : (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                No parks to compare
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── 5. 14-Day Attendance Trend ── */}
      <motion.div variants={fadeUp}>
        <Card className="overflow-hidden border-border">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Attendance Trend</h3>
              <Badge variant="outline" className="text-[10px] font-normal">
                Last 14 days
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Present / Late / Absent across all parks
            </p>
            <AttendanceChart data={trend14Day} height={220} />
          </CardContent>
        </Card>
      </motion.div>

      {/* ── 6. Fees Overview ── */}
      <motion.div variants={fadeUp}>
        <Card className="overflow-hidden border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
              <h3 className="text-sm font-semibold">Fees Overview</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">
                  Collected This Month
                </p>
                <p
                  className="text-base sm:text-xl font-bold text-[#4B0A8F] dark:text-[#8A40B0] truncate"
                  title={`Rs ${feesOverview.totalCollectedThisMonth.toLocaleString()}`}
                >
                  Rs {feesOverview.totalCollectedThisMonth.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">
                  Pending Fees
                </p>
                <p
                  className={cn(
                    "text-base sm:text-xl font-bold truncate",
                    feesOverview.totalPendingFees > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-[#4B0A8F] dark:text-[#8A40B0]"
                  )}
                  title={`Rs ${feesOverview.totalPendingFees.toLocaleString()}`}
                >
                  Rs {feesOverview.totalPendingFees.toLocaleString()}
                </p>
              </div>
            </div>

            {feesOverview.totalPendingFees > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs text-[#4B0A8F] hover:text-[#4B0A8F] dark:text-[#8A40B0] dark:hover:text-[#8A40B0] h-9"
                onClick={() => navigateTo("admin-fees")}
              >
                View Fee Details
                <ChevronRight className="size-3.5 ml-1" />
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── 7. Today's Sessions ── */}
      <motion.div variants={fadeUp} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Today&apos;s Sessions</h3>
          <Badge variant="outline" className="text-[10px] font-normal">
            {todayEvents.length} {todayEvents.length === 1 ? "session" : "sessions"}
          </Badge>
        </div>

        {todayEvents.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <CalendarCheck className="size-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No sessions scheduled today across your parks
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {todayEvents.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <Card
                  className={cn(
                    "transition-shadow hover:shadow-sm",
                    event.isClosed
                      ? "border-border/60"
                      : "border-[#D4B8E3] dark:border-[#2A0C8F4D]"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate">
                            {event.title}
                          </p>
                          <Badge
                            variant={event.isClosed ? "secondary" : "default"}
                            className={cn(
                              "text-[10px] shrink-0",
                              event.isClosed
                                ? "bg-muted text-muted-foreground"
                                : "bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0]"
                            )}
                          >
                            {event.isClosed ? "Closed" : "Open"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" />
                          <span className="truncate">{event.parkName}</span>
                          <span className="mx-0.5">&middot;</span>
                          <span className="truncate">{event.groupName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-20 hidden sm:block">
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="text-muted-foreground">
                              {event.markedCount}/{event.participantCount}
                            </span>
                            <span
                              className={cn(
                                "font-semibold",
                                progressTextColor(event.progress)
                              )}
                            >
                              {event.progress}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                progressColor(event.progress)
                              )}
                              style={{ width: `${event.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 sm:hidden">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">
                          {event.markedCount}/{event.participantCount} marked
                        </span>
                        <span
                          className={cn(
                            "font-semibold",
                            progressTextColor(event.progress)
                          )}
                        >
                          {event.progress}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            progressColor(event.progress)
                          )}
                          style={{ width: `${event.progress}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── 8. Recent Activity ── */}
      <motion.div variants={fadeUp}>
        <ActivityFeed limit={5} />
      </motion.div>
    </motion.div>
  );
}
