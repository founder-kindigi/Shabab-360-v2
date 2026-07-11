"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PKT } from "@/lib/timezone";
import {
  AlertTriangle,
  Megaphone,
  Clock,
  Bell,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { toZonedTime } from "@/lib/timezone";

// ─── Types ───────────────────────────────────────────────────────────

type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: "urgent" | "normal" | "low";
  targetRoles: string[];
  authorName: string;
  authorId: string;
  createdAt: string;
  expiresAt: string | null;
  isExpired: boolean;
};

type PriorityFilter = "all" | "urgent" | "normal" | "low";

// ─── Animation Config ────────────────────────────────────────────────

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: "easeOut" },
  }),
};

// ─── Priority Config ─────────────────────────────────────────────────

const priorityConfig: Record<
  string,
  {
    icon: typeof AlertTriangle;
    badgeClass: string;
    label: string;
  }
> = {
  urgent: {
    icon: AlertTriangle,
    badgeClass: "bg-red-500/10 text-red-600 border-0 dark:text-red-400",
    label: "Urgent",
  },
  normal: {
    icon: Megaphone,
    badgeClass: "bg-[#4B0A8F]/10 text-[#4B0A8F] border-0 dark:text-[#8A40B0] dark:bg-[#4B0A8F]/20",
    label: "Normal",
  },
  low: {
    icon: Clock,
    badgeClass: "bg-slate-100 text-slate-600 border-0 dark:bg-slate-800 dark:text-slate-400",
    label: "Low",
  },
};

const roleLabels: Record<string, string> = {
  super_admin: "Admin",
  program_admin: "Program Admin",
  city_head: "City Head",
  park_admin: "Park Admin",
  park_lead: "Park Lead",
  murabbi: "Murabbi",
  guardian: "Guardian",
  student: "Student",
};

// ─── Component ───────────────────────────────────────────────────────

export function StudentAnnouncementsPage() {
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");

  // Fetch announcements filtered by student role
  const { data: announcements, isLoading, error } = useQuery<Announcement[]>({
    queryKey: ["announcements", "student"],
    queryFn: () =>
      fetch("/api/announcements?role=student").then((r) => {
        if (!r.ok) throw new Error("Failed to load announcements");
        return r.json();
      }),
    staleTime: 30000,
  });

  // Filter by priority
  const filtered = useMemo(() => {
    if (!announcements) return [];
    if (priorityFilter === "all") return announcements;
    return announcements.filter((a) => a.priority === priorityFilter);
  }, [announcements, priorityFilter]);

  const filterPills: { key: PriorityFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "urgent", label: "Urgent" },
    { key: "normal", label: "Normal" },
    { key: "low", label: "Low" },
  ];

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* ─── Header ───────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <h2 className="text-lg font-bold text-foreground">Announcements</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Stay updated with the latest news and announcements
        </p>
      </motion.div>

      {/* ─── Priority Filter Pills ─────────────────────────────────── */}
      <motion.div variants={fadeUp} className="flex items-center gap-1.5">
        <Filter className="size-3.5 text-muted-foreground shrink-0" />
        {filterPills.map((pill) => (
          <Button
            key={pill.key}
            variant={priorityFilter === pill.key ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-7 text-xs px-3",
              priorityFilter === pill.key
                ? "bg-[#4B0A8F] hover:bg-[#4B0A8F] text-white border-0"
                : "hover:border-[#D4B8E3] hover:text-[#4B0A8F] dark:hover:border-[#2A0C8F99] dark:hover:text-[#8A40B0]"
            )}
            onClick={() => setPriorityFilter(pill.key)}
          >
            {pill.label}
            {pill.key !== "all" && (
              <span className="ml-1.5 text-[10px] opacity-70">
                {pill.key === "urgent"
                  ? (announcements || []).filter((a) => a.priority === "urgent").length
                  : pill.key === "normal"
                    ? (announcements || []).filter((a) => a.priority === "normal").length
                    : (announcements || []).filter((a) => a.priority === "low").length}
              </span>
            )}
          </Button>
        ))}
      </motion.div>

      {/* ─── Content ───────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-red-200 dark:border-red-800/50">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="size-6 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Failed to load announcements
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center p-6"
        >
          <div className="rounded-2xl bg-muted/60 p-5 ring-1 ring-border">
            <Bell className="size-8 text-muted-foreground/60" />
          </div>
          <div>
            <p className="font-medium text-foreground">No announcements</p>
            <p className="text-sm text-muted-foreground mt-1">
              {priorityFilter !== "all"
                ? `No ${priorityFilter} announcements found`
                : "There are no announcements at this time"}
            </p>
          </div>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filtered.map((announcement, i) => (
              <motion.div
                key={announcement.id}
                custom={i}
                variants={cardVariant}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                <AnnouncementCard announcement={announcement} />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </motion.div>
  );
}

// ─── Announcement Card Sub-component ─────────────────────────────────

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const config = priorityConfig[announcement.priority] || priorityConfig.normal;
  const PriorityIcon = config.icon;

  const formattedDate = (() => {
    try {
      const date = new Date(announcement.createdAt);
      const zoned = toZonedTime(date, PKT);
      return format(zoned, "dd MMM yyyy · h:mm a");
    } catch {
      return "";
    }
  })();

  return (
    <Card
      className={cn(
        "overflow-hidden border-border transition-all",
        announcement.isExpired && "opacity-60"
      )}
    >
      <CardContent className="p-4 space-y-2.5">
        {/* Top row: icon, title, badge */}
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex items-center justify-center size-9 rounded-lg shrink-0 mt-0.5",
              announcement.priority === "urgent"
                ? "bg-red-50 dark:bg-red-950/40"
                : announcement.priority === "normal"
                  ? "bg-[#F3ECF6] dark:bg-[#1F086099]"
                  : "bg-slate-100 dark:bg-slate-800"
            )}
          >
            <PriorityIcon
              className={cn(
                "size-4",
                announcement.priority === "urgent"
                  ? "text-red-500 dark:text-red-400"
                  : announcement.priority === "normal"
                    ? "text-[#4B0A8F] dark:text-[#8A40B0]"
                    : "text-slate-500 dark:text-slate-400"
              )}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold leading-tight">
                {announcement.title}
              </h3>
              <Badge className={cn("text-[10px] font-semibold px-2 py-0.5", config.badgeClass)}>
                {config.label}
              </Badge>
              {announcement.isExpired && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                  Expired
                </Badge>
              )}
            </div>
            {/* Content (truncated) */}
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
              {announcement.content.length > 200
                ? announcement.content.slice(0, 200) + "…"
                : announcement.content}
            </p>
          </div>
        </div>

        {/* Bottom row: author, date */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pl-12">
          <span className="font-medium text-foreground/80">{announcement.authorName}</span>
          <span>·</span>
          <span>{formattedDate}</span>
          {/* Target roles as small badges */}
          <div className="flex items-center gap-1">
            {(announcement.targetRoles || [])
              .slice(0, 3)
              .map((role) => (
                <Badge
                  key={role}
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 h-4 font-normal border-border"
                >
                  {roleLabels[role] || role}
                </Badge>
              ))}
            {(announcement.targetRoles || []).length > 3 && (
              <span className="text-[10px] text-muted-foreground/60">
                +{(announcement.targetRoles || []).length - 3}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}