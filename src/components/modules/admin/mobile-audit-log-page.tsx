"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ScrollText,
  ShieldAlert,
  Search,
  ArrowLeft,
  Clock,
  User,
  Activity,
  CheckCircle2,
  Lock,
  Layers,
  FileCode,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AuditEntry {
  id: string;
  actorName: string;
  actorEmail: string;
  action: "create" | "update" | "delete" | "override_grant" | "attendance_mark";
  entityType: "attendance" | "admissions" | "fees" | "security" | "park";
  entityId: string;
  summary: string;
  timestamp: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}



import { useQuery } from "@tanstack/react-query";

interface MobileAuditLogPageProps {
  onBack?: () => void;
}

export function MobileAuditLogPage({ onBack }: MobileAuditLogPageProps) {
  const { data: session } = useSession();
  const [entityFilter, setEntityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const { data: apiData, isLoading, isError } = useQuery({
    queryKey: ["audit-log", entityFilter],
    queryFn: async () => {
      let url = "/api/admin/audit-log?page=1&pageSize=50";
      if (entityFilter !== "all") {
        url += `&entityType=${entityFilter}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch audit log");
      return res.json();
    }
  });

  const logs: AuditEntry[] = useMemo(() => {
    if (!apiData?.data) return [];
    return apiData.data.map((log: any) => {
      let oldVals, newVals;
      try { oldVals = typeof log.oldValues === "string" ? JSON.parse(log.oldValues) : log.oldValues; } catch (e) {}
      try { newVals = typeof log.newValues === "string" ? JSON.parse(log.newValues) : log.newValues; } catch (e) {}

      let summary = `Action: ${log.action} on ${log.entityType}`;
      if (log.action === "update") summary = `Updated ${log.entityType} ${log.entityId}`;
      if (log.action === "create") summary = `Created new ${log.entityType} ${log.entityId}`;
      if (log.action === "delete") summary = `Deleted ${log.entityType} ${log.entityId}`;

      return {
        id: log.id,
        actorName: log.user?.name || "System",
        actorEmail: log.user?.email || "",
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        summary,
        timestamp: new Date(log.createdAt).toLocaleString(),
        oldValues: oldVals,
        newValues: newVals,
      };
    });
  }, [apiData]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        !search ||
        log.actorName.toLowerCase().includes(search.toLowerCase()) ||
        log.summary.toLowerCase().includes(search.toLowerCase()) ||
        log.entityId.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [logs, search]);

  const actionBadges: Record<string, { label: string; color: string }> = {
    create: { label: "CREATED", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
    update: { label: "UPDATED", color: "bg-blue-100 text-blue-800 border-blue-300" },
    delete: { label: "DELETED", color: "bg-red-100 text-red-800 border-red-300" },
    override_grant: { label: "OVERRIDE", color: "bg-purple-100 text-purple-800 border-purple-300" },
    attendance_mark: { label: "ATTENDANCE", color: "bg-amber-100 text-amber-800 border-amber-300" },
  };

  return (
    <div className="w-full max-w-[460px] mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground pb-28 space-y-4 px-4 pt-4 select-none">
      {/* ─── PWA Top Bar ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              onClick={onBack}
              className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black text-[#1F0860] dark:text-purple-200 tracking-tight">
                Security Audit Log
              </h1>
              <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0 h-4 font-bold">
                Immutable
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              Cryptographic event log & state change trail
            </p>
          </div>
        </div>

        <div className="size-8 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-[#4B0A8F]">
          <ScrollText className="size-4" />
        </div>
      </div>

      {/* ─── Filter Pills & Search ─── */}
      <div className="space-y-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Entity Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "all", label: "All Events" },
            { id: "security", label: "Security" },
            { id: "attendance", label: "Attendance" },
            { id: "fees", label: "Fees" },
            { id: "admissions", label: "Admissions" },
          ].map((ent) => (
            <button
              key={ent.id}
              type="button"
              onClick={() => setEntityFilter(ent.id)}
              className={cn(
                "px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all",
                entityFilter === ent.id
                  ? "bg-[#4B0A8F] text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
              )}
            >
              {ent.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search actor, action, entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8 bg-slate-50 dark:bg-slate-800"
          />
        </div>
      </div>

      {/* ─── Audit Events Timeline ─── */}
      <div className="space-y-2.5">
        {isLoading && (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground animate-pulse">Loading audit logs...</p>
          </div>
        )}
        {isError && (
          <div className="py-10 text-center">
            <p className="text-sm text-red-500">Failed to load audit logs</p>
          </div>
        )}
        {!isLoading && !isError && filteredLogs.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">No logs found.</p>
          </div>
        )}
        {!isLoading && !isError && filteredLogs.map((log) => {
          const badge = actionBadges[log.action] || { label: log.action.toUpperCase(), color: "bg-slate-100 text-slate-800" };

          return (
            <Card
              key={log.id}
              onClick={() => setSelectedEntry(log)}
              className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm cursor-pointer hover:border-purple-300 transition-colors"
            >
              <CardContent className="p-3.5 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="size-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                      <User className="size-3" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">{log.actorName}</span>
                      <span className="text-[10px] text-muted-foreground">{log.actorEmail}</span>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "text-[9px] font-extrabold px-2 py-0.5 rounded-full border",
                      badge.color
                    )}
                  >
                    {badge.label}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">{log.summary}</p>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {log.timestamp}
                  </span>
                  <span className="font-mono text-[#4B0A8F] font-bold">Inspect Diff →</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ─── Inspect Diff Dialog ─── */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileCode className="size-5 text-[#4B0A8F]" />
              Event Inspection: {selectedEntry?.id}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review actor metadata and JSON state changes.
            </DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-1">
                <p className="font-bold text-foreground">Actor: {selectedEntry.actorName} ({selectedEntry.actorEmail})</p>
                <p className="text-muted-foreground text-[11px]">{selectedEntry.summary}</p>
                <span className="text-[10px] text-purple-600 font-bold block">Entity ID: {selectedEntry.entityId}</span>
              </div>

              {/* Side-by-Side Diff */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/30 dark:bg-red-950/20">
                  <span className="text-[10px] font-bold text-red-600 block mb-1">Previous Values</span>
                  <pre className="text-[10px] font-mono overflow-x-auto text-slate-700 dark:text-slate-300">
                    {JSON.stringify(selectedEntry.oldValues, null, 2)}
                  </pre>
                </div>

                <div className="p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20">
                  <span className="text-[10px] font-bold text-emerald-600 block mb-1">Updated Values</span>
                  <pre className="text-[10px] font-mono overflow-x-auto text-slate-700 dark:text-slate-300">
                    {JSON.stringify(selectedEntry.newValues, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSelectedEntry(null)}>
              Close Audit Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
