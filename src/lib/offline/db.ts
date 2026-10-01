import Dexie, { type Table } from "dexie";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface OfflineQueueItem {
  mutationId: string;
  ownerId?: string | null;
  expectedVersion?: string | null;
  expectedResetVersion?: number;
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
    this.version(3).stores({
      queue: "mutationId, ownerId, eventId, participantId, state, queuedAt",
      conflicts: "id, mutationId, entityType, entityId, status, detectedAt",
    }).upgrade(async tx => {
      await tx.table("queue").toCollection().modify(item => {
        if (!item.ownerId || !("expectedVersion" in item)) {
          item.ownerId = null; item.state = "failed"; item.retryable = false;
          item.errorCode = "LEGACY_OWNER_UNKNOWN";
          item.lastError = "Legacy mark retained for manual review; its account and base version cannot be verified.";
        }
      });
    });
    this.version(4).stores({ queue: "mutationId, ownerId, eventId, participantId, state, queuedAt", conflicts: "id, mutationId, entityType, entityId, status, detectedAt" }).upgrade(async tx => {
      await tx.table("queue").toCollection().modify(item => {
        if (item.state !== "synced" && !Number.isInteger(item.expectedResetVersion)) {
          item.state = "failed"; item.retryable = false; item.errorCode = "LEGACY_RESET_VERSION_UNKNOWN";
          item.lastError = "Legacy mark retained for review. Reload the session to verify whether it was reset.";
        }
      });
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
  ownerId: string;
  expectedVersion: string | null;
  expectedResetVersion: number;
  eventId: string;
  participantId: string;
  status: AttendanceStatus;
  markedAt: string;
}): Promise<void> {
  if (!params.ownerId || !("expectedVersion" in params) || !Number.isInteger(params.expectedResetVersion)) throw new Error("Account and base version required");
  await offlineDB.transaction("rw", offlineDB.queue, async () => {
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
export async function getPendingSyncItems(ownerId?: string, excluded: ReadonlySet<string> = new Set()): Promise<OfflineQueueItem[]> {
  if (!ownerId) return [];
  const items = await offlineDB.queue
    .orderBy("queuedAt")
    .filter((item) => item.state === "pending" && item.ownerId === ownerId && !excluded.has(item.mutationId) && item.retryCount < MAX_RETRIES)
    .limit(50)
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
export async function retryAllFailed(ownerId?: string): Promise<void> {
  await offlineDB.queue
    .where("state")
    .equals("failed")
    .filter(item => Boolean(ownerId) && item.ownerId === ownerId && item.retryable === true)
    .modify({
      state: "pending",
      retryCount: 0,
      lastError: null,
      errorCode: null,
      retryable: null,
    });
}

export async function discardFailed(mutationId: string, ownerId?: string): Promise<void> {
  const item = await offlineDB.queue.get(mutationId);
  if (ownerId && item?.ownerId === ownerId && item.state === "failed") await offlineDB.queue.delete(mutationId);
}

/** Returns interrupted sync attempts to the queue after a browser/network crash. */
export async function recoverStuckSyncing(maxAgeMs = STUCK_SYNC_AGE_MS, ownerId?: string): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  const stuck = await offlineDB.queue
    .where("state")
    .equals("syncing")
    .filter((item) => Boolean(ownerId) && item.ownerId === ownerId && item.queuedAt < cutoff)
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
export async function getQueueCounts(ownerId?: string): Promise<{
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
}> {
  const [pending, syncing, synced, failed] = await Promise.all([
    offlineDB.queue.where("state").equals("pending").filter(item => Boolean(ownerId) && item.ownerId === ownerId).count(),
    offlineDB.queue.where("state").equals("syncing").filter(item => Boolean(ownerId) && item.ownerId === ownerId).count(),
    offlineDB.queue.where("state").equals("synced").filter(item => Boolean(ownerId) && item.ownerId === ownerId).count(),
    offlineDB.queue.where("state").equals("failed").filter(item => Boolean(ownerId) && item.ownerId === ownerId).count(),
  ]);
  return { pending, syncing, synced, failed };
}

/**
 * Clear successfully synced items.
 */
export async function clearSyncedItems(ownerId?: string): Promise<void> {
  await offlineDB.queue.where("state").equals("synced").filter(item => Boolean(ownerId) && item.ownerId === ownerId).delete();
}

/**
 * Get detailed queue statistics including oldest queued item timestamp.
 */
export async function getOfflineQueueStats(ownerId?: string): Promise<{
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  oldestQueuedAt: string | null;
}> {
  const [counts, oldestItem] = await Promise.all([
    getQueueCounts(ownerId),
    offlineDB.queue.orderBy("queuedAt").filter(item => Boolean(ownerId) && item.ownerId === ownerId).first(),
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
