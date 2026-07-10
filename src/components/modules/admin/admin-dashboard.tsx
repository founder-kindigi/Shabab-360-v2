"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { DataCard } from "@/components/layout/data-card";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toPKT } from "@/lib/timezone";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import {
  TreePine,
  GraduationCap,
  CalendarCheck,
  UserCog,
  Activity,
  Building2,
  UsersRound,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Users,
  FileBarChart,
  Sparkles,
} from "lucide-react";
import type { PageId } from "@/stores/useAppStore";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = toPKT(new Date()).getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
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

function getActionIcon(action: string) {
  switch (action.toLowerCase()) {
    case "create":
      return Plus;
    case "update":
      return Pencil;
    case "delete":
      return Trash2;
    default:
      return Activity;
  }
}

function getActionColor(action: string) {
  switch (action.toLowerCase()) {
    case "create":
      return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400";
    case "update":
      return "text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400";
    case "delete":
      return "text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400";
    default:
      return "text-muted-foreground bg-muted";
  }
}

function describeAction(item: {
  action: string;
  entityType: string;
  user?: { name: string | null };
}): string {
  const who = item.user?.name || "Unknown";
  const verb = item.action.toLowerCase();
  const entity = item.entityType.replace(/_/g, " ").toLowerCase();
  return `${who} ${verb}d a ${entity}`;
}

// ── Mock trend data for metric cards ─────────────────────────────────────────

const hqTrends: Record<string, { trend: "up" | "down" | "neutral"; value: string }> = {
  cities: { trend: "neutral", value: "—" },
  parks: { trend: "up", value: "+2" },
  batches: { trend: "up", value: "+1" },
  groups: { trend: "up", value: "+5" },
  participants: { trend: "up", value: "+12" },
  staff: { trend: "neutral", value: "—" },
};

const cityTrends: Record<string, { trend: "up" | "down" | "neutral"; value: string }> = {
  parks: { trend: "neutral", value: "—" },
  batches: { trend: "up", value: "+1" },
  groups: { trend: "up", value: "+3" },
  participants: { trend: "up", value: "+8" },
  attendanceEvents: { trend: "up", value: "+4" },
};

const parkTrends: Record<string, { trend: "up" | "down" | "neutral"; value: string }> = {
  groups: { trend: "neutral", value: "—" },
  participants: { trend: "up", value: "+3" },
  todayEvents: { trend: "down", value: "-1" },
  openEvents: { trend: "down", value: "-2" },
  totalEvents: { trend: "up", value: "+7" },
};

// ── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

// ── Quick actions config ────────────────────────────────────────────────────

const quickActions: { label: string; icon: typeof MapPin; page: PageId }[] = [
  { label: "Create City", icon: MapPin, page: "admin-cities" },
  { label: "Create Park", icon: TreePine, page: "admin-parks" },
  { label: "View Reports", icon: FileBarChart, page: "admin-reports" },
  { label: "Manage Users", icon: Users, page: "admin-users" },
];

// ── Component ────────────────────────────────────────────────────────────────

export function AdminDashboard() {
  const { data: session } = useSession();
  const { selectedCityId, selectedParkId, setSelectedCity, navigateTo } =
    useAppStore();
  const user = session?.user as { role?: string; name?: string } | undefined;
  const isHQ = ["super_admin", "program_admin"].includes(user?.role || "");

  const apiUrl =
    selectedCityId || selectedParkId
      ? `/api/admin/dashboard?cityId=${selectedCityId || ""}&parkId=${selectedParkId || ""}`
      : "/api/admin/dashboard";

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard", selectedCityId, selectedParkId],
    queryFn: () => fetch(apiUrl).then((r) => r.json()),
    staleTime: 30000,
  });

  const greeting = useMemo(() => getGreeting(), []);
  const pktDate = useMemo(() => formatPKTDate(), []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  // ── HQ Dashboard ─────────────────────────────────────────────────────────
  if (isHQ && data?.cityBreakdown) {
    return (
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* A. Greeting Section */}
        <motion.div
          variants={itemVariants}
          className="relative rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200/60 dark:border-emerald-800/40 px-6 py-5"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-2.5 dark:bg-emerald-900/60">
              <Sparkles className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {greeting}, {user?.name || "Admin"}
              </h2>
              <p className="text-sm text-muted-foreground">{pktDate}</p>
            </div>
          </div>
          {data.activeBatches !== undefined && (
            <div className="mt-3 flex items-center gap-2">
              <CalendarCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                {data.activeBatches} active batch{data.activeBatches !== 1 ? "es" : ""} running
              </span>
            </div>
          )}
        </motion.div>

        {/* B. Metric Cards */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          <DataCard title="Cities" value={data.cities} icon={Building2} trend={hqTrends.cities.trend} trendValue={hqTrends.cities.value} />
          <DataCard title="Parks" value={data.parks} icon={TreePine} trend={hqTrends.parks.trend} trendValue={hqTrends.parks.value} />
          <DataCard title="Batches" value={data.batches} icon={CalendarCheck} trend={hqTrends.batches.trend} trendValue={hqTrends.batches.value} />
          <DataCard title="Groups" value={data.groups} icon={UsersRound} trend={hqTrends.groups.trend} trendValue={hqTrends.groups.value} />
          <DataCard title="Shabab" value={data.participants} icon={GraduationCap} trend={hqTrends.participants.trend} trendValue={hqTrends.participants.value} />
          <DataCard title="Staff" value={data.staff} icon={UserCog} trend={hqTrends.staff.trend} trendValue={hqTrends.staff.value} />
        </motion.div>

        {/* Two-column layout: City Overview + Right sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* C. City Overview Table */}
          <motion.div variants={itemVariants} className="lg:col-span-2 rounded-xl border bg-card">
            <div className="px-6 py-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="inline-block w-1 h-4 rounded-full bg-emerald-500" />
                Cities Overview
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">Parks &amp; staff per city</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">City</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Parks</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Staff</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cityBreakdown.map((city: any) => (
                    <tr
                      key={city.id}
                      onClick={() => setSelectedCity(city.id)}
                      className="border-b last:border-0 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-3">
                        <p className="text-sm font-medium">{city.name}</p>
                        <p className="text-xs text-muted-foreground">{city.code}</p>
                      </td>
                      <td className="text-center py-3">
                        <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                          {city._count.parks}
                        </span>
                      </td>
                      <td className="text-center py-3">
                        <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                          {city._count.staff ?? 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data.cityBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-sm text-muted-foreground">
                        No cities yet. Create your first city to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Right sidebar column */}
          <motion.div variants={itemVariants} className="space-y-6">
            {/* D. Recent Activity Feed */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span className="inline-block w-1 h-4 rounded-full bg-emerald-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {data.recentActivity && data.recentActivity.length > 0 ? (
                  <ScrollArea className="max-h-64 overflow-y-auto">
                    <div className="space-y-3 pr-3">
                      {data.recentActivity.map((item: any, idx: number) => {
                        const Icon = getActionIcon(item.action);
                        const colorCls = getActionColor(item.action);
                        return (
                          <div key={idx} className="flex items-start gap-3">
                            <div className={`rounded-md p-1.5 shrink-0 ${colorCls}`}>
                              <Icon className="size-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm leading-snug">{describeAction(item)}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="py-6 text-center">
                    <Activity className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* E. Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span className="inline-block w-1 h-4 rounded-full bg-emerald-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((action) => {
                    const ActionIcon = action.icon;
                    return (
                      <Button
                        key={action.page}
                        variant="outline"
                        className="h-auto flex flex-col items-center gap-1.5 py-3 px-2 hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-950/30 dark:hover:border-emerald-800 transition-colors"
                        onClick={() => navigateTo(action.page)}
                      >
                        <ActionIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-medium">{action.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* City Staff Breakdown */}
            {data.cityStaff && data.cityStaff.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <span className="inline-block w-1 h-4 rounded-full bg-emerald-500" />
                    Staff by Role
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {data.cityStaff.map((cs: any) => (
                      <div key={cs.role} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{cs.role.replace(/_/g, " ")}</span>
                        <Badge variant="secondary" className="font-medium">{cs.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // ── City Head Dashboard ──────────────────────────────────────────────────
  if (!isHQ && data?.cityParks) {
    return (
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Greeting */}
        <motion.div
          variants={itemVariants}
          className="relative rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200/60 dark:border-emerald-800/40 px-6 py-5"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-2.5 dark:bg-emerald-900/60">
              <Sparkles className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {greeting}, {user?.name || "City Head"}
              </h2>
              <p className="text-sm text-muted-foreground">{pktDate}</p>
            </div>
          </div>
        </motion.div>

        {/* Metric Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <DataCard title="Parks" value={data.parks} icon={TreePine} trend={cityTrends.parks.trend} trendValue={cityTrends.parks.value} />
          <DataCard title="Batches" value={data.batches} icon={CalendarCheck} trend={cityTrends.batches.trend} trendValue={cityTrends.batches.value} />
          <DataCard title="Groups" value={data.groups} icon={UsersRound} trend={cityTrends.groups.trend} trendValue={cityTrends.groups.value} />
          <DataCard title="Shabab" value={data.participants} icon={GraduationCap} trend={cityTrends.participants.trend} trendValue={cityTrends.participants.value} />
          <DataCard title="Events" value={data.attendanceEvents} icon={Activity} trend={cityTrends.attendanceEvents.trend} trendValue={cityTrends.attendanceEvents.value} />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Parks table */}
          <motion.div variants={itemVariants} className="lg:col-span-2 rounded-xl border bg-card">
            <div className="px-6 py-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="inline-block w-1 h-4 rounded-full bg-emerald-500" />
                Parks in Your City
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">Batches and groups per park</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Park</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Batches</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Groups</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cityParks.map((park: any) => (
                    <tr
                      key={park.id}
                      className="border-b last:border-0 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer"
                      onClick={() => useAppStore.getState().setSelectedPark(park.id)}
                    >
                      <td className="px-6 py-3">
                        <p className="text-sm font-medium">{park.name}</p>
                      </td>
                      <td className="text-center py-3">
                        <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                          {park._count.batches}
                        </span>
                      </td>
                      <td className="text-center py-3">
                        <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                          {park._count.groups}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span className="inline-block w-1 h-4 rounded-full bg-emerald-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {data.recentActivity && data.recentActivity.length > 0 ? (
                  <ScrollArea className="max-h-64 overflow-y-auto">
                    <div className="space-y-3 pr-3">
                      {data.recentActivity.map((item: any, idx: number) => {
                        const Icon = getActionIcon(item.action);
                        const colorCls = getActionColor(item.action);
                        return (
                          <div key={idx} className="flex items-start gap-3">
                            <div className={`rounded-md p-1.5 shrink-0 ${colorCls}`}>
                              <Icon className="size-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm leading-snug">{describeAction(item)}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="py-6 text-center">
                    <Activity className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // ── Park-level Dashboard ─────────────────────────────────────────────────
  if (data?.todayEvents !== undefined) {
    return (
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Greeting */}
        <motion.div
          variants={itemVariants}
          className="relative rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200/60 dark:border-emerald-800/40 px-6 py-5"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-2.5 dark:bg-emerald-900/60">
              <Sparkles className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {greeting}, {user?.name || "Staff"}
              </h2>
              <p className="text-sm text-muted-foreground">{pktDate}</p>
            </div>
          </div>
        </motion.div>

        {/* Metric Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <DataCard title="Groups" value={data.groups} icon={UsersRound} trend={parkTrends.groups.trend} trendValue={parkTrends.groups.value} />
          <DataCard title="Shabab" value={data.participants} icon={GraduationCap} trend={parkTrends.participants.trend} trendValue={parkTrends.participants.value} />
          <DataCard title="Today's Events" value={data.todayEvents} icon={CalendarCheck} trend={parkTrends.todayEvents.trend} trendValue={parkTrends.todayEvents.value} />
          <DataCard title="Open Events" value={data.openEvents} icon={Clock} trend={parkTrends.openEvents.trend} trendValue={parkTrends.openEvents.value} />
          <DataCard title="Total Events" value={data.totalEvents} icon={Activity} trend={parkTrends.totalEvents.trend} trendValue={parkTrends.totalEvents.value} />
        </motion.div>

        {/* Quick status indicators */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-950/50">
                <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Open Events</p>
                <p className="text-xs text-muted-foreground">Events awaiting closure</p>
              </div>
            </div>
            {data.openEvents > 0 ? (
              <p className="text-3xl font-bold text-amber-600">{data.openEvents}</p>
            ) : (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="size-4" />
                <span className="text-sm font-medium">All events closed</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/50">
                <Activity className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Today&apos;s Activity</p>
                <p className="text-xs text-muted-foreground">Attendance events for today</p>
              </div>
            </div>
            <p className="text-3xl font-bold">{data.todayEvents}</p>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // ── Fallback ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <EmptyState
        icon={Activity}
        title="No data available"
        description="Dashboard metrics will appear once your organization is set up."
      />
    </div>
  );
}