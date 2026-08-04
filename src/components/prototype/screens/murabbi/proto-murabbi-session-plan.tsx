"use client";

import React, { useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, Circle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROTO_CONTENT_PLAN } from "@/components/prototype/data/proto-data";

interface ProtoMurabbiSessionPlanProps {
  onNavigate?: (screen: string) => void;
}

export function ProtoMurabbiSessionPlan({ onNavigate }: ProtoMurabbiSessionPlanProps) {
  const [week, setWeek] = useState(18);
  const plan = PROTO_CONTENT_PLAN.filter(p => p.weekNumber === week);
  const [delivered, setDelivered] = useState<Record<string, boolean>>({});
  const [prep, setPrep] = useState([false, false, false]);

  const togglePrep = (i: number) => {
    const n = [...prep];
    n[i] = !n[i];
    setPrep(n);
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background pb-20">
      <div className="bg-card border-b border-border/70 sticky top-0 z-20 px-4 pt-4 pb-4 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => onNavigate?.("Murabbi Dashboard")} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Session Plan</h1>
        </div>

        <div className="flex items-center justify-between bg-secondary/50 rounded-xl p-1">
          <button 
            onClick={() => setWeek(Math.max(1, week - 1))}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-secondary"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="font-bold text-sm">Week {week}</div>
          <button 
            onClick={() => setWeek(Math.min(52, week + 1))}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-secondary"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-6">
        {/* Prep Checklist */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl p-4">
          <h2 className="text-xs font-bold text-amber-900 dark:text-amber-500 uppercase tracking-wider mb-3">Preparation Checklist</h2>
          <div className="space-y-3">
            {[
              "Review Tadreeb content and verses",
              "Print activity handouts (18 copies)",
              "Setup projector/screen for skills module"
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3" onClick={() => togglePrep(i)}>
                {prep[i] ? (
                  <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-5 h-5 text-amber-600/50 shrink-0 mt-0.5" />
                )}
                <span className={cn("text-sm transition-all", prep[i] ? "text-amber-900/60 dark:text-amber-500/60 line-through" : "text-amber-900 dark:text-amber-100")}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content Plan */}
        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Content Plan</h2>
          <div className="flex flex-col gap-4">
            {plan.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground text-sm">No plan available for this week.</div>
            ) : (
              plan.map((item) => (
                <div key={item.id} className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                  <div className={cn("h-1.5 w-full", 
                    item.category === "Tadreeb" ? "bg-purple-500" : 
                    item.category === "Skills" ? "bg-blue-500" : "bg-green-500"
                  )} />
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className={cn("inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full",
                        item.category === "Tadreeb" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                        item.category === "Skills" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      )}>
                        {item.category}
                      </div>
                      {delivered[item.id] && (
                        <span className="text-[10px] font-bold text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> Delivered</span>
                      )}
                    </div>
                    
                    <h3 className="font-bold text-base mb-2">{item.topic}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{item.objectives}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Method</div>
                        <div className="text-xs font-medium">{item.deliveryMethod}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Duration</div>
                        <div className="text-xs font-medium">30 mins</div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setDelivered(p => ({ ...p, [item.id]: !p[item.id] }))}
                      className={cn("w-full h-11 rounded-xl font-semibold text-sm transition-all border",
                        delivered[item.id] 
                          ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-900 dark:text-green-400" 
                          : "bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80"
                      )}
                    >
                      {delivered[item.id] ? "Marked as Delivered" : "Mark as Delivered"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
