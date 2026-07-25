"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export const decisionFormSchema = z.object({
  decision: z.string().trim().min(1, "Decision text is required").max(1000),
  category: z.string().trim().max(200).optional(),
  targetTeamId: z.string().optional(),
  assignedToId: z.string().optional(),
  hasActionItem: z.boolean().default(false),
  actionItemDescription: z.string().trim().max(500).optional(),
  actionItemTeamId: z.string().optional(),
  actionItemAssignedToId: z.string().optional(),
  actionItemDueDate: z.string().optional(),
}).refine(
  (data) => {
    if (data.hasActionItem) {
      return (
        !!data.actionItemDescription &&
        !!data.actionItemTeamId &&
        !!data.actionItemAssignedToId
      );
    }
    return true;
  },
  {
    message: "Action item description, team, and assignee are required when creating an action item",
    path: ["actionItemDescription"],
  }
);

export type DecisionFormValues = z.infer<typeof decisionFormSchema>;

interface MashwaraDecisionModalProps {
  open: boolean;
  onClose: () => void;
  meetingId: string;
  cityId?: string;
  onSuccess?: () => void;
}

export function MashwaraDecisionModal({
  open,
  onClose,
  meetingId,
  cityId,
  onSuccess,
}: MashwaraDecisionModalProps) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<DecisionFormValues>({
    decision: "",
    category: "",
    targetTeamId: "",
    assignedToId: "",
    hasActionItem: false,
    actionItemDescription: "",
    actionItemTeamId: "",
    actionItemAssignedToId: "",
    actionItemDueDate: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch collaboration teams for the city
  const { data: teamsData } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ["collaboration-teams", cityId],
    queryFn: () =>
      fetch(`/api/admin/collaboration-teams${cityId ? `?cityId=${cityId}` : ""}`).then(
        (r) => r.json()
      ),
    enabled: open,
  });

  // Fetch staff members for the city
  const { data: staffData } = useQuery<{
    data: { id: string; name: string; staffMeta?: { id: string; role: string } }[];
  }>({
    queryKey: ["people-list", cityId],
    queryFn: () =>
      fetch(`/api/admin/people${cityId ? `?cityId=${cityId}` : ""}`).then((r) =>
        r.json()
      ),
    enabled: open,
  });

  const teams = teamsData?.data || [];
  const staffList = (staffData?.data || []).filter((u) => u.staffMeta?.id);

  const createDecisionMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch(`/api/admin/mashwara/${meetingId}/decisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to record decision" }));
        throw new Error(err.error || "Failed to record decision");
      }
      return res.json();
    },
    onSuccess: (data) => {
      const hasActionItem = !!data?.actionItem;
      toast.success(hasActionItem ? "Decision and action item recorded" : "Decision recorded");
      queryClient.invalidateQueries({ queryKey: ["mashwara-detail", meetingId] });
      onClose();
      resetForm();
      if (onSuccess) onSuccess();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const resetForm = () => {
    setForm({
      decision: "",
      category: "",
      targetTeamId: "",
      assignedToId: "",
      hasActionItem: false,
      actionItemDescription: "",
      actionItemTeamId: "",
      actionItemAssignedToId: "",
      actionItemDueDate: "",
    });
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = decisionFormSchema.safeParse(form);
    if (!parsed.success) {
      const errMap: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errMap[issue.path[0] as string] = issue.message;
      }
      setErrors(errMap);
      return;
    }

    const payload: Record<string, unknown> = {
      decision: parsed.data.decision,
    };
    if (parsed.data.category) payload.category = parsed.data.category;
    if (parsed.data.targetTeamId) payload.targetTeamId = parsed.data.targetTeamId;
    if (parsed.data.assignedToId) payload.assignedToId = parsed.data.assignedToId;

    if (parsed.data.hasActionItem && parsed.data.actionItemDescription) {
      payload.actionItem = {
        description: parsed.data.actionItemDescription,
        teamId: parsed.data.actionItemTeamId,
        assignedToId: parsed.data.actionItemAssignedToId,
        dueDate: parsed.data.actionItemDueDate || undefined,
      };
    }

    createDecisionMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Decision & Action Item</DialogTitle>
          <DialogDescription>
            Document a decision made during Mashwara and optionally assign an action item.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="decision-text">Decision Text *</Label>
            <Textarea
              id="decision-text"
              placeholder="State the decision clearly..."
              maxLength={1000}
              value={form.decision}
              onChange={(e) => setForm({ ...form, decision: e.target.value })}
              rows={3}
            />
            <div className="flex justify-between items-center">
              {errors.decision && <p className="text-xs text-red-500">{errors.decision}</p>}
              {!errors.decision && <span />}
              <span className="text-xs text-muted-foreground">{form.decision.length}/1000</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                placeholder="e.g. Policy, Activity, Logistics"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Target Team</Label>
              <Select
                value={form.targetTeamId || "none"}
                onValueChange={(v) =>
                  setForm({ ...form, targetTeamId: v === "none" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assigned Staff</Label>
            <Select
              value={form.assignedToId || "none"}
              onValueChange={(v) =>
                setForm({ ...form, assignedToId: v === "none" ? "" : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {staffList.map((s) => (
                  <SelectItem key={s.staffMeta!.id} value={s.staffMeta!.id}>
                    {s.name} ({s.staffMeta!.role.replace(/_/g, " ")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Item section */}
          <div className="pt-2 border-t space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasActionItem"
                checked={form.hasActionItem}
                onCheckedChange={(checked) =>
                  setForm({ ...form, hasActionItem: !!checked })
                }
              />
              <Label htmlFor="hasActionItem" className="font-semibold cursor-pointer">
                Create Action Item for this Decision
              </Label>
            </div>

            {form.hasActionItem && (
              <div className="space-y-3 pl-6 border-l-2 border-primary/30">
                <div className="space-y-2">
                  <Label htmlFor="action-desc">Action Item Description *</Label>
                  <Input
                    id="action-desc"
                    placeholder="Specific deliverable or task..."
                    maxLength={500}
                    value={form.actionItemDescription}
                    onChange={(e) =>
                      setForm({ ...form, actionItemDescription: e.target.value })
                    }
                  />
                  <div className="flex justify-between items-center">
                    {errors.actionItemDescription && (
                      <p className="text-xs text-red-500">{errors.actionItemDescription}</p>
                    )}
                    {!errors.actionItemDescription && <span />}
                    <span className="text-xs text-muted-foreground">{(form.actionItemDescription || '').length}/500</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Action Team *</Label>
                    <Select
                      value={form.actionItemTeamId || ""}
                      onValueChange={(v) =>
                        setForm({ ...form, actionItemTeamId: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Assignee *</Label>
                    <Select
                      value={form.actionItemAssignedToId || ""}
                      onValueChange={(v) =>
                        setForm({ ...form, actionItemAssignedToId: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        {staffList.map((s) => (
                          <SelectItem key={s.staffMeta!.id} value={s.staffMeta!.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due-date">Due Date</Label>
                  <Input
                    id="due-date"
                    type="date"
                    value={form.actionItemDueDate}
                    onChange={(e) =>
                      setForm({ ...form, actionItemDueDate: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createDecisionMutation.isPending}>
              {createDecisionMutation.isPending ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" /> Saving…
                </>
              ) : (
                "Record Decision"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
