import {
  type OfflineQueueItem,
  type SyncConflictItem,
  getPendingSyncItems,
  markAsSyncing,
  markAsSynced,
  markAsFailed,
  storeConflict,
  offlineDB,
} from "@/lib/offline/db";

export interface SideBySideDiffField {
  field: string;
  label: string;
  clientValue: string;
  serverValue: string;
  isDifferent: boolean;
}

/**
 * Compare client mutation timestamp against server updated timestamp.
 * Returns true if client write is more recent.
 */
export function isClientWriteMoreRecent(clientQueuedAt: string, serverUpdatedAt: string): boolean {
  const clientTime = new Date(clientQueuedAt).getTime();
  const serverTime = new Date(serverUpdatedAt).getTime();
  return clientTime > serverTime;
}

/**
 * Construct side-by-side field diff comparison object for UI presentation.
 */
export function buildSideBySideDiff(
  clientData: Record<string, any>,
  serverData: Record<string, any>
): SideBySideDiffField[] {
  const allKeys = Array.from(new Set([...Object.keys(clientData), ...Object.keys(serverData)]));

  return allKeys.map((key) => {
    const clientVal = clientData[key] !== undefined ? String(clientData[key]) : "-";
    const serverVal = serverData[key] !== undefined ? String(serverData[key]) : "-";
    const isDifferent = clientVal !== serverVal;

    // Friendly field label formatter
    const label = key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase());

    return {
      field: key,
      label,
      clientValue: clientVal,
      serverValue: serverVal,
      isDifferent,
    };
  });
}

/**
 * Trigger full offline sync batch process.
 * Locks pending items, posts batch to /api/sync/process, handles server response, and updates IndexedDB.
 */
export async function triggerOfflineBatchSync(): Promise<{
  syncedCount: number;
  failedCount: number;
  conflictsCount: number;
}> {
  const pendingItems = await getPendingSyncItems();
  if (pendingItems.length === 0) {
    return { syncedCount: 0, failedCount: 0, conflictsCount: 0 };
  }

  const mutationIds = pendingItems.map((item) => item.mutationId);
  await markAsSyncing(mutationIds);

  try {
    const res = await fetch("/api/sync/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mutations: pendingItems }),
    });

    if (!res.ok) {
      const errText = await res.text();
      await markAsFailed(mutationIds.map((id) => ({ mutationId: id, error: errText })));
      return { syncedCount: 0, failedCount: mutationIds.length, conflictsCount: 0 };
    }

    const payload = await res.json();
    const { syncedIds = [], failedResults = [], conflicts = [] } = payload;

    // Update synced items
    if (syncedIds.length > 0) {
      await markAsSynced(syncedIds);
    }

    // Update failed items
    if (failedResults.length > 0) {
      await markAsFailed(failedResults);
    }

    // Store conflicts in Dexie IndexedDB
    for (const conflict of conflicts) {
      await storeConflict(conflict);
    }

    return {
      syncedCount: syncedIds.length,
      failedCount: failedResults.length,
      conflictsCount: conflicts.length,
    };
  } catch (err: any) {
    await markAsFailed(
      mutationIds.map((id) => ({ mutationId: id, error: err.message || "Network sync failure" }))
    );
    return { syncedCount: 0, failedCount: mutationIds.length, conflictsCount: 0 };
  }
}
