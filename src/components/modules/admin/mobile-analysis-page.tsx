"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Calendar, ChevronDown, ChevronUp, RefreshCw, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileAnalysisPageProps {
  onBack: () => void;
}

type DateFilter = "today" | "week" | "month" | "custom";

function getDateRange(filter: DateFilter, customFrom?: string, customTo?: string) {
  const now = new Date();
  
  const formatDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  if (filter === "today") {
    return { from: formatDate(now), to: formatDate(now) };
  }
  if (filter === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay()); // Sunday
    return { from: formatDate(start), to: formatDate(now) };
  }
  if (filter === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: formatDate(start), to: formatDate(now) };
  }
  return { 
    from: customFrom || formatDate(now), 
    to: customTo || formatDate(now) 
  };
}

function formatDateLabel(fromStr: string, toStr: string) {
  try {
    const from = new Date(fromStr);
    const to = new Date(toStr);
    const opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
    return `${from.toLocaleDateString(undefined, opts)} – ${to.toLocaleDateString(undefined, opts)}`;
  } catch (e) {
    return `${fromStr} – ${toStr}`;
  }
}

export function MobileAnalysisPage({ onBack }: MobileAnalysisPageProps) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const role = user?.role || "ADMIN";

  const [filter, setFilter] = useState<DateFilter>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  
  const [parkExpanded, setParkExpanded] = useState(true);
  const [murabbiExpanded, setMurabbiExpanded] = useState(true);
  const [murabbiSortInvert, setMurabbiSortInvert] = useState(false);

  const dateRange = getDateRange(filter, customFrom, customTo);
  const dateLabel = formatDateLabel(dateRange.from, dateRange.to);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-analysis", dateRange.from, dateRange.to],
    queryFn: async () => {
      const res = await fetch(`/api/admin/home-analytics?from=${dateRange.from}&to=${dateRange.to}`);
      if (!res.ok) throw new Error("Failed to fetch analysis");
      return res.json();
    },
    enabled: !!session?.user,
  });

  // Safely extract data, fallback to empty arrays/objects
  const todayAtt = data?.attendance || data?.todayAttendance || { present: 0, absent: 0, late: 0, total: 0 };
  const total = todayAtt.total ?? 0;
  const present = todayAtt.present ?? 0;
  const absent = (todayAtt.absent ?? 0) + (todayAtt.late ?? 0); // combining late with absent or treating separately. Let's just use absent if available, else total - present
  const computedAbsent = todayAtt.absent !== undefined ? todayAtt.absent : Math.max(0, total - present);
  const overall = total > 0 ? Math.round((present / total) * 100) : null;
  
  const byPark = data?.byPark || [];
  const byMurabbi = data?.byMurabbi || [];
  
  const sortedMurabbis = [...byMurabbi].sort((a, b) => {
    const aRate = a.total > 0 ? a.present / a.total : 0;
    const bRate = b.total > 0 ? b.present / b.total : 0;
    return murabbiSortInvert ? aRate - bRate : bRate - aRate;
  });

  const isEmpty = !isLoading && !isError && total === 0 && byPark.length === 0 && byMurabbi.length === 0;

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 -ml-1.5 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Analysis</h1>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold bg-purple-100 dark:bg-purple-900/40 text-[#4B0A8F] dark:text-purple-300 px-3 py-1.5 rounded-full border border-purple-200 dark:border-purple-800/40">
          <span>{role}</span>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Date Filter Tabs */}
        <div className="space-y-3">
          <div className="flex bg-muted/50 p-1 rounded-xl border border-border/50">
            {(["today", "week", "month", "custom"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex-1 py-1.5 text-xs font-bold rounded-lg capitalize transition-colors",
                  filter === f 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {filter === "custom" && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-2"
            >
              <input 
                type="date" 
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="flex-1 bg-card border border-border/50 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]"
              />
              <span className="text-xs font-bold text-muted-foreground">to</span>
              <input 
                type="date" 
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="flex-1 bg-card border border-border/50 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]"
              />
            </motion.div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Calendar className="size-3" />
            <span>{dateLabel}</span>
          </div>
        </div>

        {isError && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between font-bold">
            <span>Failed to load analysis data</span>
            <button onClick={() => refetch()} className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-extrabold transition-all">
              Retry
            </button>
          </div>
        )}

        {/* 3 Stat Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          <StatCard title="Present" value={present} isLoading={isLoading} />
          <StatCard title="Absent" value={computedAbsent} isLoading={isLoading} />
          <StatCard 
            title="Overall" 
            value={overall !== null ? `${overall}%` : "–"} 
            isLoading={isLoading} 
            highlight 
          />
        </div>

        {isEmpty ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-2">
              <Calendar className="size-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-bold text-foreground">No attendance data</p>
            <p className="text-xs text-muted-foreground">There is no data for this period.</p>
          </div>
        ) : (
          <>
            {/* By Park Section */}
            <div className="space-y-2">
              <button 
                onClick={() => setParkExpanded(!parkExpanded)}
                className="w-full flex items-center justify-between py-2"
              >
                <h2 className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest">By park</h2>
                {parkExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
              </button>

              <AnimatePresence>
                {parkExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    {isLoading ? (
                      <SkeletonRows count={3} />
                    ) : byPark.length > 0 ? (
                      byPark.map((p: any, i: number) => (
                        <div key={i} className="p-3.5 rounded-2xl bg-card border border-border/50 shadow-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">{p.name || `Park ${i+1}`}</span>
                            <span className="text-[10px] font-semibold text-muted-foreground">{p.present ?? 0}/{p.total ?? 0} present-marks</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full" 
                              style={{ width: `${(p.total > 0 ? (p.present / p.total) : 0) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground px-1">No park data available.</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* By Murabbi Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2">
                <button 
                  onClick={() => setMurabbiExpanded(!murabbiExpanded)}
                  className="flex items-center gap-2"
                >
                  <h2 className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest">By murabbi</h2>
                  {murabbiExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                </button>
                <button 
                  onClick={() => setMurabbiSortInvert(!murabbiSortInvert)}
                  className="flex items-center gap-1 text-[10px] font-bold text-[#4B0A8F] dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-md"
                >
                  <SlidersHorizontal className="size-3" />
                  Invert first
                </button>
              </div>

              <AnimatePresence>
                {murabbiExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    {isLoading ? (
                      <SkeletonRows count={3} />
                    ) : sortedMurabbis.length > 0 ? (
                      <div className="rounded-2xl bg-card border border-border/50 shadow-sm flex flex-col overflow-hidden">
                        {sortedMurabbis.map((m: any, i: number) => (
                          <div 
                            key={i} 
                            className={cn(
                              "flex items-center justify-between p-3.5",
                              i < sortedMurabbis.length - 1 && "border-b border-border/40"
                            )}
                          >
                            <span className="text-xs font-bold text-foreground">{m.name || `Murabbi ${i+1}`}</span>
                            <span className="text-[10px] font-semibold text-muted-foreground">{m.present ?? 0}/{m.total ?? 0} present-marks</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground px-1">No murabbi data available.</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, isLoading, highlight }: { title: string, value: string | number, isLoading: boolean, highlight?: boolean }) {
  return (
    <div className={cn(
      "p-3 rounded-2xl border border-border/50 shadow-sm flex flex-col items-center justify-center space-y-1 text-center",
      highlight ? "bg-purple-50 dark:bg-purple-900/10 border-purple-200/60 dark:border-purple-800/40" : "bg-card"
    )}>
      <span className={cn(
        "text-[10px] font-bold uppercase tracking-wider",
        highlight ? "text-[#4B0A8F] dark:text-purple-400" : "text-muted-foreground"
      )}>
        {title}
      </span>
      {isLoading ? (
        <div className="h-6 w-12 bg-muted animate-pulse rounded my-0.5" />
      ) : (
        <span className={cn(
          "text-xl font-black",
          highlight ? "text-[#4B0A8F] dark:text-purple-300" : "text-foreground"
        )}>
          {value}
        </span>
      )}
    </div>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-14 bg-muted/50 rounded-2xl animate-pulse" />
      ))}
    </>
  );
}
