"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Phone } from "lucide-react";

const OUTCOMES = [
  { value: "reached", label: "Reached" },
  { value: "no_answer", label: "No Answer" },
  { value: "busy", label: "Busy" },
  { value: "wrong_number", label: "Wrong Number" },
  { value: "callback_requested", label: "Callback Requested" },
];

export function CallInteractionModal({
  open,
  onClose,
  assignmentId,
  campaignId,
}: {
  open: boolean;
  onClose: () => void;
  assignmentId: string;
  campaignId: string;
}) {
  const queryClient = useQueryClient();
  const [outcome, setOutcome] = useState("reached");
  const [notes, setNotes] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/calling/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, outcome, notes: notes || undefined, scheduledFor: scheduledFor || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to log interaction" }));
        throw new Error(err.error || "Failed to log interaction");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Call logged successfully");
      queryClient.invalidateQueries({ queryKey: ["campaign-leads", campaignId] });
      onClose();
      setOutcome("reached");
      setNotes("");
      setScheduledFor("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="size-4" /> Log Call Interaction
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Outcome *</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OUTCOMES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Call notes..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Follow-up (optional)</Label>
            <Input type="date" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
