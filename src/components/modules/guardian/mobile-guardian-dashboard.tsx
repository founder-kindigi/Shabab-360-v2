"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/stores/useAppStore";
import { motion, type Variants } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { DataCard } from "@/components/layout/data-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/shared/sparkline";
import { formatPKT } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  GraduationCap,
  CalendarCheck,
  TrendingUp,
  Bell,
  ChevronRight,
  AlertTriangle,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Wallet,
  WalletIcon,
  History,
  CalendarDays,
  Megaphone,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

type ChildAttendance = {
  totalEvents30: number;
  present30: number;
  absent30: number;
  late30: number;
  excused30: number;
  rate30: number;
  rate7: number;
  last5: Array<{ date: string; status: string; title: string }>;
};

type ChildFees = {
  totalExpected: number;
  totalPaid: number;
  outstanding: number;
  upcomingFees: number;
  overdueFees: number;
};

type Announcement = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
};

type ChildData = {
  id: string;
  name: string;
  groupName: string | null;
  batchName: string | null;
  parkName: string | null;
  cityName: string | null;
  groupId: string;
  todayStatus: string | null;
  sparkline7Day: number[];
  attendance: ChildAttendance;
  fees?: ChildFees;
};

type TodayEvent = {
  id: string;
  title: string;
  isClosed: boolean;
  groupName: string;
  parkName: string | null;
  markedCount: number;
  participantCount: number;
  progress: number;
};

type DashboardData = {
  guardian: { name: string; phone: string } | null;
  children: ChildData[];
  todayEvents: TodayEvent[];
  unreadAnnouncements: number;
  todayDate: string;
  feesSummary?: { totalPaidThisMonth: number; totalOutstanding: number };
  recentAnnouncements?: Announcement[];
};

// ─── Animation Config ────────────────────────────────────────────────

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const avatarColors = [
  "bg-[#4B0A8F] text-white",
  "bg-[#A0006B] text-white",
  "bg-emerald-600 text-white",
  "bg-[#2A0C8F] text-white",
  "bg-amber-600 text-white",
  "bg-sky-600 text-white",
];

// ─── Helper Functions ────────────────────────────────────────────────

function rateColor(rate: number) {
  if (rate >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (rate >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function rateBarColor(rate: number) {
  if (rate >= 80) return "bg-emerald-500";
  if (rate >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "present":
      return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400";
    case "absent":
      return "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400";
    case "late":
      return "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400";
    case "excused":
      return "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "present": return "Present";
    case "absent": return "Absent";
    case "late": return "Late";
    case "excused": return "Excused";
    default: return "Unmarked";
  }
}

// ─── Component ───────────────────────────────────────────────────────

export function MobileGuardianDashboard() {
  const { navigateTo, setSelectedParticipantId } = useAppStore();

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["guardian-dashboard"],
    queryFn: () =>
      fetch("/api/guardian/dashboard").then((r) => {
        if (!r.ok) throw new Error("Failed to load dashboard");
        return r.json();
      }),
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 px-4 pt-4 pb-24">
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="rounded-2xl border-red-200 dark:border-red-800/50 m-4">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="size-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Could not load dashboard
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Please check your connection and try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const guardianName = data.guardian?.name || "Guardian";
  const children = data.children || [];
  const todayEvents = data.todayEvents || [];
  const unreadAnnouncements = data.unreadAnnouncements || 0;
  const recentAnnouncements = data.recentAnnouncements || [];

  const childrenWithEvents = children.filter((c) => c.attendance.totalEvents30 > 0);
  const avgRate30 = childrenWithEvents.length > 0
    ? Math.round(childrenWithEvents.reduce((sum, c) => sum + c.attendance.rate30, 0) / childrenWithEvents.length)
    : 0;

  const feesSummary = data.feesSummary;

  const handleViewChildDetails = (participantId: string) => {
    setSelectedParticipantId(participantId);
    navigateTo("guardian-history");
  };

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="flex flex-col min-h-screen pb-24 bg-background"
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3 flex flex-col justify-center min-h-[60px]">
        <p className="text-xs text-muted-foreground font-medium">Assalamu Alaikum,</p>
        <h1 className="text-lg font-bold truncate">{guardianName}</h1>
      </div>

      <div className="px-4 pt-4 space-y-6 flex-1 overflow-y-auto">
        {/* Metric Cards */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
          <DataCard title="My Children" value={children.length} icon={GraduationCap} variant="brand" className="rounded-2xl" />
          <DataCard title="Today's Sessions" value={todayEvents.length} icon={CalendarCheck} variant="sky" className="rounded-2xl" />
          <DataCard title="30-Day Rate" value={childrenWithEvents.length > 0 ? `${avgRate30}%` : "—"} icon={TrendingUp} variant="violet" className="rounded-2xl" />
          <DataCard title="Announcements" value={unreadAnnouncements} icon={Bell} variant="amber" pulse={unreadAnnouncements > 0} className="rounded-2xl" />
        </motion.div>

        {/* Quick Links */}
        <motion.div variants={fadeUp} className="space-y-3">
          <h3 className="text-sm font-semibold">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Card className="cursor-pointer rounded-2xl bg-card border hover:border-[#D4B8E3] transition-colors" onClick={() => navigateTo("guardian-fees")}>
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="size-11 rounded-full bg-[#F3ECF6] dark:bg-[#1F086099] flex items-center justify-center shrink-0">
                  <Wallet className="size-5 text-[#4B0A8F] dark:text-[#8A40B0]" />
                </div>
                <p className="text-sm font-medium">Fees</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer rounded-2xl bg-card border hover:border-[#D4B8E3] transition-colors" onClick={() => navigateTo("guardian-schedule")}>
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="size-11 rounded-full bg-[#F3ECF6] dark:bg-[#1F086099] flex items-center justify-center shrink-0">
                  <CalendarDays className="size-5 text-[#4B0A8F] dark:text-[#8A40B0]" />
                </div>
                <p className="text-sm font-medium">Schedule</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* My Children */}
        <motion.div variants={fadeUp} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">My Children</h3>
            <Badge variant="secondary" className="text-[10px] bg-[#F3ECF6] text-[#4B0A8F]">{children.length}</Badge>
          </div>

          {children.length === 0 ? (
            <Card className="rounded-2xl bg-card border">
              <CardContent className="p-6 text-center">
                <Users className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No children linked yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {children.map((child, index) => {
                const hasConsecutiveAbsences = child.attendance.last5.slice(0, 3).filter(r => r.status === 'absent').length >= 3;
                return (
                  <motion.div key={child.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, duration: 0.3 }}>
                    <Card className="rounded-2xl bg-card border overflow-hidden">
                      {hasConsecutiveAbsences && (
                         <div className="bg-red-500/10 px-4 py-2 flex items-center gap-2">
                           <AlertTriangle className="size-4 text-red-600" />
                           <span className="text-xs font-semibold text-red-600">Action Required: Consecutive Absences</span>
                         </div>
                      )}
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-start gap-3">
                          <div className={cn("flex items-center justify-center size-12 rounded-full text-sm font-bold shrink-0", avatarColors[index % avatarColors.length])} onClick={() => handleViewChildDetails(child.id)}>
                            {child.name.split(" ").map((w) => w.charAt(0)).join("").toUpperCase().slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold truncate cursor-pointer" onClick={() => handleViewChildDetails(child.id)}>{child.name}</p>
                              {child.todayStatus && (
                                <Badge className={cn("text-[10px] shrink-0 font-bold px-1.5 py-0 border-0", statusBadgeClass(child.todayStatus))}>
                                  {statusLabel(child.todayStatus)}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{child.groupName || "No group"}</p>
                          </div>
                          {child.sparkline7Day && child.sparkline7Day.filter((r) => r > 0).length >= 2 && (
                            <div className="shrink-0 pt-1">
                              <Sparkline data={child.sparkline7Day} width={60} height={24} color="#4B0A8F" />
                            </div>
                          )}
                        </div>

                        {/* Stats Ring / Bar */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground font-medium">30-day attendance</span>
                            <span className={cn("font-bold tabular-nums", rateColor(child.attendance.rate30))}>
                              {child.attendance.totalEvents30 > 0 ? `${child.attendance.rate30}%` : "No data"}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all duration-500", rateBarColor(child.attendance.rate30))} style={{ width: `${child.attendance.rate30}%` }} />
                          </div>
                        </div>

                        <Button variant="outline" className="w-full rounded-xl min-h-[44px] h-11 text-[#4B0A8F] font-semibold border-[#D4B8E3] hover:bg-[#F3ECF6]" onClick={() => handleViewChildDetails(child.id)}>
                          View Full History <ChevronRight className="size-4 ml-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
        <div className="h-6" />
      </div>
    </motion.div>
  );
}
