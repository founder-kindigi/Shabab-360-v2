"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  ShieldCheck,
  Building2,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileAdmissionsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const mockApplications = [
    {
      id: "adm1",
      studentName: "Bilal Farooq",
      guardianName: "Farooq Ahmad",
      phone: "0300****123",
      targetPark: "State Life Park",
      targetGroup: "Group 01",
      status: "pending_review",
      appliedDate: "Aug 1, 2026"
    },
    {
      id: "adm2",
      studentName: "Zaid Khan",
      guardianName: "Imran Khan",
      phone: "0321****456",
      targetPark: "Model Town Park",
      targetGroup: "Group 02",
      status: "approved",
      appliedDate: "Jul 28, 2026"
    }
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24 select-none">
      {/* ─── Sticky Header ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pt-3 pb-3 px-4 border-b border-border/60 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-[#4B0A8F]/10 text-[#4B0A8F] flex items-center justify-center font-bold">
              <UserPlus className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-bold truncate">Admissions & Applications</h1>
              <p className="text-xs text-muted-foreground">New Student Onboarding</p>
            </div>
          </div>

          <button className="size-9 rounded-xl bg-[#4B0A8F] text-white flex items-center justify-center shadow-md active:scale-95 transition-all">
            <Plus className="size-5" />
          </button>
        </div>
      </div>

      {/* ─── Applications List ────────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {mockApplications.map((app) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4B0A8F]/10 text-[#4B0A8F]">
                {app.targetPark}
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase",
                  app.status === "approved"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                )}
              >
                {app.status}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-foreground">{app.studentName}</h3>
              <p className="text-xs text-muted-foreground">Guardian: {app.guardianName} • {app.phone}</p>
            </div>

            <div className="p-2.5 rounded-2xl bg-muted/40 text-xs flex justify-between text-muted-foreground">
              <span>Applied: {app.appliedDate}</span>
              <span className="font-semibold text-foreground">Target: {app.targetGroup}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
