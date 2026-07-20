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
   * Sync a single mutation to the server.
   */
  const syncSingle = useCallback(
    async (mutationId: string): Promise<{ success: boolean; error?: string }> => {
      const item = await offlineDB.queue.get(mutationId);
      if (!item) return { success: false, error: "Item not found" };

      try {
        await offlineDB.queue.update(mutationId, { state: "syncing" });
        const res = await fetch(
          `/api/park/attendance/${item.eventId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              participantId: item.participantId,
              status: item.status,
              mutationId: item.mutationId,
              markedAt: item.markedAt,
            }),
          }
        );

        if (res.ok) {
          await offlineDB.queue.update(mutationId, {
            state: "synced",
            syncedAt: new Date().toISOString(),
          });
          await refreshCounts();
          return { success: true };
        }

        const err = await res.json().catch(() => ({ error: "Request failed" }));
        await offlineDB.queue.update(mutationId, {
          state: "failed",
          retryCount: item.retryCount + 1,
          lastError: err.error || "Unknown error",
        });
        await refreshCounts();
        return { success: false, error: err.error };
      } catch (error) {
        await offlineDB.queue.update(mutationId, {
          state: "failed",
          retryCount: item.retryCount + 1,
          lastError: error instanceof Error ? error.message : "Network error",
        });
        await refreshCounts();
        return { success: false, error: "Network error" };
      }
    },
    [refreshCounts]
  );

  /**
   * Submit a single attendance mark. Queues offline if needed.
   */
  const markAttendance = useCallback(
    async (params: {
      eventId: string;
      participantId: string;
      status: AttendanceStatus;
    }): Promise<{ success: boolean; error?: string }> => {
      const mutationId = uuidv4();
      const markedAt = new Date().toISOString();

      if (!VALID_STATUSES.includes(params.status)) {
        return { success: false, error: `Invalid status: ${params.status}` };
      }

      // Optimistic - always queue first
      await offlineDB.queue.add({
        mutationId,
        eventId: params.eventId,
        participantId: params.participantId,
        status: params.status,
        markedAt,
        queuedAt: new Date().toISOString(),
        retryCount: 0,
        lastError: null,
        syncedAt: null,
        state: "pending",
      });

      await refreshCounts();

      // If online, try to sync immediately
      if (isOnline) {
        return syncSingle(mutationId);
      }

      return { success: true };
    },
    [isOnline, refreshCounts, syncSingle]
  );

  /**
   * Sync all pending items in a batch.
   */
  const syncNow = useCallback((): Promise<SyncResult> => {
    if (activeQueueSync) return activeQueueSync;

    const runningSync = (async (): Promise<SyncResult> => {
      try {
      const items = await getPendingSyncItems();
      if (items.length === 0) {
        await clearSyncedItems();
        return { success: true, processed: 0, failed: 0 };
      }

      const mutationIds = items.map((i) => i.mutationId);
      await markAsSyncing(mutationIds);

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
        await markAsFailed(
          mutationIds.map((id) => ({ mutationId: id, error: "Server error" }))
        );
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
          failedItems.map((r: { mutationId: string; error?: string }) => ({
            mutationId: r.mutationId,
            error: r.error,
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
        setLastSyncError(
          error instanceof Error ? error.message : "Sync failed"
        );
        await refreshCounts();
        return { success: false, processed: 0, failed: 0 };
      } finally {
        activeQueueSync = null;
      }
    })();

    activeQueueSync = runningSync;
    return runningSync;
  }, [refreshCounts]);

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
    const { offlineDB: db } = await import("@/lib/offline/db");
    await db.queue
      .where("state")
      .equals("failed")
      .modify({ state: "pending" as const, lastError: null });
    await refreshCounts();
    // Auto-trigger sync
    if (isOnline) syncNow();
  }, [isOnline, syncNow, refreshCounts]);

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
    isOnline,
    markAttendance,
    syncNow,
    retryFailed,
    getFailedItems,
    refreshCounts,
  };
}
