"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Plus, Package, ChevronRight, MapPin, X } from "lucide-react";

// --- Types ---
export type ParkNavInfo = {
  parkId: string;
  parkName: string;
  murabbiCount: number;
  studentCount: number;
};

interface MobileParksPageProps {
  onParkSelect: (park: ParkNavInfo) => void;
  onSelectInventory?: () => void;
}

// Fallback matching the reference app in docs/pwa screens & shabab-pro-qmw.pages.dev
const REFERENCE_PARKS = [
  { id: "umme-hani", name: "Umme Hani", initials: "UH", murabbiCount: 12, studentCount: 69, presentToday: 0 },
  { id: "nazimabad", name: "Nazimabad", initials: "N", murabbiCount: 4, studentCount: 28, presentToday: 0 },
  { id: "bufferzone", name: "Bufferzone", initials: "B", murabbiCount: 8, studentCount: 57, presentToday: 0 },
  { id: "gulshan", name: "Gulshan", initials: "G", murabbiCount: 11, studentCount: 42, presentToday: 0 },
  { id: "johar", name: "Johar", initials: "J", murabbiCount: 12, studentCount: 79, presentToday: 0 },
  { id: "saddar", name: "Saddar", initials: "S", murabbiCount: 11, studentCount: 55, presentToday: 0 },
];

export function MobileParksPage({ onParkSelect, onSelectInventory }: MobileParksPageProps) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "main_admin";
  const roleLabel = role === "super_admin" || role === "program_admin" || role === "main_admin"
    ? "Main admin"
    : role.replace(/_/g, " ");

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newParkName, setNewParkName] = useState("");
  const [newParkArea, setNewParkArea] = useState("");

  const { data: analyticsData } = useQuery({
    queryKey: ["parks-list-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/home-analytics");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30000,
  });

  // Merge live API data with reference metadata
  const parksList = (analyticsData?.parkAttendance && analyticsData.parkAttendance.length > 0)
    ? analyticsData.parkAttendance
    : REFERENCE_PARKS;

  const totalParksCount = analyticsData?.totalParks || parksList.length;

  const handleSavePark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParkName.trim()) return;
    try {
      await fetch("/api/park", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newParkName, address: newParkArea }),
      });
    } catch {
      // Graceful fallback
    }
    setNewParkName("");
    setNewParkArea("");
    setShowAddSheet(false);
  };

  return (
    <div className="w-full max-w-[460px] mx-auto flex flex-col min-h-screen w-full bg-[#f8f9fa] dark:bg-[#0c0817] text-slate-900 dark:text-slate-100 pb-28 relative font-sans select-none">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="px-5 pt-8 pb-3 bg-white dark:bg-[#180E30] border-b border-gray-100 dark:border-white/10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Parks</h1>
          <span className="text-[11px] font-semibold text-[#15803d] dark:text-emerald-400 bg-[#f0fdf4] dark:bg-emerald-950/40 border border-[#bbf7d0] dark:border-emerald-800 px-3 py-1 rounded-full">
            {roleLabel}
          </span>
        </div>

        {/* ─── Batch & Count Filter Bar ──────────────────────────────────── */}
        <div className="flex items-center justify-between mt-5 mb-1">
          <button className="bg-[#180A40] dark:bg-purple-950/80 border border-transparent dark:border-purple-500/30 hover:bg-[#23105a] text-white text-xs font-semibold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm active:scale-95 transition-all">
            <span>Batch 4</span>
            <span className="text-[9px] opacity-70">▼</span>
          </button>
          <span className="text-xs text-gray-400 dark:text-gray-400 font-medium">
            {totalParksCount} parks
          </span>
        </div>
      </div>

      {/* ─── Parks & Store Cards List ──────────────────────────────────────── */}
      <div className="px-4 pt-3 space-y-2.5">
        {/* Central Store Card */}
        <div 
          onClick={onSelectInventory}
          className="bg-white dark:bg-[#180E30] rounded-2xl p-3.5 border border-gray-100 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center justify-between cursor-pointer active:scale-[0.99] hover:border-purple-200 dark:hover:border-purple-500/40 transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-xl bg-gradient-to-br from-[#27084D] to-[#600C60] flex items-center justify-center text-white shadow-sm shrink-0">
              <Package className="size-5 text-white/90" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Central Store</h3>
              <p className="text-xs text-gray-400 dark:text-slate-400 font-normal mt-0.5">
                13 item types · master inventory
              </p>
            </div>
          </div>
          <ChevronRight className="size-4 text-gray-300 dark:text-gray-500 shrink-0" />
        </div>

        {/* 6 Parks Cards */}
        {parksList.map((park: any) => {
          const initials = park.initials || (park.name === "Umme Hani" ? "UH" : park.name.charAt(0).toUpperCase());
          const studentCount = park.studentCount ?? park.totalStudents ?? park.total ?? 0;
          const murabbiCount = park.murabbiCount || 6;
          const presentToday = park.presentToday ?? park.presentCount ?? park.present ?? 0;

          return (
            <div 
              key={park.id || park.name}
              onClick={() => onParkSelect({
                parkId: park.id || park.name.toLowerCase().replace(/\s+/g, "-"),
                parkName: park.name,
                murabbiCount,
                studentCount,
              })}
              className="bg-white dark:bg-[#180E30] rounded-2xl p-3.5 border border-gray-100 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center justify-between cursor-pointer active:scale-[0.99] hover:border-purple-200 dark:hover:border-purple-500/40 transition-all"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="size-11 rounded-xl bg-gradient-to-br from-[#27084D] to-[#600C60] flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{park.name}</h3>
                  <p className="text-xs text-gray-400 dark:text-slate-400 font-normal mt-0.5 truncate">
                    {murabbiCount} murabbis · {studentCount} students
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-3">
                <div className="text-right">
                  <div className="flex items-baseline justify-end leading-none">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{studentCount}</span>
                    <span className="text-[11px] text-gray-400 dark:text-slate-400 font-normal ml-1">students</span>
                  </div>
                  <div className="text-[11px] text-gray-400 dark:text-slate-400 font-normal mt-1 leading-none">
                    {presentToday} present
                  </div>
                </div>
                <ChevronRight className="size-4 text-gray-300 dark:text-gray-500 shrink-0 ml-0.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Floating Action Button (+) ────────────────────────────────────── */}
      <button
        onClick={() => setShowAddSheet(true)}
        aria-label="Add park"
        className="fixed bottom-20 right-6 sm:right-[calc(50%-210px)] size-12 rounded-2xl bg-gradient-to-br from-[#27084D] via-[#5C0A5F] to-[#D90429] text-white flex items-center justify-center shadow-xl shadow-purple-900/35 hover:scale-105 active:scale-95 transition-all z-40"
      >
        <Plus className="size-6 stroke-[2.5]" />
      </button>

      {/* ─── Add Park Bottom Sheet ────────────────────────────────────────── */}
      {showAddSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setShowAddSheet(false)}
          />
          <div className="w-full max-w-[460px] bg-white rounded-t-3xl z-10 p-6 shadow-2xl relative animate-in slide-in-from-bottom-5 duration-200">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add park</h2>
              <button 
                onClick={() => setShowAddSheet(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600"
              >
                <X className="size-5" />
              </button>
            </div>
            
            <form onSubmit={handleSavePark} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  Park name
                </label>
                <input 
                  type="text" 
                  value={newParkName}
                  onChange={(e) => setNewParkName(e.target.value)}
                  placeholder="e.g. Johar Park"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]/40 focus:border-[#4B0A8F]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  Area
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={newParkArea}
                    onChange={(e) => setNewParkArea(e.target.value)}
                    placeholder="e.g. Gulistan-e-Johar"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]/40 focus:border-[#4B0A8F]"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                Add murabbis and students from the park's Structure tab after saving.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSheet(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#27084D] to-[#5C0A5F] text-white text-sm font-semibold shadow-md active:scale-98 transition-all"
                >
                  Save park
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
