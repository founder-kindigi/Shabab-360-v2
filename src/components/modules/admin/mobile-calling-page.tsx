"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhoneCall,
  Search,
  Filter,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  PhoneForwarded,
  ShieldCheck,
  MessageSquare,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileCallingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const mockLeads = [
    {
      id: "c1",
      name: "Tariq Mahmood (Guardian of Usman)",
      phoneRedacted: "0300****567",
      campaign: "Lahore Batch 4 Retention",
      status: "pending",
      lastResponse: "No Answer",
      note: "Follow up after Maghrib"
    },
    {
      id: "c2",
      name: "Kamran Shah (Guardian of Bilal)",
      phoneRedacted: "0321****890",
      campaign: "Lahore Batch 4 Retention",
      status: "completed",
      lastResponse: "Confirmed Attending",
      note: "Guardian agreed to send student on Sunday"
    },
    {
      id: "c3",
      name: "Zubair Ahmad (Guardian of Hamza)",
      phoneRedacted: "0333****123",
      campaign: "Lahore Batch 4 Retention",
      status: "pending",
      lastResponse: "Callback Requested",
      note: "Wants to speak with Murabbi"
    }
  ];

  const filteredLeads = mockLeads.filter((lead) => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && lead.status === statusFilter;
  });

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24 select-none">
      {/* ─── Sticky Header ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pt-3 pb-3 px-4 border-b border-border/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-[#4B0A8F]/10 text-[#4B0A8F] flex items-center justify-center font-bold">
              <PhoneCall className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-bold truncate">Calling Operations Desk</h1>
              <p className="text-xs text-muted-foreground">Lahore Batch 4 Campaign</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
            Active Campaign
          </span>
        </div>

        {/* Search */}
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads by name..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/60 border border-border/80 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#4B0A8F] transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {["all", "pending", "completed"].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all shrink-0 active:scale-95",
                statusFilter === tab
                  ? "bg-[#4B0A8F] text-white shadow-md"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Leads List ────────────────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {filteredLeads.map((lead) => (
          <motion.div
            key={lead.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">{lead.name}</h3>
                <p className="text-xs text-muted-foreground font-mono">{lead.phoneRedacted}</p>
              </div>
              <span
                className={cn(
                  "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase",
                  lead.status === "completed"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                )}
              >
                {lead.status}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-muted/40 text-xs text-muted-foreground space-y-1">
              <div className="font-semibold text-foreground">Last Response: {lead.lastResponse}</div>
              <div>Note: {lead.note}</div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button className="flex-1 h-11 rounded-2xl bg-[#4B0A8F] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all">
                <PhoneCall className="size-4" />
                <span>Call Lead</span>
              </button>

              <button className="h-11 px-3 rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all">
                <MessageSquare className="size-4" />
                <span>WhatsApp</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
