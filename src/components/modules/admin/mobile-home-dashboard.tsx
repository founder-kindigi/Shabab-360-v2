"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Bell, MapPin, Users, CheckCircle2, Loader2, Calendar, TrendingUp, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/theme-provider";

export function MobileHomeDashboard() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const { setTheme, resolvedTheme } = useTheme();
  const [viewMode, setViewMode] = useState<"today" | "trend">("today");
  const [audienceMode, setAudienceMode] = useState<"student" | "murabbi">("student");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-home-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/home-analytics");
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  return (
    <div className="w-full max-w-[460px] mx-auto flex flex-col min-h-screen w-full bg-background pb-24">
      {/* ─── Header Section ───────────────────────────────────────────────── */}
      <div className="w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#D90429] pt-14 pb-8 rounded-b-[2.5rem] shadow-2xl relative z-10 px-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-white/10 border border-white/20 p-2 shadow-inner backdrop-blur-sm">
              <img src="/logo-white.png" alt="Shabab 360" className="size-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight leading-none">SHABAB</h1>
              <p className="text-[10px] text-purple-200 font-bold uppercase tracking-widest mt-1">
                Revolutionary Youth Training Program
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="size-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white active:scale-95 transition-transform"
              title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="size-5 text-amber-300" />
              ) : (
                <Moon className="size-5 text-purple-200" />
              )}
            </button>
            <button className="size-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white relative">
              <Bell className="size-5" />
              <span className="absolute top-2 right-2 size-2.5 bg-[#D90429] rounded-full border border-white"></span>
            </button>
          </div>
        </div>

        {/* Batch Dropdown */}
        <div className="mb-6">
          <button className="flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-2 rounded-full text-white text-sm font-bold backdrop-blur-md">
            Batch 4 <span className="opacity-70">▼</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <MapPin className="size-5 text-purple-200 mb-1" />
            <span className="text-2xl font-black text-white">{data?.totalParks || "—"}</span>
            <span className="text-[10px] font-bold text-purple-200 uppercase tracking-wider">Parks</span>
          </div>
          <div className="flex-1 bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <Users className="size-5 text-purple-200 mb-1" />
            <span className="text-2xl font-black text-white">{data?.totalStudents || "—"}</span>
            <span className="text-[10px] font-bold text-purple-200 uppercase tracking-wider">Students</span>
          </div>
          <div className="flex-1 bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="size-5 text-[#D90429] mb-1" />
            <span className="text-2xl font-black text-white">{data?.presentToday || "—"}</span>
            <span className="text-[10px] font-bold text-purple-200 uppercase tracking-wider">Present</span>
          </div>
        </div>
      </div>

      {/* ─── Analytics Section ────────────────────────────────────────────── */}
      <div className="px-5 pt-8 pb-4">
        <h2 className="text-xl font-extrabold text-foreground mb-4">Analytics</h2>
        
        <div className="bg-card border border-border rounded-3xl shadow-sm p-1">
          {/* Toggle buttons */}
          <div className="flex bg-muted rounded-2xl p-1 mb-4">
            <button
              onClick={() => setViewMode("today")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all",
                viewMode === "today" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              )}
            >
              <Calendar className="size-4" />
              Today
            </button>
            <button
              onClick={() => setViewMode("trend")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all",
                viewMode === "trend" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              )}
            >
              <TrendingUp className="size-4" />
              Trend
            </button>
          </div>

          <div className="px-4 pb-4">
            <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wider">
              {audienceMode === "student" ? "Student attendance today" : "Murabbi attendance today"}
            </h3>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="size-8 text-[#4B0A8F] animate-spin mb-2" />
                <p className="text-sm text-muted-foreground font-medium">Loading analytics...</p>
              </div>
            ) : error ? (
              <div className="py-10 text-center">
                <p className="text-sm text-rose-500 font-bold">Failed to load analytics</p>
              </div>
            ) : data?.parks?.length > 0 ? (
              <div className="space-y-4">
                {data.parks.map((park: any) => {
                  const percentage = park.attendancePercentage ?? park.percentage ?? 0;
                  const total = park.totalStudents ?? park.studentCount ?? park.total ?? 0;
                  const present = park.presentToday ?? park.presentCount ?? park.present ?? 0;
                  const dotColor = percentage >= 80 ? "bg-emerald-500" : percentage >= 50 ? "bg-amber-500" : "bg-rose-500";
                  
                  return (
                    <div key={park.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-3">
                        <div className={cn("size-2.5 rounded-full", dotColor)} />
                        <div>
                          <p className="text-sm font-bold text-foreground">{park.name}</p>
                          <p className="text-xs font-medium text-muted-foreground">
                            {present}/{total} present ({present} marked)
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-foreground">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground font-medium">No data available for today</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Bottom Toggle ────────────────────────────────────────────────── */}
      <div className="px-5 mt-auto pb-4">
        <div className="flex bg-muted rounded-full p-1 max-w-xs mx-auto">
          <button
            onClick={() => setAudienceMode("student")}
            className={cn(
              "flex-1 py-2 rounded-full text-xs font-bold transition-all",
              audienceMode === "student" ? "bg-white text-[#4B0A8F] shadow-sm" : "text-muted-foreground"
            )}
          >
            Students
          </button>
          <button
            onClick={() => setAudienceMode("murabbi")}
            className={cn(
              "flex-1 py-2 rounded-full text-xs font-bold transition-all",
              audienceMode === "murabbi" ? "bg-white text-[#4B0A8F] shadow-sm" : "text-muted-foreground"
            )}
          >
            Murabbis
          </button>
        </div>
      </div>
    </div>
  );
}
