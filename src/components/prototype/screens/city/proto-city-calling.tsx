"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { PROTO_CALLING_LEADS, STATUS_COLORS } from "@/components/prototype/data/proto-data";
import { 
  Phone, Users, ArrowUpRight, CheckCircle2, 
  Clock, XCircle, FileDown, UserPlus, PhoneCall,
  MessageCircle
} from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  onNavigate?: (screen: string) => void;
}

export function ProtoCityCallingDesk({ onNavigate }: Props) {
  const stats = [
    { label: "Total Leads", value: 5, icon: Users, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" },
    { label: "Called", value: 1, icon: PhoneCall, color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30" },
    { label: "Pending", value: 1, icon: Clock, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30" },
    { label: "Follow Up", value: 1, icon: ArrowUpRight, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-900/30" },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background pb-20">
      <div className="bg-card border-b border-border/70 px-4 pt-12 pb-4 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D90429]/10 text-[#D90429] rounded-xl">
              <Phone size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Calling Desk</h1>
              <p className="text-xs text-muted-foreground">Lead Management Campaign</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button className="flex-1 h-11 bg-[#1F0860] text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2">
            <UserPlus size={16} /> Assign Lead
          </button>
          <button className="h-11 px-4 bg-secondary text-foreground border border-border rounded-xl font-medium text-sm flex items-center gap-2">
            <FileDown size={16} /> Export
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col items-center justify-center bg-secondary/50 rounded-2xl p-3 border border-border/50">
              <span className="text-lg font-bold text-foreground">{stat.value}</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase text-center mt-1 leading-tight">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Active Callers</h2>
          <div className="flex gap-3">
            {["Br. Zain", "Br. Omar"].map((caller, i) => (
              <div key={i} className="flex items-center gap-2 bg-card border border-border/70 px-3 py-2 rounded-xl shadow-sm">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#4B0A8F] to-[#D90429] flex items-center justify-center text-white text-xs font-bold">
                  {caller.charAt(4)}
                </div>
                <span className="text-sm font-medium">{caller}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Leads</h2>
          <div className="space-y-4">
            {PROTO_CALLING_LEADS?.map((lead) => (
              <motion.div key={lead.id} whileTap={{ scale: 0.98 }} className="bg-card border border-border/70 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-foreground text-lg">{lead.name}</h3>
                    <p className="text-sm font-medium text-muted-foreground mt-0.5">{lead.phone.replace(/(\d{4})$/, '****')}</p>
                  </div>
                  <span className={cn("inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider", STATUS_COLORS[lead.status as keyof typeof STATUS_COLORS] || "bg-gray-100 text-gray-800")}>
                    {lead.status}
                  </span>
                </div>

                <div className="bg-secondary/50 rounded-2xl p-3 text-sm grid grid-cols-2 gap-y-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Assigned To</span>
                    <span className="font-medium">{lead.callerName}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Next Action</span>
                    <span className="font-medium text-[#4B0A8F]">{lead.nextAction}</span>
                  </div>
                  <div className="col-span-2 flex flex-col mt-1 pt-2 border-t border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Outcome Note</span>
                    <span className="text-sm italic text-foreground/80 mt-0.5">{lead.outcome}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 h-11 bg-card border border-border/70 text-foreground rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-sm">
                    <Phone size={16} className="text-[#1F0860]" />
                    Log Call
                  </button>
                  <button className="h-11 px-4 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 rounded-xl flex items-center justify-center gap-2 font-medium">
                    <MessageCircle size={18} />
                  </button>
                </div>
              </motion.div>
            )) || (
              <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-xl">
                No leads data found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
