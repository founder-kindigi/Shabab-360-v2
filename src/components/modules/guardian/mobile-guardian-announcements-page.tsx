"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/stores/useAppStore";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatPKT } from "@/lib/timezone";
import { ChevronLeft, AlertTriangle, Megaphone, Clock, CheckCheck, Eye } from "lucide-react";
import { toast } from "sonner";

type Announcement = { id: string; title: string; content: string; priority: "urgent" | "normal" | "low"; authorName: string; createdAt: string; isExpired: boolean; };

const stagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } };
const fadeUp: Variants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const priorityConfig = {
  urgent: { icon: AlertTriangle, bg: "bg-red-50 text-red-600", border: "border-red-200" },
  normal: { icon: Megaphone, bg: "bg-[#F3ECF6] text-[#4B0A8F]", border: "border-[#D4B8E3]" },
  low: { icon: Clock, bg: "bg-slate-100 text-slate-600", border: "border-slate-200" },
};

export function MobileGuardianAnnouncementsPage() {
  const { navigateTo } = useAppStore();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const { data: announcements, isLoading } = useQuery<Announcement[]>({
    queryKey: ["announcements", "guardian"],
    queryFn: () => fetch("/api/announcements?role=guardian").then(r => r.json()),
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 px-4 pt-4 pb-24 bg-background min-h-screen">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  const activeAnnouncements = announcements?.filter(a => !a.isExpired) || [];
  const unreadCount = activeAnnouncements.filter(a => !readIds.has(a.id)).length;

  const markAllAsRead = () => {
    const newSet = new Set(readIds);
    activeAnnouncements.forEach(a => newSet.add(a.id));
    setReadIds(newSet);
    toast.success("Marked all as read");
  };

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-background">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3 min-h-[60px] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0 h-11 w-11 rounded-xl" onClick={() => navigateTo("guardian-dashboard")}>
            <ChevronLeft className="size-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate">Announcements</h1>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl text-[#4B0A8F]" onClick={markAllAsRead}>
            <CheckCheck className="size-5" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-4">
        {activeAnnouncements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Megaphone className="size-12 text-muted-foreground/30 mb-4" />
            <p className="font-bold text-lg">All caught up!</p>
            <p className="text-sm text-muted-foreground">No new announcements to show.</p>
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
            {activeAnnouncements.map((ann) => {
              const cfg = priorityConfig[ann.priority] || priorityConfig.normal;
              const PrioIcon = cfg.icon;
              const isUnread = !readIds.has(ann.id);
              
              return (
                <motion.div key={ann.id} variants={fadeUp}>
                  <Card className={cn("rounded-2xl border transition-all overflow-hidden", isUnread ? "bg-card shadow-sm border-[#4B0A8F]/20" : "bg-muted/30 border-border")} onClick={() => {
                    if (isUnread) {
                      const ns = new Set(readIds); ns.add(ann.id); setReadIds(ns);
                    }
                  }}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0", cfg.bg)}>
                          <PrioIcon className="size-5" />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2 mb-1">
                            {isUnread && <Badge className="bg-[#FF0015] text-white text-[9px] border-0 px-1.5 py-0">NEW</Badge>}
                            <h3 className={cn("text-sm truncate", isUnread ? "font-bold text-foreground" : "font-semibold text-foreground/80")}>{ann.title}</h3>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-medium">By {ann.authorName} • {formatPKT(new Date(ann.createdAt), "MMM d, h:mm a")}</p>
                        </div>
                      </div>
                      <p className={cn("text-xs leading-relaxed", isUnread ? "text-foreground" : "text-muted-foreground")}>
                        {ann.content}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
        <div className="h-6" />
      </div>
    </div>
  );
}
