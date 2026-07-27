"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Contact, Phone, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Guardian = {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  linkedStudents: Array<{ id: string; name: string }>;
};

export function MobileParkGuardiansPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const { data: guardians = [], isLoading } = useQuery<Guardian[]>({
    queryKey: ["park-guardians"],
    queryFn: () => fetch("/api/park/guardians").then(r => r.json()),
  });

  const filtered = guardians.filter(g => {
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Contact className="w-5 h-5 text-[#4B0A8F]" />
            Guardians
          </h1>
          <span className="text-sm font-semibold bg-muted px-2 py-1 rounded-md text-muted-foreground">
            {guardians.length} Total
          </span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search guardians..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-9 pr-4 rounded-xl bg-muted/50 border-transparent focus:bg-background focus:border-[#4B0A8F] focus:ring-1 focus:ring-[#4B0A8F] outline-none transition-all text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {["All", "Fathers", "Mothers", "Other"].map(tab => (
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
            <Skeleton key={i} className="h-28 rounded-2xl w-full" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center">
            <Contact className="w-12 h-12 opacity-20 mb-3" />
            <p className="font-medium">No guardians found</p>
          </div>
        ) : (
          filtered.map((g, i) => {
            const initials = g.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
            
            return (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <Card className="rounded-2xl border shadow-sm overflow-hidden bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br from-[#4B0A8F] to-[#8A40B0] shrink-0">
                        {initials}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-sm truncate pr-2">{g.name}</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0 uppercase">
                            {g.relationship}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="w-3.5 h-3.5 text-[#4B0A8F]" />
                          {g.phone.replace(/(\d{4})(\d{7})/, "$1-*******")}
                        </div>

                        <div className="flex items-start gap-1.5 pt-1.5 text-xs">
                          <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="flex flex-wrap gap-1">
                            {g.linkedStudents.map(student => (
                              <span key={student.id} className="bg-[#F3ECF6] text-[#4B0A8F] px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                {student.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
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
