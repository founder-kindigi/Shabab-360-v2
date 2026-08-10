"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  type OfflineQueueItem,
  type SyncConflictItem,
  getOfflineQueueStats,
  getPendingSyncItems,
  getPendingConflicts,
  resolveConflict,
  retryAllFailed,
  clearSyncedItems,
} from "@/lib/offline/db";
import {
  triggerOfflineBatchSync,
  buildSideBySideDiff,
  type SideBySideDiffField,
} from "@/lib/offline/conflict-engine";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Database,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
  Eye,
  ArrowRightLeft,
  Check,
  X,
  History,
  HardDrive,
  FileCode,
  Zap,
  Activity,
  SlidersHorizontal,
  Server,
  Smartphone,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock conflict items fallback when Dexie is empty
const MOCK_CONFLICTS: SyncConflictItem[] = [
  {
    id: "conflict-101",
    mutationId: "mut-8841",
    entityType: "attendance",
    entityId: "evt-gulberg-0809",
    participantId: "part-1",
    clientData: {
      studentName: "Muhammad Umair",
      parkName: "Gulberg Park",
      status: "Present",
      markedBy: "Murabbi Ikram Meer",
      markedAt: "2026-08-09T10:15:00Z",
    },
    serverData: {
      studentName: "Muhammad Umair",
      parkName: "Gulberg Park",
      status: "Absent",
      markedBy: "Park Lead Umar Rohail",
      markedAt: "2026-08-09T10:45:00Z",
    },
    conflictType: "timestamp_mismatch",
    status: "pending_review",
    detectedAt: "2026-08-09T11:00:00Z",
  },
  {
    id: "conflict-102",
    mutationId: "mut-8842",
    entityType: "fee",
    entityId: "fee-aug-2026",
    participantId: "part-2",
    clientData: {
      studentName: "M Abdullah Qureshi",
      amountPaid: 1500,
      paymentStatus: "Paid",
      receiptNo: "REC-2026-0842",
      collectedBy: "Danish Qureshi",
      queuedAt: "2026-08-09T14:20:00Z",
    },
    serverData: {
      studentName: "M Abdullah Qureshi",
      amountPaid: 0,
      paymentStatus: "Pending",
      receiptNo: "-",
      collectedBy: "-",
      updatedAt: "2026-08-09T15:00:00Z",
    },
    conflictType: "concurrent_modification",
    status: "pending_review",
    detectedAt: "2026-08-09T15:05:00Z",
  },
];

export function SyncConflictsPage() {
  const { data: session } = useSession();
  const isOnline = useOnlineStatus();

  const [activeTab, setActiveTab] = useState<"queue" | "conflicts" | "history">("queue");
  const [isSyncing, setIsSyncing] = useState(false);

  // Queue & Conflicts State
  const [queueStats, setQueueStats] = useState<{
    pending: number;
    syncing: number;
    synced: number;
    failed: number;
    oldestQueuedAt: string | null;
  }>({
    pending: 3,
    syncing: 0,
    synced: 128,
    failed: 1,
    oldestQueuedAt: "2026-08-10T09:30:00Z",
  });

  const [conflictsList, setConflictsList] = useState<SyncConflictItem[]>(MOCK_CONFLICTS);
  const [selectedConflict, setSelectedConflict] = useState<SyncConflictItem | null>(null);
  const [isDiffDrawerOpen, setIsDiffDrawerOpen] = useState(false);

  // Load IndexedDB state on mount & update
  const refreshData = async () => {
    try {
      const stats = await getOfflineQueueStats();
      setQueueStats(stats);
      const pendingConf = await getPendingConflicts();
      if (pendingConf.length > 0) {
        setConflictsList(pendingConf);
      }
    } catch (err) {
      // Fallback to mock state
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Handlers
  const handleManualSync = async () => {
    setIsSyncing(true);
    toast.info("Triggering batch sync with server...");
    try {
      const res = await triggerOfflineBatchSync();
      toast.success(
        `Sync completed! Processed: ${res.syncedCount} synced, ${res.conflictsCount} conflicts detected.`
      );
      await refreshData();
    } catch (err: any) {
      toast.error("Sync batch failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetryFailed = async () => {
    await retryAllFailed();
    toast.success("Reset failed items back to pending queue.");
    await refreshData();
  };

  const handleClearSynced = async () => {
    await clearSyncedItems();
    toast.success("Cleared synced mutations from IndexedDB queue.");
    await refreshData();
  };

  const handleResolve = async (conflictId: string, winner: "client" | "server") => {
    const resolution = winner === "client" ? "resolved_client_wins" : "resolved_server_wins";
    await resolveConflict(conflictId, resolution, session?.user?.name || "Admin");
    setConflictsList((prev) => prev.filter((c) => c.id !== conflictId));
    setIsDiffDrawerOpen(false);
    toast.success(
      `Conflict resolved! Accepted ${winner === "client" ? "Client Offline Mutation" : "Server State"}.`
    );
  };

  const openDiffInspector = (conflict: SyncConflictItem) => {
    setSelectedConflict(conflict);
    setIsDiffDrawerOpen(true);
  };

  const diffFields = useMemo(() => {
    if (!selectedConflict) return [];
    return buildSideBySideDiff(selectedConflict.clientData, selectedConflict.serverData);
  }, [selectedConflict]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-1 pb-6 space-y-6">
      {/* ─── Page Title & Actions ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Offline Sync Conflict Engine & Queue Studio
            </h1>
            <Badge
              className={cn(
                "gap-1",
                isOnline
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
              )}
            >
              {isOnline ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
              <span>{isOnline ? "Online (Connected)" : "Offline Mode"}</span>
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor Dexie IndexedDB mutation queues, resolve data clashes, inspect side-by-side diffs, and manage sync retries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetryFailed}
            className="gap-2 border-slate-300 dark:border-slate-700"
          >
            <RefreshCw className="size-4 text-purple-600 dark:text-purple-400" />
            <span>Retry Failed</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearSynced}
            className="gap-2 border-slate-300 dark:border-slate-700 text-muted-foreground"
          >
            <Trash2 className="size-4" />
            <span>Clear Synced</span>
          </Button>

          <Button
            size="sm"
            disabled={isSyncing}
            onClick={handleManualSync}
            className="gap-2 bg-[#4B0A8F] hover:bg-[#3b0873] text-white shadow"
          >
            <Zap className={cn("size-4", isSyncing && "animate-spin")} />
            <span>{isSyncing ? "Syncing Batch..." : "Sync Now"}</span>
          </Button>
        </div>
      </div>

      {/* ─── 4 Top KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Queued Mutations
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{queueStats.pending} Pending</h3>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">
                  IndexedDB Local Queue
                </p>
              </div>
              <div className="size-12 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Database className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Synced Items
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{queueStats.synced} Synced</h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                  Successfully Processed
                </p>
              </div>
              <div className="size-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Auto-Resolved Clashes
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-1">18 Resolved</h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                  Timestamp Last-Write-Wins
                </p>
              </div>
              <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <ShieldCheck className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Action Required
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{conflictsList.length} Conflicts</h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                  Requires Manual Review
                </p>
              </div>
              <div className="size-12 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Navigation Tabs ─── */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="queue" className="gap-2 text-xs font-medium rounded-lg">
            <Database className="size-3.5" />
            <span>Sync Queue ({queueStats.pending})</span>
          </TabsTrigger>
          <TabsTrigger value="conflicts" className="gap-2 text-xs font-medium rounded-lg">
            <AlertTriangle className="size-3.5" />
            <span>Conflicts ({conflictsList.length})</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 text-xs font-medium rounded-lg">
            <History className="size-3.5" />
            <span>Sync Audit Log</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: SYNC QUEUE & NETWORK STATUS ─── */}
        <TabsContent value="queue" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Queue Items Roster Table (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">IndexedDB Mutation Queue</CardTitle>
                      <CardDescription className="text-xs">
                        Queued mutations stored in local Dexie database awaiting server push.
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={refreshData}
                      className="h-7 text-xs text-purple-600"
                    >
                      <RefreshCw className="size-3 mr-1" /> Refresh Queue
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-muted-foreground font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="py-3 px-4">Mutation ID</th>
                            <th className="py-3 px-4">Event / Target</th>
                            <th className="py-3 px-4">Status Value</th>
                            <th className="py-3 px-4">Queued Time</th>
                            <th className="py-3 px-4">State</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-foreground">
                          <tr className="hover:bg-slate-100/50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-4 font-mono font-bold text-purple-600">mut-9012</td>
                            <td className="py-2.5 px-4">Gulberg Session #14</td>
                            <td className="py-2.5 px-4">
                              <Badge variant="outline" className="text-[10px]">
                                Present
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground">Just now</td>
                            <td className="py-2.5 px-4">
                              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-[10px]">
                                Pending
                              </Badge>
                            </td>
                          </tr>

                          <tr className="hover:bg-slate-100/50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-4 font-mono font-bold text-purple-600">mut-9011</td>
                            <td className="py-2.5 px-4">Gulberg Session #14</td>
                            <td className="py-2.5 px-4">
                              <Badge variant="outline" className="text-[10px]">
                                Late
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground">5 mins ago</td>
                            <td className="py-2.5 px-4">
                              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-[10px]">
                                Pending
                              </Badge>
                            </td>
                          </tr>

                          <tr className="hover:bg-slate-100/50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-4 font-mono font-bold text-purple-600">mut-9010</td>
                            <td className="py-2.5 px-4">Gulshan Fee REC-0842</td>
                            <td className="py-2.5 px-4">
                              <Badge variant="outline" className="text-[10px]">
                                PKR 1,500
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground">12 mins ago</td>
                            <td className="py-2.5 px-4">
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-[10px]">
                                Synced
                              </Badge>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Engine Architecture & Storage Specs (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <HardDrive className="size-4 text-[#4B0A8F]" />
                    Engine Architecture Specs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0 text-xs">
                  <div className="space-y-1">
                    <span className="text-muted-foreground">IndexedDB Engine:</span>
                    <p className="font-bold text-foreground">Dexie.js v4 (shabab360-offline)</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-muted-foreground">Batch API Endpoint:</span>
                    <p className="font-mono text-purple-600 dark:text-purple-400 font-semibold">
                      POST /api/sync/process
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-muted-foreground">Conflict Resolution Policy:</span>
                    <p className="font-semibold text-foreground">
                      Timestamp Last-Write-Wins (LWW) with Audit
                    </p>
                  </div>

                  <div className="space-y-1 pt-1">
                    <span className="text-muted-foreground">Retry Policy:</span>
                    <p className="font-medium text-slate-600 dark:text-slate-400">
                      Exponential backoff up to 5 retries.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── TAB 2: CONFLICT RESOLUTION CENTER ─── */}
        <TabsContent value="conflicts" className="mt-4 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Data Conflict Resolution Center</h3>
            <p className="text-xs text-muted-foreground">
              Inspect side-by-side diffs where client offline writes clashed with server updates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {conflictsList.map((conflict) => (
              <Card key={conflict.id} className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 text-[10px] mb-1">
                        {conflict.conflictType.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                      <CardTitle className="text-base font-bold text-foreground">
                        {conflict.entityType.toUpperCase()} Mutation Clash
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Target ID: <span className="font-mono">{conflict.mutationId}</span>
                      </CardDescription>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => openDiffInspector(conflict)}
                      className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white text-xs h-8 gap-1.5"
                    >
                      <Eye className="size-3.5" />
                      <span>Inspect Diff</span>
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0 text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                        <Smartphone className="size-3" /> Client Offline State
                      </p>
                      <p className="font-bold text-foreground">
                        {conflict.clientData.status || conflict.clientData.paymentStatus}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{conflict.clientData.markedAt || conflict.clientData.queuedAt}</p>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <Server className="size-3" /> Server Live Record
                      </p>
                      <p className="font-bold text-foreground">
                        {conflict.serverData.status || conflict.serverData.paymentStatus}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{conflict.serverData.markedAt || conflict.serverData.updatedAt}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResolve(conflict.id, "client")}
                      className="flex-1 text-xs h-8 border-purple-300 text-purple-700 dark:border-purple-800 dark:text-purple-400"
                    >
                      Accept Client Write
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResolve(conflict.id, "server")}
                      className="flex-1 text-xs h-8 border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-400"
                    >
                      Keep Server State
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── TAB 3: SYNC AUDIT & HISTORY LOG ─── */}
        <TabsContent value="history" className="mt-4 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Sync Processing Audit Log</h3>
            <p className="text-xs text-muted-foreground">
              Audited record of offline batch sync executions, network latencies, and server responses.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-muted-foreground font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Batch ID</th>
                    <th className="py-3 px-4">Dispatched At</th>
                    <th className="py-3 px-4">Mutations Count</th>
                    <th className="py-3 px-4">Success Rate</th>
                    <th className="py-3 px-4">Latency</th>
                    <th className="py-3 px-4 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-foreground">
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-bold text-purple-600">batch-2026-0810-01</td>
                    <td className="py-3 px-4 text-muted-foreground">10 Aug 2026, 11:45 AM</td>
                    <td className="py-3 px-4 font-semibold">24 Mutations</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">100%</td>
                    <td className="py-3 px-4 text-muted-foreground">142 ms</td>
                    <td className="py-3 px-4 text-right">
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-[10px]">
                        Success
                      </Badge>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-bold text-purple-600">batch-2026-0809-04</td>
                    <td className="py-3 px-4 text-muted-foreground">09 Aug 2026, 05:20 PM</td>
                    <td className="py-3 px-4 font-semibold">18 Mutations</td>
                    <td className="py-3 px-4 font-bold text-amber-600">88% (2 Conflicts)</td>
                    <td className="py-3 px-4 text-muted-foreground">210 ms</td>
                    <td className="py-3 px-4 text-right">
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 text-[10px]">
                        Conflicts Resolved
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── SIDE-BY-SIDE DIFF INSPECTOR DRAWER / MODAL ─── */}
      <Dialog open={isDiffDrawerOpen} onOpenChange={setIsDiffDrawerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ArrowRightLeft className="size-5 text-[#4B0A8F]" />
              Side-by-Side Data Diff Inspector
            </DialogTitle>
            <DialogDescription className="text-xs">
              Compare local client mutation values vs current live server record fields.
            </DialogDescription>
          </DialogHeader>

          {selectedConflict && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-muted-foreground font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-4">Field Name</th>
                        <th className="py-2.5 px-4 text-purple-700 dark:text-purple-400">
                          📱 Client Offline Value
                        </th>
                        <th className="py-2.5 px-4 text-blue-700 dark:text-blue-400">
                          🖥️ Server Record Value
                        </th>
                        <th className="py-2.5 px-4 text-right">Diff Match</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-foreground">
                      {diffFields.map((item) => (
                        <tr
                          key={item.field}
                          className={cn(
                            item.isDifferent && "bg-amber-50/60 dark:bg-amber-950/30 font-medium"
                          )}
                        >
                          <td className="py-2.5 px-4 font-bold text-foreground">{item.label}</td>
                          <td className="py-2.5 px-4 font-mono text-purple-700 dark:text-purple-300">
                            {item.clientValue}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-blue-700 dark:text-blue-300">
                            {item.serverValue}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {item.isDifferent ? (
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 text-[10px]">
                                Mismatch
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-emerald-600">
                                Match
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDiffDrawerOpen(false)}>
              Close Inspector
            </Button>

            <Button
              onClick={() => handleResolve(selectedConflict!.id, "server")}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              Keep Server State
            </Button>

            <Button
              onClick={() => handleResolve(selectedConflict!.id, "client")}
              className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white text-xs"
            >
              Accept Client Write
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
