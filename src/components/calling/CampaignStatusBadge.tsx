"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-muted-foreground/30",
  active: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400",
  paused: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400",
  archived: "bg-muted text-muted-foreground border-muted-foreground/30",
};

export function CampaignStatusBadge({ status }: { status?: string }) {
  const safeStatus = status || "draft";
  return (
    <Badge variant="outline" className={cn("text-[10px] capitalize", STATUS_STYLES[safeStatus] || STATUS_STYLES.draft)}>
      {safeStatus.replace(/_/g, " ")}
    </Badge>
  );
}
