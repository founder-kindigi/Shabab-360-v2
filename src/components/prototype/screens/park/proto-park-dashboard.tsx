"use client";

import React from "react";
import { motion } from "framer-motion";
import { Users, UserCheck, Calendar, AlertTriangle, ArrowRight, ShieldAlert, Activity, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROTO_GROUPS, PROTO_SHABAB } from "@/components/prototype/data/proto-data";

interface ProtoParkDashboardProps {
  onNavigate?: (screen: string) => void;
}

export function ProtoParkDashboard({ onNavigate }: ProtoParkDashboardProps) {
  const groups = PROTO_GROUPS;
  const totalShabab = PROTO_SHABAB.length;
  const todayAtt = 42;
  const attRate = Math.round((todayAtt / 52) * 100);

  return (
    <div className="flex flex-col min-h-screen w-full bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#4B0A8F] to-[#1F0860] pt-14 pb-8 px-6 rounded-b-3xl text-white shadow-md">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">State Life Park</h1>
            <div className="inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-xl">
              Park Lead
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D90429] to-pink-500 border-2 border-white/20 shadow-inner flex items-center justify-center font-bold text-lg">
            SL
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/70 uppercase tracking-wider font-semibold mb-1">Today, 4 Aug 2026</p>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></span>
              <p className="font-medium">Session Open</p>
            </div>
          </div>
          <button 
            onClick={() => onNavigate?.("Park Attendance")}
            className="h-11 px-4 bg-white text-[#4B0A8F] font-semibold rounded-xl text-sm flex items-center shadow-sm"
          >
            Mark
            <ArrowRight className="ml-2 w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-5 -mt-4 z-10 flex flex-col gap-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Shabab</span>
            </div>
            <div className="text-2xl font-bold">52</div>
            <div className="text-xs text-muted-foreground mt-1">Across 3 groups</div>
          </div>
          <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Today's Att</span>
            </div>
            <div className="text-2xl font-bold flex items-baseline gap-1">
              {attRate}% <span className="text-sm font-normal text-muted-foreground">({todayAtt})</span>
            </div>
            <div className="text-xs text-green-500 font-medium mt-1">+2% vs last week</div>
          </div>
          <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Staff Present</span>
            </div>
            <div className="text-2xl font-bold">6/8</div>
            <div className="text-xs text-muted-foreground mt-1">2 absent today</div>
          </div>
          <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Park Rank</span>
            </div>
            <div className="text-2xl font-bold">#4</div>
            <div className="text-xs text-muted-foreground mt-1">in Central Region</div>
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 flex gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-500 mb-1">Attention Needed</h4>
            <p className="text-xs text-amber-700 dark:text-amber-400">Group C attendance rate is below 75% for the last 3 sessions.</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => onNavigate?.("park-roster")} className="h-12 bg-secondary text-secondary-foreground rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform">
              <Users className="w-4 h-4" /> View Roster
            </button>
            <button onClick={() => onNavigate?.("park-team-attendance")} className="h-12 bg-secondary text-secondary-foreground rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform">
              <UserCheck className="w-4 h-4" /> Team Attendance
            </button>
            <button onClick={() => onNavigate?.("park-mashwara")} className="h-12 bg-secondary text-secondary-foreground rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform">
              <Calendar className="w-4 h-4" /> Park Mashwara
            </button>
            <button onClick={() => onNavigate?.("inventory-list")} className="h-12 bg-secondary text-secondary-foreground rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform">
              <Activity className="w-4 h-4" /> Equipment Catalog
            </button>
          </div>
        </div>

        {/* Groups Overview */}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Groups Overview</h3>
          <div className="flex flex-col gap-3">
            {groups.map((group) => (
              <div key={group.id} className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex items-center justify-between cursor-pointer active:scale-98 transition-transform" onClick={() => onNavigate?.("murabbi-dashboard")}>
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold", 
                    group.name.includes("A") ? "bg-[#4B0A8F]" : group.name.includes("B") ? "bg-[#D90429]" : "bg-teal-600"
                  )}>
                    {group.name.replace("Group ", "")}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{group.name}</h4>
                    <p className="text-xs text-muted-foreground">Murabbi: Br. {group.name.includes("A") ? "Ali Raza" : "Usman"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{group.name.includes("C") ? "72%" : "88%"}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Attendance</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
