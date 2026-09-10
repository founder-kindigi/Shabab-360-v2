import { getPendingSyncItems, markAsFailed, markAsSynced, markAsSyncing, recoverStuckSyncing } from "./db";

export interface SyncResult { success: boolean; processed: number; failed: number }
const active = new Map<string, Promise<SyncResult>>();

/** One contract for roster, mobile and Sync Studio. Acknowledgements must cover exactly the sent batch. */
export function drainAttendanceQueue(ownerId: string, isCurrentOwner: () => boolean = () => true): Promise<SyncResult> {
  if (!ownerId) return Promise.resolve({ success: false, processed: 0, failed: 0 });
  const existing = active.get(ownerId);
  if (existing) return existing;
  const run = async (): Promise<SyncResult> => {
    let processed = 0, failed = 0;
    const attempted = new Set<string>();
    await recoverStuckSyncing(undefined, ownerId);
    while (isCurrentOwner()) {
      const items = await getPendingSyncItems(ownerId, attempted);
      if (!items.length) break;
      const ids = items.map(i => i.mutationId);
      ids.forEach(id => attempted.add(id));
      await markAsSyncing(ids);
      try {
        if (!isCurrentOwner()) throw new Error("Account changed; marks retained for their owner");
        const response = await fetch("/api/park/attendance/sync", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mutations: items.map(i => ({ mutationId: i.mutationId, ownerId, eventId: i.eventId, participantId: i.participantId, status: i.status, markedAt: i.markedAt, expectedResetVersion: i.expectedResetVersion, expectedVersion: i.expectedVersion })) }),
        });
        if (!response.ok) throw new Error(`Sync unavailable (${response.status}); marks retained`);
        const body = await response.json();
        const results = body.results;
        if (!Array.isArray(results) || results.length !== ids.length || new Set(results.map(r => r.mutationId)).size !== ids.length || results.some(r => !ids.includes(r.mutationId) || !["processed", "failed"].includes(r.status) || (r.status === "processed" && (!r.recordId || !r.version)))) throw new Error("Invalid sync acknowledgement; marks retained");
        const accepted = results.filter(r => r.status === "processed").map(r => r.mutationId);
        const rejected = results.filter(r => r.status === "failed");
        await markAsSynced(accepted);
        await markAsFailed(rejected);
        processed += accepted.length; failed += rejected.length;
      } catch (error) {
        await markAsFailed(ids.map(mutationId => ({ mutationId, error: error instanceof Error ? error.message : "Sync failed", code: "SYNC_UNACKNOWLEDGED", retryable: true })));
        failed += ids.length;
        break;
      }
    }
    return { success: failed === 0 && isCurrentOwner(), processed, failed };
  };
  const locked = async () => typeof navigator !== "undefined" && navigator.locks
    ? navigator.locks.request(`shabab-attendance-${ownerId}`, run) : run();
  const promise = locked().finally(() => active.delete(ownerId));
  active.set(ownerId, promise);
  return promise;
}
