"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { motion } from "framer-motion";
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
  ClipboardList,
  Clock,
  X,
  Search,
  Eye,
  Pencil,
  Archive,
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

type EventsResponse = { events: EventItem[]; total: number; page: number; limit: number };

// ─── Creation Zod Schema ─────────────────────────────────────────────────

const eventSchema = z.object({
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

const EVENT_TYPES = [
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

const STATUS_STYLES: Record<string, string> = {
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
  cityId,
}: {
  open: boolean;
  onClose: () => void;
  cityId?: string;
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
      const params = cityId ? `?cityId=${cityId}` : "";
      const res = await fetch(`/api/admin/events${params}`, {
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
    createMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
          <DialogDescription>Schedule a new programme event.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" />
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
              <Label htmlFor="startDate">Start Date *</Label>
              <Input id="startDate" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              {errors.startDate && <p className="text-xs text-red-500">{errors.startDate}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" value={form.endDate || ""} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity</Label>
            <Input id="capacity" type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value ? Number(e.target.value) : "" })} placeholder="Optional max attendees" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
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
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const isHq = userRole === "super_admin" || userRole === "program_admin";
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (cityFilter) params.set("cityId", cityFilter);
  if (statusFilter) params.set("status", statusFilter);
  params.set("page", String(page));
  params.set("limit", "20");

  const { data, isLoading, error } = useQuery<EventsResponse>({
    queryKey: ["admin-events", cityFilter, statusFilter, page],
    queryFn: () => fetch(`/api/admin/events?${params}`).then((r) => {
      if (!r.ok) throw new Error("Failed to load events");
      return r.json();
    }),
  });

  // City selector for HQ
  const { data: cities } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["cities-list"],
    queryFn: () => fetch("/api/admin/cities").then((r) => r.json()).then((d) => d.data || d),
    enabled: isHq,
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-sm text-muted-foreground">Manage programme events and responsibilities</p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={!isHq && userRole !== "city_head"}>
          <Plus className="size-4 mr-1.5" /> New Event
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {isHq && cities && (
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All cities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cities</SelectItem>
              {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
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

      {/* List */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/30">
          <AlertTriangle className="size-4 text-red-500" />
          <p className="text-sm text-red-700">Failed to load events. Please try again.</p>
        </div>
      )}
      {data?.events?.length === 0 && !isLoading && (
        <div className="py-16 text-center">
          <Calendar className="size-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No events found.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowCreate(true)}>Create your first event</Button>
        </div>
      )}
      {data?.events?.map((event) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow cursor-pointer"
          onClick={() => window.location.href = `/admin/events/${event.id}`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{event.title}</p>
              <Badge variant="outline" className={cn("text-[10px]", STATUS_STYLES[event.status])}>
                {event.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="size-3" />{format(new Date(event.startDate), "MMM d, yyyy")}</span>
              {event.venue && <span className="flex items-center gap-1"><MapPin className="size-3" />{event.venue}</span>}
              <Badge variant="secondary" className="text-[10px]">{event.eventType}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-3">
            <span className="text-xs text-muted-foreground hidden sm:block">{event._count?.teams ?? 0} teams</span>
            <Button variant="ghost" size="icon" className="size-8"><Eye className="size-4" /></Button>
          </div>
        </motion.div>
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}

      {/* Create Dialog */}
      <EventForm open={showCreate} onClose={() => setShowCreate(false)} cityId={cityFilter || undefined} />
    </div>
  );
}

export default EventsPage;
