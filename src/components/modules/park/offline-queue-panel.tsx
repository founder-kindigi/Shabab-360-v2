"use client";

import { useState, useEffect, useCallback } from "react";
import { useAttendanceSync } from "@/hooks/use-attendance-sync";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RefreshCw, ChevronDown, AlertCircle, Loader2, WifiOff } from "lucide-react";
import type { OfflineQueueItem } from "@/lib/offline/db";

export function OfflineQueuePanel() {
  const { pendingCount, failedCount, isOnline, syncNow, retryFailed, getFailedItems } =
    useAttendanceSync();
  const [open, setOpen] = useState(false);
  const [failedItems, setFailedItems] = useState<OfflineQueueItem[]>([]);
  const [syncing, setSyncing] = useState(false);

  const loadFailedItems = useCallback(async () => {
    const items = await getFailedItems();
    setFailedItems(items);
  }, [getFailedItems]);

  // Auto-expand if there are failed items
  useEffect(() => {
    if (failedCount > 0) {
      setOpen(true);
      loadFailedItems();
    }
  }, [failedCount, loadFailedItems]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncNow();
      await loadFailedItems();
    } finally {
      setSyncing(false);
    }
  };

  const handleRetry = async () => {
    setSyncing(true);
    try {
      await retryFailed();
      await loadFailedItems();
    } finally {
      setSyncing(false);
    }
  };

  // Don't show if everything is clean
  if (pendingCount === 0 && failedCount === 0) {
    return null;
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "rounded-lg border transition-colors",
          failedCount > 0
            ? "border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20"
            : "border-border bg-card"
        )}
      >
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
            <div className="flex items-center gap-2.5 min-w-0">
              {failedCount > 0 ? (
                <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
              ) : isOnline ? (
                <RefreshCw
                  className={cn(
                    "size-4 text-emerald-600 dark:text-emerald-400 shrink-0",
                    syncing && "animate-spin"
                  )}
                />
              ) : (
                <WifiOff className="size-4 text-muted-foreground shrink-0" />
              )}
              <span className="text-sm font-medium truncate">
                {failedCount > 0
                  ? "Sync Issues"
                  : `${pendingCount} mark${pendingCount !== 1 ? "s" : ""} pending`}
              </span>
              {pendingCount > 0 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                >
                  {pendingCount}
                </Badge>
              )}
              {failedCount > 0 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                >
                  {failedCount} failed
                </Badge>
              )}
            </div>
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground shrink-0 transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-3 space-y-3 border-t">
            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-3">
              {pendingCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSync}
                  disabled={syncing || !isOnline}
                  className="text-xs"
                >
                  {syncing ? (
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3.5 mr-1.5" />
                  )}
                  Sync Now
                </Button>
              )}
              {failedCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetry}
                  disabled={syncing}
                  className="text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
                >
                  <RefreshCw className="size-3.5 mr-1.5" />
                  Retry Failed
                </Button>
              )}
            </div>

            {/* Failed items list */}
            {failedItems.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {failedItems.map((item) => (
                  <div
                    key={item.mutationId}
                    className="flex items-start gap-2 text-xs rounded-md bg-red-50 dark:bg-red-950/20 px-2.5 py-2 border border-red-100 dark:border-red-900/30"
                  >
                    <AlertCircle className="size-3.5 text-red-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-red-700 dark:text-red-400 font-medium">
                        {item.status} for {item.participantId.slice(0, 8)}...
                      </p>
                      <p className="text-red-500 dark:text-red-500/70 mt-0.5">
                        {item.lastError || "Unknown error"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isOnline && (
              <p className="text-xs text-muted-foreground text-center">
                Connect to the internet to sync.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}