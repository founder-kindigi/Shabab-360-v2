"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, RefreshCw, Check, ArrowLeft, MoreVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROTO_SHABAB } from "@/components/prototype/data/proto-data";

interface ProtoAttendanceSessionProps {
  onNavigate?: (screen: string) => void;
}

type AttStatus = 'P' | 'A' | 'L' | 'E' | null;

export function ProtoAttendanceSession({ onNavigate }: ProtoAttendanceSessionProps) {
  const [selectedGroup, setSelectedGroup] = useState("Group A");
  const [statuses, setStatuses] = useState<Record<string, AttStatus>>({});
  
  const shabab = PROTO_SHABAB.filter(s => s.groupId === "grp_1"); // Group A roughly

  const handleStatus = (id: string, st: AttStatus) => {
    setStatuses(prev => ({ ...prev, [id]: st }));
  };

  const stats = {
    P: Object.values(statuses).filter(s => s === 'P').length,
    A: Object.values(statuses).filter(s => s === 'A').length,
    L: Object.values(statuses).filter(s => s === 'L').length,
    E: Object.values(statuses).filter(s => s === 'E').length,
    Total: shabab.length
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background pb-32">
      {/* Header */}
      <div className="bg-card border-b border-border/70 sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 h-16">
          <button onClick={() => onNavigate?.("Park Dashboard")} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <select 
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-secondary border-none text-sm font-bold rounded-xl h-10 px-4 focus:ring-0"
            >
              <option>Group A</option>
              <option>Group B</option>
              <option>Group C</option>
            </select>
          </div>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
        
        <div className="px-4 pb-4 pt-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">4 Aug 2026 • Class</span>
            </div>
            <div className="inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-green-200 bg-green-50 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400">
              Session Open
            </div>
          </div>
          <div className="flex items-center justify-between bg-secondary/50 rounded-xl p-2.5">
            <div className="text-xs text-muted-foreground">Facilitator: <span className="font-semibold text-foreground">Br. Ali Raza</span></div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <RefreshCw className="w-3.5 h-3.5" />
              2 Pending
            </div>
          </div>
        </div>
      </div>

      {/* Roster */}
      <div className="px-4 py-4 flex flex-col gap-3">
        {shabab.map((student) => {
          const current = statuses[student.id];
          return (
            <div key={student.id} className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4B0A8F] to-[#D90429] flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                  {student.firstName[0]}{student.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm truncate">{student.firstName} {student.lastName}</h4>
                  <p className="text-xs text-muted-foreground">{student.grade}</p>
                </div>
              </div>
              
              <div className="flex gap-2 w-full">
                <button 
                  onClick={() => handleStatus(student.id, 'P')}
                  className={cn("flex-1 h-12 rounded-xl text-sm font-bold transition-all border",
                    current === 'P' ? "bg-green-500 text-white border-green-600 shadow-[0_0_10px_rgba(34,197,94,0.3)]" : "bg-secondary border-transparent text-foreground hover:bg-secondary/80"
                  )}
                >
                  P
                </button>
                <button 
                  onClick={() => handleStatus(student.id, 'A')}
                  className={cn("flex-1 h-12 rounded-xl text-sm font-bold transition-all border",
                    current === 'A' ? "bg-red-500 text-white border-red-600 shadow-[0_0_10px_rgba(239,68,68,0.3)]" : "bg-secondary border-transparent text-foreground hover:bg-secondary/80"
                  )}
                >
                  A
                </button>
                <button 
                  onClick={() => handleStatus(student.id, 'L')}
                  className={cn("flex-1 h-12 rounded-xl text-sm font-bold transition-all border",
                    current === 'L' ? "bg-amber-500 text-white border-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.3)]" : "bg-secondary border-transparent text-foreground hover:bg-secondary/80"
                  )}
                >
                  L
                </button>
                <button 
                  onClick={() => handleStatus(student.id, 'E')}
                  className={cn("flex-1 h-12 rounded-xl text-sm font-bold transition-all border",
                    current === 'E' ? "bg-blue-500 text-white border-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.3)]" : "bg-secondary border-transparent text-foreground hover:bg-secondary/80"
                  )}
                >
                  E
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border/70 p-4 pb-safe flex flex-col gap-3">
        <div className="flex justify-between text-xs font-semibold px-2">
          <span className="text-green-600 dark:text-green-400">P {stats.P}</span>
          <span className="text-red-600 dark:text-red-400">A {stats.A}</span>
          <span className="text-amber-600 dark:text-amber-400">L {stats.L}</span>
          <span className="text-blue-600 dark:text-blue-400">E {stats.E}</span>
          <span className="text-muted-foreground">Total {stats.Total}</span>
        </div>
        <button className="h-12 w-full bg-[#D90429] hover:bg-[#D90429]/90 text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-2">
          Submit Session
        </button>
      </div>
    </div>
  );
}
