"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { offlineDB, getQueueCounts, queueAttendanceMark, retryAllFailed, discardFailed, type AttendanceStatus } from "@/lib/offline/db";
import { drainAttendanceQueue, type SyncResult } from "@/lib/offline/sync-attendance";
import { v4 as uuidv4 } from "uuid";
export type { SyncResult } from "@/lib/offline/sync-attendance";

export function useAttendanceSync() {
  const { data: session } = useSession();
  const ownerId = session?.user?.id ?? "";
  const owner = useRef(ownerId);
  useLayoutEffect(() => { owner.current = ownerId; return () => { owner.current = ""; }; }, [ownerId]);
  const isOnline = useOnlineStatus();
  const [counts, setCounts] = useState({ ownerId, pending: 0, failed: 0 });
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const refreshCounts = useCallback(async () => {
    try { const c = await getQueueCounts(ownerId); if (owner.current === ownerId) setCounts({ ownerId, pending: c.pending + c.syncing, failed: c.failed }); } catch { /* IndexedDB unavailable; saves report their own errors. */ }
  }, [ownerId]);
  const syncNow = useCallback(async (): Promise<SyncResult> => {
    if (!ownerId || !isOnline || session?.user?.mustResetPwd) return { success: false, processed: 0, failed: 0 };
    setIsSyncing(true); setLastSyncError(null);
    try { return await drainAttendanceQueue(ownerId, () => owner.current === ownerId); }
    catch { setLastSyncError("Local queue could not be accessed"); return { success: false, processed: 0, failed: 0 }; }
    finally { setIsSyncing(false); await refreshCounts(); }
  }, [ownerId, isOnline, session?.user?.mustResetPwd, refreshCounts]);
  const markAttendance = useCallback(async (params: { eventId: string; participantId: string; status: AttendanceStatus; expectedResetVersion: number; expectedVersion: string | null }): Promise<{ success: boolean; queued?: boolean; error?: string }> => {
    if (!ownerId || session?.user?.mustResetPwd) return { success: false, error: "Sign in before marking attendance" };
    try {
      const mutationId = uuidv4();
      await queueAttendanceMark({ ...params, ownerId, mutationId, markedAt: new Date().toISOString() });
      await refreshCounts();
      if (!isOnline) return { success: true, queued: true };
      await syncNow();
      const saved = await offlineDB.queue.get(mutationId);
      return saved?.state === "synced" ? { success: true } : { success: false, queued: true, error: saved?.lastError || "Mark retained locally; waiting for acknowledgement" };
    } catch { return { success: false, error: "Local storage failed. Attendance was not saved." }; }
  }, [ownerId, session?.user?.mustResetPwd, isOnline, refreshCounts, syncNow]);
  useEffect(() => {
    setCounts({ ownerId, pending: 0, failed: 0 }); setLastSyncError(null);
    void refreshCounts();
    const timer = window.setInterval(() => void refreshCounts(), 3000);
    if (isOnline && ownerId) void syncNow();
    return () => window.clearInterval(timer);
  }, [ownerId, isOnline, refreshCounts, syncNow]);
  const retryFailed = useCallback(async () => { await retryAllFailed(ownerId); await syncNow(); await refreshCounts(); }, [ownerId, syncNow, refreshCounts]);
  const discardFailedItem = useCallback(async (id: string) => { await discardFailed(id, ownerId); await refreshCounts(); }, [ownerId, refreshCounts]);
  const getFailedItems = useCallback(async () => offlineDB.queue.where("state").equals("failed").filter(i => Boolean(ownerId) && i.ownerId === ownerId).toArray(), [ownerId]);
  return { pendingCount: counts.ownerId === ownerId ? counts.pending : 0, failedCount: counts.ownerId === ownerId ? counts.failed : 0, lastSyncError, isSyncing, isOnline, markAttendance, syncNow, retryFailed, discardFailedItem, getFailedItems, refreshCounts };
}
