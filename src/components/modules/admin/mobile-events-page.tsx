"use client";
import { useSession } from "next-auth/react";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Calendar,
  Trophy,
  Users,
  MapPin,
  ArrowLeft,
  RefreshCw,
  Plus,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileEventsPageProps {
  onBack?: () => void;
}

export function MobileEventsPage({ onBack }: MobileEventsPageProps) {
  const { data: session } = useSession();
  // ─── Real DB Query ─────────────────────────────────────────────────────
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ["events-list-real"],
    queryFn: async () => {
      const res = await fetch("/api/admin/events");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000
  });

  const eventsList: any[] = eventsData?.data ?? eventsData?.events ?? [];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-6 pb-8 px-5 rounded-b-[2rem] shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="size-8 rounded-xl bg-white/10 flex items-center justify-center text-white"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <div className="size-9 rounded-xl bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] border border-white/20 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
              <img src="/shabab-logo.png" alt="Logo" className="size-full object-contain" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white">Youth Events & Camps</h1>
              <p className="text-[11px] text-purple-200">Special Youth Programs</p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-bold bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
            {isLoading ? <RefreshCw className="size-3 animate-spin text-purple-300" /> : <Trophy className="size-3 text-amber-300" />}
            <span>DB Live</span>
          </div>
        </div>
      </div>

      {/* ─── Events List ──────────────────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-xs text-muted-foreground">
            <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-[#4B0A8F]" />
            Loading events roster…
          </div>
        ) : eventsList.length === 0 ? (
          <div className="text-center py-12 text-xs text-muted-foreground bg-card rounded-3xl border border-border/80 p-6">
            <Calendar className="size-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="font-semibold text-foreground">No events scheduled</p>
            <p className="mt-1 text-[11px]">There are currently no upcoming youth events or camps scheduled.</p>
          </div>
        ) : (
          eventsList.map((event: any) => {
            const regCount = event._count?.registrations ?? event.registered ?? 0;
            const dateStr = event.eventDate
              ? new Date(event.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : event.date ?? "TBD";
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B0A8F] dark:text-purple-300">
                      {event.eventType || event.type || "Event"}
                    </span>
                    <h3 className="text-sm font-extrabold text-foreground">{event.title}</h3>
                  </div>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    {regCount} Registered
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/60">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5" />
                    {dateStr}
                  </span>
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="size-3.5 shrink-0" />
                    {event.location || "Grounds"}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
