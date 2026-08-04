"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  Plus,
  Users,
  MapPin,
  Clock,
  DollarSign,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileEventsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const mockEvents = [
    {
      id: "ev1",
      title: "Lahore Annual Youth Leadership Camp 2026",
      code: "CAMP-2026-LHR",
      city: "Lahore",
      date: "Sunday, Aug 23, 2026",
      registeredCount: 142,
      fee: "PKR 500",
      status: "open"
    },
    {
      id: "ev2",
      title: "Karachi Inter-Park Sports Tournament",
      code: "SPORTS-2026-KHI",
      city: "Karachi",
      date: "Sunday, Sep 6, 2026",
      registeredCount: 98,
      fee: "PKR 300",
      status: "scheduled"
    }
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24 select-none">
      {/* ─── Sticky Header ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pt-3 pb-3 px-4 border-b border-border/60 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-[#4B0A8F]/10 text-[#4B0A8F] flex items-center justify-center font-bold">
              <CalendarCheck className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-bold truncate">Special Events Portal</h1>
              <p className="text-xs text-muted-foreground">Camps & Tournaments</p>
            </div>
          </div>

          <button className="size-9 rounded-xl bg-[#4B0A8F] text-white flex items-center justify-center shadow-md active:scale-95 transition-all">
            <Plus className="size-5" />
          </button>
        </div>
      </div>

      {/* ─── Events List ──────────────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {mockEvents.map((event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4B0A8F]/10 text-[#4B0A8F]">
                {event.city} • {event.code}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 uppercase">
                {event.status}
              </span>
            </div>

            <h3 className="text-sm font-bold text-foreground leading-snug">{event.title}</h3>
            <p className="text-xs text-muted-foreground">{event.date}</p>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 text-center border border-purple-200/50">
                <div className="font-black text-[#4B0A8F] dark:text-purple-300">{event.registeredCount}</div>
                <div className="text-[10px] text-muted-foreground">Registered Students</div>
              </div>

              <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-center border border-emerald-200/50">
                <div className="font-black text-emerald-700 dark:text-emerald-400">{event.fee}</div>
                <div className="text-[10px] text-muted-foreground">Registration Fee</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
