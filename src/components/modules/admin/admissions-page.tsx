"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { formatPKT } from "@/lib/timezone";
import {
  ADMISSION_FIELD_LIMITS,
  validateAdmissionAdditionalFields,
} from "@/lib/admissions/fields";
import type { AdmissionAdditionalFields } from "@/lib/admissions/fields";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Phone,
  MapPin,
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
  ArrowRight,
  Users,
  Clock,
  Star,
  UserCheck,
  UserX,
  Trash2,
  FolderInput,
  CalendarPlus,
  Copy,
  Check,
  AlertTriangle,
  Shield,
  Video,
  Award,
  LayoutGrid,
  ArrowRightLeft,
  Pencil,
} from "lucide-react";
import { autoAssignParkAndGroup } from "@/lib/pipeline/registration-flow-store";

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
  emergencyContact: string | null;
  emergencyPhone: string | null;
  previousEducation: string | null;
  reference: string | null;
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

const EMPTY_ADDITIONAL_FIELDS: AdmissionAdditionalFields = {
  emergencyContact: "",
  emergencyPhone: "",
  previousEducation: "",
  reference: "",
};

function AdditionalFieldsForm({
  fields,
  errors,
  onChange,
}: {
  fields: AdmissionAdditionalFields;
  errors: Record<string, string>;
  onChange: (field: keyof AdmissionAdditionalFields, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Emergency Contact Name</Label>
          <Input
            placeholder="Emergency contact name"
            value={fields.emergencyContact}
            maxLength={ADMISSION_FIELD_LIMITS.emergencyContact}
            aria-invalid={Boolean(errors.emergencyContact)}
            onChange={(event) => onChange("emergencyContact", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">Emergency Contact Phone</Label>
          <Input
            placeholder="Emergency contact phone"
            value={fields.emergencyPhone}
            maxLength={ADMISSION_FIELD_LIMITS.emergencyPhone}
            aria-invalid={Boolean(errors.emergencyPhone)}
            onChange={(event) => onChange("emergencyPhone", event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Previous Education</Label>
        <Input
          placeholder="Last school / institution attended"
          value={fields.previousEducation}
          maxLength={ADMISSION_FIELD_LIMITS.previousEducation}
          aria-invalid={Boolean(errors.previousEducation)}
          onChange={(event) => onChange("previousEducation", event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Reference</Label>
        <Input
          placeholder="Referral name or source"
          value={fields.reference}
          maxLength={ADMISSION_FIELD_LIMITS.reference}
          aria-invalid={Boolean(errors.reference)}
          onChange={(event) => onChange("reference", event.target.value)}
        />
      </div>
    </div>
  );
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
  screening: {
    label: "Screening",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
    darkBg: "dark:bg-amber-950/50",
    darkText: "dark:text-amber-400",
  },
  interview_scheduled: {
    label: "Interview Scheduled",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
    darkBg: "dark:bg-blue-950/50",
    darkText: "dark:text-blue-400",
  },
  interviewed: {
    label: "Interviewed",
    color: "text-[#4B0A8F]",
    bg: "bg-[#4B0A8F]/10",
    border: "border-[#4B0A8F]/20",
    dot: "bg-[#4B0A8F]",
    darkBg: "dark:bg-[#4B0A8F]/20",
    darkText: "dark:text-[#8A40B0]",
  },
  accepted: {
    label: "Accepted",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    dot: "bg-green-500",
    darkBg: "dark:bg-green-950/50",
    darkText: "dark:text-green-400",
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
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    darkBg: "dark:bg-emerald-950/50",
    darkText: "dark:text-emerald-400",
  },
};

const PIPELINE_STATUSES = [
  "submitted",
  "screening",
  "interview_scheduled",
  "interviewed",
  "accepted",
  "rejected",
  "enrolled",
] as const;

// Display pipeline for visual flow (excludes rejected/enrolled)
const VISUAL_PIPELINE = [
  "submitted",
  "screening",
  "interview_scheduled",
  "interviewed",
  "accepted",
  "rejected",
] as const;

const STATUS_FLOW: Record<string, string[]> = {
  submitted: ["screening", "rejected"],
  screening: ["interview_scheduled", "rejected", "submitted"],
  interview_scheduled: ["interviewed", "rejected", "screening"],
  interviewed: ["accepted", "rejected", "interview_scheduled"],
  accepted: ["enrolled", "rejected", "interviewed"],
  rejected: ["submitted"],
  enrolled: [],
};

// Map current status → next logical "advance" status
const NEXT_STATUS_MAP: Record<string, string> = {
  submitted: "screening",
  screening: "interview_scheduled",
  interview_scheduled: "interviewed",
  interviewed: "accepted",
  accepted: "enrolled",
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

function getInitials(name?: string | null) {
  if (!name || typeof name !== "string") return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  return parts.map((w) => w[0]).join("").toUpperCase().slice(0, 2);
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

function getInterviewResultBadge(status: string) {
  if (status === "passed") {
    return (
      <Badge className="text-[10px] bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400">
        <CheckCircle2 className="size-3 mr-0.5" /> Pass
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge className="text-[10px] bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400">
        <XCircle className="size-3 mr-0.5" /> Fail
      </Badge>
    );
  }
  if (status === "conditional") {
    return (
      <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400">
        <AlertTriangle className="size-3 mr-0.5" /> Conditional
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400">
      <Clock className="size-3 mr-0.5" /> Scheduled
    </Badge>
  );
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
  const [editAdditionalOpen, setEditAdditionalOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [recordResultsOpen, setRecordResultsOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  // Copy tracking
  const [copied, setCopied] = useState(false);

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
    ...EMPTY_ADDITIONAL_FIELDS,
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [editAdditionalForm, setEditAdditionalForm] = useState<AdmissionAdditionalFields>({
    ...EMPTY_ADDITIONAL_FIELDS,
  });
  const [editAdditionalErrors, setEditAdditionalErrors] = useState<Record<string, string>>({});

  // Interview schedule form
  const [interviewDate, setInterviewDate] = useState<Date | undefined>(undefined);
  const [interviewTime, setInterviewTime] = useState("");
  const [interviewConductedBy, setInterviewConductedBy] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");

  // Score/Record results form
  const [scoreForm, setScoreForm] = useState({
    score1: "",
    score2: "",
    score3: "",
  });
  const [interviewResult, setInterviewResult] = useState<"passed" | "failed" | "conditional">("passed");
  const [scoreNotes, setScoreNotes] = useState("");

  // Reject form
  const [rejectReason, setRejectReason] = useState("");

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
      params.set("pageSize", viewMode === "kanban" ? "200" : "50");
      return fetch("/api/admin/admissions?" + params.toString()).then((r) => r.json());
    },
  });

  const { data: rawCities } = useQuery<any>({
    queryKey: ["cities-select"],
    queryFn: () => fetch("/api/admin/cities").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: rawParks } = useQuery<any>({
    queryKey: ["parks-select"],
    queryFn: () => fetch("/api/admin/parks").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: rawGroups } = useQuery<any>({
    queryKey: ["groups-select-all"],
    queryFn: () => fetch("/api/admin/groups?pageSize=200").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const cities: CityOption[] = useMemo(() => {
    if (Array.isArray(rawCities)) return rawCities;
    if (Array.isArray(rawCities?.data)) return rawCities.data;
    if (Array.isArray(rawCities?.cities)) return rawCities.cities;
    return [];
  }, [rawCities]);

  const parks: ParkOption[] = useMemo(() => {
    if (Array.isArray(rawParks)) return rawParks;
    if (Array.isArray(rawParks?.data)) return rawParks.data;
    if (Array.isArray(rawParks?.parks)) return rawParks.parks;
    return [];
  }, [rawParks]);

  const groups: GroupOption[] = useMemo(() => {
    if (Array.isArray(rawGroups)) return rawGroups;
    if (Array.isArray(rawGroups?.data)) return rawGroups.data;
    if (Array.isArray(rawGroups?.groups)) return rawGroups.groups;
    return [];
  }, [rawGroups]);

  const { data: selectedDetail, isLoading: detailLoading } = useQuery<Application>({
    queryKey: ["admission-detail", selectedApp?.id],
    queryFn: () => fetch(`/api/admin/admissions/${selectedApp!.id}`).then((r) => r.json()),
    enabled: !!selectedApp && sheetOpen,
  });

  // ─── Stats ───────────────────────────────────────────────────────────────

  const { data: submittedCount } = useQuery<{ pagination: Pagination }>({
    queryKey: ["admissions-count", "submitted"],
    queryFn: () => fetch("/api/admin/admissions?status=submitted&pageSize=1").then((r) => r.json()),
    staleTime: 30 * 1000,
  });
  const { data: screeningCount } = useQuery<{ pagination: Pagination }>({
    queryKey: ["admissions-count", "screening"],
    queryFn: () => fetch("/api/admin/admissions?status=screening&pageSize=1").then((r) => r.json()),
    staleTime: 30 * 1000,
  });
  const { data: acceptedCount } = useQuery<{ pagination: Pagination }>({
    queryKey: ["admissions-count", "accepted"],
    queryFn: () => fetch("/api/admin/admissions?status=accepted&pageSize=1").then((r) => r.json()),
    staleTime: 30 * 1000,
  });

  const statCards = [
    { label: "Total Applications", value: applicationsData?.pagination?.total ?? 0, icon: FileText, color: "text-[#4B0A8F] dark:text-[#8A40B0]", bg: "bg-[#F3ECF6] dark:bg-[#1F086080]" },
    { label: "Submitted", value: submittedCount?.pagination?.total ?? 0, icon: ClipboardCheck, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800" },
    { label: "In Pipeline", value: (screeningCount?.pagination?.total ?? 0), icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/50" },
    { label: "Accepted", value: acceptedCount?.pagination?.total ?? 0, icon: CheckCircle2, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/50" },
  ];

  // ─── Kanban grouping ─────────────────────────────────────────────────────

  const applications = applicationsData?.data || [];

  const kanbanGroups = useMemo(() => {
    const groups: Record<string, Application[]> = {};
    for (const s of PIPELINE_STATUSES) {
      groups[s] = [];
    }
    for (const app of applications) {
      const key = PIPELINE_STATUSES.includes(app.status as any) ? app.status : "submitted";
      if (groups[key]) {
        groups[key].push(app);
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
      setCreateForm({ applicantName: "", applicantDOB: "", gender: "", guardianName: "", guardianPhone: "", guardianRelation: "", cityId: "", preferredParkId: "", notes: "", ...EMPTY_ADDITIONAL_FIELDS });
      setCreateErrors({});
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/admin/admissions/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Applicant record deleted successfully");
      setSheetOpen(false);
      setSelectedApp(null);
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      queryClient.invalidateQueries({ queryKey: ["admissions-count"] });
    },
    onError: () => toast.error("Failed to delete application"),
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
      const hasScores = variables.data.score1 !== undefined || variables.data.score2 !== undefined || variables.data.score3 !== undefined;
      if (hasScores) {
        toast.success("Interview results recorded");
        setRecordResultsOpen(false);
        setScoreForm({ score1: "", score2: "", score3: "" });
        setScoreNotes("");
        setInterviewResult("passed");
      } else {
        toast.success("Interview scheduled");
        setInterviewOpen(false);
        setInterviewDate(undefined);
        setInterviewTime("");
        setInterviewConductedBy("");
        setInterviewNotes("");
      }
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
    setCopied(false);
  }, []);

  const handleCopyTracking = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Tracking code copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
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
    const dateStr = interviewDate ? format(interviewDate, "yyyy-MM-dd") : undefined;
    interviewMutation.mutate({
      id: selectedApp.id,
      data: {
        scheduledDate: dateStr,
        scheduledTime: interviewTime || undefined,
        conductedBy: interviewConductedBy || undefined,
        notes: interviewNotes || undefined,
      },
    });
  }, [selectedApp, interviewDate, interviewTime, interviewConductedBy, interviewNotes, interviewMutation]);

  const handleRecordResults = useCallback(() => {
    if (!selectedApp) return;
    interviewMutation.mutate({
      id: selectedApp.id,
      data: {
        score1: scoreForm.score1 ? Number(scoreForm.score1) : undefined,
        score2: scoreForm.score2 ? Number(scoreForm.score2) : undefined,
        score3: scoreForm.score3 ? Number(scoreForm.score3) : undefined,
        status: interviewResult,
        notes: scoreNotes || undefined,
      },
    });
  }, [selectedApp, scoreForm, interviewResult, scoreNotes, interviewMutation]);

  // Detail data (must be before handlers that reference it)
  const detail = (selectedDetail && !("error" in (selectedDetail as any)) ? selectedDetail : null) || selectedApp;

  const handleOpenEditAdditional = useCallback(() => {
    if (!detail) return;

    setEditAdditionalForm({
      emergencyContact: detail.emergencyContact || "",
      emergencyPhone: detail.emergencyPhone || "",
      previousEducation: detail.previousEducation || "",
      reference: detail.reference || "",
    });
    setEditAdditionalErrors({});
    setEditAdditionalOpen(true);
  }, [detail]);

  const handleSaveAdditional = useCallback(() => {
    if (!detail) return;

    const errors = validateAdmissionAdditionalFields(editAdditionalForm);
    if (Object.keys(errors).length > 0) {
      setEditAdditionalErrors(errors);
      return;
    }

    setEditAdditionalErrors({});
    updateMutation.mutate(
      { id: detail.id, data: { ...editAdditionalForm } },
      {
        onSuccess: (data) => {
          if (!data.error) setEditAdditionalOpen(false);
        },
      }
    );
  }, [detail, editAdditionalForm, updateMutation]);

  const handleAdvance = useCallback(() => {
    if (!selectedApp || !detail) return;
    const next = NEXT_STATUS_MAP[detail.status];
    if (!next) return;
    if (next === "enrolled") {
      handleOpenEnroll();
    } else {
      updateMutation.mutate({ id: detail.id, data: { status: next } });
    }
  }, [selectedApp, detail, updateMutation, handleOpenEnroll]);

  const handleReject = useCallback(() => {
    if (!selectedApp || !detail) return;
    if (!rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    const existingNotes = detail.notes || "";
    const newNotes = existingNotes
      ? `${existingNotes}\n\nRejection reason: ${rejectReason}`
      : `Rejection reason: ${rejectReason}`;
    updateMutation.mutate({
      id: detail.id,
      data: { status: "rejected", notes: newNotes },
    });
    setRejectOpen(false);
    setRejectReason("");
  }, [selectedApp, detail, rejectReason, updateMutation]);

  const handleCreate = useCallback(() => {
    const errors: Record<string, string> = {};
    if (!createForm.applicantName.trim()) errors.applicantName = "Applicant name is required";
    if (!createForm.guardianName.trim()) errors.guardianName = "Guardian name is required";
    if (!createForm.guardianPhone.trim()) errors.guardianPhone = "Guardian phone is required";
    else if (createForm.guardianPhone.trim().length < 5) errors.guardianPhone = "Phone must be at least 5 characters";
    Object.assign(errors, validateAdmissionAdditionalFields(createForm));
    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }
    setCreateErrors({});
    createMutation.mutate(createForm);
  }, [createForm, createMutation]);

  // Parks filtered by city
  const createFormParks = useMemo(() => {
    if (!createForm.cityId || !parks) return [];
    return parks.filter((p) => p.cityId === createForm.cityId);
  }, [createForm.cityId, parks]);

  const canAdvance = detail && NEXT_STATUS_MAP[detail.status] && detail.status !== "rejected" && detail.status !== "enrolled";
  const canReject = detail && detail.status !== "rejected" && detail.status !== "enrolled";
  const canEnroll = detail && detail.status === "accepted" && !detail.convertedParticipantId;
  const hasScheduledInterview = detail?.interviews?.some((i) => i.status === "scheduled") ?? false;

  const totalScore = useMemo(() => {
    const s1 = scoreForm.score1 ? Number(scoreForm.score1) : 0;
    const s2 = scoreForm.score2 ? Number(scoreForm.score2) : 0;
    const s3 = scoreForm.score3 ? Number(scoreForm.score3) : 0;
    return s1 + s2 + s3;
  }, [scoreForm]);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-1 pb-6 space-y-6">
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
                  <div className="text-2xl font-bold tracking-tight">{isLoading ? <Skeleton className="h-7 w-8" /> : s.value}</div>
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
          </div>
          <div className="flex items-center justify-between mt-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "kanban" | "list")}>
              <TabsList className="h-8">
                <TabsTrigger value="kanban" className="text-xs gap-1.5 px-3">
                  <LayoutGrid className="size-3.5" />
                  Pipeline
                </TabsTrigger>
                <TabsTrigger value="list" className="text-xs gap-1.5 px-3">
                  <List className="size-3.5" />
                  Table
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {viewMode === "kanban" && (
              <span className="text-[10px] text-muted-foreground">
                {applications.length} applications
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Status Pills */}
      {!isLoading && viewMode === "kanban" && !statusFilter && !debouncedSearch && !cityFilter ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {VISUAL_PIPELINE.map((status) => {
            const cfg = STATUS_CONFIG[status];
            const count = (kanbanGroups[status] || []).length;
            return (
              <div
                key={status}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap ${cfg.bg} ${cfg.border} ${cfg.color} ${cfg.darkBg} ${cfg.darkText}`}
              >
                <span className={`size-2 rounded-full ${cfg.dot}`} />
                {cfg.label}
                <span className="font-bold">{count}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
            <span className="size-2 rounded-full bg-emerald-500" />
            Enrolled
            <span className="font-bold">{(kanbanGroups["enrolled"] || []).length}</span>
          </div>
        </div>
      ) : null}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {PIPELINE_STATUSES.map((s) => (
            <div key={s} className="space-y-3">
              <Skeleton className="h-8 w-28" />
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
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
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs font-medium">Notes</Label>
              <Textarea
                placeholder="Any additional notes..."
                rows={3}
                value={createForm.notes}
                onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Additional Information</p>
            <AdditionalFieldsForm
              fields={createForm}
              errors={createErrors}
              onChange={(field, value) => setCreateForm((current) => ({ ...current, [field]: value }))}
            />
            {Object.keys(createErrors).length > 0 && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3">
                <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Please fix the following errors:</p>
                {Object.entries(createErrors).map(([field, msg]) => (
                  <p key={field} className="text-xs text-red-600 dark:text-red-400">• {msg}</p>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => { setCreateOpen(false); setCreateErrors({}); }}>Cancel</Button>
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

      <Dialog open={editAdditionalOpen} onOpenChange={setEditAdditionalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Additional Information</DialogTitle>
            <DialogDescription>
              Update the admission-only contact, education, and referral details.
            </DialogDescription>
          </DialogHeader>
          <AdditionalFieldsForm
            fields={editAdditionalForm}
            errors={editAdditionalErrors}
            onChange={(field, value) => setEditAdditionalForm((current) => ({ ...current, [field]: value }))}
          />
          {Object.keys(editAdditionalErrors).length > 0 && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3">
              {Object.entries(editAdditionalErrors).map(([field, message]) => (
                <p key={field} className="text-xs text-red-600 dark:text-red-400">{message}</p>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAdditionalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveAdditional}
              disabled={updateMutation.isPending}
              className="bg-[#4B0A8F] hover:bg-[#4B0A8F]/90 text-white"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Detail Sheet ─── */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) { setSelectedApp(null); setCopied(false); } }}>
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
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{detail.applicantName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs text-muted-foreground font-mono">{detail.trackingCode}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-5 shrink-0 hover:bg-transparent"
                          onClick={() => handleCopyTracking(detail.trackingCode)}
                        >
                          {copied ? (
                            <Check className="size-3 text-green-600 dark:text-green-400" />
                          ) : (
                            <Copy className="size-3 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </SheetTitle>
                  <SheetDescription className="text-left">
                    Applied on {formatPKT(new Date(detail.createdAt))}
                  </SheetDescription>
                </SheetHeader>
                <div className="flex items-center gap-2 mt-3">
                  {getStatusBadge(detail.status)}
                  {detail.convertedParticipant && (
                    <Badge variant="outline" className="text-[11px] text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400">
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

                  <Separator className="bg-border/50" />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <GraduationCap className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
                        Additional Information
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={handleOpenEditAdditional}
                      >
                        <Pencil className="size-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Emergency Contact</p>
                        <p className="font-medium">{detail.emergencyContact || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Emergency Phone</p>
                        <p className="font-medium">{detail.emergencyPhone || "—"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Previous Education</p>
                        <p className="font-medium">{detail.previousEducation || "—"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Reference</p>
                        <p className="font-medium">{detail.reference || "—"}</p>
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

                  {/* Interviews Section */}
                  <Separator className="bg-border/50" />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Video className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
                        Interviews ({(detail.interviews || []).length})
                      </h4>
                      {detail.status !== "enrolled" && detail.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-[#4B0A8F]/20 text-[#4B0A8F] hover:bg-[#4B0A8F]/10"
                          onClick={() => setInterviewOpen(true)}
                        >
                          <CalendarPlus className="size-3.5 mr-1" />
                          Schedule Interview
                        </Button>
                      )}
                    </div>

                    {(!detail.interviews || detail.interviews.length === 0) ? (
                      <div className="text-center py-6 border border-dashed border-border/50 rounded-lg">
                        <Calendar className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-sm text-muted-foreground">No interviews scheduled yet</p>
                        {detail.status === "submitted" || detail.status === "screening" ? (
                          <p className="text-xs text-muted-foreground mt-1">Advance to schedule an interview</p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {detail.interviews.map((intv) => (
                          <Card key={intv.id} className="border-border/50 shadow-none">
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {getInterviewResultBadge(intv.status)}
                                  {intv.conductedBy && (
                                    <span className="text-xs text-muted-foreground">by {intv.conductedBy}</span>
                                  )}
                                </div>
                                {intv.totalScore !== null && intv.totalScore !== undefined && (
                                  <Badge className="bg-[#F3ECF6] text-[#4B0A8F] border-[#D4B8E3] dark:bg-[#1F086080] dark:text-[#8A40B0] text-xs shrink-0">
                                    <Star className="size-3 mr-1" />
                                    {intv.totalScore}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                {intv.scheduledDate && <span className="flex items-center gap-1"><Calendar className="size-3" />{formatPKT(new Date(intv.scheduledDate))}</span>}
                                {intv.scheduledTime && <span className="flex items-center gap-1"><Clock className="size-3" />{intv.scheduledTime}</span>}
                              </div>
                              {intv.score1 !== null && intv.score1 !== undefined && (
                                <div className="flex gap-3 text-xs">
                                  <span className="text-muted-foreground">Scores:</span>
                                  <span className="font-medium">{intv.score1} / {intv.score2} / {intv.score3}</span>
                                </div>
                              )}
                              {intv.notes && (
                                <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1">{intv.notes}</p>
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
                            onClick={handleRecordResults}
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
                          <UserCheck className="size-4 text-emerald-600" />
                          Enrolled Participant
                        </h4>
                        <Card className="border-emerald-200 shadow-none">
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

                  {/* Documents Section */}
                  <Separator className="bg-border/50" />
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
                      Documents
                    </h4>
                    <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                      Document uploads are unavailable until private Storage is configured for the pilot.
                    </p>
                  </div>

                  {/* Actions Section */}
                  <Separator className="bg-border/50" />
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      {/* Advance to Next Stage */}
                      {canAdvance && (
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-[#4B0A8F] hover:bg-[#4B0A8F]/90 text-white"
                          onClick={handleAdvance}
                          disabled={updateMutation.isPending}
                        >
                          <ArrowRight className="size-3.5 mr-1.5" />
                          {NEXT_STATUS_MAP[detail.status] === "enrolled"
                            ? "Convert to Participant"
                            : `Advance to ${STATUS_CONFIG[NEXT_STATUS_MAP[detail.status]]?.label || "Next Stage"}`}
                        </Button>
                      )}

                      {/* Enroll (when accepted and not yet enrolled) */}
                      {canEnroll && !canAdvance && (
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-600/90 text-white"
                          onClick={handleOpenEnroll}
                        >
                          <FolderInput className="size-3.5 mr-1.5" />
                          Convert to Participant
                        </Button>
                      )}

                      {/* Reject */}
                      {canReject && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 text-xs"
                          onClick={() => setRejectOpen(true)}
                        >
                          <UserX className="size-3.5 mr-1.5" />
                          Reject
                        </Button>
                      )}

                      {/* Delete Record */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 rounded-xl font-bold"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete applicant ${detail.applicantName}?`)) {
                            deleteMutation.mutate(detail.id);
                          }
                        }}
                      >
                        <Trash2 className="size-3.5 mr-1.5" />
                        Delete Record
                      </Button>
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
              <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                <CalendarPlus className="size-4 text-blue-600 dark:text-blue-400" />
              </div>
              Schedule Interview
            </DialogTitle>
            <DialogDescription>Set the date, time, and interviewer for this application.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Interview Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal h-9"
                  >
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    {interviewDate ? format(interviewDate, "dd MMM yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={interviewDate}
                    onSelect={setInterviewDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Interview Time</Label>
              <Input
                type="time"
                className="h-9"
                value={interviewTime}
                onChange={(e) => setInterviewTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Conducted By</Label>
              <Input
                placeholder="Interviewer name"
                className="h-9"
                value={interviewConductedBy}
                onChange={(e) => setInterviewConductedBy(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Notes</Label>
              <Textarea
                placeholder="Any notes for the interview..."
                rows={2}
                value={interviewNotes}
                onChange={(e) => setInterviewNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInterviewOpen(false)}>Cancel</Button>
            <Button
              onClick={handleScheduleInterview}
              disabled={interviewMutation.isPending || !interviewDate}
              className="bg-blue-600 hover:bg-blue-600/90 text-white"
            >
              {interviewMutation.isPending ? "Scheduling..." : "Schedule Interview"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Record Interview Results Dialog ─── */}
      <Dialog open={recordResultsOpen} onOpenChange={setRecordResultsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086080] flex items-center justify-center">
                <Award className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>
              Record Interview Results
            </DialogTitle>
            <DialogDescription>Enter the interview scores and result for this applicant.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Scores */}
            <div className="space-y-3">
              <Label className="text-xs font-medium">Scores (0–10 each)</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground">Score 1</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    placeholder="0-10"
                    className="h-9 text-sm text-center"
                    value={scoreForm.score1}
                    onChange={(e) => setScoreForm((f) => ({ ...f, score1: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground">Score 2</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    placeholder="0-10"
                    className="h-9 text-sm text-center"
                    value={scoreForm.score2}
                    onChange={(e) => setScoreForm((f) => ({ ...f, score2: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground">Score 3</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    placeholder="0-10"
                    className="h-9 text-sm text-center"
                    value={scoreForm.score3}
                    onChange={(e) => setScoreForm((f) => ({ ...f, score3: e.target.value }))}
                  />
                </div>
              </div>
              {/* Total Score */}
              <div className="flex items-center justify-center gap-2 py-2 px-3 bg-muted/50 rounded-lg">
                <span className="text-xs text-muted-foreground">Total Score:</span>
                <span className={`text-lg font-bold ${totalScore >= 20 ? "text-green-600 dark:text-green-400" : totalScore >= 15 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                  {totalScore}
                </span>
                <span className="text-xs text-muted-foreground">/ 30</span>
              </div>
            </div>

            {/* Result Status */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Result *</Label>
              <Select value={interviewResult} onValueChange={(v) => setInterviewResult(v as "passed" | "failed" | "conditional")}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passed">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-green-600 dark:text-green-400" /> Pass
                    </span>
                  </SelectItem>
                  <SelectItem value="failed">
                    <span className="flex items-center gap-2">
                      <XCircle className="size-3.5 text-red-600 dark:text-red-400" /> Fail
                    </span>
                  </SelectItem>
                  <SelectItem value="conditional">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" /> Conditional
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Notes</Label>
              <Textarea
                placeholder="Interview notes and observations..."
                rows={3}
                value={scoreNotes}
                onChange={(e) => setScoreNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordResultsOpen(false)}>Cancel</Button>
            <Button
              onClick={handleRecordResults}
              disabled={interviewMutation.isPending}
              className="bg-[#4B0A8F] hover:bg-[#4B0A8F]/90 text-white"
            >
              {interviewMutation.isPending ? "Saving..." : "Save Results"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Reject Dialog ─── */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center">
                <AlertTriangle className="size-4 text-red-600 dark:text-red-400" />
              </div>
              Reject Application
            </DialogTitle>
            <DialogDescription>
              This will mark <span className="font-semibold">{selectedApp?.applicantName}</span> as rejected. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Rejection Reason *</Label>
              <Textarea
                placeholder="Explain why this application is being rejected..."
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectOpen(false); setRejectReason(""); }}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={updateMutation.isPending || !rejectReason.trim()}
            >
              {updateMutation.isPending ? "Rejecting..." : "Reject Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Enrollment / Convert to Participant Dialog ─── */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                <FolderInput className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              Convert to Participant
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
                      <span className="truncate">{g.name} — {g.batch.name} / {g.batch.park.name}</span>
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
              className="bg-emerald-600 hover:bg-emerald-600/90 text-white"
            >
              {enrollMutation.isPending ? "Enrolling..." : "Convert to Participant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Mini Pipeline Progress ────────────────────────────────────────────────

const PROGRESS_STEPS = ["submitted", "screening", "interview_scheduled", "interviewed", "accepted", "enrolled"];

function PipelineProgress({ currentStatus }: { currentStatus: string }) {
  const currentIndex = PROGRESS_STEPS.indexOf(currentStatus);
  const isRejected = currentStatus === "rejected";

  return (
    <div className="flex items-center gap-0.5">
      {PROGRESS_STEPS.map((step, idx) => {
        const isActive = idx <= currentIndex && !isRejected;
        const isCurrent = step === currentStatus;
        const stepCfg = STATUS_CONFIG[step];
        return (
          <div key={step} className="flex-1 flex items-center">
            <div
              className={`h-1.5 w-full rounded-full transition-colors ${
                isRejected
                  ? "bg-red-300 dark:bg-red-800"
                  : isActive
                    ? `${stepCfg.dot}`
                    : "bg-border/50"
              } ${isCurrent && !isRejected ? "ring-1 ring-offset-1 ring-offset-background rounded-full " + stepCfg.dot.replace("bg-", "ring-") : ""}`}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Kanban / Pipeline View ──────────────────────────────────────────────────

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
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
      {PIPELINE_STATUSES.map((status) => {
        const cfg = STATUS_CONFIG[status];
        const apps = groups[status] || [];
        return (
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="min-w-[240px] w-[240px] shrink-0 space-y-3"
          >
            {/* Column header with color-coded styling */}
            <div className="sticky top-0 bg-background z-10 pb-1">
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg border-l-4 ${cfg.border} ${cfg.bg} ${cfg.darkBg}`}>
                <div className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${cfg.dot}`} />
                  <h3 className={`text-xs font-semibold ${cfg.color} ${cfg.darkText}`}>{cfg.label}</h3>
                </div>
                <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${cfg.color} ${cfg.darkText}`}>
                  {apps.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
              {apps.length === 0 && (
                <div className="text-center py-6 text-[10px] text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border/50">
                  No applications
                </div>
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
                    <Card className={`border shadow-none hover:shadow-sm transition-all cursor-pointer hover:border-[#4B0A8F]/30 ${cfg.bg} ${cfg.darkBg}`}>
                      <CardContent className="p-3 space-y-2">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <button
                            className="text-left min-w-0 flex-1"
                            onClick={() => onView(app)}
                          >
                            <p className="text-[10px] font-mono text-muted-foreground">{app.trackingCode}</p>
                            <p className="text-xs font-semibold truncate mt-0.5">{app.applicantName}</p>
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-6 shrink-0">
                                <MoreHorizontal className="size-3.5" />
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
                                  className={ns === "rejected" ? "text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400" : ""}
                                >
                                  {ns === "rejected" ? <UserX className="size-3.5 mr-2" /> : <ArrowRightLeft className="size-3.5 mr-2" />}
                                  Move to {STATUS_CONFIG[ns].label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Info */}
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Users className="size-3 shrink-0" />
                          <span className="truncate">{app.guardianName}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <MapPin className="size-3 shrink-0" />
                          <span className="truncate">{app.city?.name || "No city"}{app.preferredPark ? ` · ${app.preferredPark.name}` : ""}</span>
                        </div>

                        {/* Mini Pipeline Progress Indicator */}
                        <PipelineProgress currentStatus={app.status} />

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[9px] text-muted-foreground">{formatPKT(new Date(app.createdAt), "dd MMM")}</span>
                          <div className="flex items-center gap-1">
                            {app.interviews.length > 0 && app.interviews[0].totalScore !== null && app.interviews[0].totalScore !== undefined && (
                              <Badge variant="outline" className="text-[9px] h-4 bg-[#4B0A8F]/10 text-[#4B0A8F] border-[#4B0A8F]/20 dark:text-[#8A40B0] px-1.5">
                                <Star className="size-2 mr-0.5" />
                                {app.interviews[0].totalScore}
                              </Badge>
                            )}
                            {NEXT_STATUS_MAP[app.status] && app.status !== "rejected" && app.status !== "enrolled" && (
                              <Button
                                size="icon"
                                className="size-5 h-5 bg-[#4B0A8F] hover:bg-[#4B0A8F]/80 text-white rounded-full"
                                onClick={(e) => { e.stopPropagation(); onMoveStatus(app, NEXT_STATUS_MAP[app.status]); }}
                              >
                                <ArrowRight className="size-2.5" />
                              </Button>
                            )}
                          </div>
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

// ─── List / Table View ───────────────────────────────────────────────────────

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
                      <Badge variant="outline" className="text-[10px] bg-[#4B0A8F]/10 text-[#4B0A8F] border-[#4B0A8F]/20 dark:text-[#8A40B0]">
                        {app.interviews[0].totalScore ? `${app.interviews[0].totalScore}` : "Pending"}
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
                            className={ns === "rejected" ? "text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400" : ""}
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

const PIPELINE_STEPS = ["submitted", "screening", "interview_scheduled", "interviewed", "accepted", "enrolled"];

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
          const isRejected = currentStatus === "rejected" && idx === 0;

          // Show rejected indicator at the top if rejected
          if (isRejected && currentStatus === "rejected") {
            const rejCfg = STATUS_CONFIG.rejected;
            return (
              <div key="rejected-marker" className="flex items-center gap-3 py-1 mb-1">
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

          // Skip the second "rejected" render
          if (currentStatus === "rejected" && idx > 0) return null;

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
