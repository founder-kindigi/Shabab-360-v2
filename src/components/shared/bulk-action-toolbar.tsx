"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BulkAction {
  key: string;
  label: string;
  icon: LucideIcon;
  variant?: "default" | "destructive";
  confirmMessage?: string;
}

interface BulkActionToolbarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  actions: BulkAction[];
  onAction: (action: string) => void;
  isLoading: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BulkActionToolbar({
  selectedIds,
  onClearSelection,
  actions,
  onAction,
  isLoading,
}: BulkActionToolbarProps) {
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);

  const handleActionClick = useCallback(
    (action: BulkAction) => {
      if (action.confirmMessage) {
        setPendingAction(action);
      } else {
        onAction(action.key);
      }
    },
    [onAction]
  );

  const handleConfirm = useCallback(() => {
    if (pendingAction) {
      onAction(pendingAction.key);
      setPendingAction(null);
    }
  }, [pendingAction, onAction]);

  const handleCancel = useCallback(() => {
    setPendingAction(null);
  }, []);

  if (selectedIds.length === 0) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ duration: 0.2 }}
          className="sticky top-0 z-20 overflow-hidden"
        >
          <div className="flex items-center gap-2 rounded-xl border border-[#D4B8E3] dark:border-[#2A0C8F] bg-[#F3ECF6] dark:bg-[#1F0860] px-4 py-2.5 shadow-sm">
            {/* Count badge */}
            <Badge
              variant="outline"
              className="bg-[#4B0A8F] text-white border-[#4B0A8F] dark:bg-[#8A40B0] dark:border-[#8A40B0] shrink-0"
            >
              {selectedIds.length} selected
            </Badge>

            {/* Divider */}
            <div className="w-px h-6 bg-[#D4B8E3] dark:bg-[#2A0C8F] shrink-0" />

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0">
              {actions.map((action) => {
                const Icon = action.icon;
                const isDestructive = action.variant === "destructive";
                return (
                  <Button
                    key={action.key}
                    size="sm"
                    variant={isDestructive ? "destructive" : "outline"}
                    className={`
                      ${isDestructive ? "" : "border-[#D4B8E3] text-[#4B0A8F] hover:bg-[#4B0A8F]/10 dark:border-[#2A0C8F] dark:text-[#8A40B0] dark:hover:bg-[#8A40B0]/10"}
                      shrink-0 h-8 text-xs
                    `}
                    onClick={() => handleActionClick(action)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Icon className="size-3.5 mr-1.5" />
                    )}
                    {action.label}
                  </Button>
                );
              })}
            </div>

            {/* Clear selection */}
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={onClearSelection}
              disabled={isLoading}
            >
              <X className="size-4" />
              <span className="sr-only">Clear selection</span>
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Confirmation dialog */}
      <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && handleCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.confirmMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isLoading}
              className={
                pendingAction?.variant === "destructive"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-[#4B0A8F] hover:bg-[#4B0A8FE6]"
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}