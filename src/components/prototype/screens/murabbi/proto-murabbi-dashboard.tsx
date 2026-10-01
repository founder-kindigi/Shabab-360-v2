"use client";

import React from "react";
import { BookOpen, Users, Calendar, AlertTriangle, ArrowRight, PlayCircle, Book } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProtoMurabbiDashboardProps {
  onNavigate?: (screen: string) => void;
}

export function ProtoMurabbiDashboard({ onNavigate }: ProtoMurabbiDashboardProps) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-background pb-24">
      <div className="bg-gradient-to-r from-[#D90429] to-pink-700 pt-14 pb-8 px-6 rounded-b-3xl text-white shadow-md">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Br. Ali Raza</h1>
            <div className="inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-xl">
              Murabbi
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/20 shadow-inner flex items-center justify-center font-bold text-lg overflow-hidden">
            <img src="https://ui-avatars.com/api/?name=Ali+Raza&background=random&color=fff" alt="AR" className="w-full h-full object-cover" />
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/70 uppercase tracking-wider font-semibold mb-1">Assigned Group</p>
            <p className="font-bold text-lg">Group A (Senior)</p>
            <p className="text-xs text-white/80 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" /> State Life Park • 18 Students
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4 z-10 flex flex-col gap-6">
        {/* Session Card */}
        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full"></div>
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <Calendar className="w-4 h-4 text-[#4B0A8F]" />
            <h3 className="text-sm font-bold">This Week's Session</h3>
            <span className="text-[10px] ml-auto text-muted-foreground">Week 18</span>
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1 relative z-10">Leadership & Accountability</h2>
          <p className="text-xs text-muted-foreground mb-4 relative z-10 line-clamp-2">Understanding the role of a leader in Islam and how accountability shapes our actions.</p>
          <div className="flex gap-2 relative z-10">
            <button 
              onClick={() => onNavigate?.("Session Plan")}
              className="flex-1 h-11 bg-secondary text-secondary-foreground rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" /> Plan
            </button>
            <button 
              onClick={() => onNavigate?.("Park Attendance")}
              className="flex-1 h-11 bg-[#4B0A8F] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm"
            >
              <Users className="w-4 h-4" /> Mark
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Last Session</div>
            <div className="text-2xl font-bold">83%</div>
            <div className="text-xs text-muted-foreground mt-1">15/18 Present</div>
          </div>
          <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Month Avg</div>
            <div className="text-2xl font-bold text-green-600">86%</div>
            <div className="text-xs text-muted-foreground mt-1">+4% vs last month</div>
          </div>
        </div>

        {/* Follow Up */}
        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold">Needs Follow-up</h3>
          </div>
          <div className="space-y-3">
            {[
              { name: "Ahmed Khan", att: 65 },
              { name: "Bilal Hassan", att: 70 },
              { name: "Omar Farooq", att: 55 }
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                    {s.name[0]}
                  </div>
                  <span className="text-sm font-medium">{s.name}</span>
                </div>
                <span className="text-xs font-bold text-red-500">{s.att}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Resources</h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => onNavigate?.("Murabbi Roster")} className="h-12 bg-secondary text-secondary-foreground rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm">
              <Users className="w-4 h-4" /> My Roster
            </button>
            <button onClick={() => onNavigate?.("Training")} className="h-12 bg-secondary text-secondary-foreground rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm">
              <Book className="w-4 h-4" /> Training
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// MapPin missing import hack
const MapPin = ({className}: {className?: string}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
);
