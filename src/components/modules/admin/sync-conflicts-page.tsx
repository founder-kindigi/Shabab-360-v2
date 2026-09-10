"use client";
import { OfflineQueuePanel } from "@/components/modules/park/offline-queue-panel";
export function SyncConflictsPage({ onBack }: { onBack?: () => void } = {}) {
  return <section className="p-5 space-y-4"><button onClick={onBack}>Back</button><h1 className="text-xl font-bold">Attendance sync</h1><p>Pending attendance belongs to the signed-in account. Conflicting marks remain available for review; reload the roster before making a correction.</p><OfflineQueuePanel /><p className="text-sm text-muted-foreground">Offline fees, events, and meeting edits are currently unavailable. Legacy marks without a verified account remain stored and are never submitted automatically.</p></section>;
}
