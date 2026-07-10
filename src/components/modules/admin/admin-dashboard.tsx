"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { EmptyState } from "@/components/layout/empty-state";
import { DataCard } from "@/components/layout/data-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { toPKT, formatPKT } from "@/lib/timezone";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
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
  ArrowRight,
  Zap,
  TrendingUp,
  Shield,
  BarChart3,
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

function getActionColor(action: string) {
  switch (action.toLowerCase()) {
    case "create": return "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400";
    case "update": return "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400";
    case "delete": return "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400";
    case "login": case "logout": return "bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400";
    default: return "bg-muted text-muted-foreground";
  }
}

function getActionBadgeColor(action: string) {
  switch (action.toLowerCase()) {
    case "create": return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
    case "update": return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
    case "delete": return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800";
    case "login": case "logout": return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800";
    default: return "bg-muted text-muted-foreground border-border";
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
  if (verb === "login" || verb === "logout") return `${who} ${verb === "login" ? "signed in" : "signed out"}`;
  return `${who} ${verb}d a ${entity}`;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "??";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
};

// ── Quick actions config ────────────────────────────────────────────────────

const quickActions: { label: string; description: string; icon: typeof MapPin; page: PageId; color: string }[] = [
  { label: "Cities", description: "Manage locations", icon: MapPin, page: "admin-cities", color: "from-emerald-500 to-teal-500" },
  { label: "Parks", description: "Park operations", icon: TreePine, page: "admin-parks", color: "from-sky-500 to-blue-500" },
  { label: "Users", description: "Staff accounts", icon: Users, page: "admin-users", color: "from-violet-500 to-purple-500" },
  { label: "Reports", description: "Analytics", icon: BarChart3, page: "admin-reports", color: "from-amber-500 to-orange-500" },
];

// ── Greeting Card ────────────────────────────────────────────────────────────

function GreetingCard({ name, activeBatches }: { name: string; activeBatches?: number }) {
  const greeting = useMemo(() => getGreeting(), []);
  const pktDate = useMemo(() => formatPKTDate(), []);

  return (
    <motion.div
      variants={itemVariants}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 dark:from-emerald-800 dark:via-emerald-700 dark:to-teal-700 px-6 py-6 md:px-8 md:py-8"
    >
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 right-20 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
      <div className="absolute top-4 right-6 opacity-20">
        <Sparkles className="size-12 text-white" />
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
            className="rounded-2xl bg-white/20 backdrop-blur-sm p-3 shadow-lg"
          >
            <Zap className="size-7 text-white" />
          </motion.div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">
              {greeting}, {name}
            </h2>
            <p className="text-emerald-100 text-sm mt-1">{pktDate}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeBatches !== undefined && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-2.5 rounded-xl bg-white/15 backdrop-blur-sm px-4 py-2.5"
            >
              <CalendarCheck className="size-4 text-white" />
              <div>
                <p className="text-white font-semibold text-sm">
                  {activeBatches} Active {activeBatches === 1 ? "Batch" : "Batches"}
                </p>
                <p className="text-emerald-100 text-[11px]">Currently running</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Activity Timeline Item ───────────────────────────────────────────────────

function ActivityItem({ item, idx }: { item: any; idx: number }) {
  const colorCls = getActionColor(item.action);
  const badgeCls = getActionBadgeColor(item.action);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="flex items-start gap-3 group"
    >
      <div className="relative flex flex-col items-center">
        <div className={cn("rounded-lg p-1.5 shrink-0 shadow-sm", colorCls)}>
          <span className="sr-only">{item.action}</span>
          {item.action.toLowerCase() === "create" && <Plus className="size-3.5" />}
          {item.action.toLowerCase() === "update" && <Pencil className="size-3.5" />}
          {item.action.toLowerCase() === "delete" && <Trash2 className="size-3.5" />}
          {item.action.toLowerCase() === "login" && <Shield className="size-3.5" />}
          {item.action.toLowerCase() === "logout" && <Shield className="size-3.5" />}
          {!["create", "update", "delete", "login", "logout"].includes(item.action.toLowerCase()) && <Activity className="size-3.5" />}
        </div>
        {idx < 9 && <div className="w-px flex-1 bg-border mt-1 min-h-[8px]" />}
      </div>
      <div className="flex-1 min-w-0 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm leading-snug">{describeAction(item)}</p>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", badgeCls)}>
            {item.action}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </p>
      </div>
    </motion.div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// ── Staff Role Badge Colors ──────────────────────────────────────────────────

const roleColors: Record<string, string> = {
  super_admin: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400",
  program_admin: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400",
  city_head: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400",
  park_admin: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  park_lead: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  murabbi: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400",
};

// ── Main Component ───────────────────────────────────────────────────────────

export function AdminDashboard() {
  const { data: session } = useSession();
  const { selectedCityId, selectedParkId, setSelectedCity, navigateTo } = useAppStore();
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ── HQ Dashboard ─────────────────────────────────────────────────────────
  if (isHQ && data?.cityBreakdown) {
    const totalParks = data.cityBreakdown.reduce((sum: number, c: any) => sum + (c._count?.parks || 0), 0);
    const maxCityParks = Math.max(...data.cityBreakdown.map((c: any) => c._count?.parks || 0), 1);
    const totalStaff = data.cityStaff?.reduce((sum: number, s: any) => sum + s.count, 0) || 0;

    return (
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* A. Greeting */}
        <GreetingCard name={user?.name || "Admin"} activeBatches={data.activeBatches} />

        {/* B. Metric Cards */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4"
        >
          <DataCard title="Cities" value={data.cities} icon={Building2} variant="emerald" />
          <DataCard title="Parks" value={data.parks} icon={TreePine} variant="sky" />
          <DataCard title="Batches" value={data.batches} icon={CalendarCheck} variant="amber" />
          <DataCard title="Groups" value={data.groups} icon={UsersRound} variant="violet" />
          <DataCard title="Shabab" value={data.participants} icon={GraduationCap} variant="rose" />
          <DataCard title="Staff" value={data.staff} icon={UserCog} variant="slate" />
        </motion.div>

        {/* C. Quick Actions */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {quickActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <motion.button
                  key={action.page}
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigateTo(action.page)}
                  className="group relative rounded-xl border bg-card p-4 text-left hover:shadow-lg transition-shadow duration-300 overflow-hidden"
                >
                  <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", action.color)} />
                  <div className={cn("rounded-lg p-2 w-fit mb-3 bg-gradient-to-br text-white shadow-sm", action.color)}>
                    <ActionIcon className="size-4" />
                  </div>
                  <p className="text-sm font-semibold">{action.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                  <ArrowRight className="absolute bottom-4 right-4 size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* D. City Distribution */}
          <motion.div variants={itemVariants} className="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/20">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <Building2 className="size-4 text-emerald-600" />
                City Distribution
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.cityBreakdown.length} cities · {totalParks} parks · {totalStaff} staff
              </p>
            </div>
            <div className="p-5 space-y-4">
              {data.cityBreakdown.map((city: any, idx: number) => {
                const parks = city._count?.parks || 0;
                const staff = city._count?.staff || 0;
                const pct = maxCityParks > 0 ? (parks / maxCityParks) * 100 : 0;
                return (
                  <motion.div
                    key={city.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="group cursor-pointer"
                    onClick={() => setSelectedCity(city.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-emerald-50 p-1.5 dark:bg-emerald-950/50 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950/80 transition-colors">
                          <Building2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <span className="text-sm font-medium group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                            {city.name}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground font-mono">{city.code}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{staff} staff</span>
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                          {parks} {parks === 1 ? "park" : "parks"}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                      />
                    </div>
                  </motion.div>
                );
              })}
              {data.cityBreakdown.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No cities created yet.</p>
                  <Button
                    variant="link"
                    className="text-emerald-600 mt-1"
                    onClick={() => navigateTo("admin-cities")}
                  >
                    Create your first city
                  </Button>
                </div>
              )}
            </div>
          </motion.div>

          {/* E. Right sidebar column */}
          <motion.div variants={itemVariants} className="space-y-6">
            {/* Recent Activity */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 bg-muted/20 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="size-4 text-emerald-600" />
                  Recent Activity
                  {data.recentActivity?.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5">
                      {data.recentActivity.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 px-4">
                {data.recentActivity && data.recentActivity.length > 0 ? (
                  <ScrollArea className="max-h-[280px] overflow-y-auto">
                    <div className="space-y-0 pr-2">
                      {data.recentActivity.map((item: any, idx: number) => (
                        <ActivityItem key={idx} item={item} idx={idx} />
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="py-8 text-center">
                    <div className="rounded-full bg-muted p-4 w-fit mx-auto mb-3">
                      <Activity className="size-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Actions will appear here as your team uses the system
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Staff by Role */}
            {data.cityStaff && data.cityStaff.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-3 bg-muted/20 border-b">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="size-4 text-emerald-600" />
                    Staff by Role
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 px-4 space-y-3">
                  {data.cityStaff.map((cs: any, idx: number) => {
                    const pct = totalStaff > 0 ? (cs.count / totalStaff) * 100 : 0;
                    const colorCls = roleColors[cs.role] || "bg-muted text-muted-foreground";
                    return (
                      <motion.div
                        key={cs.role}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.06 }}
                        className="space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm capitalize">{cs.role.replace(/_/g, " ")}</span>
                          <div className="flex items-center gap-2">
                            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md", colorCls)}>
                              {cs.count}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: idx * 0.08 }}
                            className={cn("h-full rounded-full", cs.role.includes("admin") ? "bg-violet-500" : cs.role === "city_head" ? "bg-sky-500" : "bg-emerald-500")}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
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
        <GreetingCard name={user?.name || "City Head"} />

        {/* Metric Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          <DataCard title="Parks" value={data.parks} icon={TreePine} variant="sky" />
          <DataCard title="Batches" value={data.batches} icon={CalendarCheck} variant="amber" />
          <DataCard title="Groups" value={data.groups} icon={UsersRound} variant="violet" />
          <DataCard title="Shabab" value={data.participants} icon={GraduationCap} variant="rose" />
          <DataCard title="Events" value={data.attendanceEvents} icon={Activity} variant="emerald" />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Parks breakdown */}
          <motion.div variants={itemVariants} className="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/20">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <TreePine className="size-4 text-emerald-600" />
                Parks in Your City
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Batches and groups per park</p>
            </div>
            <div className="p-5 space-y-4">
              {data.cityParks.map((park: any, idx: number) => (
                <motion.div
                  key={park.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => useAppStore.getState().setSelectedPark(park.id)}
                >
                  <div className="rounded-xl bg-sky-50 p-2.5 dark:bg-sky-950/50">
                    <TreePine className="size-4 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{park.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {park.address || "No address"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-sm font-semibold">{park._count.batches}</p>
                      <p className="text-[10px] text-muted-foreground">Batches</p>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="text-center">
                      <p className="text-sm font-semibold">{park._count.groups}</p>
                      <p className="text-[10px] text-muted-foreground">Groups</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden h-full">
              <CardHeader className="pb-3 bg-muted/20 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="size-4 text-emerald-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 px-4">
                {data.recentActivity && data.recentActivity.length > 0 ? (
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-0 pr-2">
                      {data.recentActivity.map((item: any, idx: number) => (
                        <ActivityItem key={idx} item={item} idx={idx} />
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="py-8 text-center">
                    <div className="rounded-full bg-muted p-4 w-fit mx-auto mb-3">
                      <Activity className="size-6 text-muted-foreground/50" />
                    </div>
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
        <GreetingCard name={user?.name || "Staff"} />

        {/* Metric Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          <DataCard title="Groups" value={data.groups} icon={UsersRound} variant="violet" />
          <DataCard title="Shabab" value={data.participants} icon={GraduationCap} variant="rose" />
          <DataCard title="Today" value={data.todayEvents} icon={CalendarCheck} variant="emerald" />
          <DataCard title="Open" value={data.openEvents} icon={Clock} variant="amber" />
          <DataCard title="Total Events" value={data.totalEvents} icon={Activity} variant="sky" />
        </motion.div>

        {/* Status Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            variants={scaleIn}
            className="rounded-xl border bg-card p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-amber-50 p-2.5 dark:bg-amber-950/50">
                <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">Open Events</p>
                <p className="text-xs text-muted-foreground">Events awaiting closure</p>
              </div>
            </div>
            {data.openEvents > 0 ? (
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold text-amber-600">{data.openEvents}</p>
                <p className="text-sm text-muted-foreground">need attention</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="size-5" />
                <span className="text-sm font-medium">All events closed</span>
              </div>
            )}
          </motion.div>

          <motion.div
            variants={scaleIn}
            className="rounded-xl border bg-card p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-emerald-50 p-2.5 dark:bg-emerald-950/50">
                <CalendarCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">Today&apos;s Activity</p>
                <p className="text-xs text-muted-foreground">Attendance events for today</p>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold">{data.todayEvents}</p>
              <p className="text-sm text-muted-foreground">events</p>
            </div>
          </motion.div>
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