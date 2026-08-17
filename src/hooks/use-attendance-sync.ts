"use client";

import { useEffect, useCallback, useState } from "react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  offlineDB,
  getPendingSyncItems,
  markAsSyncing,
  markAsSynced,
  markAsFailed,
  getQueueCounts,
  clearSyncedItems,
  queueAttendanceMark,
  recoverStuckSyncing,
  retryAllFailed,
  discardFailed,
  type OfflineQueueItem,
} from "@/lib/offline/db";
import { v4 as uuidv4 } from "uuid";
import type { AttendanceStatus } from "@/lib/offline/db";

const VALID_STATUSES: AttendanceStatus[] = ["present", "absent", "late", "excused"];

export interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
}

// The roster and queue panel can both mount this hook, so they must share one sync lock.
let activeQueueSync: Promise<SyncResult> | null = null;

export function useAttendanceSync() {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Poll queue counts
  const refreshCounts = useCallback(async () => {
    try {
      const counts = await getQueueCounts();
      setPendingCount(counts.pending + counts.syncing);
      setFailedCount(counts.failed);
    } catch {
      // Dexie may not be available in SSR
    }
  }, []);

  /**
   * Sync all pending items in a batch.
   */
  const syncNow = useCallback((): Promise<SyncResult> => {
    if (activeQueueSync) return activeQueueSync;

    const runningSync = (async (): Promise<SyncResult> => {
      let lockedItems: OfflineQueueItem[] = [];
      try {
      setIsSyncing(true);
      setLastSyncError(null);
      await recoverStuckSyncing();
      const items = await getPendingSyncItems();
      if (items.length === 0) {
        await clearSyncedItems();
        return { success: true, processed: 0, failed: 0 };
      }

      const mutationIds = items.map((i) => i.mutationId);
      await markAsSyncing(mutationIds);
      lockedItems = items;

      const res = await fetch("/api/park/attendance/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mutations: items.map((i) => ({
            mutationId: i.mutationId,
            eventId: i.eventId,
            participantId: i.participantId,
            status: i.status,
            markedAt: i.markedAt,
          })),
        }),
      });

      if (!res.ok) {
        // Server error - reset all back to pending
        await markAsFailed(mutationIds.map((id) => ({
          mutationId: id,
          error: `Server error (${res.status})`,
          code: "SERVER_ERROR",
          retryable: true,
        })));
        await refreshCounts();
        return { success: false, processed: 0, failed: items.length };
      }

      const data = await res.json();
      const processedIds = data.results
        .filter((r: { status: string }) => r.status === "processed")
        .map((r: { mutationId: string }) => r.mutationId);
      const failedItems = data.results.filter(
        (r: { status: string }) => r.status === "failed"
      );

      if (processedIds.length > 0) await markAsSynced(processedIds);
      if (failedItems.length > 0)
        await markAsFailed(
          failedItems.map((r: { mutationId: string; error?: string; code?: string; retryable?: boolean }) => ({
            mutationId: r.mutationId,
            error: r.error,
            code: r.code,
            retryable: r.retryable,
          }))
        );

      await clearSyncedItems();
      await refreshCounts();

      return {
        success: failedItems.length === 0,
        processed: processedIds.length,
        failed: failedItems.length,
      };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sync failed";
        setLastSyncError(message);
        if (lockedItems.length > 0) {
          await markAsFailed(lockedItems.map((item) => ({
            mutationId: item.mutationId,
            error: message,
            code: "NETWORK_ERROR",
            retryable: true,
          })));
        }
        await refreshCounts();
        return { success: false, processed: 0, failed: lockedItems.length };
      } finally {
        setIsSyncing(false);
        activeQueueSync = null;
      }
    })();

    activeQueueSync = runningSync;
    return runningSync;
  }, [refreshCounts]);

  const markAttendance = useCallback(
    async (params: {
      eventId: string;
      participantId: string;
      status: AttendanceStatus;
    }): Promise<{ success: boolean; error?: string }> => {
      if (!VALID_STATUSES.includes(params.status)) {
        return { success: false, error: `Invalid status: ${params.status}` };
      }

      await queueAttendanceMark({
        ...params,
        mutationId: uuidv4(),
        markedAt: new Date().toISOString(),
      });
      await refreshCounts();

      if (!isOnline) return { success: true };
      const result = await syncNow();
      return result.success
        ? { success: true }
        : { success: false, error: "Attendance saved locally but could not sync" };
    },
    [isOnline, refreshCounts, syncNow]
  );

  // Auto-sync when coming back online after syncNow is initialized.
  useEffect(() => {
    if (!isOnline) return;

    const timer = window.setTimeout(() => {
      void syncNow();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isOnline, syncNow]);

  // Refresh queue counters after mount and while the panel is active.
  useEffect(() => {
    const initialRefreshTimer = window.setTimeout(() => {
      void refreshCounts();
    }, 0);
    const interval = window.setInterval(() => {
      void refreshCounts();
    }, 3000);

    return () => {
      window.clearTimeout(initialRefreshTimer);
      window.clearInterval(interval);
    };
  }, [refreshCounts]);

  /**
   * Retry all failed items.
   */
  const retryFailed = useCallback(async () => {
    await retryAllFailed();
    await refreshCounts();
    if (isOnline) await syncNow();
  }, [isOnline, syncNow, refreshCounts]);

  const discardFailedItem = useCallback(async (mutationId: string) => {
    await discardFailed(mutationId);
    await refreshCounts();
  }, [refreshCounts]);

  /**
   * Get all failed items for display.
   */
  const getFailedItems = useCallback(async (): Promise<OfflineQueueItem[]> => {
    return offlineDB.queue.where("state").equals("failed").toArray();
  }, []);

  return {
    pendingCount,
    failedCount,
    lastSyncError,
    isSyncing,
    isOnline,
    markAttendance,
    syncNow,
    retryFailed,
    getFailedItems,
    discardFailedItem,
    refreshCounts,
  };
}
