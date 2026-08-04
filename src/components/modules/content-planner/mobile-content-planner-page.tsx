"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Trophy,
  Dumbbell,
  Compass,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileContentPlannerPage() {
  const [activeTab, setActiveTab] = useState<"sports" | "skills" | "tadreeb">("sports");

  const mockCurriculum = [
    {
      week: "Week 01",
      topic: "Physical Fitness & Martial Arts Basics",
      category: "Sports",
      parkOverride: "State Life Park Approved",
      status: "active"
    },
    {
      week: "Week 02",
      topic: "Public Speaking & Leadership Skills",
      category: "Skills",
      parkOverride: "Standard Template",
      status: "active"
    },
    {
      week: "Week 03",
      topic: "Tadreeb: Character & Ethics Module",
      category: "Tadreeb",
      parkOverride: "Standard Template",
      status: "active"
    }
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24 select-none">
      {/* ─── Sticky Header ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pt-3 pb-3 px-4 border-b border-border/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-[#4B0A8F]/10 text-[#4B0A8F] flex items-center justify-center font-bold">
              <BookOpen className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-bold truncate">Content Planner & Modules</h1>
              <p className="text-xs text-muted-foreground">Sports, Skills & Tadreeb Curriculum</p>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {[
            { id: "sports", label: "Sports", icon: Dumbbell },
            { id: "skills", label: "Skills", icon: Compass },
            { id: "tadreeb", label: "Tadreeb", icon: Trophy },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 active:scale-95",
                  isActive
                    ? "bg-[#4B0A8F] text-white shadow-md"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Curriculum Cards ────────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {mockCurriculum.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4B0A8F]/10 text-[#4B0A8F]">
                {item.week}
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold">
                {item.parkOverride}
              </span>
            </div>

            <h3 className="text-sm font-bold text-foreground">{item.topic}</h3>
            <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">{item.category} Module</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
