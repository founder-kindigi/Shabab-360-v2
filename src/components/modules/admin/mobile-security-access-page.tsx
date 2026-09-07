"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  UserCheck,
  ArrowLeft,
  RefreshCw,
  Plus,
  Search,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Key,
  Globe,
  Activity
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MobileSecurityAccessPageProps {
  onBack?: () => void;
}


import { useMutation, useQueryClient } from "@tanstack/react-query";

export function MobileSecurityAccessPage({ onBack }: MobileSecurityAccessPageProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedOverride, setSelectedOverride] = useState<any | null>(null);
  const [authError, setAuthError] = useState(false);

  // ─── Real DB Query ─────────────────────────────────────────────────────
  const { data: accessData, isLoading, isError } = useQuery({
    queryKey: ["role-overrides"],
    queryFn: async () => {
      const res = await fetch("/api/admin/access/role-overrides");
      if (res.status === 401 || res.status === 403) {
        setAuthError(true);
        return null;
      }
      if (!res.ok) throw new Error("Failed to fetch overrides");
      setAuthError(false);
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
  });

  const revokeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/access/role-overrides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to revoke override");
    },
    onSuccess: () => {
      toast.success("Override capability revoked");
      setSelectedOverride(null);
      queryClient.invalidateQueries({ queryKey: ["role-overrides"] });
    },
    onError: () => {
      toast.error("Failed to revoke override");
    }
  });

  const overrides = accessData?.overrides || [];

  const filteredOverrides = overrides.filter((o: any) => {
    return (
      !search ||
      o.role.toLowerCase().includes(search.toLowerCase()) ||
      o.capability.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="flex flex-col min-h-screen w-full max-w-[460px] mx-auto bg-slate-50 dark:bg-slate-950 text-foreground pb-28 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-6 pb-12 px-5 rounded-b-[2.5rem] shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="size-9 rounded-2xl bg-white/10 active:scale-95 transition-transform flex items-center justify-center text-white backdrop-blur-md border border-white/15"
              >
                <ArrowLeft className="size-5" />
              </button>
            )}
            <div className="size-10 rounded-2xl bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] border border-white/20 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
              <img src="/shabab-logo.png" alt="Logo" className="size-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                سیکیورٹی و رسائی
              </h1>
              <p className="text-[11px] text-purple-200 font-medium">Security & Role Access Desk</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-bold bg-white/10 px-3 py-1.5 rounded-full border border-white/15 backdrop-blur-md">
            {isLoading ? (
              <RefreshCw className="size-3 animate-spin text-purple-300" />
            ) : (
              <ShieldCheck className="size-3 text-emerald-400" />
            )}
            <span>System Healthy</span>
          </div>
        </div>
      </div>

      {/* ─── Metrics & Search ────────────────────────────────────────────── */}
      <div className="-mt-7 px-4 z-10 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-3xl bg-card border border-slate-200 dark:border-slate-800 shadow-md space-y-1"
          >
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Active Role Overrides</span>
            <div className="text-lg font-black text-purple-600 dark:text-purple-400">{overrides.length} active</div>
            <p className="text-[10px] text-muted-foreground font-medium">Scoped Permissions</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-4 rounded-3xl bg-emerald-500 text-white shadow-md space-y-1"
          >
            <span className="text-[10px] uppercase font-bold text-emerald-100 tracking-wider">Domain Allowlist</span>
            <div className="text-lg font-black text-white">Strict Enforced</div>
            <p className="text-[10px] text-emerald-100/90 font-medium">Zero Trust Enabled</p>
          </motion.div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user or capability override..."
            className="pl-10 h-11 rounded-2xl bg-card border-slate-200 dark:border-slate-800 shadow-sm font-medium text-xs"
          />
        </div>

        {/* Overrides List */}
        <div className="space-y-3">
          {authError && (
            <div className="py-10 text-center bg-card rounded-3xl border border-slate-200 dark:border-slate-800">
              <ShieldAlert className="size-8 mx-auto text-amber-500 mb-2" />
              <h3 className="font-bold text-foreground">Insufficient Permissions</h3>
              <p className="text-xs text-muted-foreground">You do not have access to manage security roles.</p>
            </div>
          )}
          {!authError && isLoading && (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground animate-pulse">Loading roles...</p>
            </div>
          )}
          {!authError && !isLoading && filteredOverrides.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">No overrides found.</p>
            </div>
          )}
          {!authError && !isLoading && filteredOverrides.map((ov: any, idx: number) => (
            <motion.div
              key={ov.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedOverride(ov)}
              className="p-4 rounded-3xl bg-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 cursor-pointer hover:border-purple-300 transition-all active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 capitalize">
                    {ov.role.replace("_", " ")}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-medium">Effect: {ov.effect.toUpperCase()}</p>
                </div>

                <Badge className={cn("font-bold text-[10px] uppercase", ov.effect === 'allow' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                  {ov.effect}
                </Badge>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                <span className="text-purple-600 dark:text-purple-400 font-mono text-[11px]">
                  {ov.capability}
                </span>

                <ChevronRight className="size-4 text-slate-400" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ─── Detail Drawer ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedOverride && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-0"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-lg bg-card rounded-t-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />

              <div className="space-y-1">
                <Badge variant="outline" className="font-mono text-xs font-bold">
                  {selectedOverride.capability}
                </Badge>
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 capitalize">
                  {selectedOverride.role.replace("_", " ")}
                </h2>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">Effect</span>
                  <span className={cn("capitalize", selectedOverride.effect === 'allow' ? "text-emerald-600" : "text-red-600")}>{selectedOverride.effect}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">Reason</span>
                  <span>{selectedOverride.reason}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{new Date(selectedOverride.updatedAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => {
                    revokeMutation.mutate({
                      role: selectedOverride.role,
                      capability: selectedOverride.capability,
                      effect: "deny",
                      reason: "Revoked via mobile app",
                    });
                  }}
                  variant="destructive"
                  className="w-full font-bold rounded-2xl h-12"
                  disabled={revokeMutation.isPending}
                >
                  {revokeMutation.isPending ? "Revoking..." : "Revoke Override Capability"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedOverride(null)}
                  className="w-full rounded-2xl font-bold h-12"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
