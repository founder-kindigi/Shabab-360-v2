"use client";

import React from "react";
import { ChevronLeft, BookOpen, FileText, Download, PlayCircle } from "lucide-react";
import { PROTO_CONTENT_PLAN } from "@/components/prototype/data/proto-data";

interface ProtoStudentResourcesProps {
  onNavigate?: (screen: string) => void;
}

export function ProtoStudentResources({ onNavigate }: ProtoStudentResourcesProps) {
  const currentWeek = PROTO_CONTENT_PLAN[0];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <div className="pt-12 pb-4 px-4 flex items-center border-b border-border/50 sticky top-0 bg-background z-20">
        <button onClick={() => onNavigate?.("student-dashboard")} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="font-bold text-lg ml-2">Class Resources</h1>
      </div>

      <div className="flex-1 p-5 space-y-8">
        
        {/* This week's content */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">This Week (Week {currentWeek.weekNo})</h3>
            <span className="text-xs font-bold text-[#4B0A8F] bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-md">{currentWeek.theme}</span>
          </div>

          <div className="space-y-4">
            {PROTO_CONTENT_PLAN.filter(cp => cp.week === 18).map((item, i) => (
              <div key={i} className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border/50">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{item.category}</div>
                  <h4 className="font-bold text-base mb-2">{item.topic}</h4>
                  <p className="text-sm text-muted-foreground">{item.objectives}</p>
                </div>
                <div className="bg-muted/50 p-3 flex justify-between items-center">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> {item.materials}
                  </span>
                  <button className="text-xs font-bold text-[#4B0A8F] hover:underline flex items-center gap-1">
                    View <Download className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Library Categories */}
        <section>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Resource Library</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { title: "Books & Manuals", icon: BookOpen, count: 3 },
              { title: "Presentations", icon: PlayCircle, count: 5 },
              { title: "Worksheets", icon: FileText, count: 8 },
              { title: "Programme Guide", icon: Download, count: 1 }
            ].map((lib, i) => (
              <div key={i} className="bg-card border border-border/70 rounded-xl p-4 flex flex-col gap-2 items-start active:scale-95 transition-transform">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <lib.icon className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">{lib.title}</h4>
                  <p className="text-xs text-muted-foreground">{lib.count} items</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
