"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePresenceStore } from "@/stores/usePresenceStore";

interface OnlineStatusProps {
  userId: string;
  size?: "sm" | "md";
  /** Optional override — forces a specific state */
  override?: "online" | "offline";
}

/**
 * Small dot indicator showing online/offline status.
 *
 * - Green (emerald-500) with pulse animation = online
 * - Gray (muted-foreground/30) = offline
 * - Tooltip shows "Online" or "Offline"
 */
export function OnlineStatus({ userId, size = "sm", override }: OnlineStatusProps) {
  const isUserOnline = usePresenceStore((s) => s.isUserOnline);
  const online = override ? override === "online" : isUserOnline(userId);

  const dotSize = size === "sm" ? "size-2" : "size-[10px]";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`relative inline-flex items-center justify-center ${dotSize} shrink-0`}
          aria-label={online ? "Online" : "Offline"}
        >
          {online ? (
            <>
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-40 animate-[pulse-dot_2s_ease-in-out_infinite]" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 ring-2 ring-emerald-500/20" />
            </>
          ) : (
            <span className="inline-flex rounded-full h-2 w-2 bg-muted-foreground/30" />
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {online ? "Online" : "Offline"}
      </TooltipContent>
    </Tooltip>
  );
}