"use client";

import { AnimatePresence, motion } from "framer-motion";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/use-online-status";

/**
 * A sticky banner shown at the top of the viewport when the user goes offline.
 * Auto-hides when connectivity returns. Includes a manual "Retry" button.
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="overflow-hidden flex-none"
        >
          <div className="flex items-center justify-center gap-2.5 bg-amber-500 px-4 py-2 text-white text-sm font-medium">
            <WifiOff className="size-4 flex-none" />
            <span>You are offline. Some features may be unavailable.</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              className="h-6 px-2 text-white hover:bg-amber-600 hover:text-white flex-none"
            >
              <RefreshCw className="size-3 mr-1" />
              Retry
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}