"use client";

import React from "react";
import { ChevronLeft, Calendar as CalIcon, MapPin, Clock } from "lucide-react";
import { PROTO_EVENTS } from "@/components/prototype/data/proto-data";

interface ProtoStudentScheduleProps {
  onNavigate?: (screen: string) => void;
}

export function ProtoStudentSchedule({ onNavigate }: ProtoStudentScheduleProps) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <div className="pt-12 pb-4 px-4 flex items-center border-b border-border/50 sticky top-0 bg-background z-20">
        <button onClick={() => onNavigate?.("student-dashboard")} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="font-bold text-lg ml-2">Schedule & Calendar</h1>
      </div>

      <div className="flex-1 p-5 space-y-6">
        
        {/* Next Session Highlight */}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">This Week</h3>
          <div className="bg-gradient-to-br from-[#1F0860] to-[#4B0A8F] text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
            <div className="relative z-10">
              <div className="bg-white/20 inline-flex px-3 py-1 rounded-full text-xs font-bold mb-4">
                Regular Session
              </div>
              <h2 className="text-2xl font-bold mb-1">Sunday 10-Aug</h2>
              <p className="text-purple-200 text-sm mb-4">09:00 AM — 12:00 PM</p>
              
              <div className="bg-black/20 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-purple-300" />
                  <span>State Life Park</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CalIcon className="w-4 h-4 text-purple-300" />
                  <span>Topic: Leadership & Accountability</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Regular Schedule Note */}
        <div className="bg-muted rounded-2xl p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">
            Weekly Sessions: Sundays 09:00 AM at State Life Park
          </p>
        </div>

        {/* Upcoming Events */}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Upcoming Events</h3>
          <div className="space-y-4">
            {PROTO_EVENTS.map((ev) => (
              <div key={ev.id} className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex gap-4">
                <div className="w-14 h-14 rounded-xl bg-muted flex flex-col items-center justify-center shrink-0 border border-border/50">
                  <span className="text-xs font-bold text-[#D90429] uppercase leading-none">{ev.date.split(" ")[1]}</span>
                  <span className="text-lg font-extrabold leading-tight mt-1">{ev.date.split("-")[0]}</span>
                </div>
                <div>
                  <h4 className="font-bold text-base mb-1">{ev.title}</h4>
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {ev.time}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.venue}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
