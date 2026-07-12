"use client";

import { useMemo, useState, useEffect } from "react";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Sparkles,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Wallet,
  UserPlus,
  TrendingUp,
} from "lucide-react";
import { AttendanceChart } from "@/components/shared/attendance-chart";
import { Sparkline } from "@/components/shared/sparkline";
import { DonutChart } from "@/components/shared/donut-chart";
import { BarChart } from "@/components/shared/bar-chart";
import { WelcomeWidget } from "@/components/shared/welcome-widget";
import { ActivityFeed } from "@/components/shared/activity-feed";
import { useTranslation } from "@/lib/i18n";
import type { PageId } from "@/stores/useAppStore";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(t: (key: string) => string): string {
  const hour = toPKT(new Date()).getHours();
  if (hour < 12) return t("dashboard.goodMorning");
  if (hour < 17) return t("dashboard.goodAfternoon");
  return t("dashboard.goodEvening");
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
    case "create": return "bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086099] dark:text-[#8A40B0]";
    case "update": return "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400";
    case "delete": return "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400";
    case "login": case "logout": return "bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400";
    default: return "bg-muted text-muted-foreground";
  }
}

function getActionBadgeColor(action: string) {
  switch (action.toLowerCase()) {
    case "create": return "bg-[#F3ECF6] text-[#4B0A8F] border-[#D4B8E3] dark:bg-[#1F086066] dark:text-[#8A40B0] dark:border-[#2A0C8F]";
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

function formatPKR(amount: number): string {
  if (amount >= 100000) return `Rs ${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `Rs ${(amount / 1000).toFixed(1)}K`;
  return `Rs ${amount.toLocaleString()}`;
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

const quickActionsConfig: { tKey: string; descKey: string; icon: typeof MapPin; page: PageId; color: string }[] = [
  { tKey: "nav.cities", descKey: "dashboard.manageLocations", icon: MapPin, page: "admin-cities", color: "from-[#2A0C8F] via-[#A0006B] to-[#FF0015]" },
  { tKey: "nav.parks", descKey: "dashboard.parkOperations", icon: TreePine, page: "admin-parks", color: "from-sky-500 to-blue-500" },
  { tKey: "nav.users", descKey: "dashboard.staffAccounts", icon: Users, page: "admin-users", color: "from-violet-500 to-purple-500" },
  { tKey: "nav.reports", descKey: "dashboard.analytics", icon: BarChart3, page: "admin-reports", color: "from-amber-500 to-orange-500" },
];

// ── Animated gradient keyframes (injected once) ─────────────────────────────
const gradientStyle = `
@keyframes bannerGradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes floatParticle {
  0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.15; }
  25% { transform: translateY(-8px) translateX(4px); opacity: 0.35; }
  50% { transform: translateY(-3px) translateX(-6px); opacity: 0.2; }
  75% { transform: translateY(-10px) translateX(2px); opacity: 0.3; }
}
@keyframes subtlePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(42, 12, 143, 0.3); }
  50% { box-shadow: 0 0 0 6px rgba(42, 12, 143, 0); }
}
.banner-gradient {
  background: linear-gradient(135deg, #2A0C8F, #4B0A8F, #A0006B, #6B0F8F, #2A0C8F);
  background-size: 300% 300%;
  animation: bannerGradientShift 12s ease infinite;
}
.floating-dot {
  animation: floatParticle var(--dot-duration, 6s) ease-in-out infinite;
  animation-delay: var(--dot-delay, 0s);
}
.action-pulse {
  animation: subtlePulse 3s ease-in-out infinite;
}
`;

// Pre-generate particle positions for the greeting banner
const bannerParticles = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  top: `${8 + (i * 7.5) % 84}%`,
  left: `${5 + (i * 13) % 90}%`,
  size: i % 3 === 0 ? 4 : i % 3 === 1 ? 3 : 2,
  duration: `${4 + (i * 1.7) % 5}s`,
  delay: `${(i * 0.4) % 3}s`,
}));

// ── Greeting Card ────────────────────────────────────────────────────────────

function GreetingCard({ name, activeBatches }: { name: string; activeBatches?: number }) {
  const { t } = useTranslation();
  const greeting = useMemo(() => getGreeting(t), [t]);
  const pktDate = useMemo(() => formatPKTDate(), []);
  const [pktTime, setPktTime] = useState("");

  useEffect(() => {
    const tick = () => setPktTime(formatPKT(new Date(), "HH:mm:ss"));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      variants={itemVariants}
      className="relative overflow-hidden rounded-2xl px-6 py-6 md:px-8 md:py-8 banner-gradient"
    >
      <style dangerouslySetInnerHTML={{ __html: gradientStyle }} />

      {/* Floating particle dots */}
      {bannerParticles.map((p) => (
        <div
          key={p.id}
          className="floating-dot absolute rounded-full bg-white"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            opacity: 0.2,
            "--dot-duration": p.duration,
            "--dot-delay": p.delay,
          } as React.CSSProperties}
        />
      ))}

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
            <p className="text-white/90 text-sm mt-1 font-medium">{pktDate}</p>
            {pktTime && (
              <p className="text-white/70 text-xs mt-0.5 font-mono tracking-wider">
                PKT {pktTime}
              </p>
            )}
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
                <p className="text-white/80 text-[11px]">Currently running</p>
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
  park_lead: "bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0]",
  murabbi: "bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0]",
};

// ── Main Component ───────────────────────────────────────────────────────────

export function AdminDashboard() {
  const { data: session } = useSession();
  const { selectedCityId, selectedParkId, setSelectedCity, navigateTo } = useAppStore();
  const { t } = useTranslation();
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4B0A8F] dark:border-[#8A40B0]" />
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
        data-tour="dashboard"
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* A. Greeting */}
        <GreetingCard name={user?.name || "Admin"} activeBatches={data.activeBatches} />

        {/* A2. Welcome Widget */}
        <motion.div variants={itemVariants}>
          <WelcomeWidget />
        </motion.div>

        {/* B. Metric Cards */}
        <motion.div
          data-tour="dashboard-cards"
          variants={itemVariants}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4"
        >
          <DataCard title={t("nav.cities")} value={data.cities} icon={Building2} variant="brand" />
          <DataCard title={t("nav.parks")} value={data.parks} icon={TreePine} variant="sky" />
          <DataCard title={t("nav.batches")} value={data.batches} icon={CalendarCheck} variant="amber" />
          <DataCard title={t("nav.groups")} value={data.groups} icon={UsersRound} variant="violet" />
          <DataCard title={t("dashboard.totalStudents")} value={data.participants} icon={GraduationCap} variant="rose" />
          <DataCard title={t("nav.users")} value={data.staff} icon={UserCog} variant="slate" />
        </motion.div>

        {/* B2. Today's Attendance Card with Sparkline */}
        {data.todayAttendance && (
          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 bg-muted/20 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CalendarCheck className="size-4 text-[#4B0A8F]" />
                  {t("dashboard.todayAttendance")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 px-4">
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#4B0A8F] dark:text-[#8A40B0]">
                      {data.todayAttendance.present}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{t("dashboard.present")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#A0006B]">
                      {data.todayAttendance.late}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{t("dashboard.late")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#FF0015]">
                      {data.todayAttendance.absent}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{t("dashboard.absent")}</p>
                  </div>
                  <div className="ml-auto">
                    {data.attendanceTrend && data.attendanceTrend.length > 1 && (
                      <Sparkline
                        data={data.attendanceTrend.slice(-7).map((d: any) => d.present)}
                        width={90}
                        height={32}
                        color="#4B0A8F"
                        showTrend
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* B3. Attendance Trend Chart */}
        {data.attendanceTrend && data.attendanceTrend.length > 0 && (
          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-muted/20 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="size-4 text-[#4B0A8F]" />
                  {t("dashboard.attendanceTrend")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2 px-4">
                <AttendanceChart data={data.attendanceTrend} height={220} />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* B4. Trends Section — Registration & Fee Collection */}
        {(data.registrationTrend || data.feeCollectionTrend) && (
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Registration Trend */}
            {data.registrationTrend && data.registrationTrend.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-2 bg-muted/20 border-b">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <UserPlus className="size-4 text-[#4B0A8F]" />
                    {t("dashboard.registrationTrend")}
                    <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5">
                      {data.registrationTrend.reduce((s: number, d: any) => s + d.count, 0)} {t("dashboard.registrationTotal")}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 px-4 pb-4">
                  <BarChart
                    data={data.registrationTrend.map((d: any) => ({ label: d.month, value: d.count }))}
                    height={160}
                    barColor="#4B0A8F"
                  />
                </CardContent>
              </Card>
            )}

            {/* Fee Collection Trend */}
            {data.feeCollectionTrend && data.feeCollectionTrend.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-2 bg-muted/20 border-b">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="size-4 text-[#A0006B]" />
                    {t("dashboard.feeCollection")}
                    <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5">
                      {formatPKR(data.feeCollectionTrend.reduce((s: number, d: any) => s + d.total, 0))}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 px-4 pb-4">
                  <BarChart
                    data={data.feeCollectionTrend.map((d: any) => ({ label: d.month, value: d.total }))}
                    height={160}
                    barColor="#A0006B"
                    valueFormatter={(v) => formatPKR(v)}
                  />
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* C. Quick Actions */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {quickActionsConfig.map((action, aIdx) => {
              const ActionIcon = action.icon;
              const isPrimary = aIdx === 0;
              return (
                <motion.button
                  key={action.page}
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigateTo(action.page)}
                  className={cn(
                    "group relative rounded-xl border bg-card p-4 text-left hover:shadow-lg transition-all duration-300 overflow-hidden",
                    isPrimary && "action-pulse"
                  )}
                >
                  {/* Default top border — replaced by gradient on hover */}
                  <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 from-[#2A0C8F] to-[#A0006B]")} />
                  {/* Original color bar (visible by default, hidden on hover) */}
                  <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r group-hover:opacity-0 transition-opacity duration-300", action.color)} />
                  <div className={cn("rounded-lg p-2 w-fit mb-3 bg-gradient-to-br text-white shadow-sm", action.color)}>
                    <ActionIcon className="size-4" />
                  </div>
                  <p className="text-sm font-semibold">{t(action.tKey)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t(action.descKey)}</p>
                  <ArrowRight className="absolute bottom-4 right-4 size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Two new charts row: Gender Distribution + Fee Summary */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gender Distribution Donut */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 bg-muted/20 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="size-4 text-[#4B0A8F]" />
                {t("dashboard.genderDistribution")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex items-center justify-center px-4 pb-4">
              <DonutChart
                segments={[
                  { label: t("dashboard.male"), value: data.genderDistribution?.male || 0, color: "#4B0A8F" },
                  { label: t("dashboard.female"), value: data.genderDistribution?.female || 0, color: "#A0006B" },
                  { label: t("dashboard.unknown"), value: data.genderDistribution?.unknown || 0, color: "#D4B8E3" },
                ]}
                size={150}
                strokeWidth={24}
                centerValue={`${data.participants}`}
                centerLabel={t("common.total")}
              />
            </CardContent>
          </Card>

          {/* Fee Collection Summary */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 bg-muted/20 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wallet className="size-4 text-[#4B0A8F]" />
                {t("dashboard.feeCollectionSummary")}
                {data.feeSummary && (
                  <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5">
                    {data.feeSummary.collectionRate}%
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 px-4 pb-4 space-y-4">
              {data.feeSummary ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium">{t("dashboard.totalExpected")}</p>
                      <p className="text-lg font-bold tabular-nums">{formatPKR(data.feeSummary.totalExpected)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium">{t("dashboard.totalCollected")}</p>
                      <p className="text-lg font-bold tabular-nums text-[#4B0A8F] dark:text-[#8A40B0]">{formatPKR(data.feeSummary.totalCollected)}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t("dashboard.collectionProgress")}</span>
                      <span className="font-semibold">{data.feeSummary.collectionRate}%</span>
                    </div>
                    <Progress
                      value={data.feeSummary.collectionRate}
                      className="h-2.5"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-[#4B0A8F] hover:text-[#4B0A8F] dark:text-[#8A40B0] dark:hover:text-[#8A40B0] h-8"
                    onClick={() => navigateTo("admin-fees")}
                  >
                    View Fees Management
                    <ArrowRight className="size-3.5 ml-1" />
                  </Button>
                </>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-sm text-muted-foreground">No fee data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* D. City Distribution */}
          <motion.div variants={itemVariants} className="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/20">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <Building2 className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
                City Distribution
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.cityBreakdown.length} cities · {totalParks} parks · {totalStaff} staff
              </p>
            </div>
            <TooltipProvider delayDuration={200}>
            <div className="p-5 space-y-4">
              {data.cityBreakdown.map((city: any, idx: number) => {
                const parks = city._count?.parks || 0;
                const staff = city._count?.staff || 0;
                const pct = maxCityParks > 0 ? (parks / maxCityParks) * 100 : 0;
                const pctRounded = Math.round(pct);
                // Color-code: >70% brand gradient, 40-70% amber, <40% red
                const barColor = pct > 70
                  ? "bg-gradient-to-r from-[#2A0C8F] to-[#A0006B]"
                  : pct >= 40
                    ? "bg-gradient-to-r from-amber-400 to-amber-500"
                    : "bg-gradient-to-r from-red-400 to-red-500";
                const pctColor = pct > 70
                  ? "text-[#4B0A8F] dark:text-[#8A40B0]"
                  : pct >= 40
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-red-600 dark:text-red-400";
                return (
                  <Tooltip key={city.id}>
                    <TooltipTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="group cursor-pointer"
                    onClick={() => setSelectedCity(city.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-[#F3ECF6] p-1.5 dark:bg-[#1F086080] group-hover:bg-[#F3ECF6] dark:group-hover:bg-[#1F0860CC] transition-colors">
                          <Building2 className="size-3.5 text-[#4B0A8F] dark:text-[#8A40B0]" />
                        </div>
                        <div>
                          <span className="text-sm font-medium group-hover:text-[#4B0A8F] dark:group-hover:text-[#8A40B0] transition-colors">
                            {city.name}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground font-mono">{city.code}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{staff} staff</span>
                        <span className="text-xs font-semibold text-[#4B0A8F] dark:text-[#8A40B0] bg-[#F3ECF6] dark:bg-[#1F086080] px-2 py-0.5 rounded-full">
                          {parks} {parks === 1 ? "park" : "parks"}
                        </span>
                        <span className={cn("text-xs font-bold min-w-[36px] text-right", pctColor)}>
                          {pctRounded}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.1, ease: "easeOut" }}
                        className={cn("h-full rounded-full", barColor)}
                      />
                    </div>
                  </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <span className="font-semibold">{city.name}</span>: {parks} {parks === 1 ? "park" : "parks"} · {pctRounded}% of top city
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              {data.cityBreakdown.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No cities created yet.</p>
                  <Button
                    variant="link"
                    className="text-[#4B0A8F] dark:text-[#8A40B0] mt-1"
                    onClick={() => navigateTo("admin-cities")}
                  >
                    Create your first city
                  </Button>
                </div>
              )}
            </div>
            </TooltipProvider>
          </motion.div>

          {/* E. Right sidebar column */}
          <motion.div variants={itemVariants} className="space-y-6">
            {/* Recent Activity */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 bg-muted/20 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
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
                    <Users className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
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
                            className={cn("h-full rounded-full", cs.role.includes("admin") ? "bg-violet-500" : cs.role === "city_head" ? "bg-sky-500" : "bg-[#4B0A8F]")}
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
          <DataCard title={t("nav.parks")} value={data.parks} icon={TreePine} variant="sky" />
          <DataCard title={t("nav.batches")} value={data.batches} icon={CalendarCheck} variant="amber" />
          <DataCard title={t("nav.groups")} value={data.groups} icon={UsersRound} variant="violet" />
          <DataCard title={t("dashboard.totalStudents")} value={data.participants} icon={GraduationCap} variant="rose" />
          <DataCard title={t("dashboard.events")} value={data.attendanceEvents} icon={Activity} variant="brand" />
        </motion.div>

        {/* Today's Attendance Card with Sparkline */}
        {data.todayAttendance && (
          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 bg-muted/20 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CalendarCheck className="size-4 text-[#4B0A8F]" />
                  Today&apos;s Attendance
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 px-4">
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#4B0A8F] dark:text-[#8A40B0]">
                      {data.todayAttendance.present}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{t("dashboard.present")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#A0006B]">
                      {data.todayAttendance.late}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{t("dashboard.late")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#FF0015]">
                      {data.todayAttendance.absent}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{t("dashboard.absent")}</p>
                  </div>
                  <div className="ml-auto">
                    {data.attendanceTrend && data.attendanceTrend.length > 1 && (
                      <Sparkline
                        data={data.attendanceTrend.slice(-7).map((d: any) => d.present)}
                        width={90}
                        height={32}
                        color="#4B0A8F"
                        showTrend
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Attendance Trend Chart */}
        {data.attendanceTrend && data.attendanceTrend.length > 0 && (
          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-muted/20 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="size-4 text-[#4B0A8F]" />
                  {t("dashboard.attendanceTrend")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2 px-4">
                <AttendanceChart data={data.attendanceTrend} height={220} />
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Parks breakdown */}
          <motion.div variants={itemVariants} className="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/20">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <TreePine className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
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
                  <Activity className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
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
          <DataCard title={t("nav.groups")} value={data.groups} icon={UsersRound} variant="violet" />
          <DataCard title={t("dashboard.totalStudents")} value={data.participants} icon={GraduationCap} variant="rose" />
          <DataCard title={t("time.today")} value={data.todayEvents} icon={CalendarCheck} variant="brand" />
          <DataCard title={t("dashboard.openEvents")} value={data.openEvents} icon={Clock} variant="amber" />
          <DataCard title={t("dashboard.totalEvents")} value={data.totalEvents} icon={Activity} variant="sky" />
        </motion.div>

        {/* Today's Attendance + Sparkline */}
        {data.todayAttendance && (
          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 bg-muted/20 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CalendarCheck className="size-4 text-[#4B0A8F]" />
                  Today&apos;s Attendance
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 px-4">
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#4B0A8F] dark:text-[#8A40B0]">
                      {data.todayAttendance.present}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Present</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#A0006B]">
                      {data.todayAttendance.late}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Late</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#FF0015]">
                      {data.todayAttendance.absent}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Absent</p>
                  </div>
                  <div className="ml-auto">
                    {data.attendanceTrend && data.attendanceTrend.length > 1 && (
                      <Sparkline
                        data={data.attendanceTrend.slice(-7).map((d: any) => d.present)}
                        width={90}
                        height={32}
                        color="#4B0A8F"
                        showTrend
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Attendance Trend Chart */}
        {data.attendanceTrend && data.attendanceTrend.length > 0 && (
          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-muted/20 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="size-4 text-[#4B0A8F]" />
                  Attendance Trend (14 Days)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2 px-4">
                <AttendanceChart data={data.attendanceTrend} height={220} />
              </CardContent>
            </Card>
          </motion.div>
        )}

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
              <div className="flex items-center gap-2 text-[#4B0A8F] dark:text-[#8A40B0]">
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
              <div className="rounded-xl bg-[#F3ECF6] p-2.5 dark:bg-[#1F086080]">
                <CalendarCheck className="size-5 text-[#4B0A8F] dark:text-[#8A40B0]" />
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