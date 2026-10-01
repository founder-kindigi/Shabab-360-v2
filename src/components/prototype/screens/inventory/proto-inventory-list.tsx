"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Search, Filter, Box, Package, Archive, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onNavigate?: (screen: string) => void;
}

const CATEGORIES = ["All", "Sports Gear", "Audio/IT", "Camping & Outdoor", "Stationeries"];

const INVENTORY_ITEMS = [
  { id: 1, name: "Cricket Kits", category: "Sports Gear", total: 12, locations: "4 at State Life, 4 at Gulberg, 4 in HQ", condition: "Good" },
  { id: 2, name: "Footballs & Cones", category: "Sports Gear", total: 30, locations: "10 per park", condition: "Good" },
  { id: 3, name: "Camping Tents (4-Person)", category: "Camping & Outdoor", total: 15, locations: "15 in HQ Storage", condition: "Excellent" },
  { id: 4, name: "Portable PA System", category: "Audio/IT", total: 4, locations: "1 per active park", condition: "Fair" },
  { id: 5, name: "Tadreeb Workbooks (Ch 1-8)", category: "Stationeries", total: 250, locations: "Distributed to all Murabbis", condition: "New" },
  { id: 6, name: "First Aid Kits", category: "Medical", total: 6, locations: "1 per park", condition: "Complete" },
];

export function ProtoInventoryList({ onNavigate }: Props) {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredItems = INVENTORY_ITEMS.filter(
    (item) => activeCategory === "All" || item.category === activeCategory
  );

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-4 flex items-center gap-3">
        <button onClick={() => onNavigate?.("home")} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#1F0860] dark:text-white">Inventory & Equipment</h1>
          <p className="text-xs text-muted-foreground">Track stock items across all parks</p>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-6">
        {/* Stats */}
        <div className="bg-gradient-to-br from-[#1F0860] to-[#4B0A8F] rounded-3xl p-5 text-white shadow-lg">
          <h2 className="text-sm font-medium text-white/80 mb-4 uppercase tracking-wider">Stock Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col">
              <span className="text-3xl font-bold">317</span>
              <span className="text-xs text-white/70">Total Items</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold">280</span>
              <span className="text-xs text-white/70">Allocated</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-[#D90429]">37</span>
              <span className="text-xs text-white/70">Available</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                activeCategory === cat
                  ? "bg-[#D90429] text-white border-[#D90429]"
                  : "bg-card text-foreground border-border/70 hover:bg-muted"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {activeCategory} Items ({filteredItems.length})
            </h2>
          </div>

          {filteredItems.map((item, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={item.id}
              className="bg-card border border-border/70 rounded-2xl p-4 flex gap-4 items-start shadow-sm"
            >
              <div className="w-12 h-12 rounded-full bg-[#4B0A8F]/10 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-[#4B0A8F]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-base truncate">{item.name}</h3>
                  <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border bg-muted">
                    {item.condition}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{item.category}</p>
                
                <div className="flex flex-col gap-1 text-sm bg-muted/50 rounded-xl p-3 border border-border/50">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Units:</span>
                    <span className="font-semibold">{item.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Locations:</span>
                    <span className="font-medium text-right max-w-[180px]">{item.locations}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* FAB */}
      <div className="fixed bottom-6 right-6">
        <button className="w-14 h-14 bg-[#D90429] text-white rounded-full flex items-center justify-center shadow-xl hover:bg-[#b00322] transition-colors">
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
