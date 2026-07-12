"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { formatPKT } from "@/lib/timezone";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Phone,
  MapPin,
  LayoutGrid,
  List,
  X,
  FileText,
  Calendar,
  User,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  Users,
  Clock,
  Star,
  UserCheck,
  UserX,
  FolderInput,
  CalendarPlus,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CityOption { id: string; name: string }
interface ParkOption { id: string; name: string; cityId: string }
interface GroupOption { id: string; name: string; batch: { id: string; name: string; park: { id: string; name: string } } }

interface Interview {
  id: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  status: string;
  score1: number | null;
  score2: number | null;
  score3: number | null;
  totalScore: number | null;
  notes: string | null;
  conductedBy: string | null;
  createdAt: string;
}

interface ConvertedParticipant {
  id: string;
  name: string;
  group: { id: string; name: string; batch: { id: string; name: string; park: { id: string; name: string } } };
}

interface Application {
  id: string;
  trackingCode: string;
  applicantName: string;
  applicantDOB: string | null;
  gender: string | null;
  guardianName: string;
  guardianPhone: string;
  guardianRelation: string | null;
  cityId: string | null;
  preferredParkId: string | null;
  status: string;
  notes: string | null;
  convertedParticipantId: string | null;
  createdAt: string;
  updatedAt: string;
  city: { id: string; name: string } | null;
  preferredPark: { id: string; name: string; cityId: string } | null;
  interviews: Interview[];
  convertedParticipant: ConvertedParticipant | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ─── Status Config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string; darkBg: string; darkText: string }> = {
  submitted: {
    label: "Submitted",
    color: "text-slate-700",
    bg: "bg-slate-100",
    border: "border-slate-200",
    dot: "bg-slate-400",
    darkBg: "dark:bg-slate-800",
    darkText: "dark:text-slate-300",
  },
  reviewing: {
    label: "In Review",
    color: "text-[#A0006B]",
    bg: "bg-[#A0006B]/10",
    border: "border-[#A0006B]/20",
    dot: "bg-[#A0006B]",
    darkBg: "dark:bg-[#A0006B]/20",
    darkText: "dark:text-[#D4B8E3]",
  },
  interviewed: {
    label: "Interviewed",
    color: "text-[#6B20A0]",
    bg: "bg-[#6B20A0]/10",
    border: "border-[#6B20A0]/20",
    dot: "bg-[#6B20A0]",
    darkBg: "dark:bg-[#6B20A0]/20",
    darkText: "dark:text-[#C08ADF]",
  },
  accepted: {
    label: "Accepted",
    color: "text-[#4B0A8F]",
    bg: "bg-[#4B0A8F]/10",
    border: "border-[#4B0A8F]/20",
    dot: "bg-[#4B0A8F]",
    darkBg: "dark:bg-[#4B0A8F]/20",
    darkText: "dark:text-[#8A40B0]",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
    darkBg: "dark:bg-red-950/50",
    darkText: "dark:text-red-400",
  },
  enrolled: {
    label: "Enrolled",
    color: "text-[#166534]",
    bg: "bg-[#166534]/10",
    border: "border-[#166534]/20",
    dot: "bg-[#166534]",
    darkBg: "dark:bg-[#166534]/20",
    darkText: "dark:text-[#4ade80]",
  },
};

const KANBAN_STATUSES = ["submitted", "reviewing", "interviewed", "accepted"];

const STATUS_FLOW: Record<string, string[]> = {
  submitted: ["reviewing", "rejected"],
  reviewing: ["interviewed", "submitted", "rejected"],
  interviewed: ["accepted", "reviewing", "rejected"],
  accepted: ["enrolled", "interviewed", "rejected"],
  rejected: ["submitted"],
  enrolled: [],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusBadge(status: string) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.submitted;
  return (
    <Badge variant="outline" className={`text-[11px] font-medium gap-1 ${cfg.bg} ${cfg.color} ${cfg.border} ${cfg.darkBg} ${cfg.darkText} border`}>
      <span className={`size-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </Badge>
  );
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function getAge(dob: string | null): string {
  if (!dob) return "—";
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return `${age}y`;
}

// ─── Animations ──────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function AdmissionsPage() {
  const queryClient = useQueryClient();

  // View
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  // Sheet & Dialogs
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({
    applicantName: "",
    applicantDOB: "",
    gender: "",
    guardianName: "",
    guardianPhone: "",
    guardianRelation: "",
    cityId: "",
    preferredParkId: "",
    notes: "",
  });

  // Interview form
  const [interviewForm, setInterviewForm] = useState({
    scheduledDate: "",
    scheduledTime: "",
    conductedBy: "",
  });

  // Score form
  const [scoreForm, setScoreForm] = useState({
    score1: "",
    score2: "",
    score3: "",
  });

  // Enroll form
  const [enrollForm, setEnrollForm] = useState({
    groupId: "",
    createGuardian: true,
  });

  const handleSearchChange = useCallback((val: string) => { setSearch(val); setPage(1); }, []);
  const handleStatusFilterChange = useCallback((val: string) => { setStatusFilter(val); setPage(1); }, []);
  const handleCityFilterChange = useCallback((val: string) => { setCityFilter(val); setPage(1); }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("");
    setCityFilter("");
    setPage(1);
  }, []);

  // ─── Queries ─────────────────────────────────────────────────────────────

  const { data: applicationsData, isLoading } = useQuery<{ data: Application[]; pagination: Pagination }>({
    queryKey: ["admissions", debouncedSearch, statusFilter, cityFilter, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (cityFilter) params.set("cityId", cityFilter);
      params.set("page", String(page));
      params.set("pageSize", "50");
      return fetch("/api/admin/admissions?" + params.toString()).then((r) => r.json());
    },
  });

  const { data: cities } = useQuery<CityOption[]>({
    queryKey: ["cities-select"],
    queryFn: () => fetch("/api/admin/cities").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: parks } = useQuery<ParkOption[]>({
    queryKey: ["parks-select"],
    queryFn: () => fetch("/api/admin/parks").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: groups } = useQuery<GroupOption[]>({
    queryKey: ["groups-select-all"],
    queryFn: () => fetch("/api/admin/groups?pageSize=200").then((r) => r.json()).then((d: any) => d.data || d),
    staleTime: 5 * 60 * 1000,
  });

  const { data: selectedDetail, isLoading: detailLoading } = useQuery<Application>({
    queryKey: ["admission-detail", selectedApp?.id],
    queryFn: () => fetch(`/api/admin/admissions/${selectedApp!.id}`).then((r) => r.json()),
    enabled: !!selectedApp && sheetOpen,
  });

  // ─── Stats ───────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const all = applicationsData?.data || [];
    return {
      total: all.length > 0 ? applicationsData.pagination.total : 0,
      submitted: applicationsData?.pagination.total ?? 0,
      reviewing: 0,
      accepted: 0,
    };
  }, [applicationsData]);

  // We need actual counts per status. Fetch them from all data.
  const { data: allAppsForCounts } = useQuery<{ data: Application[] }>({
    queryKey: ["admissions-counts"],
    queryFn: () => fetch("/api/admin/admissions?pageSize=1").then((r) => r.json()).then(() => {
      // We'll derive stats from the main data for now
      return { data: [] };
    }),
  });

  // Simpler: use the current loaded data stats
  const statusCounts = useMemo(() => {
    // We make individual count queries via the main query's pagination.total for specific statuses
    // For now, derive from what we have
    const counts: Record<string, number> = { submitted: 0, reviewing: 0, interviewed: 0, accepted: 0, rejected: 0, enrolled: 0 };
    // Use the main data's total (which may be filtered), but also check if all statuses loaded
    return counts;
  }, []);

  // Let's fetch counts for each pipeline status
  const { data: submittedCount } = useQuery<{ pagination: Pagination }>({
    queryKey: ["admissions-count", "submitted"],
    queryFn: () => fetch("/api/admin/admissions?status=submitted&pageSize=1").then((r) => r.json()),
    staleTime: 30 * 1000,
  });
  const { data: reviewingCount } = useQuery<{ pagination: Pagination }>({
    queryKey: ["admissions-count", "reviewing"],
    queryFn: () => fetch("/api/admin/admissions?status=reviewing&pageSize=1").then((r) => r.json()),
    staleTime: 30 * 1000,
  });
  const { data: acceptedCount } = useQuery<{ pagination: Pagination }>({
    queryKey: ["admissions-count", "accepted"],
    queryFn: () => fetch("/api/admin/admissions?status=accepted&pageSize=1").then((r) => r.json()),
    staleTime: 30 * 1000,
  });

  const statCards = [
    { label: "Total Applications", value: applicationsData?.pagination.total ?? 0, icon: FileText, color: "text-[#4B0A8F] dark:text-[#8A40B0]", bg: "bg-[#F3ECF6] dark:bg-[#1F086080]" },
    { label: "Submitted", value: submittedCount?.pagination.total ?? 0, icon: ClipboardCheck, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800" },
    { label: "In Review", value: reviewingCount?.pagination.total ?? 0, icon: Clock, color: "text-[#A0006B] dark:text-[#D4B8E3]", bg: "bg-[#A0006B]/10 dark:bg-[#A0006B]/20" },
    { label: "Accepted", value: acceptedCount?.pagination.total ?? 0, icon: CheckCircle2, color: "text-[#4B0A8F] dark:text-[#8A40B0]", bg: "bg-[#4B0A8F]/10 dark:bg-[#4B0A8F]/20" },
  ];

  // ─── Kanban grouping ─────────────────────────────────────────────────────

  const applications = applicationsData?.data || [];

  const kanbanGroups = useMemo(() => {
    const groups: Record<string, Application[]> = {
      submitted: [],
      reviewing: [],
      interviewed: [],
      accepted: [],
    };
    for (const app of applications) {
      if (groups[app.status]) {
        groups[app.status].push(app);
      }
    }
    return groups;
  }, [applications]);

  // ─── Mutations ───────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: typeof createForm) => fetch("/api/admin/admissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.error) {
        toast.error("Validation error", { description: JSON.stringify(data.error) });
        return;
      }
      toast.success("Application created", { description: `Tracking code: ${data.trackingCode}` });
      setCreateOpen(false);
      setCreateForm({ applicantName: "", applicantDOB: "", gender: "", guardianName: "", guardianPhone: "", guardianRelation: "", cityId: "", preferredParkId: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      queryClient.invalidateQueries({ queryKey: ["admissions-count"] });
    },
    onError: () => toast.error("Failed to create application"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => fetch(`/api/admin/admissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),
    onSuccess: (data, variables) => {
      if (data.error) {
        toast.error("Update failed", { description: JSON.stringify(data.error) });
        return;
      }
      toast.success("Application updated");
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      queryClient.invalidateQueries({ queryKey: ["admissions-count"] });
      queryClient.invalidateQueries({ queryKey: ["admission-detail", variables.id] });
      if (selectedApp?.id === variables.id) {
        setSelectedApp(data);
      }
    },
    onError: () => toast.error("Failed to update application"),
  });

  const enrollMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => fetch(`/api/admin/admissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),
    onSuccess: (data, variables) => {
      if (data.error) {
        toast.error("Enrollment failed", { description: JSON.stringify(data.error) });
        return;
      }
      toast.success("Student enrolled successfully");
      setEnrollOpen(false);
      setEnrollForm({ groupId: "", createGuardian: true });
      setSheetOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      queryClient.invalidateQueries({ queryKey: ["admissions-count"] });
    },
    onError: () => toast.error("Failed to enroll student"),
  });

  const interviewMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => fetch(`/api/admin/admissions/${id}/interviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),
    onSuccess: (data, variables) => {
      if (data.error) {
        toast.error("Interview action failed", { description: JSON.stringify(data.error) });
        return;
      }
      toast.success(variables.data.score1 !== undefined ? "Interview scores saved" : "Interview scheduled");
      setInterviewOpen(false);
      setInterviewForm({ scheduledDate: "", scheduledTime: "", conductedBy: "" });
      setScoreForm({ score1: "", score2: "", score3: "" });
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      queryClient.invalidateQueries({ queryKey: ["admissions-count"] });
      queryClient.invalidateQueries({ queryKey: ["admission-detail", variables.id] });
    },
    onError: () => toast.error("Interview action failed"),
  });

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleMoveStatus = useCallback((app: Application, newStatus: string) => {
    updateMutation.mutate({ id: app.id, data: { status: newStatus } });
  }, [updateMutation]);

  const handleOpenDetail = useCallback((app: Application) => {
    setSelectedApp(app);
    setSheetOpen(true);
  }, []);

  const handleOpenEnroll = useCallback(() => {
    setEnrollOpen(true);
  }, []);

  const handleEnroll = useCallback(() => {
    if (!selectedApp) return;
    if (!enrollForm.groupId) {
      toast.error("Please select a group");
      return;
    }
    enrollMutation.mutate({
      id: selectedApp.id,
      data: { status: "enrolled", groupId: enrollForm.groupId, createGuardian: enrollForm.createGuardian },
    });
  }, [selectedApp, enrollForm, enrollMutation]);

  const handleScheduleInterview = useCallback(() => {
    if (!selectedApp) return;
    interviewMutation.mutate({
      id: selectedApp.id,
      data: {
        scheduledDate: interviewForm.scheduledDate || undefined,
        scheduledTime: interviewForm.scheduledTime || undefined,
        conductedBy: interviewForm.conductedBy || undefined,
      },
    });
  }, [selectedApp, interviewForm, interviewMutation]);

  const handleSubmitScores = useCallback(() => {
    if (!selectedApp) return;
    interviewMutation.mutate({
      id: selectedApp.id,
      data: {
        score1: scoreForm.score1 ? Number(scoreForm.score1) : undefined,
        score2: scoreForm.score2 ? Number(scoreForm.score2) : undefined,
        score3: scoreForm.score3 ? Number(scoreForm.score3) : undefined,
      },
    });
  }, [selectedApp, scoreForm, interviewMutation]);

  const handleCreate = useCallback(() => {
    createMutation.mutate(createForm);
  }, [createForm, createMutation]);

  // Parks filtered by city
  const createFormParks = useMemo(() => {
    if (!createForm.cityId || !parks) return [];
    return parks.filter((p) => p.cityId === createForm.cityId);
  }, [createForm.cityId, parks]);

  const detail = selectedDetail || selectedApp;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <PageHeader
        title="Admissions"
        description="Manage student admission applications and approval pipeline"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="bg-[#4B0A8F] hover:bg-[#4B0A8F]/90 text-white">
            <Plus className="size-4 mr-2" />
            New Application
          </Button>
        }
      />

      {/* Stats Bar */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {statCards.map((s) => (
          <motion.div key={s.label} variants={itemVariants}>
            <Card className="border-border/50 shadow-none">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`size-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`size-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tracking-tight">{isLoading ? <Skeleton className="h-7 w-8" /> : s.value}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Filter Bar */}
      <Card className="border-border/50 shadow-none">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or tracking code..."
                className="pl-9 h-9"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <Select value={cityFilter} onValueChange={handleCityFilterChange}>
              <SelectTrigger className="h-9 w-full sm:w-[160px]">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="h-9 w-full sm:w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(search || statusFilter || cityFilter) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-muted-foreground">
                <X className="size-3.5 mr-1" />
                Clear
              </Button>
            )}
            <div className="hidden sm:flex items-center border-l border-border pl-2 ml-1">
              <Button
                variant={viewMode === "kanban" ? "secondary" : "ghost"}
                size="icon"
                className="size-8"
                onClick={() => setViewMode("kanban")}
              >
                <LayoutGrid className="size-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="size-8"
                onClick={() => setViewMode("list")}
              >
                <List className="size-4" />
              </Button>
            </div>
          </div>
          {/* Mobile view toggle */}
          <div className="flex sm:hidden items-center gap-1 mt-2">
            <span className="text-xs text-muted-foreground mr-1">View:</span>
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="size-3.5 mr-1" />
              Pipeline
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setViewMode("list")}
            >
              <List className="size-3.5 mr-1" />
              List
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {KANBAN_STATUSES.map((s) => (
            <div key={s} className="space-y-3">
              <Skeleton className="h-8 w-32" />
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ))}
        </div>
      ) : applications.length === 0 && !statusFilter && !debouncedSearch && !cityFilter ? (
        <EmptyState
          icon={GraduationCap}
          title="No applications yet"
          description="Create a new admission application to get started with the admission pipeline."
        />
      ) : viewMode === "kanban" ? (
        <KanbanView
          groups={kanbanGroups}
          onView={handleOpenDetail}
          onMoveStatus={handleMoveStatus}
        />
      ) : (
        <ListView
          applications={applications}
          onView={handleOpenDetail}
          onMoveStatus={handleMoveStatus}
          pagination={applicationsData?.pagination}
          onPageChange={setPage}
        />
      )}

      {/* ─── Create Application Dialog ─── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086080] flex items-center justify-center">
                <Plus className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>
              New Application
            </DialogTitle>
            <DialogDescription>Fill in the applicant and guardian details to create a new admission application.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Applicant Name *</Label>
                <Input
                  placeholder="Full name"
                  value={createForm.applicantName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, applicantName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Date of Birth</Label>
                <Input
                  type="date"
                  value={createForm.applicantDOB}
                  onChange={(e) => setCreateForm((f) => ({ ...f, applicantDOB: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Gender</Label>
                <Select value={createForm.gender} onValueChange={(v) => setCreateForm((f) => ({ ...f, gender: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Guardian Relation</Label>
                <Input
                  placeholder="e.g. Father, Mother"
                  value={createForm.guardianRelation}
                  onChange={(e) => setCreateForm((f) => ({ ...f, guardianRelation: e.target.value }))}
                />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Guardian Name *</Label>
                <Input
                  placeholder="Full name"
                  value={createForm.guardianName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, guardianName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Guardian Phone *</Label>
                <Input
                  placeholder="Phone number"
                  value={createForm.guardianPhone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, guardianPhone: e.target.value }))}
                />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">City</Label>
                <Select value={createForm.cityId} onValueChange={(v) => setCreateForm((f) => ({ ...f, cityId: v, preferredParkId: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>
                    {cities?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Preferred Park</Label>
                <Select value={createForm.preferredParkId} onValueChange={(v) => setCreateForm((f) => ({ ...f, preferredParkId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select park" /></SelectTrigger>
                  <SelectContent>
                    {createFormParks.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Notes</Label>
              <Textarea
                placeholder="Any additional notes..."
                rows={3}
                value={createForm.notes}
                onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !createForm.applicantName || !createForm.guardianName || !createForm.guardianPhone}
              className="bg-[#4B0A8F] hover:bg-[#4B0A8F]/90 text-white"
            >
              {createMutation.isPending ? "Creating..." : "Create Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Detail Sheet ─── */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) setSelectedApp(null); }}>
        <SheetContent className="w-full sm:max-w-lg p-0 overflow-y-auto">
          {detailLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : detail ? (
            <div className="space-y-0">
              {/* Sheet Header */}
              <div className="p-6 pb-4 border-b border-border/50">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-3 text-left">
                    <div className="size-10 rounded-xl bg-[#F3ECF6] dark:bg-[#1F086080] flex items-center justify-center text-sm font-bold text-[#4B0A8F] dark:text-[#8A40B0] shrink-0">
                      {getInitials(detail.applicantName)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{detail.applicantName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{detail.trackingCode}</p>
                    </div>
                  </SheetTitle>
                  <SheetDescription className="text-left">
                    Submitted on {formatPKT(new Date(detail.createdAt))}
                  </SheetDescription>
                </SheetHeader>
                <div className="flex items-center gap-2 mt-3">
                  {getStatusBadge(detail.status)}
                  {detail.convertedParticipant && (
                    <Badge variant="outline" className="text-[11px] text-[#166534] border-[#166534]/20 bg-[#166534]/10">
                      <CheckCircle2 className="size-3 mr-1" />
                      Enrolled
                    </Badge>
                  )}
                </div>
              </div>

              <ScrollArea className="h-[calc(100vh-220px)]">
                <div className="p-6 space-y-6">
                  {/* Status Timeline */}
                  <StatusTimeline
                    currentStatus={detail.status}
                    createdAt={detail.createdAt}
                    updatedAt={detail.updatedAt}
                  />

                  {/* Applicant Info */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <User className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
                      Applicant Information
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="font-medium">{detail.applicantName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Age</p>
                        <p className="font-medium">{getAge(detail.applicantDOB)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Gender</p>
                        <p className="font-medium capitalize">{detail.gender || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Date of Birth</p>
                        <p className="font-medium">{detail.applicantDOB ? formatPKT(new Date(detail.applicantDOB)) : "—"}</p>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-border/50" />

                  {/* Guardian Info */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Users className="size-4 text-[#A0006B] dark:text-[#D4B8E3]" />
                      Guardian Information
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="font-medium">{detail.guardianName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium">{detail.guardianPhone}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Relation</p>
                        <p className="font-medium">{detail.guardianRelation || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-border/50" />

                  {/* Location Info */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <MapPin className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
                      Preferred Location
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">City</p>
                        <p className="font-medium">{detail.city?.name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Park</p>
                        <p className="font-medium">{detail.preferredPark?.name || "—"}</p>
                      </div>
                    </div>
                  </div>

                  {detail.notes && (
                    <>
                      <Separator className="bg-border/50" />
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Notes</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{detail.notes}</p>
                      </div>
                    </>
                  )}

                  {/* Interviews */}
                  <Separator className="bg-border/50" />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Calendar className="size-4 text-[#6B20A0] dark:text-[#C08ADF]" />
                        Interviews ({(detail.interviews || []).length})
                      </h4>
                      {detail.status !== "enrolled" && detail.status !== "rejected" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setInterviewOpen(true)}>
                          <CalendarPlus className="size-3.5 mr-1" />
                          Schedule
                        </Button>
                      )}
                    </div>
                    {(!detail.interviews || detail.interviews.length === 0) ? (
                      <p className="text-sm text-muted-foreground py-3 text-center">No interviews scheduled</p>
                    ) : (
                      <div className="space-y-2">
                        {detail.interviews.map((intv) => (
                          <Card key={intv.id} className="border-border/50 shadow-none">
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={`text-[10px] ${intv.status === "completed" ? "bg-[#4B0A8F]/10 text-[#4B0A8F] border-[#4B0A8F]/20 dark:text-[#8A40B0]" : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400"}`}>
                                    {intv.status === "completed" ? "Completed" : "Scheduled"}
                                  </Badge>
                                  {intv.conductedBy && (
                                    <span className="text-xs text-muted-foreground">by {intv.conductedBy}</span>
                                  )}
                                </div>
                                {intv.totalScore !== null && (
                                  <Badge className="bg-[#F3ECF6] text-[#4B0A8F] border-[#D4B8E3] dark:bg-[#1F086080] dark:text-[#8A40B0] text-xs">
                                    <Star className="size-3 mr-1" />
                                    {intv.totalScore}/300
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                {intv.scheduledDate && <span>{formatPKT(new Date(intv.scheduledDate))}</span>}
                                {intv.scheduledTime && <span>at {intv.scheduledTime}</span>}
                              </div>
                              {intv.score1 !== null && (
                                <div className="flex gap-3 text-xs">
                                  <span className="text-muted-foreground">Scores:</span>
                                  <span>{intv.score1} / {intv.score2} / {intv.score3}</span>
                                </div>
                              )}
                              {intv.notes && (
                                <p className="text-xs text-muted-foreground">{intv.notes}</p>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Score Input for latest scheduled interview */}
                    {detail.interviews?.some((i) => i.status === "scheduled") && (
                      <Card className="border-[#6B20A0]/20 dark:border-[#6B20A0]/30 shadow-none">
                        <CardContent className="p-3 space-y-3">
                          <p className="text-xs font-medium text-[#6B20A0] dark:text-[#C08ADF]">Record Interview Scores</p>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Score 1</Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="0-100"
                                className="h-8 text-sm"
                                value={scoreForm.score1}
                                onChange={(e) => setScoreForm((f) => ({ ...f, score1: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Score 2</Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="0-100"
                                className="h-8 text-sm"
                                value={scoreForm.score2}
                                onChange={(e) => setScoreForm((f) => ({ ...f, score2: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Score 3</Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="0-100"
                                className="h-8 text-sm"
                                value={scoreForm.score3}
                                onChange={(e) => setScoreForm((f) => ({ ...f, score3: e.target.value }))}
                              />
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-[#6B20A0] hover:bg-[#6B20A0]/90 text-white"
                            onClick={handleSubmitScores}
                            disabled={interviewMutation.isPending}
                          >
                            Submit Scores
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Converted Participant */}
                  {detail.convertedParticipant && (
                    <>
                      <Separator className="bg-border/50" />
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <UserCheck className="size-4 text-[#166534]" />
                          Enrolled Participant
                        </h4>
                        <Card className="border-[#166534]/20 shadow-none">
                          <CardContent className="p-3 text-sm space-y-1">
                            <p className="font-medium">{detail.convertedParticipant.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {detail.convertedParticipant.group.name} · {detail.convertedParticipant.group.batch.name} · {detail.convertedParticipant.group.batch.park.name}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}

                  {/* Action Buttons */}
                  <Separator className="bg-border/50" />
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_FLOW[detail.status]?.map((nextStatus) => {
                        const cfg = STATUS_CONFIG[nextStatus];
                        const isReject = nextStatus === "rejected";
                        const isEnroll = nextStatus === "enrolled";

                        if (isEnroll) {
                          return (
                            <Button
                              key={nextStatus}
                              size="sm"
                              className="h-8 text-xs bg-[#166534] hover:bg-[#166534]/90 text-white"
                              onClick={handleOpenEnroll}
                              disabled={!!detail.convertedParticipantId}
                            >
                              <FolderInput className="size-3.5 mr-1" />
                              Enroll Student
                            </Button>
                          );
                        }

                        return (
                          <Button
                            key={nextStatus}
                            size="sm"
                            variant={isReject ? "destructive" : "outline"}
                            className={`h-8 text-xs ${!isReject ? `${cfg.bg} ${cfg.color} ${cfg.border} border hover:${cfg.bg} hover:${cfg.darkBg}` : ""}`}
                            onClick={() => handleMoveStatus(detail, nextStatus)}
                          >
                            {isReject ? <UserX className="size-3.5 mr-1" /> : <ArrowRightLeft className="size-3.5 mr-1" />}
                            Move to {cfg.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* ─── Schedule Interview Dialog ─── */}
      <Dialog open={interviewOpen} onOpenChange={setInterviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="size-5 text-[#6B20A0] dark:text-[#C08ADF]" />
              Schedule Interview
            </DialogTitle>
            <DialogDescription>Set the date, time, and interviewer for this application.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Interview Date</Label>
              <Input
                type="date"
                value={interviewForm.scheduledDate}
                onChange={(e) => setInterviewForm((f) => ({ ...f, scheduledDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Interview Time</Label>
              <Input
                type="time"
                value={interviewForm.scheduledTime}
                onChange={(e) => setInterviewForm((f) => ({ ...f, scheduledTime: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Conducted By</Label>
              <Input
                placeholder="Interviewer name"
                value={interviewForm.conductedBy}
                onChange={(e) => setInterviewForm((f) => ({ ...f, conductedBy: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInterviewOpen(false)}>Cancel</Button>
            <Button
              onClick={handleScheduleInterview}
              disabled={interviewMutation.isPending}
              className="bg-[#6B20A0] hover:bg-[#6B20A0]/90 text-white"
            >
              {interviewMutation.isPending ? "Scheduling..." : "Schedule Interview"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Enrollment Dialog ─── */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-[#166534]/10 flex items-center justify-center">
                <FolderInput className="size-4 text-[#166534]" />
              </div>
              Enroll Student
            </DialogTitle>
            <DialogDescription>
              Select a group to enroll <span className="font-semibold">{selectedApp?.applicantName}</span> into the program.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Group / Batch *</Label>
              <Select value={enrollForm.groupId} onValueChange={(v) => setEnrollForm((f) => ({ ...f, groupId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                <SelectContent>
                  {(groups || []).map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} — {g.batch.name} / {g.batch.park.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="create-guardian"
                checked={enrollForm.createGuardian}
                onCheckedChange={(checked) => setEnrollForm((f) => ({ ...f, createGuardian: !!checked }))}
              />
              <Label htmlFor="create-guardian" className="text-sm">
                Also create a guardian record for {selectedApp?.guardianName}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollOpen(false)}>Cancel</Button>
            <Button
              onClick={handleEnroll}
              disabled={enrollMutation.isPending || !enrollForm.groupId}
              className="bg-[#166534] hover:bg-[#166534]/90 text-white"
            >
              {enrollMutation.isPending ? "Enrolling..." : "Enroll Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Kanban View ─────────────────────────────────────────────────────────────

function KanbanView({
  groups,
  onView,
  onMoveStatus,
}: {
  groups: Record<string, Application[]>;
  onView: (app: Application) => void;
  onMoveStatus: (app: Application, status: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {KANBAN_STATUSES.map((status) => {
        const cfg = STATUS_CONFIG[status];
        const apps = groups[status] || [];
        return (
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-3"
          >
            {/* Column header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${cfg.dot}`} />
                <h3 className="text-sm font-semibold">{cfg.label}</h3>
              </div>
              <Badge variant="secondary" className="text-[10px] h-5 min-w-[20px] flex items-center justify-center rounded-full">
                {apps.length}
              </Badge>
            </div>

            {/* Cards */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {apps.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground">No applications</div>
              )}
              <AnimatePresence>
                {apps.map((app) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className={`border ${cfg.border} shadow-none hover:shadow-sm transition-shadow cursor-pointer ${cfg.darkBg}`}>
                      <CardContent className="p-3 space-y-2.5">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <button
                            className="text-left min-w-0 flex-1"
                            onClick={() => onView(app)}
                          >
                            <p className="text-xs font-mono text-muted-foreground">{app.trackingCode}</p>
                            <p className="text-sm font-semibold truncate">{app.applicantName}</p>
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7 shrink-0">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onView(app)}>
                                <Eye className="size-3.5 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {STATUS_FLOW[app.status]?.map((ns) => (
                                <DropdownMenuItem
                                  key={ns}
                                  onClick={() => onMoveStatus(app, ns)}
                                  className={ns === "rejected" ? "text-red-600 focus:text-red-600" : ""}
                                >
                                  {ns === "rejected" ? <UserX className="size-3.5 mr-2" /> : <ArrowRightLeft className="size-3.5 mr-2" />}
                                  Move to {STATUS_CONFIG[ns].label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Info */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Users className="size-3 shrink-0" />
                          <span className="truncate">{app.guardianName}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="size-3 shrink-0" />
                          <span>{app.guardianPhone}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="size-3 shrink-0" />
                          <span className="truncate">{app.city?.name || "No city"}{app.preferredPark ? ` · ${app.preferredPark.name}` : ""}</span>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-muted-foreground">{formatPKT(new Date(app.createdAt), "dd MMM")}</span>
                          {app.interviews.length > 0 && (
                            <Badge variant="outline" className="text-[10px] h-5 bg-[#6B20A0]/10 text-[#6B20A0] border-[#6B20A0]/20 dark:text-[#C08ADF]">
                              <Star className="size-2.5 mr-0.5" />
                              {app.interviews[0].totalScore ?? "Pending"}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── List View ───────────────────────────────────────────────────────────────

function ListView({
  applications,
  onView,
  onMoveStatus,
  pagination,
  onPageChange,
}: {
  applications: Application[];
  onView: (app: Application) => void;
  onMoveStatus: (app: Application, status: string) => void;
  pagination?: Pagination;
  onPageChange: (page: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Card className="border-border/50 shadow-none overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Tracking Code</TableHead>
                <TableHead className="text-xs">Applicant</TableHead>
                <TableHead className="text-xs">Guardian</TableHead>
                <TableHead className="text-xs">Location</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Interview</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">
                    No applications found
                  </TableCell>
                </TableRow>
              )}
              {applications.map((app) => (
                <TableRow
                  key={app.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => onView(app)}
                >
                  <TableCell className="text-xs font-mono">{app.trackingCode}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{app.applicantName}</p>
                      <p className="text-xs text-muted-foreground">{app.gender ? app.gender.charAt(0).toUpperCase() + app.gender.slice(1) : ""} {getAge(app.applicantDOB)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{app.guardianName}</p>
                      <p className="text-xs text-muted-foreground">{app.guardianPhone}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{app.city?.name || "—"}</TableCell>
                  <TableCell>{getStatusBadge(app.status)}</TableCell>
                  <TableCell>
                    {app.interviews.length > 0 ? (
                      <Badge variant="outline" className="text-[10px] bg-[#6B20A0]/10 text-[#6B20A0] border-[#6B20A0]/20 dark:text-[#C08ADF]">
                        {app.interviews[0].totalScore ? `${app.interviews[0].totalScore}/300` : "Pending"}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatPKT(new Date(app.createdAt), "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="size-7">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(app); }}>
                          <Eye className="size-3.5 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {STATUS_FLOW[app.status]?.map((ns) => (
                          <DropdownMenuItem
                            key={ns}
                            onClick={(e) => { e.stopPropagation(); onMoveStatus(app, ns); }}
                            className={ns === "rejected" ? "text-red-600 focus:text-red-600" : ""}
                          >
                            {ns === "rejected" ? <UserX className="size-3.5 mr-2" /> : <ArrowRightLeft className="size-3.5 mr-2" />}
                            Move to {STATUS_CONFIG[ns].label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {applications.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">No applications found</div>
        )}
        <AnimatePresence>
          {applications.map((app) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Card className="border-border/50 shadow-none" onClick={() => onView(app)}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono text-muted-foreground">{app.trackingCode}</p>
                      <p className="text-sm font-semibold truncate">{app.applicantName}</p>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="size-3" />
                    <span>{app.guardianName}</span>
                    <span>·</span>
                    <Phone className="size-3" />
                    <span>{app.guardianPhone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3" />
                    <span>{app.city?.name || "No city"}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted-foreground">{formatPKT(new Date(app.createdAt), "dd MMM yyyy")}</span>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]">
                      View <ChevronRight className="size-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Status Timeline ─────────────────────────────────────────────────────────

const PIPELINE_STEPS = ["submitted", "reviewing", "interviewed", "accepted", "enrolled"];

function StatusTimeline({ currentStatus, createdAt, updatedAt }: { currentStatus: string; createdAt: string; updatedAt: string }) {
  const currentIndex = PIPELINE_STEPS.indexOf(currentStatus);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <ClipboardCheck className="size-4 text-[#A0006B] dark:text-[#D4B8E3]" />
        Status Pipeline
      </h4>
      <div className="relative">
        {PIPELINE_STEPS.map((step, idx) => {
          const cfg = STATUS_CONFIG[step];
          const isReached = idx <= currentIndex;
          const isCurrent = step === currentStatus;
          const isRejected = currentStatus === "rejected" && step === "rejected";

          // For rejected, we still show the full pipeline but mark rejected
          if (isRejected) {
            const rejCfg = STATUS_CONFIG.rejected;
            return (
              <div key="rejected" className="flex items-center gap-3 py-1">
                <div className="flex flex-col items-center">
                  <div className={`size-6 rounded-full flex items-center justify-center ${rejCfg.bg} ${rejCfg.border} border`}>
                    <XCircle className={`size-3.5 ${rejCfg.color}`} />
                  </div>
                </div>
                <div>
                  <p className={`text-xs font-medium ${rejCfg.color}`}>Rejected</p>
                  <p className="text-[10px] text-muted-foreground">{formatPKT(new Date(updatedAt), "dd MMM yyyy, hh:mm a")}</p>
                </div>
              </div>
            );
          }

          return (
            <div key={step} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <motion.div
                  initial={false}
                  animate={{ scale: isCurrent ? 1.1 : 1 }}
                  className={`size-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isReached
                      ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                      : "bg-muted border-border/50"
                  }`}
                >
                  {isReached ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-muted-foreground/30" />
                  )}
                </motion.div>
                {idx < PIPELINE_STEPS.length - 1 && (
                  <div
                    className={`w-0.5 h-6 transition-colors ${
                      idx < currentIndex ? cfg.dot : "bg-border/50"
                    }`}
                  />
                )}
              </div>
              <div className="pt-0.5">
                <p className={`text-xs font-medium ${isReached ? cfg.color : "text-muted-foreground"}`}>
                  {cfg.label}
                </p>
                {isCurrent && (
                  <p className="text-[10px] text-muted-foreground">
                    {step === "submitted" ? formatPKT(new Date(createdAt), "dd MMM yyyy, hh:mm a") : formatPKT(new Date(updatedAt), "dd MMM yyyy, hh:mm a")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}