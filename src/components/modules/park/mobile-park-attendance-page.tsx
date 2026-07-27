"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/stores/useAppStore";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  CalendarCheck, 
  ChevronRight, 
  Search,
  Lock,
  Circle,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

type EventItem = {
  id: string;
  title: string;
  groupId: string;
  groupName: string;
  batchName: string;
  eventDate: string;
  isClosed: boolean;
  participantCount: number;
  markedCount: number;
  progress: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
};

const FILTER_TABS = ["All", "Open", "Closed"] as const;
type FilterTab = typeof FILTER_TABS[number];

export function MobileParkAttendancePage() {
  const { navigateTo, setSelectedEventId } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("All");
  const [search, setSearch] = useState("");
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  const { data: events = [], isLoading } = useQuery<EventItem[]>({
    queryKey: ["park-events"],
    queryFn: () => fetch("/api/park/events").then(r => r.json()),
  });

  const filteredEvents = events.filter(e => {
    if (activeFilter === "Open" && e.isClosed) return false;
    if (activeFilter === "Closed" && !e.isClosed) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.groupName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-[#4B0A8F]" />
            Events
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search events or groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-9 pr-4 rounded-xl bg-muted/50 border-transparent focus:bg-background focus:border-[#4B0A8F] focus:ring-1 focus:ring-[#4B0A8F] outline-none transition-all text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {FILTER_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
                activeFilter === tab
                  ? "bg-[#4B0A8F] text-white"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl w-full" />
          ))
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <CalendarCheck className="w-12 h-12 opacity-20 mb-3" />
            <p className="font-medium text-sm">No events found.</p>
          </div>
        ) : (
          filteredEvents.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
            >
              <Card className="rounded-2xl border bg-card overflow-hidden shadow-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0 pr-2">
                      <h3 className="font-bold text-base truncate">{event.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {event.groupName} &middot; {event.batchName}
                      </p>
                    </div>
                    {event.isClosed ? (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-500 shrink-0 text-[10px]">
                        <Lock className="w-3 h-3 mr-1" /> Closed
                      </Badge>
                    ) : (
                      <Badge className="bg-[#F3ECF6] text-[#4B0A8F] shrink-0 text-[10px]">
                        <Circle className="w-2 h-2 mr-1 fill-current" /> Open
                      </Badge>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5 font-medium">
                      <span>{event.markedCount}/{event.participantCount} Marked</span>
                      <span className={cn(event.progress >= 100 ? "text-emerald-600" : "text-[#4B0A8F]")}>
                        {event.progress}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-500", event.progress >= 100 ? "bg-emerald-500" : "bg-[#4B0A8F]")} 
                        style={{ width: `${event.progress}%` }} 
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      {event.present > 0 && <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-bold">P:{event.present}</span>}
                      {event.late > 0 && <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold">L:{event.late}</span>}
                      {event.absent > 0 && <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-bold">A:{event.absent}</span>}
                    </div>
                    
                    <button
                      onClick={() => {
                        setSelectedEventId(event.id);
                        navigateTo("park-attendance-roster");
                      }}
                      className={cn(
                        "flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors",
                        event.isClosed 
                          ? "bg-slate-100 text-slate-600" 
                          : "bg-[#4B0A8F] text-white"
                      )}
                    >
                      {event.isClosed ? "View Details" : "Mark"}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
        <div className="h-6" />
      </div>

      {/* FAB */}
      <button 
        onClick={() => setShowCreateSheet(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-[#4B0A8F] text-white rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-transform z-30"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Bottom Sheet for Create Event (Simulated) */}
      <AnimatePresence>
        {showCreateSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateSheet(false)}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl z-50 p-6 pb-12 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6" />
              <h2 className="text-xl font-bold mb-4">Create New Event</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Event Title</label>
                  <input type="text" className="w-full h-12 px-4 rounded-xl border bg-muted/30 focus:border-[#4B0A8F] outline-none" placeholder="e.g. Daily Class" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Group</label>
                  <select className="w-full h-12 px-4 rounded-xl border bg-muted/30 focus:border-[#4B0A8F] outline-none">
                    <option>Select group...</option>
                  </select>
                </div>
                <button 
                  onClick={() => setShowCreateSheet(false)}
                  className="w-full h-12 bg-[#4B0A8F] text-white rounded-xl font-bold mt-4"
                >
                  Create Event
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
