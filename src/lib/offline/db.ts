import Dexie, { type Table } from "dexie";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface OfflineQueueItem {
  mutationId: string;
  eventId: string;
  participantId: string;
  status: AttendanceStatus;
  markedAt: string;
  queuedAt: string;
  retryCount: number;
  lastError: string | null;
  errorCode: string | null;
  retryable: boolean | null;
  syncedAt: string | null;
  state: "pending" | "syncing" | "synced" | "failed";
}

export interface SyncConflictItem {
  id: string;
  mutationId: string;
  entityType: "attendance" | "fee" | "event" | "mashwara";
  entityId: string;
  participantId?: string;
  clientData: any;
  serverData: any;
  conflictType: "timestamp_mismatch" | "state_lock" | "concurrent_modification";
  status: "pending_review" | "resolved_client_wins" | "resolved_server_wins" | "auto_resolved";
  detectedAt: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
}

export class ShababOfflineDB extends Dexie {
  queue!: Table<OfflineQueueItem, string>;
  conflicts!: Table<SyncConflictItem, string>;

  constructor() {
    super("shabab360-offline");
    this.version(1).stores({
      queue: "mutationId, eventId, participantId, state, queuedAt",
    });
    this.version(2).stores({
      queue: "mutationId, eventId, participantId, state, queuedAt",
      conflicts: "id, mutationId, entityType, entityId, status, detectedAt",
    });
  }
}

export const offlineDB = new ShababOfflineDB();

const MAX_RETRIES = 5;
const STUCK_SYNC_AGE_MS = 2 * 60 * 1000;

/** Preserves the user's mutation order when multiple offline marks target one record. */
export function orderSyncItems<T extends Pick<OfflineQueueItem, "queuedAt">>(items: T[]): T[] {
  return [...items].sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
}

/** Keeps only the newest unsent mark for each attendance record. */
export function coalesceAttendanceItems<T extends Pick<OfflineQueueItem, "eventId" | "participantId" | "queuedAt">>(
  items: T[]
): T[] {
  const latest = new Map<string, T>();
  for (const item of orderSyncItems(items)) {
    latest.set(`${item.eventId}:${item.participantId}`, item);
  }
  return orderSyncItems([...latest.values()]);
}

/**
 * Add an attendance mark to the offline queue.
 */
export async function queueAttendanceMark(params: {
  mutationId: string;
  eventId: string;
  participantId: string;
  status: AttendanceStatus;
  markedAt: string;
}): Promise<void> {
  await offlineDB.transaction("rw", offlineDB.queue, async () => {
    const replaceable = await offlineDB.queue
      .where("eventId")
      .equals(params.eventId)
      .filter((item) =>
        item.participantId === params.participantId &&
        (item.state === "pending" || item.state === "failed")
      )
      .primaryKeys();
    if (replaceable.length > 0) await offlineDB.queue.bulkDelete(replaceable);

    await offlineDB.queue.add({
      ...params,
      queuedAt: new Date().toISOString(),
      retryCount: 0,
      lastError: null,
      errorCode: null,
      retryable: null,
      syncedAt: null,
      state: "pending",
    });
  });
}

/**
 * Get all items that need syncing (pending + failed within retry limit).
 */
export async function getPendingSyncItems(): Promise<OfflineQueueItem[]> {
  const items = await offlineDB.queue
    .where("state")
    .equals("pending")
    .filter((item) => item.retryCount < MAX_RETRIES)
    .limit(200)
    .toArray();
  return coalesceAttendanceItems(items);
}

/**
 * Mark items as syncing (lock them).
 */
export async function markAsSyncing(mutationIds: string[]): Promise<void> {
  await offlineDB.queue.bulkUpdate(
    mutationIds.map((id) => ({
      key: id,
      changes: { state: "syncing" as const },
    }))
  );
}

/**
 * Mark items as synced after successful server processing.
 */
export async function markAsSynced(mutationIds: string[]): Promise<void> {
  await offlineDB.queue.bulkUpdate(
    mutationIds.map((id) => ({
      key: id,
      changes: { state: "synced" as const, syncedAt: new Date().toISOString() },
    }))
  );
}

/**
 * Mark items as failed after sync attempt.
 */
export async function markAsFailed(
  results: Array<{ mutationId: string; error?: string; code?: string; retryable?: boolean }>
): Promise<void> {
  await offlineDB.transaction("rw", offlineDB.queue, async () => {
    for (const { mutationId, error, code, retryable = true } of results) {
      const item = await offlineDB.queue.get(mutationId);
      if (!item) continue;
      const newRetryCount = item.retryCount + 1;
      await offlineDB.queue.update(mutationId, {
        state: !retryable || newRetryCount >= MAX_RETRIES ? "failed" : ("pending" as const),
        retryCount: newRetryCount,
        lastError: error || null,
        errorCode: code || null,
        retryable,
      });
    }
  });
}

/**
 * Reset all failed items back to pending for retry.
 */
export async function retryAllFailed(): Promise<void> {
  await offlineDB.queue
    .where("state")
    .equals("failed")
    .modify({
      state: "pending",
      retryCount: 0,
      lastError: null,
      errorCode: null,
      retryable: null,
    });
}

export async function discardFailed(mutationId: string): Promise<void> {
  const item = await offlineDB.queue.get(mutationId);
  if (item?.state === "failed") await offlineDB.queue.delete(mutationId);
}

/** Returns interrupted sync attempts to the queue after a browser/network crash. */
export async function recoverStuckSyncing(maxAgeMs = STUCK_SYNC_AGE_MS): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  const stuck = await offlineDB.queue
    .where("state")
    .equals("syncing")
    .filter((item) => item.queuedAt < cutoff)
    .toArray();
  if (stuck.length === 0) return 0;
  await offlineDB.queue.bulkUpdate(stuck.map((item) => ({
    key: item.mutationId,
    changes: {
      state: "pending" as const,
      lastError: "Previous sync was interrupted",
      errorCode: "SYNC_INTERRUPTED",
      retryable: true,
    },
  })));
  return stuck.length;
}

/**
 * Get counts by state.
 */
export async function getQueueCounts(): Promise<{
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
}> {
  const [pending, syncing, synced, failed] = await Promise.all([
    offlineDB.queue.where("state").equals("pending").count(),
    offlineDB.queue.where("state").equals("syncing").count(),
    offlineDB.queue.where("state").equals("synced").count(),
    offlineDB.queue.where("state").equals("failed").count(),
  ]);
  return { pending, syncing, synced, failed };
}

/**
 * Clear successfully synced items.
 */
export async function clearSyncedItems(): Promise<void> {
  await offlineDB.queue.where("state").equals("synced").delete();
}

/**
 * Get detailed queue statistics including oldest queued item timestamp.
 */
export async function getOfflineQueueStats(): Promise<{
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  oldestQueuedAt: string | null;
}> {
  const [counts, oldestItem] = await Promise.all([
    getQueueCounts(),
    offlineDB.queue.orderBy("queuedAt").first(),
  ]);

  return {
    ...counts,
    oldestQueuedAt: oldestItem ? oldestItem.queuedAt : null,
  };
}

/**
 * Prune synced items older than maxAgeMs.
 */
export async function pruneStaleSyncedItems(maxAgeMs = 24 * 60 * 60 * 1000): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  const staleItems = await offlineDB.queue
    .where("state")
    .equals("synced")
    .filter((item) => Boolean(item.syncedAt && item.syncedAt < cutoff))
    .toArray();

  if (staleItems.length === 0) return 0;

  const ids = staleItems.map((i) => i.mutationId);
  await offlineDB.queue.bulkDelete(ids);
  return ids.length;
}

/**
 * Store a sync conflict in IndexedDB.
 */
export async function storeConflict(conflict: SyncConflictItem): Promise<void> {
  await offlineDB.conflicts.put(conflict);
}

/**
 * Get pending sync conflicts.
 */
export async function getPendingConflicts(): Promise<SyncConflictItem[]> {
  return await offlineDB.conflicts.where("status").equals("pending_review").toArray();
}

/**
 * Resolve a sync conflict.
 */
export async function resolveConflict(
  id: string,
  resolution: "resolved_client_wins" | "resolved_server_wins",
  user: string
): Promise<void> {
  await offlineDB.conflicts.update(id, {
    status: resolution,
    resolvedAt: new Date().toISOString(),
    resolvedBy: user,
  });
}
