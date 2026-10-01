"use client";

import React from "react";
import { ArrowLeft, BookOpen, Download, FileText, Video, Folder, ArrowRight } from "lucide-react";

interface ProtoMurabbiTrainingProps {
  onNavigate?: (screen: string) => void;
}

export function ProtoMurabbiTraining({ onNavigate }: ProtoMurabbiTrainingProps) {
  const categories = [
    { title: "Murabbi Handbook", count: "1 File", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" },
    { title: "Tadreeb Resources", count: "12 Files", icon: FileText, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-900/30" },
    { title: "Skills Content", count: "8 Files", icon: Video, color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30" },
    { title: "Programme Guide", count: "3 Files", icon: Folder, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30" },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background pb-20">
      <div className="bg-card border-b border-border/70 sticky top-0 z-20 px-4 pt-4 pb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate?.("Murabbi Dashboard")} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Training Resources</h1>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-6">
        <div>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat, i) => (
              <div key={i} className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex flex-col items-center text-center cursor-pointer hover:border-primary/50 transition-colors">
                <div className={`w-12 h-12 rounded-full ${cat.bg} flex items-center justify-center mb-3`}>
                  <cat.icon className={`w-6 h-6 ${cat.color}`} />
                </div>
                <h3 className="font-bold text-sm leading-tight mb-1">{cat.title}</h3>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">{cat.count}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Recent Downloads</h2>
          <div className="flex flex-col gap-3">
            {[
              { name: "Week 18 Activity Guide.pdf", size: "2.4 MB", date: "Today" },
              { name: "Leadership Module Video.mp4", size: "45 MB", date: "Yesterday" },
              { name: "Term 2 Syllabus.pdf", size: "1.1 MB", date: "Last Week" },
            ].map((file, i) => (
              <div key={i} className="bg-card border border-border/70 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{file.name}</h4>
                  <p className="text-xs text-muted-foreground">{file.size} • {file.date}</p>
                </div>
                <button className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button className="h-12 w-full border-2 border-dashed border-border rounded-xl text-sm font-semibold text-muted-foreground flex items-center justify-center gap-2 hover:bg-secondary/50">
          Request Resource
        </button>
      </div>
    </div>
  );
}
