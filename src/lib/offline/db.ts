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
  syncedAt: string | null;
  state: "pending" | "syncing" | "synced" | "failed";
}

export class ShababOfflineDB extends Dexie {
  queue!: Table<OfflineQueueItem, string>;

  constructor() {
    super("shabab360-offline");
    this.version(1).stores({
      queue: "mutationId, eventId, participantId, state, queuedAt",
    });
  }
}

export const offlineDB = new ShababOfflineDB();

const MAX_RETRIES = 5;

/** Preserves the user's mutation order when multiple offline marks target one record. */
export function orderSyncItems<T extends Pick<OfflineQueueItem, "queuedAt">>(items: T[]): T[] {
  return [...items].sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
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
  await offlineDB.queue.add({
    ...params,
    queuedAt: new Date().toISOString(),
    retryCount: 0,
    lastError: null,
    syncedAt: null,
    state: "pending",
  });
}

/**
 * Get all items that need syncing (pending + failed within retry limit).
 */
export async function getPendingSyncItems(): Promise<OfflineQueueItem[]> {
  const items = await offlineDB.queue
    .where("state")
    .anyOf(["pending", "failed"])
    .filter((item) => item.retryCount < MAX_RETRIES)
    .toArray();
  return orderSyncItems(items);
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
  results: Array<{ mutationId: string; error?: string }>
): Promise<void> {
  await offlineDB.transaction("rw", offlineDB.queue, async () => {
    for (const { mutationId, error } of results) {
      const item = await offlineDB.queue.get(mutationId);
      if (!item) continue;
      const newRetryCount = item.retryCount + 1;
      await offlineDB.queue.update(mutationId, {
        state: newRetryCount >= MAX_RETRIES ? "failed" : ("pending" as const),
        retryCount: newRetryCount,
        lastError: error || null,
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
    .modify({ state: "pending", lastError: null });
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
