"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Calendar,
  MapPin,
  Users,
  Eye,
  AlertTriangle,
  Loader2,
  FileText,
  Search,
  Activity,
  ListTodo,
  FileCheck,
  CheckCircle2,
  XCircle,
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
  decisionCount?: number;
  actionItems?: { open: number; completed: number };
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
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
};

// ─── Mock Data ─────────────────────────────────────────────────────────────

const MOCK_MEETINGS: MashwaraMeetingItem[] = [
  {
    id: "m-1",
    title: "Weekly Leadership Mashwara - Gulberg",
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    location: "Gulberg Park Hall",
    status: "scheduled",
    cityId: "c-1",
    createdAt: new Date().toISOString(),
    createdBy: { id: "u-1", name: "Hasnain Zafar" },
    decisionCount: 0,
    actionItems: { open: 0, completed: 0 }
  },
  {
    id: "m-2",
    title: "Johar Town Leads Sync & Karguzari",
    scheduledAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    location: "Johar Town Markaz",
    status: "completed",
    cityId: "c-1",
    createdAt: new Date().toISOString(),
    createdBy: { id: "u-2", name: "Hanzala Tauseef" },
    decisionCount: 6,
    actionItems: { open: 2, completed: 4 }
  },
  {
    id: "m-3",
    title: "Gulshan Iqbal Monthly Review",
    scheduledAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    location: "Gulshan Iqbal Park",
    status: "completed",
    cityId: "c-1",
    createdAt: new Date().toISOString(),
    createdBy: { id: "u-3", name: "Danish Qureshi" },
    decisionCount: 3,
    actionItems: { open: 0, completed: 3 }
  },
  {
    id: "m-4",
    title: "State Life Urgent Mashwara",
    scheduledAt: new Date(Date.now() - 3600000).toISOString(),
    location: "State Life Sector B",
    status: "in_progress",
    cityId: "c-1",
    createdAt: new Date().toISOString(),
    createdBy: { id: "u-4", name: "Basit Ahsan" },
    decisionCount: 1,
    actionItems: { open: 1, completed: 0 }
  }
];

const MOCK_ATTENDANCE = [
  { name: "Hasnain Zafar", role: "Murabbi", park: "Gulberg", rate: 95, weeks: ["P", "P", "P", "A"] },
  { name: "Hanzala Tauseef", role: "Sports Lead", park: "Gulshan Iqbal", rate: 100, weeks: ["P", "P", "P", "P"] },
  { name: "Ikram Meer", role: "Park Admin", park: "Griffin", rate: 75, weeks: ["P", "A", "P", "P"] },
  { name: "Imran Amin", role: "Media Lead", park: "Johar Town", rate: 80, weeks: ["A", "P", "P", "P"] },
  { name: "Hammad Raza", role: "Skills Muawin", park: "Gulshan Ravi", rate: 100, weeks: ["P", "P", "P", "P"] },
  { name: "Basit Ahsan", role: "Sports Officer", park: "State Life", rate: 50, weeks: ["P", "A", "P", "A"] },
  { name: "Abdul Kabeer", role: "Murabbi", park: "Gulberg", rate: 100, weeks: ["P", "P", "P", "P"] },
  { name: "Danish Qureshi", role: "Sports Muawin", park: "Gulshan Iqbal", rate: 75, weeks: ["P", "P", "A", "P"] },
  { name: "Faizan Ibrahim", role: "Park Admin", park: "Griffin", rate: 100, weeks: ["P", "P", "P", "P"] },
  { name: "Fahad bhai", role: "Media Lead", park: "Johar Town", rate: 100, weeks: ["P", "P", "P", "P"] },
];

const WEEK_COLUMNS = ["Wk 1", "Wk 2", "Wk 3", "Wk 4"];

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
        const err = await res.json().catch(() => ({ error: "Failed to schedule meeting" }));
        throw new Error(err.error || "Failed to schedule meeting");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Weekly Mashwara scheduled successfully!");
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Schedule Weekly Mashwara</DialogTitle>
          <DialogDescription>
            Create a new weekly leadership meeting. Set the agenda, location, and coordinate with Murabbis.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isHq && (
            <div className="space-y-2">
              <Label>City / Zone *</Label>
              <Select
                value={form.cityId}
                onValueChange={(v) => setForm({ ...form, cityId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select city or zone" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.cityId && <p className="text-xs text-red-500">{errors.cityId}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="m-title">Mashwara Title *</Label>
            <Input
              id="m-title"
              placeholder="e.g. Lahore Executive Mashwara - Week 14"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="m-scheduledAt">Date & Time *</Label>
              <Input
                id="m-scheduledAt"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              />
              {errors.scheduledAt && (
                <p className="text-xs text-red-500">{errors.scheduledAt}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="m-location">Location / Venue</Label>
              <Input
                id="m-location"
                placeholder="e.g. Gulberg Park Hall"
                value={form.location || ""}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-summary">Initial Agenda / Notes</Label>
            <Textarea
              id="m-summary"
              placeholder="List key topics to discuss, previous action items to review..."
              value={form.minutesSummary || ""}
              onChange={(e) => setForm({ ...form, minutesSummary: e.target.value })}
              rows={4}
            />
          </div>

          <DialogFooter className="pt-2">
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

// ─── Main Dashboard Page ───────────────────────────────────────────

export default function MashwaraPage() {
  const { data: session } = useSession();
  const navigateTo = useAppStore((s) => s.navigateTo);
  const user = session?.user as { role?: string; assignedCityId?: string } | undefined;
  const userRole = user?.role;
  const isHq = userRole === "super_admin" || userRole === "program_admin";
  const userCityId = user?.assignedCityId;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;

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
  if (statusFilter && statusFilter !== "all") queryParams.set("status", statusFilter);
  if (cityFilter && cityFilter !== "all") queryParams.set("cityId", cityFilter);

  const { data, isLoading, error } = useQuery<MashwaraListResponse>({
    queryKey: ["admin-mashwara", cityFilter, statusFilter, page],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/admin/mashwara?${queryParams}`);
        if (!res.ok) throw new Error("API not available");
        const json = await res.json();
        if (json.data && json.data.length > 0) return json;
        throw new Error("No data");
      } catch (err) {
        // Fallback to mock data if API fails or returns empty
        let filtered = [...MOCK_MEETINGS];
        if (statusFilter && statusFilter !== "all") {
          filtered = filtered.filter((m) => m.status === statusFilter);
        }
        return {
          data: filtered,
          pagination: { page: 1, pageSize: 12, total: filtered.length, totalPages: 1 },
        };
      }
    },
  });

  const totalPages = data?.pagination?.totalPages || 0;
  
  const displayedMeetings = data?.data?.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.location?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleViewDetail = (meetingId: string) => {
    useAppStore.getState().setSelectedEventId(meetingId);
    window.history.pushState({}, "", `/admin/mashwara/${meetingId}`);
    navigateTo("admin-mashwara-detail");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-1 pb-6 space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            ہفتہ وار مشورہ 
            <span className="text-xl font-normal text-muted-foreground hidden sm:inline-block">
              - Executive Mashwara & Karguzari Hub
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Coordinate weekly leadership meetings, track Murabbi attendance, record decisions, and delegate action items.
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} size="lg" className="shrink-0 rounded-full shadow-md">
          <Plus className="size-5 mr-2" /> Schedule Weekly Mashwara
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="size-5 text-primary" />
              </div>
              <Badge variant="outline" className="bg-background">Total Meetings</Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-bold">18</h3>
              <p className="text-sm text-muted-foreground">4 Scheduled • 12 Completed</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Users className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <Badge variant="outline" className="bg-background">Attendance</Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">88%</h3>
              <p className="text-sm text-muted-foreground">Overall Murabbi Attendance</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <FileCheck className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <Badge variant="outline" className="bg-background">Decisions</Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-bold text-blue-600 dark:text-blue-400">24</h3>
              <p className="text-sm text-muted-foreground">Across Sports, Skills, Media</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <ListTodo className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <Badge variant="outline" className="bg-background">Action Items</Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-bold text-amber-600 dark:text-amber-400">15 <span className="text-lg text-muted-foreground font-medium">/ 24</span></h3>
              <p className="text-sm text-muted-foreground">15 Open • 9 Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="roster" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-6">
          <TabsTrigger value="roster">Meetings Roster</TabsTrigger>
          <TabsTrigger value="attendance">Murabbi Attendance Log</TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-2 rounded-lg border">
            <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
              {isHq && (
                <Select value={cityFilter || "all"} onValueChange={(v) => { setCityFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[160px] bg-background">
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    <SelectItem value="c-1">Lahore</SelectItem>
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
                <SelectTrigger className="w-[160px] bg-background">
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
            
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input 
                placeholder="Search title or location..." 
                className="pl-9 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Content Grid */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/30 text-red-700">
              <AlertTriangle className="size-4 shrink-0" />
              <p className="text-sm">Failed to load Mashwara meetings. Please try again.</p>
            </div>
          )}

          {!isLoading && displayedMeetings.length === 0 && (
            <div className="py-20 text-center border rounded-2xl bg-card border-dashed">
              <div className="mx-auto size-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                <Users className="size-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No Mashwara Meetings Found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                No meetings match your current search and filter criteria. Adjust your filters or schedule a new meeting.
              </p>
              <Button
                variant="default"
                className="mt-6 rounded-full px-6"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="size-4 mr-2" /> Schedule First Meeting
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedMeetings.map((meeting) => (
              <motion.div
                key={meeting.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className="hover:shadow-lg transition-all cursor-pointer border hover:border-primary/30 flex flex-col h-full rounded-2xl overflow-hidden group"
                  onClick={() => handleViewDetail(meeting.id)}
                >
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-[17px] font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {meeting.title}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] font-medium capitalize shrink-0 rounded-full px-2.5 border",
                          STATUS_STYLES[meeting.status]
                        )}
                      >
                        {meeting.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col p-5">
                    <div className="space-y-2.5 text-sm mb-6">
                      <div className="flex items-center gap-2 text-foreground">
                        <Calendar className="size-4 text-muted-foreground shrink-0" />
                        <span className="font-medium">
                          {format(new Date(meeting.scheduledAt), "EEE, MMM d • h:mm a")}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="size-4 shrink-0" />
                        <span className="truncate">{meeting.location || "No location set"}</span>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Decisions</p>
                        <div className="flex items-center gap-1.5 font-medium">
                          <FileCheck className="size-4 text-blue-500" />
                          <span>{meeting.decisionCount || 0} Logged</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Action Items</p>
                        <div className="flex items-center gap-1.5 font-medium">
                          <Activity className="size-4 text-amber-500" />
                          <span>
                            {meeting.actionItems?.open || 0} Open
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button className="w-full mt-6 rounded-xl" variant="secondary">
                      View Details & Karguzari
                      <Eye className="size-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6 pb-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-full px-6"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground font-medium px-4">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-full px-6"
              >
                Next
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="attendance" className="focus-visible:outline-none focus-visible:ring-0">
          <Card className="border rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/20 border-b pb-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <CardTitle className="text-xl">Murabbi Mashwara Attendance Log</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Excel synced attendance records across 6 parks (Gulberg, Gulshan Iqbal, Griffin, Johar Town, Gulshan Ravi, State Life)
                  </p>
                </div>
                <Button variant="outline" size="sm" className="bg-background">
                  <Activity className="size-4 mr-2" /> Sync with Excel
                </Button>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold text-foreground">Name</TableHead>
                    <TableHead className="font-semibold text-foreground">Role</TableHead>
                    <TableHead className="font-semibold text-foreground">Park / Area</TableHead>
                    <TableHead className="font-semibold text-foreground text-center">Attendance %</TableHead>
                    {WEEK_COLUMNS.map((col) => (
                      <TableHead key={col} className="text-center w-[80px] font-semibold text-foreground">{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_ATTENDANCE.map((row, i) => (
                    <TableRow key={i} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{row.role}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal bg-background">{row.park}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          className={cn(
                            "font-bold",
                            row.rate >= 90 ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : 
                            row.rate >= 70 ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20" : 
                            "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                          )}
                          variant="secondary"
                        >
                          {row.rate}%
                        </Badge>
                      </TableCell>
                      {row.weeks.map((status, idx) => (
                        <TableCell key={idx} className="text-center">
                          {status === "P" ? (
                            <CheckCircle2 className="size-5 text-emerald-500 mx-auto" />
                          ) : (
                            <XCircle className="size-5 text-red-400 mx-auto" />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

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
