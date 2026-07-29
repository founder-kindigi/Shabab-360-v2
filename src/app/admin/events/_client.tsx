"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Calendar,
  MapPin,
  Eye,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { z } from "zod";

// ─── Types ───────────────────────────────────────────────────────────────

type EventItem = {
  id: string;
  cityId: string;
  title: string;
  eventType: string;
  status: string;
  venue: string | null;
  startDate: string;
  endDate: string | null;
  capacity: number | null;
  _count?: { teams?: number; responsibilities?: number; plannerItems?: number };
};

type UiContext = { canManage: boolean; isHq: boolean };

// ─── Creation Zod Schema ─────────────────────────────────────────────────

export const eventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  eventType: z.enum(["trip", "ceremony", "campaign", "activity", "sports_day", "camp", "open_day", "closing", "other"]),
  venue: z.string().max(200).optional().or(z.literal("")),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().or(z.literal("")),
  capacity: z.coerce.number().int().positive().optional().or(z.literal("")),
});

type EventFormData = {
  title: string;
  eventType: "trip" | "ceremony" | "campaign" | "activity" | "sports_day" | "camp" | "open_day" | "closing" | "other";
  venue: string;
  startDate: string;
  endDate: string;
  capacity: number | "";
};

export const EVENT_TYPES = [
  { value: "trip", label: "Trip" },
  { value: "ceremony", label: "Ceremony" },
  { value: "campaign", label: "Campaign" },
  { value: "activity", label: "Activity" },
  { value: "sports_day", label: "Sports Day" },
  { value: "camp", label: "Camp" },
  { value: "open_day", label: "Open Day" },
  { value: "closing", label: "Closing" },
  { value: "other", label: "Other" },
];

export const STATUS_STYLES: Record<string, string> = {
  planned: "bg-muted text-muted-foreground",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

// ─── EventForm ───────────────────────────────────────────────────────────

export function EventForm({
  open,
  onClose,
  cityId,   // HQ: explicit selection; scoped: omit so server derives it
  canManage,
}: {
  open: boolean;
  onClose: () => void;
  cityId?: string;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EventFormData>({
    title: "",
    eventType: "activity",
    venue: "",
    startDate: "",
    endDate: "",
    capacity: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to create event" }));
        throw new Error(err.error || "Failed to create event");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Event created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      onClose();
      setForm({ title: "", eventType: "activity", venue: "", startDate: "", endDate: "", capacity: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = eventSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    const payload: Record<string, unknown> = { ...parsed.data };
    if (!payload.venue) delete payload.venue;
    if (!payload.endDate) delete payload.endDate;
    if (payload.capacity === "" || payload.capacity === undefined) {
      delete payload.capacity;
    } else {
      payload.capacity = Number(payload.capacity);
    }
    // HQ must provide cityId in body; scoped actors must NOT — server derives from staff scope
    if (cityId) payload.cityId = cityId;

    createMutation.mutate(payload);
  };

  if (!canManage) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
          <DialogDescription>Schedule a new programme event.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ef-title">Title *</Label>
            <Input id="ef-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" />
            {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={form.eventType} onValueChange={(v) => setForm({ ...form, eventType: v as EventFormData["eventType"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Venue</Label>
              <Input value={form.venue || ""} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Venue" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ef-startDate">Start Date *</Label>
              <Input id="ef-startDate" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              {errors.startDate && <p className="text-xs text-red-500">{errors.startDate}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ef-endDate">End Date</Label>
              <Input id="ef-endDate" type="date" value={form.endDate || ""} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ef-capacity">Capacity</Label>
            <Input
              id="ef-capacity"
              type="number"
              min="1"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value ? Number(e.target.value) : "" })}
              placeholder="Optional max attendees"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button id="ef-submit" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? <><Loader2 className="size-4 mr-2 animate-spin" /> Creating…</> : "Create Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── EventsPage (List) ───────────────────────────────────────────────────

export function EventsPage() {
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("");

  // ── Server-resolved capabilities via narrow endpoint ──────────────────
  const { data: ctx, isError: ctxError, error: ctxErr } = useQuery<UiContext>({
    queryKey: ["events-ui-context"],
    queryFn: () =>
      fetch("/api/admin/events/ui-context").then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((json as { error?: string }).error || "Failed to load access permissions");
        return json as UiContext;
      }),
    staleTime: 60_000,
    retry: false,
  });

  const canManage = ctx?.canManage ?? false;
  const isHq = ctx?.isHq ?? false;

  // ── Context-gated enabled check: must have ctx AND (if HQ, must have cityFilter selected) ──
  const isEnabled = Boolean(ctx) && (!ctx.isHq || Boolean(cityFilter));
  const isHqWaitingForCity = Boolean(ctx) && ctx.isHq && !cityFilter;

  const params = new URLSearchParams();
  if (cityFilter) params.set("cityId", cityFilter);
  if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
  params.set("offset", "0");
  params.set("limit", "50");

  const { data: events, isLoading, error } = useQuery<EventItem[]>({
    queryKey: ["admin-events", cityFilter, statusFilter],
    queryFn: () =>
      fetch(`/api/admin/events?${params}`).then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((json as { error?: string }).error || "Failed to load events");
        return json as EventItem[];
      }),
    enabled: isEnabled,
  });

  // Cities list — only fetched for HQ after context resolves
  const { data: cities } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["cities-list"],
    queryFn: () =>
      fetch("/api/admin/cities").then((r) => r.json()).then((d) => (d.data || d) as { id: string; name: string }[]),
    enabled: isHq,
    staleTime: 120_000,
  });

  // Safe access state on context failure
  if (ctxError) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div id="events-context-error" role="alert" className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="size-5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Access Verification Failed</p>
            <p className="text-xs opacity-90">{(ctxErr as Error)?.message || "Failed to load access permissions"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-sm text-muted-foreground">Manage programme events and responsibilities</p>
        </div>
        {canManage && (
          <Button
            id="events-new-btn"
            onClick={() => setShowCreate(true)}
            disabled={isHqWaitingForCity}
            title={isHqWaitingForCity ? "Select a city first" : undefined}
          >
            <Plus className="size-4 mr-1.5" /> New Event
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {isHq && (
          <Select value={cityFilter} onValueChange={(v) => { setCityFilter(v); }}>
            <SelectTrigger id="events-city-filter" className="w-full sm:w-48">
              <SelectValue placeholder="Select a city…" />
            </SelectTrigger>
            <SelectContent>
              {(cities ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
          <SelectTrigger id="events-status-filter" className="w-full sm:w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* HQ gate — must pick a city first */}
      {isHqWaitingForCity && (
        <div
          id="events-city-required"
          className="py-16 text-center border border-dashed rounded-lg bg-card/50"
        >
          <MapPin className="size-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">Select a city to view events</p>
          <p className="text-xs text-muted-foreground mt-1">HQ users must choose a city scope before loading data.</p>
        </div>
      )}

      {/* Loading skeletons */}
      {isEnabled && isLoading && (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Error state: 400/403/404/409 all surface the server message */}
      {isEnabled && error && (
        <div
          id="events-error"
          role="alert"
          className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/30"
        >
          <AlertTriangle className="size-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{(error as Error).message}</p>
        </div>
      )}

      {/* Empty state */}
      {isEnabled && !isLoading && !error && events?.length === 0 && (
        <div className="py-16 text-center border border-dashed rounded-lg bg-card/50">
          <Calendar className="size-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No events found.</p>
          {canManage && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowCreate(true)}>
              Create your first event
            </Button>
          )}
        </div>
      )}

      {/* Event rows */}
      {isEnabled && events?.map((event) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow cursor-pointer gap-4"
          onClick={() => { window.location.href = `/admin/events/${event.id}`; }}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium truncate">{event.title}</p>
              <Badge variant="outline" className={cn("text-[10px]", STATUS_STYLES[event.status])}>
                {event.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {format(new Date(event.startDate), "MMM d, yyyy")}
              </span>
              {event.venue && (
                <span className="flex items-center gap-1 max-w-[180px] truncate">
                  <MapPin className="size-3 shrink-0" />
                  <span className="truncate">{event.venue}</span>
                </span>
              )}
              <Badge variant="secondary" className="text-[10px]">{event.eventType}</Badge>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            <span className="text-xs text-muted-foreground">{event._count?.teams ?? 0} teams</span>
            <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="View event">
              <Eye className="size-4" />
            </Button>
          </div>
        </motion.div>
      ))}

      {/* Create Dialog */}
      <EventForm
        open={showCreate}
        onClose={() => setShowCreate(false)}
        cityId={cityFilter || undefined}
        canManage={canManage}
      />
    </div>
  );
}

export default EventsPage;
