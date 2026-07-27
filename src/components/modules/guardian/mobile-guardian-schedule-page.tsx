"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/stores/useAppStore";
import { motion, type Variants } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toPKT, formatPKT } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, CalendarClock, Clock, MapPin, GraduationCap } from "lucide-react";

type ChildEvent = { id: string; title: string; eventDate: string; dayOfWeek: number; dateStr: string; timeStr: string; isClosed: boolean; markedCount: number; };
type ChildData = { participant: { id: string; name: string }; group: { id: string; name: string; batchName: string | null; parkName: string | null; }; events: ChildEvent[]; };
type ScheduleData = { children: ChildData[]; weekStart: string; weekEnd: string; weekLabel: string; };

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const stagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } };
const fadeUp: Variants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

function getWeekDays(weekStart: string) {
  const start = new Date(weekStart);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const pkt = toPKT(d);
    return { dayOfWeek: i, dateNum: pkt.getDate(), dateStr: formatPKT(pkt, "yyyy-MM-dd"), isToday: formatPKT(toPKT(new Date()), "yyyy-MM-dd") === formatPKT(pkt, "yyyy-MM-dd") };
  });
}

export function MobileGuardianSchedulePage() {
  const { navigateTo } = useAppStore();
  const [weekOffset, setWeekOffset] = useState(0);

  const { data, isLoading } = useQuery<ScheduleData>({
    queryKey: ["guardian-schedule", weekOffset],
    queryFn: () => fetch(`/api/guardian/schedule?weekOffset=${weekOffset}`).then(r => r.json()),
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 px-4 pt-4 pb-24 bg-background min-h-screen">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!data) return null;

  const { children, weekStart, weekLabel } = data;
  const weekDays = getWeekDays(weekStart);
  const totalEvents = children.reduce((s, c) => s + c.events.length, 0);

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-background">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3 min-h-[60px] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0 h-11 w-11 rounded-xl" onClick={() => navigateTo("guardian-dashboard")}>
            <ChevronLeft className="size-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate">Schedule</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-6">
        <motion.div variants={fadeUp} className="flex items-center justify-between bg-card border rounded-2xl p-2 px-4 shadow-sm">
          <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft className="size-5" />
          </Button>
          <div className="text-center font-bold text-sm">
            {weekLabel}
            {weekOffset === 0 && <p className="text-[10px] text-emerald-600 font-semibold">This Week</p>}
          </div>
          <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl" onClick={() => setWeekOffset(w => Math.min(w + 1, 0))} disabled={weekOffset >= 0}>
            <ChevronRight className="size-5" />
          </Button>
        </motion.div>

        {children.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <CalendarClock className="size-12 text-muted-foreground/30 mb-4" />
            <p className="font-bold">No Schedule Found</p>
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
            {children.map((child) => (
              <motion.div key={child.participant.id} variants={fadeUp}>
                <Card className="rounded-2xl bg-card border overflow-hidden">
                  <div className="bg-[#4B0A8F]/5 p-4 border-b">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-[#4B0A8F] text-white flex items-center justify-center font-bold text-sm">
                        {child.participant.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{child.participant.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{child.group.name}</p>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {weekDays.map((day, i) => {
                        const event = child.events.find(e => e.dayOfWeek === i);
                        const isToday = day.isToday;
                        if (!event && !isToday) return null; // Show today always, else only events
                        
                        return (
                          <div key={i} className={cn("p-4 flex gap-4", isToday && "bg-[#4B0A8F]/5")}>
                            <div className="flex flex-col items-center w-12 shrink-0">
                              <span className={cn("text-[10px] font-bold uppercase", isToday ? "text-[#4B0A8F]" : "text-muted-foreground")}>{DAY_LABELS[i]}</span>
                              <span className={cn("text-lg font-black", isToday ? "text-[#4B0A8F]" : "text-foreground")}>{day.dateNum}</span>
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              {event ? (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold truncate pr-2">{event.title}</p>
                                    <Badge className={cn("text-[10px] shrink-0 border-0", event.isClosed ? "bg-muted text-muted-foreground" : "bg-emerald-100 text-emerald-700")}>
                                      {event.isClosed ? "Done" : "Open"}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                    <Clock className="size-3.5" />
                                    <span>{event.timeStr}</span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm font-medium text-muted-foreground italic">No session</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
        <div className="h-6" />
      </div>
    </div>
  );
}
