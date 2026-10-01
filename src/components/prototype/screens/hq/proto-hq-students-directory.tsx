"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, Filter, Download, Phone, MessageCircle, User, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROTO_SHABAB } from "@/components/prototype/data/proto-data";

interface ProtoHqStudentsDirectoryProps {
  onNavigate?: (screen: string) => void;
}

const FILTERS = ["All Parks", "State Life", "Gulberg", "Johar"];

export function ProtoHqStudentsDirectory({ onNavigate }: ProtoHqStudentsDirectoryProps) {
  const [activeFilter, setActiveFilter] = useState("All Parks");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Take first 10 for demo if needed, or use all
  const students = PROTO_SHABAB.slice(0, 10);

  const filteredStudents = students.filter(s => {
    if (activeFilter !== "All Parks" && s.park !== activeFilter) return false;
    if (searchQuery) {
      return s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             s.guardianName?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigate?.("hq")}
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-bold text-foreground">Students Directory</h1>
          </div>
          <button className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <Download className="w-5 h-5" />
          </button>
        </div>
        
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search students or guardians..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-muted/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]/50 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 snap-x">
          {FILTERS.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "snap-start whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold transition-colors border",
                activeFilter === filter
                  ? "bg-[#1F0860] text-white border-[#1F0860]"
                  : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 p-4 space-y-3">
        {filteredStudents.map(student => {
          const isExpanded = expandedId === student.id;
          // Mock attendance percentage
          const attendance = Math.floor(Math.random() * 40) + 60; // 60 to 100
          
          return (
            <div key={student.id} className="bg-card border border-border/70 rounded-2xl overflow-hidden transition-all shadow-sm">
              <div 
                className="p-4 flex items-start gap-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : student.id)}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4B0A8F] to-[#D90429] flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {student.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-foreground truncate pr-2">{student.name}</h3>
                    <div className={cn(
                      "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      attendance >= 80 ? "bg-green-500/10 text-green-600 border-green-500/20" :
                      attendance >= 75 ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                      "bg-red-500/10 text-red-600 border-red-500/20"
                    )}>
                      {attendance}%
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span>Age {student.age}</span>
                    <span>•</span>
                    <span>Grade {student.grade}</span>
                    <span>•</span>
                    <span className="font-medium text-[#4B0A8F] bg-[#4B0A8F]/10 px-1.5 py-0.5 rounded">Group {student.group}</span>
                  </div>
                  <div className="text-sm text-foreground/80 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {student.guardianName || "Guardian Unassigned"}
                  </div>
                </div>
                <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform mt-3", isExpanded && "rotate-180")} />
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 border-t border-border/50 bg-muted/10">
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="bg-card rounded-xl p-3 border border-border/50">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Status</div>
                          <div className="inline-flex items-center text-xs font-bold px-2 py-1 rounded bg-green-500/10 text-green-600 border border-green-500/20">
                            Active Student
                          </div>
                        </div>
                        <div className="bg-card rounded-xl p-3 border border-border/50">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Park</div>
                          <div className="text-sm font-semibold text-foreground truncate">{student.park}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-3">
                        <button className="flex-1 h-10 rounded-xl bg-muted/50 hover:bg-muted flex items-center justify-center gap-2 text-sm font-semibold transition-colors border border-border/50">
                          <Phone className="w-4 h-4" />
                          Call
                        </button>
                        <button className="flex-1 h-10 rounded-xl bg-green-500/10 text-green-600 hover:bg-green-500/20 flex items-center justify-center gap-2 text-sm font-semibold transition-colors border border-green-500/20">
                          <MessageCircle className="w-4 h-4" />
                          WhatsApp
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </main>
    </div>
  );
}
