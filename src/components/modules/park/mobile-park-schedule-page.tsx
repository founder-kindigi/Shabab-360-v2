"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type ScheduleEvent = {
  id: string;
  title: string;
  time: string;
  groupName: string;
  location: string;
  instructor: string;
};

type WeeklySchedule = Record<string, ScheduleEvent[]>;

export function MobileParkSchedulePage() {
  // Determine current day to set as default (Mon-Sun -> 0-6 index)
  const currentDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const [activeDay, setActiveDay] = useState(DAYS[currentDayIndex]);

  const { data: schedule = {}, isLoading } = useQuery<WeeklySchedule>({
    queryKey: ["park-schedule"],
    queryFn: () => fetch("/api/park/schedule").then(r => r.json()),
  });

  const dayEvents = schedule[activeDay] || [];

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b space-y-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#4B0A8F]" />
          Weekly Schedule
        </h1>

        {/* Day Pills */}
        <div className="flex justify-between gap-1 overflow-x-auto no-scrollbar pb-1">
          {DAYS.map(day => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={cn(
                "flex flex-col items-center justify-center w-[13%] aspect-square rounded-2xl transition-all",
                activeDay === day
                  ? "bg-[#4B0A8F] text-white shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <span className="text-[10px] font-medium uppercase tracking-wider">{day}</span>
              <span className={cn(
                "text-xs font-bold mt-0.5",
                activeDay === day ? "text-white" : "text-foreground"
              )}>
                {/* Simulated dates relative to week start could go here, omitting for simplicity */}
                &bull;
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Events */}
      <div className="p-4 space-y-3 relative">
        {/* Timeline line */}
        <div className="absolute left-[39px] top-6 bottom-6 w-0.5 bg-muted/60 z-0" />

        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4 relative z-10">
              <Skeleton className="w-12 h-6 shrink-0 rounded-md" />
              <Skeleton className="h-28 flex-1 rounded-2xl" />
            </div>
          ))
        ) : dayEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center relative z-10">
            <Clock className="w-12 h-12 opacity-20 mb-3" />
            <p className="font-medium">No events scheduled for {activeDay}</p>
          </div>
        ) : (
          dayEvents.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="flex gap-4 relative z-10"
            >
              {/* Time column */}
              <div className="w-12 shrink-0 pt-2 text-right">
                <span className="text-xs font-bold text-muted-foreground bg-background py-1 relative z-10">
                  {event.time}
                </span>
                {/* Timeline dot */}
                <div className="absolute left-[23px] top-[14px] w-2.5 h-2.5 rounded-full bg-[#4B0A8F] ring-4 ring-background" />
              </div>

              {/* Event Card */}
              <Card className="flex-1 rounded-2xl border shadow-sm overflow-hidden bg-card">
                <CardContent className="p-4">
                  <div className="mb-2">
                    <span className="text-[10px] font-bold text-[#4B0A8F] bg-[#F3ECF6] px-2 py-0.5 rounded-full">
                      {event.groupName}
                    </span>
                  </div>
                  <h3 className="font-bold text-base mb-3 leading-tight">{event.title}</h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 text-[#4B0A8F]/70" />
                      <span className="truncate">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5 text-[#4B0A8F]/70" />
                      <span className="truncate">{event.instructor}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
        <div className="h-6" />
      </div>
    </div>
  );
}
