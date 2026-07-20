"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, type Variants } from "framer-motion";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toPKT, formatPKT } from "@/lib/timezone";
import {
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  Clock,
  Users,
  MapPin,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ==================== TYPES ====================

type ChildEvent = {
  id: string;
  title: string;
  eventDate: string;
  dayOfWeek: number;
  dateStr: string;
  timeStr: string;
  isClosed: boolean;
  markedCount: number;
};

type ChildData = {
  participant: { id: string; name: string };
  group: {
    id: string;
    name: string;
    batchName: string | null;
    parkName: string | null;
  };
  events: ChildEvent[];
};

type ScheduleData = {
  children: ChildData[];
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
};

// ==================== HELPERS ====================

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

function getWeekDays(weekStart: string) {
  const start = new Date(weekStart);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const pkt = toPKT(d);
    return {
      dayOfWeek: i,
      dateNum: pkt.getDate(),
      dateStr: formatPKT(pkt, "yyyy-MM-dd"),
      isToday: formatPKT(toPKT(new Date()), "yyyy-MM-dd") === formatPKT(pkt, "yyyy-MM-dd"),
    };
  });
}

// ==================== COMPONENT ====================

export function GuardianSchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0);

  const { data, isLoading, error } = useQuery<ScheduleData>({
    queryKey: ["guardian-schedule", weekOffset],
    queryFn: () =>
      fetch(`/api/guardian/schedule?weekOffset=${weekOffset}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load schedule");
        return r.json();
      }),
    staleTime: 30000,
  });

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-52" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    );
  }

  // ── Error State ──
  if (error || !data) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Could not load schedule"
        description="There was an error loading schedule data. Please try again."
      />
    );
  }

  const { children, weekStart, weekLabel } = data;
  const weekDays = getWeekDays(weekStart);

  // Collect all events grouped by day for the detailed list
  const eventsByDay: Array<{
    dayIdx: number;
    dayLabel: string;
    dateStr: string;
    events: Array<{
      childName: string;
      title: string;
      groupName: string;
      parkName: string | null;
      timeStr: string;
      isClosed: boolean;
    }>;
  }> = [];

  for (let d = 0; d < 7; d++) {
    const dayEvents: typeof eventsByDay[0]["events"] = [];
    for (const child of children) {
      const ev = child.events.find((e) => e.dayOfWeek === d);
      if (ev) {
        dayEvents.push({
          childName: child.participant.name,
          title: ev.title,
          groupName: child.group.name,
          parkName: child.group.parkName,
          timeStr: ev.timeStr,
          isClosed: ev.isClosed,
        });
      }
    }
    if (dayEvents.length > 0) {
      eventsByDay.push({
        dayIdx: d,
        dayLabel: DAY_FULL[d],
        dateStr: weekDays[d].dateStr,
        events: dayEvents,
      });
    }
  }

  const totalEvents = children.reduce((s, c) => s + c.events.length, 0);

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* ── 1. Header ── */}
      <motion.div variants={fadeUp}>
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#2A0C8F] via-[#A0006B] to-[#FF0015] px-5 py-4 md:px-6 md:py-5 text-white shadow-lg">
          <div className="absolute -top-6 -right-6 size-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -right-4 size-16 rounded-full bg-white/5" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Schedule</h1>
              <p className="text-white/70 text-sm mt-0.5">
                Your children&apos;s weekly session schedule
              </p>
            </div>

            {/* Week Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/15"
                onClick={() => setWeekOffset((w) => w - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="text-center min-w-[160px]">
                <p className="text-sm font-medium">{weekLabel}</p>
                {weekOffset === 0 && (
                  <p className="text-[10px] text-white/60">This Week</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/15"
                onClick={() => setWeekOffset((w) => Math.min(w + 1, 0))}
                disabled={weekOffset >= 0}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 2. Per-child calendar strips ── */}
      {children.length === 0 ? (
        <motion.div variants={fadeUp}>
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="size-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                No children linked to your account
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Contact your park admin to link children
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className="space-y-4">
          {children.map((child) => (
            <Card key={child.participant.id} className="overflow-hidden">
              <CardContent className="p-4">
                {/* Child info */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center size-9 rounded-full bg-[#F3ECF6] dark:bg-[#1F086080]">
                    <GraduationCap className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">
                      {child.participant.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {child.group.parkName && (
                        <>
                          <MapPin className="size-3" />
                          <span className="truncate">{child.group.parkName}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge className="text-[10px] bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0] shrink-0">
                    {child.group.name}
                  </Badge>
                </div>

                {/* Weekly strip — horizontal on mobile */}
                <div className="overflow-x-auto">
                  <div className="flex gap-1.5 min-w-[500px]">
                    {weekDays.map((day, i) => {
                      const event = child.events.find(
                        (e) => e.dayOfWeek === i
                      );
                      const isToday = day.isToday;

                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex-1 min-w-[68px] rounded-lg p-2 text-center transition-colors",
                            isToday
                              ? "bg-[#F3ECF6] dark:bg-[#1F086080] ring-1 ring-[#D4B8E3] dark:ring-[#2A0C8F]"
                              : "bg-muted/30",
                            event && !event.isClosed && "bg-[#F5E8EF] dark:bg-[#2A0C8F33]"
                          )}
                        >
                          <p
                            className={cn(
                              "text-[10px] uppercase tracking-wider font-medium",
                              isToday
                                ? "text-[#4B0A8F] dark:text-[#8A40B0]"
                                : "text-muted-foreground"
                            )}
                          >
                            {DAY_LABELS[i]}
                          </p>
                          <p
                            className={cn(
                              "text-base font-bold mt-0.5",
                              isToday
                                ? "text-[#4B0A8F] dark:text-[#8A40B0]"
                                : "text-foreground"
                            )}
                          >
                            {day.dateNum}
                          </p>
                          {event ? (
                            <div className="mt-1.5">
                              <div
                                className={cn(
                                  "mx-auto size-2 rounded-full",
                                  event.isClosed
                                    ? "bg-muted-foreground/60"
                                    : "bg-[#A0006B]"
                                )}
                              />
                              <p className="text-[9px] font-medium mt-1 truncate text-foreground/80">
                                {event.title}
                              </p>
                            </div>
                          ) : (
                            <div className="mt-1.5 h-6" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* ── 3. Detailed List ── */}
      <motion.div variants={fadeUp} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">This Week&apos;s Sessions</h3>
          <Badge variant="outline" className="text-[10px] font-normal">
            {totalEvents} {totalEvents === 1 ? "session" : "sessions"}
          </Badge>
        </div>

        {eventsByDay.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <CalendarClock className="size-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No sessions scheduled this week
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {eventsByDay.map((dayGroup) => (
              <motion.div
                key={dayGroup.dayIdx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="overflow-hidden">
                  <div className="px-4 py-2 bg-muted/30 border-b">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {dayGroup.dayLabel}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {dayGroup.dateStr}
                      </p>
                    </div>
                  </div>
                  <CardContent className="p-3 space-y-2">
                    {dayGroup.events.map((ev, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div
                          className={cn(
                            "size-2 rounded-full shrink-0",
                            ev.isClosed
                              ? "bg-muted-foreground/60"
                              : "bg-[#A0006B]"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">
                            {ev.title}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                            <span className="font-medium text-foreground/80">
                              {ev.childName}
                            </span>
                            <span>&middot;</span>
                            <span>{ev.groupName}</span>
                            {ev.parkName && (
                              <>
                                <span>&middot;</span>
                                <span className="truncate">{ev.parkName}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Clock className="size-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">
                            {ev.timeStr}
                          </span>
                          <Badge
                            variant={ev.isClosed ? "secondary" : "default"}
                            className={cn(
                              "text-[9px] ml-1",
                              ev.isClosed
                                ? "bg-muted text-muted-foreground"
                                : "bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0]"
                            )}
                          >
                            {ev.isClosed ? "Done" : "Open"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
