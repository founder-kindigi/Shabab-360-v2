"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export type SessionFormData = {
  sessionDate: string;
  weekLabel: string;
  dayLabel: string;
  focusArea: string;
  isOffDay: boolean;
  status: string;
};

export type BlockFormData = {
  teamId: string;
  title: string;
  content: string;
  sortOrder: number;
};

export type TeamOption = {
  id: string;
  name: string;
  code: string;
};

export function SessionFormDialog({
  open,
  onOpenChange,
  mode,
  form,
  onChange,
  onSubmit,
  isPending,
  errorMessage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  form: SessionFormData;
  onChange: (form: SessionFormData) => void;
  onSubmit: () => void;
  isPending: boolean;
  errorMessage?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Curriculum Session" : "Edit Session"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new scheduled session for this plan."
              : "Update session details and status."}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div
            data-testid="session-error-banner"
            className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        <div className="space-y-3 py-2">
          <div>
            <label htmlFor="session-date" className="block text-xs font-bold text-foreground">
              Session Date *
            </label>
            <input
              id="session-date"
              type="date"
              required
              value={form.sessionDate}
              onChange={(e) => onChange({ ...form, sessionDate: e.target.value })}
              className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="session-week" className="block text-xs font-bold text-foreground">
                Week Label
              </label>
              <input
                id="session-week"
                type="text"
                placeholder="e.g. Week 1"
                value={form.weekLabel}
                onChange={(e) => onChange({ ...form, weekLabel: e.target.value })}
                className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-xs font-medium"
              />
            </div>
            <div>
              <label htmlFor="session-day" className="block text-xs font-bold text-foreground">
                Day Label
              </label>
              <input
                id="session-day"
                type="text"
                placeholder="e.g. Class 1"
                value={form.dayLabel}
                onChange={(e) => onChange({ ...form, dayLabel: e.target.value })}
                className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-xs font-medium"
              />
            </div>
          </div>

          <div>
            <label htmlFor="session-focus" className="block text-xs font-bold text-foreground">
              Focus Area
            </label>
            <textarea
              id="session-focus"
              rows={2}
              placeholder="Summary of topics for this session"
              value={form.focusArea}
              disabled={form.isOffDay}
              onChange={(e) => onChange({ ...form, focusArea: e.target.value })}
              className="mt-1 w-full rounded-xl border bg-background p-2.5 text-xs font-medium disabled:opacity-50"
            />
          </div>

          {mode === "edit" && (
            <div>
              <label htmlFor="session-status" className="block text-xs font-bold text-foreground">
                Status
              </label>
              <select
                id="session-status"
                value={form.status}
                onChange={(e) => onChange({ ...form, status: e.target.value })}
                className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-xs font-medium"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          )}

          {mode === "create" && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="session-offday"
                checked={form.isOffDay}
                onChange={(e) => onChange({ ...form, isOffDay: e.target.checked })}
                className="size-4 rounded text-primary"
              />
              <label
                htmlFor="session-offday"
                className="cursor-pointer text-xs font-medium text-muted-foreground"
              >
                Mark as Operational Off-Day (No activities)
              </label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={isPending || !form.sessionDate} onClick={onSubmit}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : mode === "create" ? "Create Session" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  isPending,
  variant = "destructive",
  errorMessage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  isPending: boolean;
  variant?: "default" | "destructive";
  errorMessage?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div
            className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep
          </Button>
          <Button variant={variant} disabled={isPending} onClick={onConfirm}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BlockFormDialog({
  open,
  onOpenChange,
  mode,
  categoryLabel,
  expectedTeamCode,
  form,
  teams,
  onChange,
  onSubmit,
  isPending,
  errorMessage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  categoryLabel: string;
  expectedTeamCode: string;
  form: BlockFormData;
  teams: TeamOption[];
  onChange: (form: BlockFormData) => void;
  onSubmit: () => void;
  isPending: boolean;
  errorMessage?: string;
}) {
  const hasTeams = teams.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? `Add ${categoryLabel} Block` : "Edit Activity Block"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a structured activity block for this session."
              : "Modify block title or content guidelines."}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div
            data-testid="block-error-banner"
            className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        <div className="space-y-3 py-2">
          {mode === "create" && (
            <div>
              <label htmlFor="block-team" className="block text-xs font-bold text-foreground">
                Collaboration Team ({expectedTeamCode}) *
              </label>
              {hasTeams ? (
                <select
                  id="block-team"
                  value={form.teamId}
                  onChange={(e) => onChange({ ...form, teamId: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-xs font-medium"
                >
                  <option value="">Select team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({team.code})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-1 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                  {`No active ${expectedTeamCode} team found in this city.`}
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="block-title" className="block text-xs font-bold text-foreground">
              Activity Title
            </label>
            <input
              id="block-title"
              type="text"
              placeholder="e.g. Warm-up Drills"
              value={form.title}
              onChange={(e) => onChange({ ...form, title: e.target.value })}
              className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-xs font-medium"
            />
          </div>

          <div>
            <label htmlFor="block-content" className="block text-xs font-bold text-foreground">
              Activity Content / Guidelines *
            </label>
            <textarea
              id="block-content"
              rows={4}
              required
              placeholder="Detailed steps, drills, or instructions"
              value={form.content}
              onChange={(e) => onChange({ ...form, content: e.target.value })}
              className="mt-1 w-full rounded-xl border bg-background p-2.5 text-xs font-medium"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              isPending ||
              !form.content.trim() ||
              (mode === "create" && (!hasTeams || !form.teamId))
            }
            onClick={onSubmit}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : mode === "create" ? "Add Block" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
