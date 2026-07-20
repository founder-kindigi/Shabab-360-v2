"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PKT, toZonedTime } from "@/lib/timezone";
import { formatPKT } from "@/lib/timezone";
import {
  AlertTriangle,
  Megaphone,
  Clock,
  Bell,
  Filter,
  ChevronDown,
  CheckCheck,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

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

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const cardVariant: Variants = {
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
    borderClass: string;
    iconBgClass: string;
    iconClass: string;
  }
> = {
  urgent: {
    icon: AlertTriangle,
    badgeClass: "bg-red-500/10 text-red-600 border-0 dark:text-red-400 dark:bg-red-500/20",
    label: "Urgent",
    borderClass: "border-l-[3px] border-l-red-500 dark:border-l-red-400",
    iconBgClass: "bg-red-50 dark:bg-red-950/40",
    iconClass: "text-red-500 dark:text-red-400",
  },
  normal: {
    icon: Megaphone,
    badgeClass: "bg-[#4B0A8F]/10 text-[#4B0A8F] border-0 dark:text-[#8A40B0] dark:bg-[#4B0A8F]/20",
    label: "Normal",
    borderClass: "border-l-[3px] border-l-[#4B0A8F] dark:border-l-[#8A40B0]",
    iconBgClass: "bg-[#F3ECF6] dark:bg-[#1F086099]",
    iconClass: "text-[#4B0A8F] dark:text-[#8A40B0]",
  },
  low: {
    icon: Clock,
    badgeClass: "bg-slate-100 text-slate-600 border-0 dark:bg-slate-800 dark:text-slate-400",
    label: "Low",
    borderClass: "border-l-[3px] border-l-slate-400 dark:border-l-slate-500",
    iconBgClass: "bg-slate-100 dark:bg-slate-800",
    iconClass: "text-slate-500 dark:text-slate-400",
  },
};

// ─── localStorage helpers ────────────────────────────────────────────

const STORAGE_KEY = "shabab360-student-read-announcements";

function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function setReadIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

// ─── Component ───────────────────────────────────────────────────────

export function StudentAnnouncementsPage() {
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [readIds, setReadIdsState] = useState<Set<string>>(new Set());

  // Hydrate readIds from localStorage after mount
  useState(() => {
    setReadIdsState(getReadIds());
  });

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

  // Unread count (non-expired, not read)
  const unreadCount = useMemo(
    () =>
      (announcements || []).filter(
        (a) => !a.isExpired && !readIds.has(a.id)
      ).length,
    [announcements, readIds]
  );

  const markAllAsRead = useCallback(() => {
    if (!announcements) return;
    const newSet = new Set(readIds);
    announcements.forEach((a) => {
      if (!a.isExpired) newSet.add(a.id);
    });
    setReadIdsState(newSet);
    setReadIds(newSet);
    toast.success("All announcements marked as read");
  }, [announcements, readIds]);

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
      <motion.div
        variants={fadeUp}
        className="flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <h2 className="text-lg font-bold text-foreground">Announcements</h2>
          {unreadCount > 0 && (
            <Badge className="bg-[#FF0015] text-white border-0 text-[10px] font-bold px-2 py-0.5">
              {unreadCount} new
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-[#4B0A8F] hover:text-[#6B20A0] hover:bg-[#F3ECF6] dark:text-[#8A40B0] dark:hover:bg-[#1F086080] h-8 gap-1.5"
            onClick={markAllAsRead}
          >
            <CheckCheck className="size-3.5" />
            Mark all as read
          </Button>
        )}
      </motion.div>

      <motion.div variants={fadeUp}>
        <p className="text-sm text-muted-foreground">
          Stay updated with the latest news and announcements
        </p>
      </motion.div>

      {/* ─── Priority Filter Pills ─────────────────────────────────── */}
      <motion.div variants={fadeUp} className="flex items-center gap-1.5 flex-wrap">
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
        <Card className="border-red-200 dark:border-red-800/50 bg-card">
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
                <AnnouncementCard
                  announcement={announcement}
                  isRead={readIds.has(announcement.id)}
                  onRead={(id) => {
                    const newSet = new Set(readIds);
                    newSet.add(id);
                    setReadIdsState(newSet);
                    setReadIds(newSet);
                  }}
                />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </motion.div>
  );
}

// ─── Announcement Card Sub-component ─────────────────────────────────

function AnnouncementCard({
  announcement,
  isRead,
  onRead,
}: {
  announcement: Announcement;
  isRead: boolean;
  onRead: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = priorityConfig[announcement.priority] || priorityConfig.normal;
  const PriorityIcon = config.icon;
  const isUnread = !isRead && !announcement.isExpired;
  const isLong = announcement.content.length > 150;

  const formattedDate = (() => {
    try {
      return formatPKT(new Date(announcement.createdAt), "dd MMM yyyy · h:mm a");
    } catch {
      return "";
    }
  })();

  const handleExpand = () => {
    if (isLong) {
      setExpanded((prev) => !prev);
    }
    // Mark as read on click
    if (isUnread) {
      onRead(announcement.id);
    }
  };

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200 bg-card",
        config.borderClass,
        announcement.isExpired && "opacity-60",
        isUnread
          ? "hover:shadow-md dark:hover:shadow-[#4B0A8F]/5"
          : "hover:shadow-sm"
      )}
    >
      <CardContent className="p-4 space-y-2.5">
        {/* Top row: icon, title, badges */}
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex items-center justify-center size-9 rounded-lg shrink-0 mt-0.5 relative",
              config.iconBgClass
            )}
          >
            <PriorityIcon className={cn("size-4", config.iconClass)} />
            {/* Pulsing dot for urgent + unread */}
            {announcement.priority === "urgent" && isUnread && (
              <span className="absolute -top-0.5 -right-0.5">
                <span className="flex size-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-2.5 bg-red-500" />
                </span>
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {/* "New" badge for unread */}
              {isUnread && (
                <Badge className="bg-[#FF0015] text-white border-0 text-[9px] font-bold px-1.5 py-0 h-4 leading-none">
                  NEW
                </Badge>
              )}
              <h3
                className={cn(
                  "text-sm leading-tight cursor-pointer",
                  isUnread ? "font-bold text-foreground" : "font-semibold text-foreground/90"
                )}
                onClick={handleExpand}
              >
                {announcement.title}
              </h3>
              <Badge
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 shrink-0",
                  config.badgeClass
                )}
              >
                {config.label}
              </Badge>
              {announcement.isExpired && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-muted text-muted-foreground">
                  Expired
                </Badge>
              )}
            </div>

            {/* Content — expandable */}
            <div
              className={cn(
                "text-xs text-muted-foreground mt-1.5 leading-relaxed cursor-pointer",
                isLong && !expanded && "line-clamp-2"
              )}
              onClick={handleExpand}
            >
              {expanded || !isLong
                ? announcement.content
                : announcement.content.slice(0, 150) + "…"}
            </div>

            {/* Expand/collapse indicator */}
            {isLong && (
              <button
                onClick={handleExpand}
                className="flex items-center gap-0.5 text-[11px] text-[#4B0A8F] dark:text-[#8A40B0] hover:underline mt-1 font-medium"
              >
                {expanded ? "Show less" : "Read more"}
                <ChevronDown
                  className={cn(
                    "size-3 transition-transform duration-200",
                    expanded && "rotate-180"
                  )}
                />
              </button>
            )}
          </div>
        </div>

        {/* Bottom row: author, date */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pl-12">
          <span className="font-medium text-foreground/80">
            {announcement.authorName}
          </span>
          <span>·</span>
          <span>{formattedDate}</span>
          {isUnread && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1 text-[#4B0A8F] dark:text-[#8A40B0]">
                <Eye className="size-3" />
                Unread
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
