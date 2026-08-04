"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Search, FileText, Video, Download, Eye, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onNavigate?: (screen: string) => void;
}

const CATEGORIES = ["All", "Books & Guides", "Tadreeb Modules", "Video Lectures", "Articles"];

const RESOURCES = [
  { id: 1, title: "Shabab Alburhan Member Handbook", type: "PDF", category: "Books & Guides", size: "4.2 MB", downloads: 340, icon: FileText },
  { id: 2, title: "Tadreeb Module 1-8 Companion Guide", type: "PDF", category: "Tadreeb Modules", size: "12.1 MB", downloads: 180, icon: BookOpen },
  { id: 3, title: "Public Speaking & Leadership Skills", type: "PDF", category: "Books & Guides", size: "8.5 MB", downloads: 220, icon: FileText },
  { id: 4, title: "Outdoor Survival & Teamwork Handbook", type: "PDF", category: "Books & Guides", size: "6.0 MB", downloads: 150, icon: BookOpen },
  { id: 5, title: "Accountability in Youth Leadership", type: "Video", category: "Video Lectures", size: "24 mins", downloads: 0, icon: Video },
  { id: 6, title: "Character & Responsibility Series", type: "Article", category: "Articles", size: "10 mins read", downloads: 0, icon: FileText },
];

export function ProtoResourcesLibrary({ onNavigate }: Props) {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = RESOURCES.filter(
    r => activeCategory === "All" || r.category === activeCategory
  );

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-20">
      <header className="sticky top-0 z-10 bg-[#1F0860] text-white px-4 py-4 rounded-b-3xl shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => onNavigate?.("home")} className="p-2 -ml-2 rounded-full hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Resources Library</h1>
            <p className="text-xs text-white/70">Online Learning Portal</p>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input 
            type="text" 
            placeholder="Search resources, modules..." 
            className="w-full h-12 bg-white/10 border border-white/20 rounded-2xl pl-10 pr-4 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-6 pt-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {CATEGORIES.map(cat => (
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={item.id}
              className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex flex-col"
            >
              <div className="flex gap-4 items-start mb-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                  item.type === 'PDF' ? "bg-red-100 text-red-600 dark:bg-red-900/30" : 
                  item.type === 'Video' ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30" : 
                  "bg-blue-100 text-blue-600 dark:bg-blue-900/30"
                )}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/50">
                <div className="flex items-center gap-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <span>{item.type}</span>
                  <span>•</span>
                  <span>{item.size}</span>
                </div>
                <div className="flex gap-2">
                  <button className="w-8 h-8 bg-muted rounded-full flex items-center justify-center hover:bg-muted-foreground/20 transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="w-8 h-8 bg-[#1F0860]/10 text-[#1F0860] dark:bg-white/10 dark:text-white rounded-full flex items-center justify-center hover:bg-[#1F0860]/20 transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
