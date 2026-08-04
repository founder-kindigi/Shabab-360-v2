"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { PROTO_PARKS, STATUS_COLORS } from "@/components/prototype/data/proto-data";
import { 
  Users, MapPin, CheckCircle, AlertCircle, 
  ArrowRight, Phone, ClipboardList, 
  CalendarDays, TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  onNavigate?: (screen: string) => void;
}

export function ProtoCityDashboard({ onNavigate }: Props) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-background pb-20">
      <div className="bg-gradient-to-br from-[#4B0A8F] to-[#D90429] p-6 rounded-b-3xl text-white shadow-md">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">Lahore</h1>
            <p className="text-white/80 text-sm">City Head Dashboard</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center">
            <MapPin className="text-white" size={24} />
          </div>
        </div>
        <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-white/90" />
            <span className="text-sm font-medium">Batch 4, Week 18</span>
          </div>
          <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-md">Today</span>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <motion.div whileTap={{ scale: 0.98 }} className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                <MapPin size={20} />
              </div>
              <span className="text-2xl font-bold text-foreground">6</span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parks</p>
          </motion.div>

          <motion.div whileTap={{ scale: 0.98 }} className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-[#4B0A8F] rounded-lg">
                <Users size={20} />
              </div>
              <span className="text-2xl font-bold text-foreground">254</span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Shabab</p>
          </motion.div>

          <motion.div whileTap={{ scale: 0.98 }} className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg">
                <TrendingUp size={20} />
              </div>
              <span className="text-2xl font-bold text-foreground">84%</span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attendance</p>
          </motion.div>

          <motion.div whileTap={{ scale: 0.98 }} className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-lg">
                <CheckCircle size={20} />
              </div>
              <span className="text-2xl font-bold text-foreground">18</span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Staff</p>
          </motion.div>
        </div>

        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => onNavigate?.("city-admissions")} className="h-12 bg-[#1F0860] text-white rounded-xl flex items-center justify-center gap-2 font-medium shadow-sm active:scale-95 transition-transform">
              <ClipboardList size={18} />
              Admissions
            </button>
            <button onClick={() => onNavigate?.("city-calling")} className="h-12 bg-card border border-border/70 text-foreground rounded-xl flex items-center justify-center gap-2 font-medium shadow-sm active:scale-95 transition-transform">
              <Phone size={18} className="text-[#D90429]" />
              Calling Desk
            </button>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Parks Overview</h2>
            <button className="text-xs font-semibold text-[#4B0A8F] flex items-center gap-1">View All <ArrowRight size={14} /></button>
          </div>
          <div className="space-y-3">
            {PROTO_PARKS?.slice(0, 3).map((park) => (
              <div key={park.id} className="bg-card border border-border/70 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-sm">{park.name}</h3>
                    <p className="text-xs text-muted-foreground">{park.totalShabab} Shabab</p>
                  </div>
                  <span className={cn("inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full border", STATUS_COLORS[park.status as keyof typeof STATUS_COLORS] || "bg-gray-100 text-gray-800")}>
                    {park.status}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Attendance</span>
                    <span className="font-semibold">{(Math.random() * (95 - 70) + 70).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-[#4B0A8F] rounded-full" style={{ width: `${Math.random() * (95 - 70) + 70}%` }} />
                  </div>
                </div>
              </div>
            )) || (
              <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-xl">
                No parks data found
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-orange-500" />
            Alerts & Exceptions
          </h2>
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                <Users size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-orange-900 dark:text-orange-300">Staffing Shortage</p>
                <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">2 groups at Model Town park need a Murabbi.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-900 dark:text-red-300">Low Attendance</p>
                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">Iqbal Town park attendance below 70% threshold.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
