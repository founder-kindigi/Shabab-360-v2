"use client";

import React, { useState } from "react";
import { ArrowLeft, Users, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROTO_STAFF } from "@/components/prototype/data/proto-data";

interface ProtoTeamAttendanceProps {
  onNavigate?: (screen: string) => void;
}
type AttStatus = 'P' | 'A' | 'L' | 'E' | null;

export function ProtoTeamAttendance({ onNavigate }: ProtoTeamAttendanceProps) {
  const [statuses, setStatuses] = useState<Record<string, AttStatus>>({});

  const handleStatus = (id: string, st: AttStatus) => {
    setStatuses(prev => ({ ...prev, [id]: st }));
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background pb-32">
      <div className="bg-card border-b border-border/70 sticky top-0 z-20 px-4 pt-4 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => onNavigate?.("Park Dashboard")} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Team Attendance</h1>
        </div>
        <div className="flex items-center gap-2 text-sm bg-secondary/50 p-3 rounded-xl">
          <Calendar className="w-4 h-4 text-[#D90429]" />
          <span className="font-semibold">Mashwara Week 18</span>
          <span className="text-muted-foreground ml-auto">3 Aug 2026</span>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        {PROTO_STAFF.map((staff) => {
          const current = statuses[staff.id];
          return (
            <div key={staff.id} className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1F0860] to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                  {staff.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm truncate">{staff.name}</h4>
                  <div className="inline-flex mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                    {staff.roles[0]}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 w-full">
                <button onClick={() => handleStatus(staff.id, 'P')} className={cn("flex-1 h-12 rounded-xl text-sm font-bold transition-all border", current === 'P' ? "bg-green-500 text-white border-green-600 shadow-sm" : "bg-secondary border-transparent hover:bg-secondary/80")}>P</button>
                <button onClick={() => handleStatus(staff.id, 'A')} className={cn("flex-1 h-12 rounded-xl text-sm font-bold transition-all border", current === 'A' ? "bg-red-500 text-white border-red-600 shadow-sm" : "bg-secondary border-transparent hover:bg-secondary/80")}>A</button>
                <button onClick={() => handleStatus(staff.id, 'L')} className={cn("flex-1 h-12 rounded-xl text-sm font-bold transition-all border", current === 'L' ? "bg-amber-500 text-white border-amber-600 shadow-sm" : "bg-secondary border-transparent hover:bg-secondary/80")}>L</button>
                <button onClick={() => handleStatus(staff.id, 'E')} className={cn("flex-1 h-12 rounded-xl text-sm font-bold transition-all border", current === 'E' ? "bg-blue-500 text-white border-blue-600 shadow-sm" : "bg-secondary border-transparent hover:bg-secondary/80")}>E</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border/70 p-4 pb-safe">
        <button className="h-12 w-full bg-[#4B0A8F] hover:bg-[#4B0A8F]/90 text-white rounded-xl font-bold shadow-md">
          Submit Attendance
        </button>
      </div>
    </div>
  );
}
