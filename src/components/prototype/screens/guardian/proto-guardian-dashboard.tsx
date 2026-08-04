"use client";

import React from "react";
import { motion } from "framer-motion";
import { Bell, Calendar, User, FileText, Phone, ChevronRight, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROTO_ANNOUNCEMENTS } from "@/components/prototype/data/proto-data";

interface ProtoGuardianDashboardProps {
  onNavigate?: (screen: string) => void;
}

export function ProtoGuardianDashboard({ onNavigate }: ProtoGuardianDashboardProps) {
  const topAnnouncements = PROTO_ANNOUNCEMENTS.slice(0, 2);

  return (
    <div className="flex flex-col min-h-screen w-full bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1F0860] to-[#4B0A8F] text-white pt-14 pb-8 px-6 rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="relative z-10 flex justify-between items-start mb-6">
          <div>
            <p className="text-purple-200 text-sm font-medium mb-1">As-Salamu Alaykum</p>
            <h1 className="text-2xl font-bold">Br. Ahmad Abdullah</h1>
          </div>
          <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold border border-white/20 backdrop-blur-sm">
            Guardian
          </div>
        </div>

        {/* Linked Child Card */}
        <div 
          onClick={() => onNavigate?.("student-dashboard")}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-4 active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center shrink-0 border border-white/30 text-lg font-bold">
            MA
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg leading-tight">Muhammad Abdullah</h2>
            <p className="text-purple-100 text-sm mt-0.5">Age 16 • Group A • State Life Park</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/50" />
        </div>
      </div>

      <div className="flex-1 px-5 py-6 space-y-6">
        {/* Attendance & Next Session Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div 
            onClick={() => onNavigate?.("guardian-attendance")}
            className="bg-card border border-border/70 rounded-2xl p-4 flex flex-col items-center justify-center text-center active:scale-95 transition-transform shadow-sm"
          >
            <div className="relative w-16 h-16 flex items-center justify-center mb-2">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path className="text-muted/30" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-green-500" strokeWidth="3" strokeDasharray="91, 100" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-bold text-sm">
                91%
              </div>
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Attendance</span>
            <span className="text-green-500 font-medium text-sm mt-1">Excellent</span>
          </div>

          <div className="bg-card border border-border/70 rounded-2xl p-4 flex flex-col justify-center shadow-sm">
            <Calendar className="w-6 h-6 text-[#D90429] mb-3" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Next Session</span>
            <span className="font-bold text-sm leading-tight">Sun 10-Aug, 09:00 AM</span>
            <span className="text-xs text-muted-foreground mt-1">State Life Park</span>
          </div>
        </div>

        {/* Notices Alert */}
        <div 
          onClick={() => onNavigate?.("guardian-notices")}
          className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center gap-4 active:scale-95 transition-transform shadow-sm"
        >
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
            <CheckSquare className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-amber-900 dark:text-amber-100 text-sm">Action Required</h3>
            <p className="text-amber-700 dark:text-amber-300 text-xs mt-0.5">1 pending consent form (Swimming)</p>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-500" />
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Quick Links</h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Attendance", icon: User, route: "guardian-attendance" },
              { label: "Notices", icon: FileText, route: "guardian-notices" },
              { label: "Fees", icon: CheckSquare, route: "guardian-fees" },
              { label: "Contact", icon: Phone, route: "none" }
            ].map((act, i) => (
              <button 
                key={i} 
                onClick={() => act.route !== "none" && onNavigate?.(act.route)}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-foreground active:scale-95 transition-transform shadow-sm">
                  <act.icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-semibold text-center">{act.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Announcements */}
        <div>
          <div className="flex justify-between items-end mb-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Announcements</h3>
            <button className="text-xs font-bold text-[#4B0A8F] dark:text-purple-400">View All</button>
          </div>
          <div className="space-y-3">
            {topAnnouncements.map((ann, i) => (
              <div key={i} className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-[#D90429] uppercase px-2 py-0.5 bg-[#D90429]/10 rounded-full">
                    {ann.type}
                  </span>
                  <span className="text-xs text-muted-foreground">{ann.date}</span>
                </div>
                <h4 className="font-bold text-sm mb-1">{ann.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2">{ann.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
