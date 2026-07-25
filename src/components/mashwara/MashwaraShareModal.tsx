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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Share2 } from "lucide-react";

export const shareFormSchema = z.object({
  staffMetaId: z.string().min(1, "Please select a staff member to share with"),
});

export type ShareFormValues = z.infer<typeof shareFormSchema>;

interface MashwaraShareModalProps {
  open: boolean;
  onClose: () => void;
  meetingId: string;
  cityId?: string;
  onSuccess?: () => void;
}

export function MashwaraShareModal({
  open,
  onClose,
  meetingId,
  cityId,
  onSuccess,
}: MashwaraShareModalProps) {
  const queryClient = useQueryClient();
  const [staffMetaId, setStaffMetaId] = useState("");
  const [error, setError] = useState("");

  // Fetch active staff in the same city
  const { data: staffData, isLoading } = useQuery<{
    data: { id: string; name: string; staffMeta?: { id: string; role: string } }[];
  }>({
    queryKey: ["people-list", cityId],
    queryFn: () =>
      fetch(`/api/admin/people${cityId ? `?cityId=${cityId}` : ""}`).then((r) =>
        r.json()
      ),
    enabled: open,
  });

  const staffList = (staffData?.data || []).filter((u) => u.staffMeta?.id);

  const grantShareMutation = useMutation({
    mutationFn: async (payload: { staffMetaId: string }) => {
      const res = await fetch(`/api/admin/mashwara/${meetingId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to grant share" }));
        throw new Error(err.error || "Failed to grant share");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Meeting share granted");
      queryClient.invalidateQueries({ queryKey: ["mashwara-detail", meetingId] });
      onClose();
      setStaffMetaId("");
      setError("");
      if (onSuccess) onSuccess();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const parsed = shareFormSchema.safeParse({ staffMetaId });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Invalid selection");
      return;
    }

    grantShareMutation.mutate({ staffMetaId });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-5 text-primary" /> Share Mashwara Access
          </DialogTitle>
          <DialogDescription>
            Grant a restricted, audited meeting-specific view share to an active team member in the same city.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Staff Member *</Label>
            {isLoading ? (
              <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Loading city staff...
              </div>
            ) : (
              <Select value={staffMetaId} onValueChange={setStaffMetaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member in city" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      No staff members available
                    </SelectItem>
                  ) : (
                    staffList.map((s) => (
                      <SelectItem key={s.staffMeta!.id} value={s.staffMeta!.id}>
                        {s.name} ({s.staffMeta!.role.replace(/_/g, " ")})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!staffMetaId || grantShareMutation.isPending}
            >
              {grantShareMutation.isPending ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" /> Granting…
                </>
              ) : (
                "Grant Share"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
