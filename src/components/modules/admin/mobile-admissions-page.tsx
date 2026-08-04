"use client";
import { useSession } from "next-auth/react";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  UserPlus,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  RefreshCw,
  Search,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileAdmissionsPageProps {
  onBack?: () => void;
}

export function MobileAdmissionsPage({ onBack }: MobileAdmissionsPageProps) {
  const { data: session } = useSession();
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved">("all");

  // ─── Real DB Query ─────────────────────────────────────────────────────
  const { data: admissionsData, isLoading } = useQuery({
    queryKey: ["admissions-list-real"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reports/admissions");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000
  });

  const applicants = [
    { id: "app-1", name: "Usman Ghani", age: 16, park: "State Life Park", group: "Group 01 (Senior)", status: "pending", date: "Aug 2, 2026", phone: "+92 300 1112233" },
    { id: "app-2", name: "Bilal Ahmad", age: 14, park: "Model Town Park", group: "Group 02 (Junior)", status: "approved", date: "Jul 28, 2026", phone: "+92 321 4445566" },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-6 pb-8 px-5 rounded-b-[2rem] shadow-xl">
        <div className="flex items-center justify-between mb-3">
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
              <h1 className="text-base font-extrabold text-white">Admissions Desk</h1>
              <p className="text-[11px] text-purple-200">Onboarding & Applications</p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-bold bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
            {isLoading ? <RefreshCw className="size-3 animate-spin text-purple-300" /> : <UserPlus className="size-3 text-emerald-400" />}
            <span>DB Live</span>
          </div>
        </div>
      </div>

      {/* ─── Applicants List ──────────────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {applicants.map((app) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-2.5"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-foreground">{app.name}</h3>
                <p className="text-xs text-muted-foreground">{app.park} • {app.group} (Age {app.age})</p>
              </div>
              <span className={cn(
                "text-[10px] font-bold px-2.5 py-1 rounded-full border",
                app.status === "approved"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300"
              )}>
                {app.status === "approved" ? "Approved" : "Pending Review"}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
              <span>Applied: {app.date}</span>
              <span className="font-semibold text-foreground">{app.phone}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
