"use client";
import { OfflineQueuePanel } from "@/components/modules/park/offline-queue-panel";
import { ModuleFrame, WorkflowNotice, moduleCard } from "@/components/modules/shared/module-presentation";
import { ShieldCheck, RefreshCw, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
export function SyncConflictsPage({ onBack }: { onBack?: () => void } = {}) {
  return <ModuleFrame mobile onBack={onBack} title="Offline Sync & Cache" subtitle="Attendance queue & conflict review">
    <OfflineQueuePanel dashboard />
    <div className={cn(moduleCard, "p-4 space-y-4")}><h2 className="text-sm font-bold text-[#4B0A8F] dark:text-purple-300 flex items-center gap-2"><ShieldCheck className="size-4" />Your attendance queue</h2><p className="text-xs text-muted-foreground leading-relaxed">Pending attendance belongs to the signed-in account. Conflicting marks remain available for review; reload the roster before making a correction.</p><div className="flex gap-3 border-t border-slate-100 dark:border-white/10 pt-3"><RefreshCw className="size-4 text-purple-500 shrink-0" /><p className="text-xs text-muted-foreground">Reconnect to submit pending marks. A mark leaves the queue only after the server acknowledges it.</p></div></div>
    <WorkflowNotice>Offline fees, events, and meeting edits are currently unavailable. Legacy marks without a verified account remain stored and are never submitted automatically.</WorkflowNotice>
    <div className="flex justify-center items-center gap-2 text-[10px] text-slate-400"><WifiOff className="size-3" />Attendance remains available during connection loss.</div>
  </ModuleFrame>;
}
