"use client";

import React, { useState } from "react";
import { ArrowLeft, Search, ChevronDown, Phone, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { PROTO_SHABAB } from "@/components/prototype/data/proto-data";

interface ProtoMurabbiRosterProps {
  onNavigate?: (screen: string) => void;
}

export function ProtoMurabbiRoster({ onNavigate }: ProtoMurabbiRosterProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Just use a slice of shabab to represent "Group A"
  const shabab = PROTO_SHABAB.slice(0, 18);

  return (
    <div className="flex flex-col min-h-screen w-full bg-background pb-20">
      <div className="bg-card border-b border-border/70 sticky top-0 z-20 px-4 pt-4 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => onNavigate?.("Murabbi Dashboard")} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Group A — Roster</h1>
            <p className="text-xs text-muted-foreground">18 Students</p>
          </div>
        </div>
        
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search student..." 
            className="w-full h-11 bg-secondary rounded-xl pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        {shabab.map((student, i) => {
          const isExpanded = expandedId === student.id;
          const att = i === 2 ? 65 : i === 5 ? 72 : 80 + (i % 15);
          const attColor = att >= 80 ? "text-green-500" : att >= 75 ? "text-amber-500" : "text-red-500";
          const bgBar = att >= 80 ? "bg-green-500" : att >= 75 ? "bg-amber-500" : "bg-red-500";

          return (
            <div key={student.id} className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-sm">
              <div 
                className="p-4 flex items-center gap-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : student.id)}
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#D90429] to-pink-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                  {student.firstName[0]}{student.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm truncate">{student.firstName} {student.lastName}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{student.grade}</span>
                    <span className="text-muted-foreground text-[10px]">•</span>
                    <span className={cn("text-xs font-bold", attColor)}>{att}% Att</span>
                  </div>
                </div>
                <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform shrink-0", isExpanded && "rotate-180")} />
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden border-t border-border/50 bg-secondary/20"
                  >
                    <div className="p-4 flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">Attendance Progress</span>
                          <span className="font-bold">{att}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", bgBar)} style={{ width: `${att}%` }} />
                        </div>
                      </div>
                      
                      <div className="bg-card border border-border/70 rounded-xl p-3 flex items-center justify-between mt-2">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Guardian Details</div>
                          <div className="text-sm font-semibold">{student.guardianName}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{student.guardianPhone}</div>
                        </div>
                        <div className="flex gap-2">
                          <a href={`https://wa.me/${student.guardianPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center justify-center">
                            <MessageCircle className="w-4 h-4" />
                          </a>
                          <a href={`tel:${student.guardianPhone}`} className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
                            <Phone className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
