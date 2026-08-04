"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { PROTO_MASHWARA, STATUS_COLORS } from "@/components/prototype/data/proto-data";
import { 
  Users, Plus, Calendar, Clock, ChevronDown, ChevronUp, CheckCircle, Circle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onNavigate?: (screen: string) => void;
}

export function ProtoCityMashwara({ onNavigate }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background pb-20">
      <div className="bg-card border-b border-border/70 px-4 pt-12 pb-4 shadow-sm sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#4B0A8F]/10 text-[#4B0A8F] rounded-xl">
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Mashwara</h1>
              <p className="text-xs text-muted-foreground">Meetings & Decisions</p>
            </div>
          </div>
          <button className="h-10 w-10 bg-[#1F0860] text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform">
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <button className="w-full h-12 border-2 border-dashed border-[#1F0860]/30 text-[#1F0860] rounded-2xl flex items-center justify-center gap-2 font-medium bg-[#1F0860]/5 hover:bg-[#1F0860]/10 transition-colors">
          <Plus size={18} /> Schedule Mashwara
        </button>

        <div className="space-y-4 pt-2">
          {PROTO_MASHWARA?.map((mashwara) => (
            <motion.div key={mashwara.id} layout className="bg-card border border-border/70 rounded-3xl overflow-hidden shadow-sm">
              <div 
                className="p-5 cursor-pointer"
                onClick={() => toggleExpand(mashwara.id)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-foreground text-lg leading-tight">{mashwara.title}</h3>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Calendar size={14} />
                      <span>{mashwara.date}</span>
                      <span className="mx-1">•</span>
                      <span>{mashwara.attendeesCount} Attendees</span>
                    </div>
                  </div>
                  <span className={cn("inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider", STATUS_COLORS[mashwara.status as keyof typeof STATUS_COLORS] || "bg-gray-100 text-gray-800")}>
                    {mashwara.status}
                  </span>
                </div>
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-secondary px-2 py-1 rounded-md uppercase tracking-wider">
                      {mashwara.scope}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      Lead: {mashwara.facilitator}
                    </span>
                  </div>
                  <button className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-foreground">
                    {expandedId === mashwara.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {expandedId === mashwara.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-secondary/30 border-t border-border/50 px-5 py-4"
                  >
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Decisions & Action Items</h4>
                    <div className="space-y-3">
                      {mashwara.decisions?.map((decision: any, index: number) => (
                        <div key={index} className="flex gap-3 bg-card p-3 rounded-xl border border-border/50">
                          <div className="mt-0.5">
                            {decision.status === "Completed" ? (
                              <CheckCircle size={18} className="text-green-500" />
                            ) : (
                              <Circle size={18} className="text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{decision.task}</p>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users size={12} /> {decision.assignee}
                              </span>
                              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase", 
                                decision.status === "Completed" ? "bg-green-100 text-green-700 border-green-200" : "bg-orange-100 text-orange-700 border-orange-200"
                              )}>
                                {decision.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )) || (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-xl">
              No mashwara records found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
