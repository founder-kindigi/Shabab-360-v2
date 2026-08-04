"use client";

import React from "react";
import { ChevronLeft, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock } from "lucide-react";
import { PROTO_ATTENDANCE_SESSIONS, STATUS_COLORS } from "@/components/prototype/data/proto-data";
import { cn } from "@/lib/utils";

interface ProtoGuardianAttendanceProps {
  onNavigate?: (screen: string) => void;
}

export function ProtoGuardianAttendance({ onNavigate }: ProtoGuardianAttendanceProps) {
  // Mock current week calendar
  const weekDays = [
    { day: "M", date: 4, status: "none" },
    { day: "T", date: 5, status: "none" },
    { day: "W", date: 6, status: "none" },
    { day: "T", date: 7, status: "none" },
    { day: "F", date: 8, status: "none" },
    { day: "S", date: 9, status: "none" },
    { day: "S", date: 10, status: "present" },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1F0860] to-[#4B0A8F] text-white pt-12 pb-6 px-4 flex items-center border-b-4 border-[#D90429]">
        <button onClick={() => onNavigate?.("guardian-dashboard")} className="p-2 -ml-2 rounded-full hover:bg-white/10">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="ml-2">
          <h1 className="font-bold text-lg">Muhammad Abdullah</h1>
          <p className="text-purple-200 text-xs">Attendance Records</p>
        </div>
      </div>

      <div className="flex-1 p-5 space-y-6">
        {/* Month Summary Card */}
        <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold">August 2026</h3>
              <p className="text-sm text-muted-foreground">3 of 4 sessions attended</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold text-green-500">75%</span>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Month Avg</p>
            </div>
          </div>
          
          {/* Week Strip */}
          <div className="flex justify-between border-t border-border/50 pt-4">
            {weekDays.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-bold text-muted-foreground">{d.day}</span>
                <span className="text-sm font-semibold">{d.date}</span>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  d.status === "present" ? "bg-green-500" : "bg-muted"
                )} />
              </div>
            ))}
          </div>
        </div>

        {/* Overall Stats Grid */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-muted rounded-xl p-3 text-center">
            <span className="block text-lg font-bold">45</span>
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Total</span>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-center">
            <span className="block text-lg font-bold text-green-600 dark:text-green-400">41</span>
            <span className="text-[10px] uppercase font-bold text-green-700 dark:text-green-500">Present</span>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-center">
            <span className="block text-lg font-bold text-red-600 dark:text-red-400">3</span>
            <span className="text-[10px] uppercase font-bold text-red-700 dark:text-red-500">Absent</span>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-center">
            <span className="block text-lg font-bold text-amber-600 dark:text-amber-400">1</span>
            <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-500">Late</span>
          </div>
        </div>

        {/* History */}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Recent Records</h3>
          <div className="space-y-3">
            {PROTO_ATTENDANCE_SESSIONS.slice(0, 8).map((session) => (
              <div key={session.id} className="bg-card border border-border/70 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex gap-4 items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    session.status === "Present" ? "bg-green-100 text-green-600" :
                    session.status === "Absent" ? "bg-red-100 text-red-600" :
                    session.status === "Late" ? "bg-amber-100 text-amber-600" : "bg-muted text-muted-foreground"
                  )}>
                    {session.status === "Present" ? <CheckCircle2 className="w-5 h-5" /> :
                     session.status === "Absent" ? <XCircle className="w-5 h-5" /> :
                     session.status === "Late" ? <Clock className="w-5 h-5" /> : <CalendarIcon className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{session.date}</h4>
                    <p className="text-xs text-muted-foreground">{session.type}</p>
                    {session.notes && <p className="text-[10px] italic text-muted-foreground mt-0.5">{session.notes}</p>}
                  </div>
                </div>
                <div className={cn(
                  "px-2.5 py-0.5 rounded-full border text-[11px] font-bold",
                  STATUS_COLORS[session.status as keyof typeof STATUS_COLORS]
                )}>
                  {session.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
