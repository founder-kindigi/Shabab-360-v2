"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, type Variants } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  CalendarCheck,
  CalendarClock,
  AlertTriangle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

type ScheduleEvent = {
  id: string;
  title: string;
  eventDate: string;
  dayOfWeek: number;
  dateStr: string;
  timeStr: string;
  isClosed: boolean;
  myStatus: string | null;
};

type ScheduleData = {
  events: ScheduleEvent[];
  weekStart: string;
  weekLabel: string;
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

// ─── Component ───────────────────────────────────────────────────────

export function MobileStudentSchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0);

  const { data, isLoading, error } = useQuery<ScheduleData>({
    queryKey: ["student-schedule", weekOffset],
    queryFn: () =>
      fetch(`/api/student/schedule?weekOffset=${weekOffset}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load schedule");
        return r.json();
      }),
    staleTime: 30000,
  });

  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border/50">
        <h1 className="text-lg font-bold">Schedule</h1>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          
          {/* Week Selector */}
          <motion.div variants={fadeUp} className="flex items-center justify-between bg-card rounded-2xl p-2 border shadow-sm">
            <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => w - 1)} className="rounded-xl h-10 w-10">
              <ChevronLeft className="size-5" />
            </Button>
            <div className="text-center">
              <span className="font-bold text-[#4B0A8F] text-sm">{data?.weekLabel || "Loading..."}</span>
              {weekOffset === 0 && <p className="text-[10px] text-muted-foreground uppercase">This Week</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => Math.min(w + 1, 0))} disabled={weekOffset >= 0} className="rounded-xl h-10 w-10">
              <ChevronRight className="size-5" />
            </Button>
          </motion.div>

          {/* Days */}
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          ) : error || !data ? (
            <div className="p-4 text-center text-red-500">
              <AlertTriangle className="size-8 mx-auto mb-2" />
              <p>Failed to load schedule</p>
            </div>
          ) : (
            <div className="space-y-3">
              {DAY_LABELS.map((dayLabel, index) => {
                const event = data.events.find(e => e.dayOfWeek === index);
                
                return (
                  <motion.div key={index} variants={fadeUp}>
                    <Card className={cn(
                      "rounded-2xl border bg-card shadow-sm overflow-hidden",
                      event ? "border-l-4 border-l-[#4B0A8F]" : "border-l-4 border-l-muted"
                    )}>
                      <CardContent className="p-0 flex items-stretch">
                        <div className="bg-muted/30 p-3 w-16 shrink-0 flex flex-col items-center justify-center text-center border-r">
                          <p className="text-xs uppercase tracking-wide font-medium text-muted-foreground">{dayLabel}</p>
                          {event && <p className="text-sm font-bold text-[#4B0A8F] mt-0.5">{event.dateStr.split('-')[2]}</p>}
                        </div>
                        <div className="p-3 flex-1 flex flex-col justify-center">
                          {event ? (
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-start gap-2">
                                <h3 className="font-semibold text-sm leading-tight">{event.title}</h3>
                                {event.isClosed ? (
                                  <Badge className="bg-muted text-muted-foreground text-[9px] px-1.5 py-0">Closed</Badge>
                                ) : (
                                  <Badge className="bg-[#4B0A8F]/10 text-[#4B0A8F] border-0 text-[9px] px-1.5 py-0">Open</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="size-3" />
                                <span>{event.timeStr}</span>
                              </div>
                              {event.myStatus && (
                                <Badge className="text-[10px] uppercase font-bold mt-1 inline-block">
                                  {event.myStatus}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-muted-foreground/60 text-sm italic py-2">
                              No session scheduled
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Bottom spacer */}
          <div className="h-6" />
        </motion.div>
      </div>
    </div>
  );
}
