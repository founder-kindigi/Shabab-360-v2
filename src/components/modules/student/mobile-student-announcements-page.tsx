"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatPKT } from "@/lib/timezone";
import {
  AlertTriangle,
  Megaphone,
  Clock,
  Bell,
  ChevronDown,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: "urgent" | "normal" | "low";
  targetRoles: string[];
  authorName: string;
  createdAt: string;
  isExpired: boolean;
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

const cardVariant: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: "easeOut" },
  }),
};

// ─── Priority Config ─────────────────────────────────────────────────

const priorityConfig: Record<string, any> = {
  urgent: {
    icon: AlertTriangle,
    badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400",
    borderClass: "border-l-4 border-l-red-500",
    iconBgClass: "bg-red-50 dark:bg-red-950/40 text-red-500",
  },
  normal: {
    icon: Megaphone,
    badgeClass: "bg-[#4B0A8F]/10 text-[#4B0A8F]",
    borderClass: "border-l-4 border-l-[#4B0A8F]",
    iconBgClass: "bg-[#4B0A8F]/10 text-[#4B0A8F]",
  },
  low: {
    icon: Clock,
    badgeClass: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    borderClass: "border-l-4 border-l-slate-400",
    iconBgClass: "bg-slate-100 dark:bg-slate-800 text-slate-500",
  },
};

// ─── Component ───────────────────────────────────────────────────────

export function MobileStudentAnnouncementsPage() {
  const { data: announcements, isLoading, error } = useQuery<Announcement[]>({
    queryKey: ["announcements", "student"],
    queryFn: () =>
      fetch("/api/announcements?role=student").then((r) => {
        if (!r.ok) throw new Error("Failed to load announcements");
        return r.json();
      }),
    staleTime: 30000,
  });

  const validAnnouncements = useMemo(() => {
    return (announcements || []).filter(a => !a.isExpired);
  }, [announcements]);

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border/50">
        <h1 className="text-lg font-bold">Announcements</h1>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
          ) : error ? (
            <div className="p-4 space-y-4">
              <Card className="rounded-2xl border-red-200 dark:border-red-800/50 bg-card">
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="size-8 text-red-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    Failed to load announcements
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : validAnnouncements.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground text-center">
              <Bell className="size-10 opacity-40" />
              <p className="text-sm font-medium">No announcements</p>
            </div>
          ) : (
            <AnimatePresence>
              <div className="space-y-3">
                {validAnnouncements.map((announcement, i) => (
                  <motion.div key={announcement.id} custom={i} variants={cardVariant} initial="hidden" animate="visible">
                    <AnnouncementCard announcement={announcement} />
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}

          {/* Bottom spacer */}
          <div className="h-6" />
        </motion.div>
      </div>
    </div>
  );
}

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const [expanded, setExpanded] = useState(false);
  const config = priorityConfig[announcement.priority] || priorityConfig.normal;
  const PriorityIcon = config.icon;
  const isLong = announcement.content.length > 150;

  const formattedDate = (() => {
    try {
      return formatPKT(new Date(announcement.createdAt), "dd MMM yyyy · h:mm a");
    } catch {
      return "";
    }
  })();

  return (
    <Card className={cn("rounded-2xl border bg-card shadow-sm overflow-hidden", config.borderClass)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className={cn("rounded-xl p-2 shrink-0 flex items-center justify-center", config.iconBgClass)}>
            <PriorityIcon className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-bold text-sm leading-tight text-foreground">{announcement.title}</h3>
              <Badge className={cn("text-[9px] uppercase font-bold px-1.5 py-0 border-0 shrink-0", config.badgeClass)}>
                {announcement.priority}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              By {announcement.authorName} · {formattedDate}
            </p>
          </div>
        </div>

        <div className="pl-12">
          <div
            className={cn("text-sm text-muted-foreground leading-relaxed", !expanded && isLong && "line-clamp-2")}
            onClick={() => isLong && setExpanded(!expanded)}
          >
            {announcement.content}
          </div>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#4B0A8F] hover:underline mt-2"
            >
              {expanded ? "Show less" : "Read more"}
              <ChevronDown className={cn("size-3 transition-transform", expanded && "rotate-180")} />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
