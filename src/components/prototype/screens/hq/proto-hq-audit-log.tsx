"use client";

import React, { useState } from "react";
import { ArrowLeft, Search, Filter, Activity, UserCheck, Shield, LogIn, CheckSquare, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProtoHqAuditLogProps {
  onNavigate?: (screen: string) => void;
}

const LOGS = [
  { id: 1, type: "ATTENDANCE_MARKED", action: "ATTENDANCE_MARKED", desc: "Br. Ali Raza marked attendance for Group A (15 Present, 2 Absent)", time: "10 mins ago", ip: "39.42.12.5", icon: CheckSquare, color: "text-green-500 bg-green-500/10" },
  { id: 2, type: "ADMISSION_APPROVED", action: "ADMISSION_APPROVED", desc: "Br. Tariq Mahmood approved application for Saqib Hussain", time: "1 hour ago", ip: "39.42.12.6", icon: UserCheck, color: "text-blue-500 bg-blue-500/10" },
  { id: 3, type: "CAPABILITY_GRANTED", action: "CAPABILITY_GRANTED", desc: "Super Admin granted finance.view to City Head", time: "3 hours ago", ip: "103.11.23.4", icon: Shield, color: "text-[#D90429] bg-[#D90429]/10" },
  { id: 4, type: "USER_LOGIN", action: "USER_LOGIN", desc: "Br. Usman Ali logged in (Park Lead)", time: "4 hours ago", ip: "39.42.12.8", icon: LogIn, color: "text-gray-500 bg-gray-500/10" },
  { id: 5, type: "MASHWARA_CLOSED", action: "MASHWARA_CLOSED", desc: "Br. Tariq Mahmood closed City Mashwara Week 18", time: "Yesterday", ip: "39.42.12.6", icon: Activity, color: "text-[#4B0A8F] bg-[#4B0A8F]/10" },
  { id: 6, type: "PAYMENT_RECORDED", action: "PAYMENT_RECORDED", desc: "Br. Bilal Ahmed recorded PKR 500 registration fee for Muhammad Abdullah", time: "2 days ago", ip: "39.42.12.9", icon: DollarSign, color: "text-amber-500 bg-amber-500/10" },
];

const FILTERS = ["All Actions", "Auth", "Attendance", "Admissions", "Access", "Finance"];

export function ProtoHqAuditLog({ onNavigate }: ProtoHqAuditLogProps) {
  const [activeFilter, setActiveFilter] = useState("All Actions");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = LOGS.filter(log => {
    if (activeFilter !== "All Actions") {
      if (activeFilter === "Auth" && !log.type.includes("LOGIN")) return false;
      if (activeFilter === "Attendance" && !log.type.includes("ATTENDANCE") && !log.type.includes("MASHWARA")) return false;
      if (activeFilter === "Admissions" && !log.type.includes("ADMISSION")) return false;
      if (activeFilter === "Access" && !log.type.includes("CAPABILITY")) return false;
      if (activeFilter === "Finance" && !log.type.includes("PAYMENT")) return false;
    }
    if (searchQuery) {
      return log.desc.toLowerCase().includes(searchQuery.toLowerCase()) || log.action.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button 
            onClick={() => onNavigate?.("hq")}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">System Audit Log</h1>
        </div>
        
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search audit trail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-muted/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]/50 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 snap-x">
          {FILTERS.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "snap-start whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                activeFilter === filter
                  ? "bg-[#1F0860] text-white border-[#1F0860]"
                  : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4">
        {filteredLogs.map(log => {
          const Icon = log.icon;
          return (
            <div key={log.id} className="bg-card border border-border/70 rounded-2xl p-4 flex gap-4">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", log.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded border border-border/50 bg-muted/30">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{log.time}</span>
                </div>
                <p className="text-sm text-foreground font-medium leading-snug mb-2">
                  {log.desc}
                </p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    IP: {log.ip}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No logs found</p>
          </div>
        )}
      </main>
    </div>
  );
}
