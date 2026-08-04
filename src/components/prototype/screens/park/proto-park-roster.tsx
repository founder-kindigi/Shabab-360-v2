"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, Phone, MessageCircle, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROTO_SHABAB } from "@/components/prototype/data/proto-data";

interface ProtoParkRosterProps {
  onNavigate?: (screen: string) => void;
}

export function ProtoParkRoster({ onNavigate }: ProtoParkRosterProps) {
  const [filter, setFilter] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filters = ["All", "Group A", "Group B", "Group C"];
  const shabab = PROTO_SHABAB;

  return (
    <div className="flex flex-col min-h-screen w-full bg-background pb-20">
      <div className="bg-card border-b border-border/70 sticky top-0 z-20 px-4 pt-4 pb-2">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => onNavigate?.("Park Dashboard")} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Shabab & Families</h1>
        </div>
        
        <div className="relative mb-4">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search name, phone..." 
            className="w-full h-11 bg-secondary rounded-xl pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
          {filters.map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={cn("h-8 px-4 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
                filter === f ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        {shabab.map(student => {
          const isExpanded = expandedId === student.id;
          const att = Math.floor(Math.random() * 30) + 70; // random mock 70-100
          return (
            <div key={student.id} className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-sm">
              <div 
                className="p-4 flex items-center gap-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : student.id)}
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#4B0A8F] to-[#1F0860] flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                  {student.firstName[0]}{student.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h4 className="font-bold text-sm truncate">{student.firstName} {student.lastName}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground shrink-0 ml-2">
                      Grp {student.groupId.replace('grp_', '')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{student.grade} • Guardian: {student.guardianName}</p>
                  <div className="mt-2 w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full", att >= 80 ? "bg-green-500" : att >= 75 ? "bg-amber-500" : "bg-red-500")}
                      style={{ width: `${att}%` }}
                    />
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
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Age</div>
                          <div className="text-sm font-medium">14 yrs</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Attendance</div>
                          <div className="text-sm font-medium flex items-center gap-1">
                            {att}% 
                            <span className="text-green-500 text-xs">↗</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-card border border-border/70 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Guardian</div>
                          <div className="text-sm font-semibold">{student.guardianName}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{student.guardianPhone}</div>
                        </div>
                        <div className="flex gap-2">
                          <button className="w-9 h-9 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center justify-center">
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
                            <Phone className="w-4 h-4" />
                          </button>
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
