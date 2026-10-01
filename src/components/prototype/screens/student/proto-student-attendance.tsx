"use client";

import React from "react";
import { ChevronLeft, CheckCircle2, XCircle, Clock, Calendar as CalIcon } from "lucide-react";
import { PROTO_ATTENDANCE_SESSIONS, STATUS_COLORS } from "@/components/prototype/data/proto-data";
import { cn } from "@/lib/utils";

interface ProtoStudentAttendanceProps {
  onNavigate?: (screen: string) => void;
}

export function ProtoStudentAttendance({ onNavigate }: ProtoStudentAttendanceProps) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <div className="pt-12 pb-4 px-4 flex items-center border-b border-border/50 sticky top-0 bg-background z-20">
        <button onClick={() => onNavigate?.("student-dashboard")} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="font-bold text-lg ml-2">My Attendance</h1>
      </div>

      <div className="flex-1 p-5 space-y-6">
        
        {/* Stats Strip */}
        <div className="bg-card border border-border/70 rounded-2xl p-4 flex justify-between items-center shadow-sm">
          <div className="text-center">
            <span className="block text-xl font-extrabold text-[#4B0A8F] dark:text-purple-400">91%</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Rate</span>
          </div>
          <div className="w-px h-8 bg-border/50" />
          <div className="text-center">
            <span className="block text-lg font-bold text-green-500">41</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Present</span>
          </div>
          <div className="w-px h-8 bg-border/50" />
          <div className="text-center">
            <span className="block text-lg font-bold text-red-500">3</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Absent</span>
          </div>
          <div className="w-px h-8 bg-border/50" />
          <div className="text-center">
            <span className="block text-lg font-bold text-amber-500">1</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Late</span>
          </div>
        </div>

        {/* History List */}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Recent Sessions</h3>
          <div className="space-y-3">
            {PROTO_ATTENDANCE_SESSIONS.map((session) => (
              <div key={session.id} className="bg-card border border-border/70 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-muted flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none">{session.date.split(" ")[1]}</span>
                  <span className="text-sm font-extrabold leading-tight mt-0.5">{session.date.split("-")[0]}</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-sm line-clamp-1">{session.type}</h4>
                    <span className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded-full border whitespace-nowrap ml-2",
                      STATUS_COLORS[session.status as keyof typeof STATUS_COLORS]
                    )}>
                      {session.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Topic: Leadership (Sample)</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
