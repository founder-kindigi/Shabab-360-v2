"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ListTodo, Search, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type RosterMember = {
  id: string;
  shababNumber: string;
  name: string;
  groupName: string;
  batchName: string;
  status: "Active" | "Inactive";
};

export function MobileParkRosterPage() {
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState("All Groups");

  const { data: roster = [], isLoading } = useQuery<RosterMember[]>({
    queryKey: ["park-roster"],
    queryFn: () => fetch("/api/park/roster").then(r => r.json()),
  });

  const groups = ["All Groups", ...Array.from(new Set(roster.map(r => r.groupName)))];

  const filtered = roster.filter(r => {
    if (activeGroup !== "All Groups" && r.groupName !== activeGroup) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.shababNumber.includes(search)) return false;
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-[#4B0A8F]" />
            Full Roster
          </h1>
          <button className="flex items-center gap-1.5 text-xs font-semibold bg-[#F3ECF6] text-[#4B0A8F] px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-9 pr-4 rounded-xl bg-muted/50 border-transparent focus:bg-background focus:border-[#4B0A8F] focus:ring-1 focus:ring-[#4B0A8F] outline-none transition-all text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {groups.map(group => (
            <button
              key={group}
              onClick={() => setActiveGroup(group)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
                activeGroup === group
                  ? "bg-[#4B0A8F] text-white"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl w-full" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center">
            <ListTodo className="w-12 h-12 opacity-20 mb-3" />
            <p className="font-medium">No members found</p>
          </div>
        ) : (
          filtered.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
            >
              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center font-bold text-[#4B0A8F] text-xs shrink-0">
                    {r.shababNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">{r.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <span className="truncate">{r.groupName}</span>
                      <span>&middot;</span>
                      <span className="truncate">{r.batchName}</span>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0",
                    r.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  )}>
                    {r.status}
                  </span>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
        <div className="h-6" />
      </div>
    </div>
  );
}
