"use client";

import React from "react";
import { ArrowLeft, Calendar, Clock, MapPin, CheckCircle2, ChevronRight } from "lucide-react";
import { PROTO_MASHWARA } from "@/components/prototype/data/proto-data";

interface ProtoParkMashwaraProps {
  onNavigate?: (screen: string) => void;
}

export function ProtoParkMashwara({ onNavigate }: ProtoParkMashwaraProps) {
  const history = PROTO_MASHWARA.filter(m => m.scope === "Park");

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <div className="bg-card border-b border-border/70 px-4 pt-4 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => onNavigate?.("Park Dashboard")} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Park Mashwara</h1>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-6">
        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Upcoming</h2>
          <div className="bg-gradient-to-br from-[#4B0A8F] to-[#1F0860] rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
            <h3 className="font-bold text-lg mb-4 relative z-10">Monthly Park Mashwara</h3>
            
            <div className="space-y-3 relative z-10">
              <div className="flex items-center gap-3 text-white/80 text-sm">
                <Calendar className="w-4 h-4" />
                <span>Saturday, 8 Aug 2026</span>
              </div>
              <div className="flex items-center gap-3 text-white/80 text-sm">
                <Clock className="w-4 h-4" />
                <span>6:00 PM - 7:30 PM</span>
              </div>
              <div className="flex items-center gap-3 text-white/80 text-sm">
                <MapPin className="w-4 h-4" />
                <span>State Life Park, Main Lawn</span>
              </div>
            </div>
            
            <button className="mt-5 w-full h-11 bg-white text-[#4B0A8F] rounded-xl font-bold text-sm shadow-sm">
              View Agenda
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Recent History</h2>
          <div className="flex flex-col gap-4">
            {history.map((mashwara) => (
              <div key={mashwara.id} className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-sm">{mashwara.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{mashwara.date} • {typeof mashwara.attendees === "number" ? mashwara.attendees : mashwara.attendees?.length || 0} Attendees</p>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                
                <div className="mt-3 pt-3 border-t border-border/50">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Decisions</h4>
                  <ul className="space-y-1.5 mb-3">
                    {mashwara.decisions.map((dec, i) => (
                      <li key={i} className="text-xs text-foreground flex gap-2">
                        <span className="text-muted-foreground">•</span> {dec}
                      </li>
                    ))}
                  </ul>

                  {mashwara.actionItems.length > 0 && (
                    <>
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-2 mt-3">Action Items</h4>
                      <div className="space-y-2">
                        {mashwara.actionItems.map((item, i) => (
                          <div key={i} className="flex items-start gap-2 bg-secondary/50 p-2 rounded-lg">
                            <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${item.status === 'completed' ? 'text-green-500' : 'text-muted-foreground'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium">{item.task}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">Assigned to: {item.assignedTo}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
