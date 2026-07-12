"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/lib/offline/db";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AttendanceEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  recordId: string;
  participantName: string;
  currentStatus: AttendanceStatus | null;
  onClose?: () => void;
}

// ─── Status options ──────────────────────────────────────────────────────────

const STATUS_OPTIONS: {
  value: AttendanceStatus;
  label: string;
  letter: string;
  icon: typeof CheckCircle2;
  colorClass: string;
  activeClass: string;
}[] = [
  {
    value: "present",
    label: "Present",
    letter: "P",
    icon: CheckCircle2,
    colorClass: "text-emerald-600 dark:text-emerald-400",
    activeClass: "bg-emerald-100 text-emerald-700 border-emerald-400 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-600",
  },
  {
    value: "absent",
    label: "Absent",
    letter: "A",
    icon: XCircle,
    colorClass: "text-red-600 dark:text-red-400",
    activeClass: "bg-red-100 text-red-700 border-red-400 dark:bg-red-900/40 dark:text-red-300 dark:border-red-600",
  },
  {
    value: "late",
    label: "Late",
    letter: "L",
    icon: Clock,
    colorClass: "text-amber-600 dark:text-amber-400",
    activeClass: "bg-amber-100 text-amber-700 border-amber-400 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-600",
  },
  {
    value: "excused",
    label: "Excused",
    letter: "E",
    icon: ShieldCheck,
    colorClass: "text-sky-600 dark:text-sky-400",
    activeClass: "bg-sky-100 text-sky-700 border-sky-400 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-600",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function AttendanceEditDialog({
  open,
  onOpenChange,
  eventId,
  recordId,
  participantName,
  currentStatus,
  onClose,
}: AttendanceEditDialogProps) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string } | undefined)?.role;

  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | null>(
    currentStatus
  );
  const [editReason, setEditReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  // Only admin and park_admin/park_lead can use this dialog
  const canEdit =
    userRole === "admin" ||
    userRole === "super_admin" ||
    userRole === "program_admin" ||
    userRole === "park_admin" ||
    userRole === "park_lead";

  // Reset form when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedStatus(currentStatus);
      setEditReason("");
      setReasonError("");
    }
    onOpenChange(nextOpen);
    if (!nextOpen) onClose?.();
  };

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: (data: { status: string; editReason: string }) =>
      fetch(
        `/api/park/attendance/${eventId}/records/${recordId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      ).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      toast.success(`Attendance updated for ${participantName}`);
      queryClient.invalidateQueries({ queryKey: ["attendance-roster", eventId] });
      queryClient.invalidateQueries({
        queryKey: ["attendance-warnings"],
      });
      handleOpenChange(false);
    },
    onError: (err: { error?: string }) => {
      toast.error(err.error || "Failed to update attendance");
    },
  });

  function handleSubmit() {
    setReasonError("");

    if (!selectedStatus) {
      toast.error("Please select a status");
      return;
    }

    if (!editReason.trim()) {
      setReasonError("Edit reason is required");
      return;
    }

    if (editReason.trim().length < 10) {
      setReasonError("Reason must be at least 10 characters");
      return;
    }

    if (!canEdit) {
      toast.error("You don't have permission to edit records");
      return;
    }

    editMutation.mutate({
      status: selectedStatus,
      editReason: editReason.trim(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Attendance</DialogTitle>
          <DialogDescription>
            Update the attendance record for{" "}
            <span className="font-medium text-foreground">
              {participantName}
            </span>
            . A reason is required for audit purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <div className="grid grid-cols-4 gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = selectedStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedStatus(opt.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all duration-150",
                      isActive
                        ? opt.activeClass
                        : "border-transparent bg-muted/50 hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className={cn("size-5", isActive ? "" : opt.colorClass)} />
                    <span className="text-xs font-semibold">{opt.letter}</span>
                    <span className="text-[10px]">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current status indicator */}
          {currentStatus && currentStatus !== selectedStatus && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-800/50"
            >
              <AlertTriangle className="size-3.5 flex-none" />
              Changing from{" "}
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 capitalize">
                {currentStatus}
              </Badge>{" "}
              to{" "}
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 capitalize">
                {selectedStatus}
              </Badge>
            </motion.div>
          )}

          {/* Edit reason */}
          <div className="space-y-2">
            <Label htmlFor="edit-reason" className="text-sm font-medium">
              Edit Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="edit-reason"
              placeholder="Explain why this attendance record is being changed (min. 10 characters)..."
              value={editReason}
              onChange={(e) => {
                setEditReason(e.target.value);
                if (reasonError) setReasonError("");
              }}
              className={cn(
                "min-h-[80px] resize-none",
                reasonError && "border-red-500 focus-visible:ring-red-500"
              )}
            />
            <AnimatePresence>
              {reasonError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-xs text-red-500"
                >
                  {reasonError}
                </motion.p>
              )}
            </AnimatePresence>
            <p className="text-[11px] text-muted-foreground">
              This will be logged in the audit trail.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={editMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
            onClick={handleSubmit}
            disabled={editMutation.isPending || !canEdit}
          >
            {editMutation.isPending ? (
              <Loader2 className="size-4 animate-spin mr-1.5" />
            ) : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}