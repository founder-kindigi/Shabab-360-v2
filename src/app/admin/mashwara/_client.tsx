"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Calendar,
  MapPin,
  Users,
  Eye,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { z } from "zod";

// ─── Types ───────────────────────────────────────────────────────────────

export type MashwaraMeetingItem = {
  id: string;
  title: string;
  scheduledAt: string;
  location: string | null;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  cityId: string;
  createdAt: string;
  createdBy: { id: string; name: string };
};

export type MashwaraListResponse = {
  data: MashwaraMeetingItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

// ─── Creation Schema ──────────────────────────────────────────────────────

export const createMashwaraSchema = z.object({
  cityId: z.string().min(1, "City is required"),
  title: z.string().trim().min(1, "Title is required").max(200),
  scheduledAt: z.string().min(1, "Scheduled date/time is required"),
  location: z.string().trim().max(200).optional(),
  minutesSummary: z.string().optional(),
});

export type CreateMashwaraValues = z.infer<typeof createMashwaraSchema>;

export const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

// ─── Create Modal ─────────────────────────────────────────────────────────

function CreateMashwaraModal({
  open,
  onClose,
  userCityId,
  isHq,
}: {
  open: boolean;
  onClose: () => void;
  userCityId?: string | null;
  isHq: boolean;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateMashwaraValues>({
    cityId: userCityId || "",
    title: "",
    scheduledAt: "",
    location: "",
    minutesSummary: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch cities list for HQ
  const { data: citiesData } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["cities-list"],
    queryFn: () =>
      fetch("/api/admin/cities")
        .then((r) => r.json())
        .then((d) => d.data || d),
    enabled: isHq && open,
  });

  const cities = citiesData || [];

  const createMutation = useMutation({
    mutationFn: async (payload: CreateMashwaraValues) => {
      const res = await fetch("/api/admin/mashwara", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          scheduledAt: new Date(payload.scheduledAt).toISOString(),
        }),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Failed to schedule meeting" }));
        throw new Error(err.error || "Failed to schedule meeting");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Weekly Mashwara scheduled");
      queryClient.invalidateQueries({ queryKey: ["admin-mashwara"] });
      onClose();
      setForm({
        cityId: userCityId || "",
        title: "",
        scheduledAt: "",
        location: "",
        minutesSummary: "",
      });
      setErrors({});
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const effectiveCityId = isHq ? form.cityId : userCityId || form.cityId;
    const parsed = createMashwaraSchema.safeParse({
      ...form,
      cityId: effectiveCityId,
    });

    if (!parsed.success) {
      const errMap: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errMap[issue.path[0] as string] = issue.message;
      }
      setErrors(errMap);
      return;
    }

    createMutation.mutate(parsed.data);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Weekly Mashwara</DialogTitle>
          <DialogDescription>
            Create a new weekly meeting session for decision-making and
            collaboration.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isHq && (
            <div className="space-y-2">
              <Label>City *</Label>
              <Select
                value={form.cityId}
                onValueChange={(v) => setForm({ ...form, cityId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.cityId && (
                <p className="text-xs text-red-500">{errors.cityId}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="m-title">Title *</Label>
            <Input
              id="m-title"
              placeholder="e.g. Lahore Park Leads Mashwara #12"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="m-scheduledAt">Date & Time *</Label>
              <Input
                id="m-scheduledAt"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) =>
                  setForm({ ...form, scheduledAt: e.target.value })
                }
              />
              {errors.scheduledAt && (
                <p className="text-xs text-red-500">{errors.scheduledAt}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="m-location">Location</Label>
              <Input
                id="m-location"
                placeholder="Hall / Park / Online link"
                value={form.location || ""}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-summary">Initial Agenda / Minutes Summary</Label>
            <Textarea
              id="m-summary"
              placeholder="Key topics to discuss or meeting notes summary..."
              value={form.minutesSummary || ""}
              onChange={(e) =>
                setForm({ ...form, minutesSummary: e.target.value })
              }
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" /> Scheduling…
                </>
              ) : (
                "Schedule Mashwara"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Dashboard Client Page ───────────────────────────────────────────

export default function MashwaraDashboardClient({
  canView,
  canManage,
  isHq,
  actorCityId,
}: {
  canView: boolean;
  canManage: boolean;
  isHq: boolean;
  actorCityId: string | null;
}) {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const userCityId = actorCityId;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Query cities for filter (HQ)
  const { data: citiesData } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["cities-list"],
    queryFn: () =>
      fetch("/api/admin/cities")
        .then((r) => r.json())
        .then((d) => d.data || d),
    enabled: isHq,
  });

  const cities = citiesData || [];

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("pageSize", String(pageSize));
  if (statusFilter && statusFilter !== "all")
    queryParams.set("status", statusFilter);
  if (cityFilter && cityFilter !== "all") queryParams.set("cityId", cityFilter);

  const { data, isLoading, error } = useQuery<MashwaraListResponse>({
    queryKey: ["admin-mashwara", cityFilter, statusFilter, page],
    queryFn: () =>
      fetch(`/api/admin/mashwara?${queryParams}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load Mashwara meetings");
        return r.json();
      }),
  });

  const totalPages = data?.pagination?.totalPages || 0;

  const handleViewDetail = (meetingId: string) => {
    useAppStore.getState().setSelectedEventId(meetingId); // reuse generic ID holder or route
    // Update browser URL without reload if history supported
    window.history.pushState({}, "", `/admin/mashwara/${meetingId}`);
    navigateTo("admin-mashwara-detail");
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Weekly Mashwara</h1>
          <p className="text-sm text-muted-foreground">
            Manage city-scoped recurring meetings, attendance, decisions, action
            items, and shares.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="size-4 mr-1.5" /> Schedule Mashwara
          </Button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        {isHq && (
          <Select
            value={cityFilter || "all"}
            onValueChange={(v) => {
              setCityFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={statusFilter || "all"}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content Grid / List */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/30 text-red-700">
          <AlertTriangle className="size-4 shrink-0" />
          <p className="text-sm">
            Failed to load Mashwara meetings. Please try again.
          </p>
        </div>
      )}

      {data?.data?.length === 0 && !isLoading && (
        <div className="py-16 text-center border rounded-xl bg-card">
          <Users className="size-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold">
            No Mashwara Meetings Found
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            There are no meetings matching your current filter criteria.
          </p>
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setShowCreateModal(true)}
            >
              Schedule First Meeting
            </Button>
          )}
        </div>
      )}

      {data?.data && data.data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.data.map((meeting) => (
            <motion.div
              key={meeting.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card
                className="hover:shadow-md transition-shadow cursor-pointer border flex flex-col h-full"
                onClick={() => handleViewDetail(meeting.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold line-clamp-2">
                      {meeting.title}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] capitalize shrink-0",
                        STATUS_STYLES[meeting.status],
                      )}
                    >
                      {meeting.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between pt-0 space-y-4">
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-primary shrink-0" />
                      <span>
                        {format(
                          new Date(meeting.scheduledAt),
                          "EEEE, MMM d, yyyy 'at' h:mm a",
                        )}
                      </span>
                    </div>

                    {meeting.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-primary shrink-0" />
                        <span className="truncate">{meeting.location}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 pt-1">
                      <FileText className="size-3.5 text-muted-foreground shrink-0" />
                      <span>
                        Created by {meeting.createdBy?.name || "Staff"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Click for details
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-primary"
                    >
                      View <Eye className="size-3.5 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Creation Modal */}
      <CreateMashwaraModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        userCityId={userCityId}
        isHq={isHq}
      />
    </div>
  );
}
