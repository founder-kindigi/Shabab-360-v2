"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { PROTO_STAFF } from "@/components/prototype/data/proto-data";
import { 
  Search, UserPlus, Phone, MapPin, Shield, CheckCircle2, Users
} from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  onNavigate?: (screen: string) => void;
}

const TABS = ["All", "Park Lead", "Park Admin", "Murabbi", "Inactive"];

export function ProtoCityPeople({ onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState("All");
  
  const filteredStaff = PROTO_STAFF?.filter(staff => {
    if (activeTab === "All") return true;
    if (activeTab === "Inactive") return !staff.isActive;
    return staff.role === activeTab;
  }) || [];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background pb-20">
      <div className="bg-card border-b border-border/70 px-4 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D90429]/10 text-[#D90429] rounded-xl">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">People & Staff</h1>
              <p className="text-xs text-muted-foreground">City Administration</p>
            </div>
          </div>
          <button className="h-10 w-10 bg-[#1F0860] text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform">
            <UserPlus size={20} />
          </button>
        </div>

        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search staff by name or role..." 
            className="w-full h-11 pl-10 pr-4 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F0860]/50"
          />
        </div>

        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1 -mx-4 px-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                activeTab === tab 
                  ? "bg-[#1F0860] text-white border-[#1F0860]" 
                  : "bg-background text-foreground border-border hover:bg-secondary"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {filteredStaff.length > 0 ? (
          filteredStaff.map((person) => (
            <motion.div 
              whileTap={{ scale: 0.98 }}
              key={person.id} 
              className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex items-center gap-4 cursor-pointer"
            >
              <div className="relative">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#4B0A8F] to-[#D90429] flex items-center justify-center text-white font-bold text-lg shadow-inner">
                  {person.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                {person.isActive && (
                  <div className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 border-2 border-card rounded-full" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-foreground text-base truncate">{person.name}</h3>
                  <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider bg-secondary text-foreground shrink-0">
                    {person.team}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Shield size={12} className="text-[#4B0A8F]" />
                    <span className="font-medium text-[#4B0A8F]">{person.role}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} />
                    <span className="truncate">{person.parkAssigned}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center text-muted-foreground mb-4">
              <Users size={32} />
            </div>
            <h3 className="text-lg font-bold text-foreground">No staff found</h3>
            <p className="text-sm text-muted-foreground mt-1">No staff members match the selected filter.</p>
          </div>
        )}
      </div>
      
      <div className="fixed bottom-6 left-0 right-0 px-4 z-50">
         <button className="w-full h-14 bg-[#1F0860] text-white rounded-full shadow-lg flex items-center justify-center gap-2 font-bold text-sm hover:bg-[#150540] active:scale-95 transition-all">
          <UserPlus size={20} />
          Provision Staff Member
        </button>
      </div>
    </div>
  );
}
