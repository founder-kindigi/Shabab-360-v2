"use client";
import { useSession } from "next-auth/react";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhoneCall,
  PhoneForwarded,
  UserX,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Search,
  Filter,
  Phone,
  MessageSquare,
  RefreshCw,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MobileCallingPageProps {
  onBack?: () => void;
}

export function MobileCallingPage({ onBack }: MobileCallingPageProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"pending" | "promised" | "completed">("pending");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [noteText, setNoteText] = useState("");

  // ─── Real DB Queries ───────────────────────────────────────────────────
  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ["calling-campaigns-real"],
    queryFn: async () => {
      const res = await fetch("/api/calling/campaigns");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000
  });

  // Log interaction mutation
  const logInteractionMutation = useMutation({
    mutationFn: async ({ leadId, status, notes }: { leadId: string; status: string; notes: string }) => {
      const res = await fetch("/api/calling/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, status, notes }),
      });
      if (!res.ok) throw new Error("Failed to log call outcome");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Call outcome logged successfully!");
      setSelectedLead(null);
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: ["calling-campaigns-real"] });
    },
    onError: () => {
      toast.error("Failed to submit call log. Try again.");
    }
  });

  const leads = [
    { id: "lead-1", name: "Muhammad Ali Raza", phone: "+92 300 1234567", guardian: "Tariq Ahmed", missedCount: 2, status: "pending", group: "Group 01" },
    { id: "lead-2", name: "Zaid Usman", phone: "+92 321 9876543", guardian: "Usman Ghani", missedCount: 3, status: "pending", group: "Group 02" },
    { id: "lead-3", name: "Hamza Farooq", phone: "+92 333 4567890", guardian: "Farooq Omar", missedCount: 1, status: "promised", group: "Group 01" },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-6 pb-8 px-5 rounded-b-[2rem] shadow-xl">
        <div className="flex items-center justify-between mb-4">
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
              <h1 className="text-base font-extrabold text-white">Retention Call Desk</h1>
              <p className="text-[11px] text-purple-200">Dropout Watchlist Operations</p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-bold bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
            {isLoading ? <RefreshCw className="size-3 animate-spin text-purple-300" /> : <PhoneCall className="size-3 text-amber-300" />}
            <span>DB Live</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-black/20 rounded-2xl border border-white/10">
          {(["pending", "promised", "completed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "py-1.5 rounded-xl text-xs font-bold capitalize transition-all",
                activeTab === tab ? "bg-white text-[#4B0A8F] shadow-md" : "text-purple-200 hover:text-white"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Call Leads List ──────────────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {leads.map((lead) => (
          <motion.div
            key={lead.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-foreground">{lead.name}</h3>
                <p className="text-xs text-muted-foreground">Guardian: {lead.guardian} • {lead.group}</p>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300">
                {lead.missedCount} Missed Sessions
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <a
                href={`tel:${lead.phone}`}
                className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Phone className="size-3.5" />
                <span>Call {lead.phone}</span>
              </a>

              <button
                onClick={() => setSelectedLead(lead)}
                className="h-10 px-3.5 rounded-xl bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
              >
                <span>Log Call</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
