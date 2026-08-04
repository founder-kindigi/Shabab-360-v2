"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/stores/useAppStore";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CalendarCheck,
  Circle,
  Lock,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EventItem = {
  id: string | null;
  title: string;
  groupId: string;
  groupName: string;
  batchName?: string;
  isScheduled?: boolean;
  eventDate: string;
  isClosed: boolean;
  participantCount: number;
  markedCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  progress: number;
  closedAt: string | null;
  closedByName: string | null;
};

type FilterStatus = "all" | "open" | "closed";

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: "easeOut" },
  }),
};

function progressColor(progress: number) {
  if (progress >= 80) return "bg-[#4B0A8F]";
  if (progress >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function getDateLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-PK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ParkAttendancePage() {
  const { navigateTo, setSelectedEventId } = useAppStore();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<FilterStatus>("all");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Fetch today's events
  const { data, isLoading, error } = useQuery<{
    date: string;
    parkId: string;
    events: EventItem[];
  }>({
    queryKey: ["park-attendance", filter, selectedDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      params.set("date", selectedDate);
      return fetch(`/api/park/attendance?${params}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load events");
        return r.json();
      });
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const materializeMutation = useMutation({
    mutationFn: (body: { groupId: string; eventDate: string }) =>
      fetch("/api/park/attendance/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => { throw new Error(e.error || "Failed"); });
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Attendance session is ready");
      queryClient.invalidateQueries({ queryKey: ["park-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["park-dashboard"] });
    },
    onError: (err: Error) => {
      if (err.message.includes("already exists")) {
        toast.error("This attendance session is already being opened. Please try again.");
      } else {
        toast.error(err.message || "Could not open attendance");
      }
    },
  });

  const handleMarkAttendance = (event: EventItem) => {
    if (!event.id) {
      materializeMutation.mutate(
        { groupId: event.groupId, eventDate: event.eventDate },
        {
          onSuccess: (result) => {
            setSelectedEventId(result.event.id);
            navigateTo("park-attendance-roster");
          },
        },
      );
      return;
    }
    setSelectedEventId(event.id);
    navigateTo("park-attendance-roster");
  };

  const events = data?.events || [];
  const selectedDateLabel = getDateLabel(data?.date || selectedDate);

  const filters: { label: string; value: FilterStatus; count: number }[] = [
    { label: "All", value: "all", count: events.length },
    {
      label: "Open",
      value: "open",
      count: events.filter((e) => !e.isClosed).length,
    },
    {
      label: "Closed",
      value: "closed",
      count: events.filter((e) => e.isClosed).length,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Attendance"
          description="Mark and manage daily attendance"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-2 bg-muted rounded-full w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Attendance" description="Mark and manage daily attendance" />
        <EmptyState
          icon={CalendarCheck}
          title="Could not load events"
          description="There was an error fetching today's events. Please try again."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Mark and manage daily attendance"
      />

      {/* Date header */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="size-4" />
        <label className="font-medium" htmlFor="attendance-date">Class date</label>
        <input
          id="attendance-date"
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
        />
        <span className="text-xs">{selectedDateLabel}</span>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors",
              filter === f.value
                ? "bg-[#4B0A8F] text-white shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {f.label}{" "}
            <span
              className={cn(
                "ml-1 text-xs",
                filter === f.value ? "text-white/70" : "text-muted-foreground/70"
              )}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Events grid */}
      {events.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No events today"
          description={
            filter !== "all"
              ? `No ${filter} events found. Try a different filter.`
              : "No class is scheduled for this date. Classes run on Saturdays and Sundays, excluding configured off days."
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                layout
              >
                <Card
                  className={cn(
                    "overflow-hidden transition-shadow hover:shadow-md cursor-pointer border",
                    event.isClosed
                      ? "border-border/60"
                      : "border-[#D4B8E3] dark:border-[#2A0C8F80]"
                  )}
                  onClick={() =>
                    event.isClosed
                      ? null
                      : handleMarkAttendance(event)
                  }
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Top row: status + title */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {event.isClosed ? (
                          <Lock className="size-4 text-muted-foreground shrink-0" />
                        ) : (
                          <Circle className="size-4 text-[#4B0A8F] dark:text-[#8A40B0] fill-[#4B0A8F] dark:fill-[#8A40B0] shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {event.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {event.groupName}{event.batchName ? ` · ${event.batchName}` : ""}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={event.isClosed ? "secondary" : "default"}
                        className={cn(
                          "shrink-0 text-[10px] px-2 py-0",
                          event.isClosed
                            ? "bg-muted text-muted-foreground"
                            : "bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F0860] dark:text-[#8A40B0]"
                        )}
                      >
                        {event.isClosed ? "Closed" : "Open"}
                      </Badge>
                    </div>

                    {/* Progress section */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {event.markedCount} / {event.participantCount} marked
                        </span>
                        <span
                          className={cn(
                            "font-semibold",
                            event.progress >= 80
                              ? "text-[#4B0A8F] dark:text-[#8A40B0]"
                              : event.progress >= 50
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {event.progress}%
                        </span>
                      </div>
                      <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className={cn(
                            "h-full rounded-full",
                            progressColor(event.progress)
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${event.progress}%` }}
                          transition={{ duration: 0.6, delay: i * 0.06 + 0.2 }}
                        />
                      </div>
                    </div>

                    {/* Breakdown mini badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {event.presentCount > 0 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F0860] dark:text-[#8A40B0]">
                          P:{event.presentCount}
                        </span>
                      )}
                      {event.absentCount > 0 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                          A:{event.absentCount}
                        </span>
                      )}
                      {event.lateCount > 0 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                          L:{event.lateCount}
                        </span>
                      )}
                      {event.excusedCount > 0 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400">
                          E:{event.excusedCount}
                        </span>
                      )}
                    </div>

                    {/* Action button */}
                    <Button
                      variant={event.isClosed ? "outline" : "default"}
                      size="sm"
                      className={cn(
                        "w-full mt-1",
                        !event.isClosed &&
                          "bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!event.isClosed) {
                          handleMarkAttendance(event);
                        }
                      }}
                    >
                      {event.isClosed ? (
                        <>
                          View Summary
                          <ChevronRight className="size-3.5 ml-1.5" />
                        </>
                      ) : (
                        <>
                          Mark Attendance
                          <ChevronRight className="size-3.5 ml-1.5" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

    </div>
  );
}
