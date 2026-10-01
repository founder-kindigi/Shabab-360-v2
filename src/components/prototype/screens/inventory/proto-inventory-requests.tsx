"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Clock, CheckCircle2, Truck, User, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onNavigate?: (screen: string) => void;
}

const TABS = ["All", "Pending Approval", "Approved", "Transferred"];

const REQUESTS = [
  { id: 1, location: "State Life Park", item: "5 Footballs & 2 Whistles", requester: "Br. Usman Ali", status: "Approved", date: "2026-08-01" },
  { id: 2, location: "Johar Park", item: "1 Portable Speaker", requester: "Br. Sajid Mehmood", status: "Pending Approval", date: "2026-08-03" },
  { id: 3, location: "Gulberg Park", item: "20 Tadreeb Workbooks", requester: "Br. Hassan Raza", status: "Transferred", date: "2026-07-28" },
  { id: 4, location: "Islamabad City", item: "10 Camping Tents", requester: "Br. Zafar Iqbal", status: "Pending Approval", date: "2026-08-02" },
];

export function ProtoInventoryRequests({ onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState("All");

  const filteredRequests = REQUESTS.filter(
    (req) => activeTab === "All" || req.status === activeTab
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved": return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400";
      case "Pending Approval": return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400";
      case "Transferred": return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved": return <CheckCircle2 className="w-3 h-3 mr-1" />;
      case "Pending Approval": return <Clock className="w-3 h-3 mr-1" />;
      case "Transferred": return <Truck className="w-3 h-3 mr-1" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-4 flex items-center gap-3">
        <button onClick={() => onNavigate?.("inventory")} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#1F0860] dark:text-white">Procurement & Requests</h1>
          <p className="text-xs text-muted-foreground">Manage park inventory requests</p>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-6">
        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                activeTab === tab
                  ? "bg-[#4B0A8F] text-white border-[#4B0A8F]"
                  : "bg-card text-foreground border-border/70 hover:bg-muted"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {activeTab} Requests ({filteredRequests.length})
          </h2>

          {filteredRequests.map((req, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={req.id}
              className="bg-card border border-border/70 rounded-3xl p-5 shadow-sm flex flex-col gap-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-base">{req.location}</h3>
                  <p className="text-sm font-semibold text-[#D90429] mt-1">{req.item}</p>
                </div>
                <span className={cn("inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full border", getStatusColor(req.status))}>
                  {getStatusIcon(req.status)}
                  {req.status}
                </span>
              </div>

              <div className="flex flex-col gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-2xl border border-border/50">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#4B0A8F]" />
                  <span>Requested by: <span className="font-medium text-foreground">{req.requester}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#4B0A8F]" />
                  <span>Date: <span className="font-medium text-foreground">{req.date}</span></span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      <div className="fixed bottom-6 left-4 right-4 z-20">
        <button className="w-full h-12 bg-[#1F0860] hover:bg-[#2a0b80] text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 transition-colors">
          <Plus className="w-5 h-5" />
          New Purchase / Transfer Request
        </button>
      </div>
    </div>
  );
}
