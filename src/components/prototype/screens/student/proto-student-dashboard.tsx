"use client";

import React from "react";
import { User, Calendar, BookOpen, Bell, ChevronRight, Trophy } from "lucide-react";

interface ProtoStudentDashboardProps {
  onNavigate?: (screen: string) => void;
}

export function ProtoStudentDashboard({ onNavigate }: ProtoStudentDashboardProps) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#4B0A8F] to-[#1F0860] text-white pt-14 pb-8 px-6 rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D90429]/20 rounded-full blur-2xl" />
        <div className="relative z-10 flex justify-between items-start mb-6">
          <div>
            <p className="text-purple-200 text-sm font-medium mb-1">As-Salamu Alaykum</p>
            <h1 className="text-2xl font-bold">Muhammad Abdullah</h1>
          </div>
          <div 
            onClick={() => onNavigate?.("student-profile")}
            className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-bold text-sm cursor-pointer active:scale-95"
          >
            MA
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-bold">Batch 4 • Senior</span>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-md font-medium">State Life Park</span>
          </div>
          <p className="text-sm text-purple-200">Murabbi: Br. Ali Raza</p>
        </div>
      </div>

      <div className="flex-1 px-5 py-6 space-y-6">
        
        {/* Attendance Ring & Highlight */}
        <div 
          onClick={() => onNavigate?.("student-attendance")}
          className="bg-card border border-border/70 rounded-3xl p-5 flex items-center gap-6 shadow-sm active:scale-95 transition-transform"
        >
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path className="text-muted" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="text-[#4B0A8F] dark:text-purple-400" strokeWidth="3" strokeDasharray="91, 100" stroke="currentColor" fill="none" strokeLinecap="round" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-extrabold text-lg">
              91%
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-1">Excellent Attendance!</h3>
            <p className="text-sm text-muted-foreground">Keep up the good work. You've attended 41 sessions.</p>
          </div>
        </div>

        {/* Next Session */}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Up Next</h3>
          <div className="bg-gradient-to-r from-card to-card border border-border/70 rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-2 h-full bg-[#D90429]" />
            <div className="flex items-center gap-2 text-[#D90429] mb-2">
              <Calendar className="w-4 h-4" />
              <span className="font-bold text-sm">Sunday 10-Aug | 09:00 AM</span>
            </div>
            <h4 className="font-bold text-base mb-1">Leadership & Accountability</h4>
            <p className="text-xs text-muted-foreground">Week 18 • State Life Park</p>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { title: "Schedule", icon: Calendar, color: "bg-blue-100 text-blue-600", route: "student-schedule" },
            { title: "Resources", icon: BookOpen, color: "bg-purple-100 text-purple-600", route: "student-resources" },
            { title: "My Profile", icon: User, color: "bg-amber-100 text-amber-600", route: "student-profile" },
            { title: "Updates", icon: Bell, color: "bg-red-100 text-red-600", route: "none" },
          ].map((item, i) => (
            <div 
              key={i}
              onClick={() => item.route !== "none" && onNavigate?.(item.route)}
              className="bg-card border border-border/70 rounded-2xl p-4 flex flex-col gap-3 active:scale-95 transition-transform shadow-sm"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color} dark:bg-opacity-20`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm">{item.title}</span>
            </div>
          ))}
        </div>

        {/* Teams */}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">My Teams</h3>
          <div className="flex gap-2">
            <div className="bg-card border border-border/70 px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-sm">
              <Trophy className="w-4 h-4 text-amber-500" />
              Tadreeb Team
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
