"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, ChevronDown, Phone, MapPin, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Participant = {
  id: string;
  name: string;
  groupName: string;
  attendanceRate: number;
  status: "Active" | "Inactive" | "Warning";
  phone: string;
  address: string;
  joinDate: string;
};

export function MobileParkParticipantsPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: participants = [], isLoading } = useQuery<Participant[]>({
    queryKey: ["park-participants"],
    queryFn: () => fetch("/api/park/participants").then(r => r.json()),
  });

  const filtered = participants.filter(p => {
    if (activeFilter !== "All" && p.status !== activeFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-[#4B0A8F]" />
            Participants
          </h1>
          <span className="text-sm font-semibold bg-muted px-2 py-1 rounded-md text-muted-foreground">
            {participants.length} Total
          </span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search participants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-9 pr-4 rounded-xl bg-muted/50 border-transparent focus:bg-background focus:border-[#4B0A8F] focus:ring-1 focus:ring-[#4B0A8F] outline-none transition-all text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {["All", "Active", "Warning", "Inactive"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
                activeFilter === tab
                  ? "bg-[#4B0A8F] text-white"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl w-full" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center">
            <Users className="w-12 h-12 opacity-20 mb-3" />
            <p className="font-medium">No participants found</p>
          </div>
        ) : (
          filtered.map((p, i) => {
            const isExpanded = expandedId === p.id;
            const initials = p.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
            
            // Ring color based on attendance
            const ringColor = p.attendanceRate >= 80 ? "ring-emerald-500" : p.attendanceRate >= 50 ? "ring-amber-500" : "ring-red-500";
            const statusBg = p.status === "Active" ? "bg-emerald-50 text-emerald-700" : p.status === "Warning" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700";

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <Card 
                  className={cn("rounded-2xl border overflow-hidden transition-colors shadow-sm", isExpanded ? "border-[#4B0A8F]" : "border-border")}
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar with ring */}
                      <div className={cn("relative w-12 h-12 rounded-full flex items-center justify-center font-bold text-[#4B0A8F] bg-[#F3ECF6] ring-2 ring-offset-2", ringColor)}>
                        {initials}
                        <div className="absolute -bottom-1 -right-1 text-[8px] font-bold bg-background rounded-full px-1 shadow-sm border">
                          {p.attendanceRate}%
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm truncate">{p.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{p.groupName}</p>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", statusBg)}>
                          {p.status}
                        </span>
                        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 mt-4 border-t space-y-3">
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <Phone className="w-4 h-4 text-[#4B0A8F]" />
                              <span>{p.phone || "No phone provided"}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4 text-[#4B0A8F]" />
                              <span className="truncate">{p.address || "No address provided"}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <CalendarDays className="w-4 h-4 text-[#4B0A8F]" />
                              <span>Joined {p.joinDate}</span>
                            </div>
                            <div className="pt-2 flex gap-2">
                              <button className="flex-1 h-10 rounded-xl border font-semibold text-sm hover:bg-muted transition-colors">
                                View Profile
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
        <div className="h-6" />
      </div>
    </div>
  );
}
