"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { PROTO_FINANCE, STATUS_COLORS } from "@/components/prototype/data/proto-data";
import { 
  Banknote, ArrowDownRight, ArrowUpRight, 
  Wallet, Receipt, ArrowRight, Download
} from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  onNavigate?: (screen: string) => void;
}

const TABS = ["All", "Registration", "Event Fees", "Donations", "Expenses"];

export function ProtoCityFinance({ onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState("All");

  const filteredFinance = PROTO_FINANCE?.filter(item => {
    if (activeTab === "All") return true;
    return item.type === activeTab;
  }) || [];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background pb-20">
      <div className="bg-card border-b border-border/70 px-4 pt-12 pb-6 sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 text-green-600 dark:bg-green-900/30 rounded-xl">
              <Banknote size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Finance</h1>
              <p className="text-xs text-muted-foreground">City Treasury Overview</p>
            </div>
          </div>
          <button className="h-10 w-10 bg-secondary rounded-full flex items-center justify-center text-foreground">
            <Download size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-2xl p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
              <ArrowDownRight size={16} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Collected</span>
            </div>
            <span className="text-xl font-bold text-foreground">PKR 5,500</span>
          </div>
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-2xl p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-orange-700 dark:text-orange-400">
              <Wallet size={16} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Pending</span>
            </div>
            <span className="text-xl font-bold text-foreground">PKR 300</span>
          </div>
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-2xl p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400">
              <ArrowUpRight size={16} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Expenses</span>
            </div>
            <span className="text-xl font-bold text-foreground">PKR 12,000</span>
          </div>
          <div className="bg-card border border-border/70 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Banknote size={16} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Net balance</span>
            </div>
            <span className="text-xl font-bold text-red-600">PKR -6,500</span>
          </div>
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
        {filteredFinance.length > 0 ? (
          filteredFinance.map((record) => (
            <motion.div whileTap={{ scale: 0.98 }} key={record.id} className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                    record.type === "Expenses" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                  )}>
                    {record.type === "Expenses" ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm">{record.participantOrDonor}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{record.type} • {record.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn(
                    "font-bold block",
                    record.type === "Expenses" ? "text-red-600" : "text-green-600"
                  )}>
                    {record.type === "Expenses" ? "-" : "+"}PKR {record.amount.toLocaleString()}
                  </span>
                  <span className={cn("inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 uppercase tracking-wider", STATUS_COLORS[record.status as keyof typeof STATUS_COLORS] || "bg-gray-100 text-gray-800")}>
                    {record.status}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-border/50 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Receipt size={12} />
                  <span>{record.receiptNumber}</span>
                </div>
                <button className="font-semibold text-[#1F0860] flex items-center gap-1">
                  Details <ArrowRight size={12} />
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center text-muted-foreground mb-4">
              <Banknote size={32} />
            </div>
            <h3 className="text-lg font-bold text-foreground">No records</h3>
            <p className="text-sm text-muted-foreground mt-1">No financial records found for '{activeTab}'.</p>
          </div>
        )}
      </div>
    </div>
  );
}
