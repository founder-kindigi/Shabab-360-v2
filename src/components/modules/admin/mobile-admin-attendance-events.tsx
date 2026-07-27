"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Filter, 
  CalendarCheck, 
  Lock, 
  Search,
  ChevronDown,
  TreePine,
  MapPin,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

function MobileEventCard({ event, index }: { event: any, index: number }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        "rounded-2xl border bg-card overflow-hidden",
        event.isClosed ? "border-muted" : "border-[#4B0A8F]/20 shadow-sm"
      )}
    >
      <div className="p-4 space-y-3" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between">
          <div className="min-w-0 pr-2">
            <h3 className="font-bold text-sm truncate">{event.title}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <TreePine className="size-3" />
              <span className="truncate">{event.parkName}</span>
            </div>
          </div>
          <Badge className={cn(
            "shrink-0 text-[10px] font-bold",
            event.isClosed ? "bg-muted text-muted-foreground hover:bg-muted" : "bg-[#4B0A8F]/10 text-[#4B0A8F] hover:bg-[#4B0A8F]/20"
          )}>
            {event.isClosed ? <Lock className="size-2.5 mr-1" /> : null}
            {event.isClosed ? "Closed" : "Open"}
          </Badge>
        </div>

        <div>
          <div className="flex items-center justify-between text-[10px] mb-1.5 font-medium">
            <span className="text-muted-foreground">
              {event.markedCount} / {event.participantCount} marked
            </span>
            <span className={cn(
              event.progress >= 80 ? "text-emerald-600" : event.progress >= 50 ? "text-amber-600" : "text-red-600"
            )}>
              {event.progress}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all", event.progress >= 80 ? "bg-emerald-500" : event.progress >= 50 ? "bg-amber-500" : "bg-red-500")}
              style={{ width: `${event.progress}%` }}
            />
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 border-t mt-3">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-emerald-50 rounded-lg p-2">
                    <p className="text-emerald-700 font-bold text-sm">{event.presentCount}</p>
                    <p className="text-emerald-600 text-[10px] uppercase">Pres</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-2">
                    <p className="text-red-700 font-bold text-sm">{event.absentCount}</p>
                    <p className="text-red-600 text-[10px] uppercase">Abs</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-2">
                    <p className="text-amber-700 font-bold text-sm">{event.lateCount}</p>
                    <p className="text-amber-600 text-[10px] uppercase">Late</p>
                  </div>
                  <div className="bg-sky-50 rounded-lg p-2">
                    <p className="text-sky-700 font-bold text-sm">{event.excusedCount}</p>
                    <p className="text-sky-600 text-[10px] uppercase">Exc</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
                  <MapPin className="size-3" />
                  <span>{event.cityName}</span>
                  <span className="mx-1">•</span>
                  <span>{event.groupName}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function MobileAdminAttendanceEvents() {
  const [search, setSearch] = useState("");

  // Simplified query for mobile demonstration
  const { data, isLoading } = useQuery({
    queryKey: ["admin-attendance-events-mobile"],
    queryFn: () =>
      fetch(`/api/admin/attendance-events?limit=20&offset=0`).then((r) => r.json()),
    staleTime: 15000,
  });

  const events = data?.data || [];
  const filteredEvents = events.filter((e: any) => 
    e.title.toLowerCase().includes(search.toLowerCase()) || 
    e.parkName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pt-4 pb-3 px-4 border-b border-border/50 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#4B0A8F] dark:text-purple-300">Attendance Events</h1>
          <Button variant="outline" size="icon" className="size-9 rounded-full">
            <Filter className="size-4" />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search events or parks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9 rounded-xl h-11 bg-card"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-3">
        {/* Aggregate Stats */}
        {!isLoading && events.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2 overflow-x-auto pb-2 no-scrollbar"
          >
            <div className="bg-card border rounded-xl p-3 min-w-[120px] shrink-0">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Events</p>
              <p className="text-lg font-bold mt-1">{data?.total || 0}</p>
            </div>
            <div className="bg-[#4B0A8F]/5 border border-[#4B0A8F]/20 rounded-xl p-3 min-w-[120px] shrink-0">
              <p className="text-[10px] text-[#4B0A8F] uppercase font-semibold">Open</p>
              <p className="text-lg font-bold text-[#4B0A8F] mt-1">
                {events.filter((e: any) => !e.isClosed).length}
              </p>
            </div>
          </motion.div>
        )}

        {/* List */}
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-2xl" />
          ))
        ) : filteredEvents.length > 0 ? (
          filteredEvents.map((event: any, i: number) => (
            <MobileEventCard key={event.id} event={event} index={i} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarCheck className="size-12 text-muted-foreground/30 mb-3" />
            <p className="font-semibold text-sm">No events found</p>
          </div>
        )}

        <div className="h-6" />
      </div>
    </div>
  );
}
