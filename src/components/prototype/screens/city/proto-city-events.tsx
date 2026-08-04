"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { PROTO_EVENTS, STATUS_COLORS } from "@/components/prototype/data/proto-data";
import { 
  CalendarDays, Plus, MapPin, Users, Clock, 
  ChevronRight, ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  onNavigate?: (screen: string) => void;
}

export function ProtoCityEvents({ onNavigate }: Props) {
  // Simple calendar dates for week view
  const weekDates = [
    { day: "Mon", date: "12", active: false },
    { day: "Tue", date: "13", active: false },
    { day: "Wed", date: "14", active: true },
    { day: "Thu", date: "15", active: false },
    { day: "Fri", date: "16", active: false },
    { day: "Sat", date: "17", active: false },
    { day: "Sun", date: "18", active: false },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background pb-20">
      <div className="bg-[#1F0860] px-4 pt-12 pb-6 text-white rounded-b-3xl shadow-md">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Events & Calendar</h1>
            <p className="text-white/80 text-sm">City Programs</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center">
            <CalendarDays className="text-white" size={24} />
          </div>
        </div>

        <div className="flex justify-between items-center bg-white/10 rounded-2xl p-2 border border-white/10 backdrop-blur-md">
          {weekDates.map((d, i) => (
            <div 
              key={i} 
              className={cn(
                "flex flex-col items-center justify-center w-10 h-12 rounded-xl transition-colors",
                d.active ? "bg-white text-[#1F0860] shadow-sm font-bold" : "text-white/70 hover:bg-white/5"
              )}
            >
              <span className="text-[10px] uppercase mb-0.5">{d.day}</span>
              <span className="text-sm">{d.date}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-2">
        <div className="flex justify-between items-center mb-2 px-1">
          <h2 className="text-sm font-bold text-foreground">Upcoming Events</h2>
          <button className="text-xs font-semibold text-[#D90429] flex items-center gap-1">Filter <ChevronRight size={14} /></button>
        </div>

        <div className="space-y-4">
          {PROTO_EVENTS?.map((event) => (
            <motion.div whileTap={{ scale: 0.98 }} key={event.id} className="bg-card border border-border/70 rounded-3xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <span className={cn("inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider", STATUS_COLORS[event.status as keyof typeof STATUS_COLORS] || "bg-gray-100 text-gray-800")}>
                  {event.status}
                </span>
                <span className="text-[10px] font-bold bg-secondary px-2 py-0.5 rounded text-muted-foreground uppercase">
                  {event.type}
                </span>
              </div>
              
              <h3 className="font-bold text-foreground text-lg leading-tight mb-2">{event.title}</h3>
              
              <div className="grid grid-cols-2 gap-y-3 mt-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays size={14} className="text-[#1F0860]" />
                  <span className="font-medium text-foreground">{event.date}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin size={14} className="text-[#D90429]" />
                  <span className="font-medium text-foreground truncate">{event.venue}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users size={14} className="text-[#4B0A8F]" />
                  <span className="font-medium text-foreground">Cap: {event.capacity}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-4 w-4 rounded-full bg-secondary flex items-center justify-center text-[8px] font-bold">
                    {event.responsiblePerson.charAt(0)}
                  </div>
                  <span className="font-medium text-foreground truncate">{event.responsiblePerson}</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-border flex justify-end">
                <button className="text-sm font-bold text-[#1F0860] flex items-center gap-1">
                  View Details <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )) || (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-xl">
              No upcoming events
            </div>
          )}
        </div>
      </div>

      <button className="fixed bottom-6 right-4 h-14 w-14 bg-[#D90429] text-white rounded-full shadow-lg flex items-center justify-center z-50 hover:bg-[#b00320] active:scale-95 transition-all">
        <Plus size={24} />
      </button>
    </div>
  );
}
