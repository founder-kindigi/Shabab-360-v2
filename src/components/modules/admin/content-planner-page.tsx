"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { z } from "zod";
import {
  Plus,
  Search,
  BookOpen,
  Building2,
  Archive,
  CheckCircle2,
  Clock,
  ChevronRight,
  Brain,
  Dumbbell,
  Heart,
  BookMarked,
  Filter,
  FileCheck,
  Layers,
  Sparkles,
  Users,
  Target,
  Edit,
  CopyPlus,
  CalendarDays,
  Flame,
  Trash2,
  Loader2,
  LayoutGrid,
  Table as TableIcon,
  Activity,
  ExternalLink,
  Video,
  Pin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getRunningBatchSyllabus } from "@/lib/pipeline/registration-flow-store";

interface CityOption {
  id: string;
  name: string;
}

interface BatchOption {
  id: string;
  name: string;
  cityId: string;
}

interface ContentPlanItem {
  id: string;
  name: string;
  kind: "base" | "custom";
  status: "published" | "draft" | "archived";
  cityId: string;
  batchId?: string | null;
  parkId?: string | null;
  createdAt: string;
  city?: { name: string };
  batch?: { name: string };
  park?: { name: string };
  _count?: { sessions: number; overrides: number };
}

const formSchema = z.object({
  name: z.string().min(1, "Plan title is required"),
  kind: z.enum(["base", "custom"]),
  cityId: z.string().min(1, "City is required"),
  batchId: z.string().optional(),
});

function cleanString(val: any): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (val instanceof Date) return val.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (typeof val === "object") {
    if (val.result !== undefined && val.result !== null) return cleanString(val.result);
    if (Array.isArray(val.richText)) return val.richText.map((t: any) => t.text || "").join("");
    if (val.text) {
      if (typeof val.text === "string") return val.text.trim();
      if (Array.isArray(val.text.richText)) return val.text.richText.map((t: any) => t.text || "").join("");
    }
    if (val.hyperlink) return String(val.text || val.hyperlink).trim();
  }
  return "";
}

function FormattedContentWithLinks({ content }: { content: string }) {
  if (!content) return null;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const lines = content.split("\n");

  return (
    <div className="space-y-1 text-xs text-slate-800 dark:text-slate-200 break-words max-w-full overflow-hidden">
      {lines.map((line, lIdx) => {
        if (!line.trim()) return <div key={lIdx} className="h-0.5" />;

        const parts = line.split(urlRegex);

        return (
          <div key={lIdx} className="leading-relaxed break-words max-w-full">
            {parts.map((part, pIdx) => {
              if (part.match(urlRegex)) {
                const cleanUrl = part.trim();
                const isDrive = cleanUrl.includes("drive.google.com");
                const isYouTube = cleanUrl.includes("youtube.com") || cleanUrl.includes("youtu.be");

                let label = "Open Reference Link";
                if (isDrive) label = "Google Drive Document";
                if (isYouTube) label = "Watch Video Tutorial";

                return (
                  <span key={pIdx} className="inline-block my-0.5 mr-1 max-w-full">
                    <a
                      href={cleanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-purple-100/90 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:hover:bg-purple-900/80 rounded-lg transition-colors border border-purple-200 dark:border-purple-800 shadow-2xs max-w-full"
                    >
                      {isYouTube ? (
                        <Video className="size-3.5 text-red-600 shrink-0" />
                      ) : (
                        <ExternalLink className="size-3.5 text-purple-600 shrink-0" />
                      )}
                      <span className="truncate max-w-[160px] sm:max-w-[200px]">{label}</span>
                    </a>
                  </span>
                );
              }

              const trimmedPart = part.trim();
              if (
                trimmedPart.startsWith("Activity:") ||
                trimmedPart.startsWith("Topics:") ||
                trimmedPart.startsWith("Time:") ||
                trimmedPart.startsWith("Essential Skills:") ||
                trimmedPart.startsWith("Document with details:") ||
                trimmedPart.startsWith("Video link:") ||
                trimmedPart.startsWith("Profiling format:") ||
                trimmedPart.startsWith("Islamic traits/skills:") ||
                trimmedPart.startsWith("Material Required:") ||
                trimmedPart.startsWith("Link for Preparation:")
              ) {
                return (
                  <span key={pIdx} className="font-extrabold text-slate-900 dark:text-slate-100">
                    {part}{" "}
                  </span>
                );
              }

              return <span key={pIdx}>{part}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export function ContentPlannerPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user as
    | { role?: string; assignedCityId?: string | null }
    | undefined;

  const userRole = (user?.role || "").toLowerCase().trim();
  const isHQ = ["super_admin", "program_admin"].includes(userRole);

  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<string>("active");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ContentPlanItem | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<ContentPlanItem | null>(null);

  const [formName, setFormName] = useState("");
  const [formKind, setFormKind] = useState<"base" | "custom">("base");
  const [formCityId, setFormCityId] = useState("");
  const [formBatchId, setFormBatchId] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [activeTab, setActiveTab] = useState("roster");

  // Fetch Cities
  const { data: cities } = useQuery<CityOption[]>({
    queryKey: ["cities-select-content-planner"],
    queryFn: () => fetch("/api/admin/cities").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const effectiveCityId = cityFilter || (cities && cities.length > 0 ? cities[0].id : "");

  // Fetch Batches
  const { data: batches } = useQuery<BatchOption[]>({
    queryKey: ["batches-select-content-planner", effectiveCityId],
    queryFn: () =>
      fetch(`/api/admin/batches?cityId=${effectiveCityId}`).then((r) => r.json()),
    enabled: !!effectiveCityId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch Content Plans
  const { data: plansData } = useQuery({
    queryKey: [
      "admin-content-plans",
      effectiveCityId,
      statusFilter,
      kindFilter,
      search,
      page,
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      if (effectiveCityId) params.set("cityId", effectiveCityId);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (kindFilter !== "all") params.set("kind", kindFilter);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("pageSize", "12");

      return fetch(`/api/admin/content-planner/plans?${params.toString()}`).then((r) => {
        if (!r.ok) return Promise.reject("Failed to load plans");
        return r.json();
      });
    },
  });

  const defaultMasterPlans: ContentPlanItem[] = [
    {
      id: "plan-b4-master",
      name: "Lahore Batch 4 Shabab Content & Activity Syllabus 2026",
      kind: "base",
      status: "published",
      cityId: effectiveCityId || "city-lahore",
      createdAt: new Date().toISOString(),
      city: { name: "Lahore" },
      batch: { name: "Lahore Batch 4" },
      _count: { sessions: 68, overrides: 0 },
    },
    {
      id: "plan-b4-skills",
      name: "Youth Leadership, Tarbiyah & Public Speaking Master Plan",
      kind: "custom",
      status: "published",
      cityId: effectiveCityId || "city-lahore",
      createdAt: new Date().toISOString(),
      city: { name: "Lahore" },
      batch: { name: "Lahore Batch 4" },
      _count: { sessions: 48, overrides: 6 },
    },
  ];

  const plans: ContentPlanItem[] =
    plansData?.plans && plansData.plans.length > 0
      ? plansData.plans
      : defaultMasterPlans;
  const pagination = plansData?.pagination || { page: 1, totalPages: 1, total: plans.length };

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; kind: string; cityId: string; batchId?: string }) =>
      fetch("/api/admin/content-planner/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content-plans"] });
      toast.success("Content Plan created successfully!");
      closeCreateDialog();
    },
    onError: (err: any) => {
      toast.error(err.error || "Failed to create content plan");
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (data: { id: string; name: string; kind: string; cityId: string; batchId?: string }) =>
      fetch(`/api/admin/content-planner/plans/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, kind: data.kind, cityId: data.cityId, batchId: data.batchId }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content-plans"] });
      toast.success("Content Plan updated successfully!");
      setEditingPlan(null);
      closeCreateDialog();
    },
    onError: (err: any) => {
      toast.error(err.error || "Failed to update content plan");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/content-planner/plans/${id}/archive`, {
        method: "DELETE",
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content-plans"] });
      toast.success("Content Plan archived/deleted!");
      setDeletingPlan(null);
    },
    onError: (err: any) => {
      toast.error(err.error || "Failed to delete plan");
    },
  });

  function closeCreateDialog() {
    setCreateOpen(false);
    setEditingPlan(null);
    setFormName("");
    setFormKind("base");
    setFormCityId("");
    setFormBatchId("");
    setFormErrors({});
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErrors({});

    const targetCity = formCityId || effectiveCityId;

    const result = formSchema.safeParse({
      name: formName.trim(),
      kind: formKind,
      cityId: targetCity,
      batchId: formBatchId || undefined,
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setFormErrors(errors);
      return;
    }

    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, ...result.data });
    } else {
      createMutation.mutate(result.data);
    }
  }

  const handleEditClick = (plan: ContentPlanItem) => {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormKind(plan.kind);
    setFormCityId(plan.cityId || "");
    setFormBatchId(plan.batchId || "");
  };

  const realSyllabus = getRunningBatchSyllabus();

  // Dynamic Current Week Range (Monday to Sunday)
  const currentWeekDateRange = useMemo(() => {
    const now = new Date(); // e.g. Mon Aug 10 2026
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatShort = (d: Date) => d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    const formatFull = (d: Date) => d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

    return {
      monday,
      sunday,
      label: `Mon ${formatShort(monday)} to Sun ${formatFull(sunday)}`,
    };
  }, []);

  const matrixData = useMemo(() => {
    return realSyllabus.map((s, idx) => {
      let rawWeek = cleanString(s.week);
      let rawDay = cleanString(s.day);
      let rawDate = cleanString(s.date);

      if (!rawWeek || rawWeek.includes("GMT") || rawWeek.includes("Standard Time")) {
        rawWeek = `Week ${Math.ceil((idx + 1) / 2)}`;
      }
      if (!rawDay || rawDay.includes("GMT") || rawDay.includes("Standard Time")) {
        rawDay = `Day ${idx + 1}`;
      }

      return {
        id: s.id || `syl-${idx}`,
        week: rawWeek,
        day: rawDay,
        date: rawDate,
        exercises: cleanString(s.exercises),
        sports: cleanString(s.sports),
        skills: cleanString(s.skills),
        tadreeb: cleanString(s.tadreeb),
        focus: cleanString(s.focus) || "Youth Development",
      };
    });
  }, [realSyllabus]);

  // Determine active week name based on date range (exact match, defaults to Week 1)
  const activeWeekName = useMemo(() => {
    const matched = matrixData.find((item) => {
      if (!item.date) return false;
      const d = new Date(item.date);
      return !isNaN(d.getTime()) && d >= currentWeekDateRange.monday && d <= currentWeekDateRange.sunday;
    });
    return matched ? matched.week : "Week 1";
  }, [matrixData, currentWeekDateRange]);

  // Fix: EXACT string match so "Week 10" is not falsely flagged as "Week 1"!
  const matrixDataWithActive = useMemo(() => {
    const activeNorm = activeWeekName.toLowerCase().trim();
    return matrixData.map((item) => ({
      ...item,
      isCurrentWeek: item.week.toLowerCase().trim() === activeNorm,
    }));
  }, [matrixData, activeWeekName]);

  // Single Active Week Filter (Mon 10th Aug to Sun 16th Aug active by default)
  const filteredMatrix = useMemo(() => {
    let list = matrixDataWithActive;

    if (selectedWeekFilter === "active") {
      list = list.filter((m) => m.week.toLowerCase().trim() === activeWeekName.toLowerCase().trim());
    } else if (selectedWeekFilter !== "all") {
      list = list.filter((m) => m.week.toLowerCase().trim() === selectedWeekFilter.toLowerCase().trim());
    }

    if (teamFilter === "exercises") list = list.filter((m) => m.exercises && m.exercises.length > 2);
    if (teamFilter === "sports") list = list.filter((m) => m.sports && m.sports.length > 2);
    if (teamFilter === "skills") list = list.filter((m) => m.skills && m.skills.length > 2);
    if (teamFilter === "tadreeb") list = list.filter((m) => m.tadreeb && m.tadreeb.length > 2);

    // Always sort Pinned Current Active Week items to the top!
    return [...list].sort((a, b) => (b.isCurrentWeek ? 1 : 0) - (a.isCurrentWeek ? 1 : 0));
  }, [matrixDataWithActive, selectedWeekFilter, activeWeekName, teamFilter]);

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <PageHeader
        title="Content & Activity Planner"
        description="Design 4-category curriculum plans (Sports, Skills, Tadreeb, Exercises), weekly session blocks, and park-level activity syllabus."
        actions={
          <Button
            onClick={() => {
              closeCreateDialog();
              setCreateOpen(true);
            }}
            className="bg-[#4B0A8F] hover:bg-[#380668] text-white font-bold rounded-xl h-10 text-xs shadow-md"
          >
            <Plus className="size-4 mr-2" />
            Create Content Plan
          </Button>
        }
      />

      {/* KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm bg-gradient-to-br from-purple-500/5 to-indigo-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground">Total Master Plans</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{plans.length}</p>
              <p className="text-[11px] text-purple-600 font-bold mt-0.5">Lahore Batch 4 Curriculum</p>
            </div>
            <div className="size-11 rounded-2xl bg-purple-600/10 flex items-center justify-center text-purple-600">
              <BookOpen className="size-6" />
            </div>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground">Active Week Window</p>
              <p className="text-xl font-black text-slate-900 dark:text-slate-100">{activeWeekName}</p>
              <p className="text-[11px] text-emerald-600 font-bold mt-0.5">{currentWeekDateRange.label}</p>
            </div>
            <div className="size-11 rounded-2xl bg-emerald-600/10 flex items-center justify-center text-emerald-600">
              <CalendarDays className="size-6" />
            </div>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground">Collaboration Teams</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">4 Teams</p>
              <p className="text-[11px] text-blue-600 font-bold mt-0.5">Exercises, Sports, Skills, Tadreeb</p>
            </div>
            <div className="size-11 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600">
              <Layers className="size-6" />
            </div>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm bg-gradient-to-br from-amber-500/5 to-orange-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground">Active Scope</p>
              <p className="text-xl font-black text-slate-900 dark:text-slate-100">Lahore Batch 4</p>
              <p className="text-[11px] text-amber-600 font-bold mt-0.5">6 Supervised Parks</p>
            </div>
            <div className="size-11 rounded-2xl bg-amber-600/10 flex items-center justify-center text-amber-600">
              <Target className="size-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl h-11">
          <TabsTrigger value="roster" className="rounded-xl text-xs font-bold px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 shadow-sm">
            <BookOpen className="size-4 mr-2 text-purple-600" />
            Curriculum Plans Roster
          </TabsTrigger>
          <TabsTrigger value="matrix" className="rounded-xl text-xs font-bold px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 shadow-sm">
            <Sparkles className="size-4 mr-2 text-amber-500" />
            Lahore Batch 4 Running Syllabus Matrix ({filteredMatrix.length} items)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search plan title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl text-xs font-medium"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-10 rounded-xl text-xs font-bold"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((plan) => (
              <Card key={plan.id} className="rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <Badge className="bg-purple-100 text-purple-800 text-[10px] font-bold">
                      {plan.kind === "base" ? "Base Master Syllabus" : "Park Override"}
                    </Badge>
                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {plan.status}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-slate-100 leading-tight">{plan.name}</h3>
                    <p className="text-xs font-bold text-purple-600 mt-1">{plan.city?.name || "Lahore"} • {plan.batch?.name || "Lahore Batch 4"}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                    <span className="text-muted-foreground font-medium">Session Modules:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">68 Extracted Excel Sessions</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      onClick={() => {
                        setActiveTab("matrix");
                        toast.success("Switched to Lahore Batch 4 Syllabus Matrix!");
                      }}
                      className="flex-1 bg-[#4B0A8F] hover:bg-[#380668] text-white font-bold rounded-xl h-9 text-xs"
                    >
                      Syllabus Matrix <ChevronRight className="size-4 ml-1" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleEditClick(plan)}
                      className="size-9 rounded-xl text-slate-600 hover:text-purple-700 hover:bg-purple-50"
                    >
                      <Edit className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setDeletingPlan(plan)}
                      className="size-9 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="matrix" className="space-y-4 w-full">
          {/* Active Week Range Selector Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar w-full">
            <span className="text-xs font-bold text-slate-500 mr-1 shrink-0 flex items-center gap-1">
              <Pin className="size-3.5 text-purple-600" /> Current Active Week Focus:
            </span>
            {[
              { id: "active", label: `📌 ${activeWeekName} (${currentWeekDateRange.label})` },
              { id: "Week 1", label: "Week 1" },
              { id: "Week 2", label: "Week 2" },
              { id: "Week 3", label: "Week 3" },
              { id: "Week 4", label: "Week 4" },
              { id: "Week 5", label: "Week 5" },
              { id: "Week 6", label: "Week 6" },
              { id: "Week 7", label: "Week 7" },
              { id: "Week 8", label: "Week 8" },
              { id: "all", label: "All Weeks (Full Roster)" },
            ].map((wTab) => (
              <button
                key={wTab.id}
                onClick={() => setSelectedWeekFilter(wTab.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border",
                  selectedWeekFilter === wTab.id
                    ? "bg-[#4B0A8F] text-white border-[#4B0A8F] shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                )}
              >
                {wTab.label}
              </button>
            ))}
          </div>

          {/* Team Filter Pills & View Switcher */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm w-full">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-slate-500 shrink-0 mr-1">View Team Syllabus:</span>
              {[
                { id: "all", label: "All Categories", icon: Sparkles },
                { id: "exercises", label: "Exercises & Martial Arts", icon: Activity },
                { id: "sports", label: "Sports Game", icon: Flame },
                { id: "skills", label: "Skills Module & Activity", icon: Brain },
                { id: "tadreeb", label: "Tadreeb & Seerah Topic", icon: Heart },
              ].map((t) => {
                const IconComponent = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTeamFilter(t.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 border",
                      teamFilter === t.id
                        ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                        : "bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                    )}
                  >
                    <IconComponent className="size-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <Button
                size="sm"
                variant={viewMode === "cards" ? "default" : "ghost"}
                onClick={() => setViewMode("cards")}
                className={cn("h-7 px-2.5 rounded-lg text-xs font-bold gap-1", viewMode === "cards" && "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs")}
              >
                <LayoutGrid className="size-3.5" /> Web Cards
              </Button>
              <Button
                size="sm"
                variant={viewMode === "table" ? "default" : "ghost"}
                onClick={() => setViewMode("table")}
                className={cn("h-7 px-2.5 rounded-lg text-xs font-bold gap-1", viewMode === "table" && "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs")}
              >
                <TableIcon className="size-3.5" /> Table View
              </Button>
            </div>
          </div>

          {/* Render Mode 1: Modern Web Cards Grid (1 Active Week Plan) */}
          {viewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
              <AnimatePresence mode="popLayout">
                {filteredMatrix.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="w-full"
                  >
                    <Card
                      className={cn(
                        "rounded-2xl border-0 ring-1 shadow-sm hover:shadow-md transition-all overflow-hidden h-full flex flex-col justify-between bg-card relative w-full",
                        item.isCurrentWeek
                          ? "ring-2 ring-purple-600 dark:ring-purple-500 shadow-purple-500/10"
                          : "ring-slate-200 dark:ring-slate-800"
                      )}
                    >
                      {item.isCurrentWeek && (
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[11px] font-black py-1 px-3 flex items-center justify-between">
                          <span className="flex items-center gap-1 truncate max-w-[240px] sm:max-w-[280px]">
                            <Pin className="size-3 text-amber-300 fill-amber-300 shrink-0" /> PINNED ACTIVE WEEK ({currentWeekDateRange.label})
                          </span>
                          <Badge className="bg-amber-400 text-slate-900 font-bold text-[9px] px-1.5 py-0 shrink-0">ACTIVE NOW</Badge>
                        </div>
                      )}

                      <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-between">
                        <div>
                          <span className="text-xs font-black text-[#4B0A8F] tracking-wide">{item.week} • {item.day}</span>
                          {item.date && <span className="text-[10px] text-muted-foreground block font-semibold">{item.date}</span>}
                        </div>
                        {item.focus && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold">
                            {item.focus}
                          </Badge>
                        )}
                      </CardHeader>

                      <CardContent className="p-4 space-y-3 text-xs flex-1 w-full max-w-full overflow-hidden">
                        {(teamFilter === "all" || teamFilter === "exercises") && item.exercises && (
                          <div className="space-y-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 w-full overflow-hidden">
                            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                              <Activity className="size-3.5 text-slate-500 shrink-0" /> Exercises & Martial Arts
                            </div>
                            <FormattedContentWithLinks content={item.exercises} />
                          </div>
                        )}

                        {(teamFilter === "all" || teamFilter === "sports") && item.sports && (
                          <div className="space-y-1 p-2.5 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-900/30 w-full overflow-hidden">
                            <div className="flex items-center gap-1.5 font-bold text-orange-700 dark:text-orange-400">
                              <Flame className="size-3.5 text-orange-500 shrink-0" /> Sports Game
                            </div>
                            <p className="text-slate-800 dark:text-slate-200 font-bold text-sm leading-relaxed break-words">{item.sports}</p>
                          </div>
                        )}

                        {(teamFilter === "all" || teamFilter === "skills") && item.skills && (
                          <div className="space-y-1 p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30 w-full overflow-hidden">
                            <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-400">
                              <Brain className="size-3.5 text-blue-500 shrink-0" /> Skills Module & Activity
                            </div>
                            <FormattedContentWithLinks content={item.skills} />
                          </div>
                        )}

                        {(teamFilter === "all" || teamFilter === "tadreeb") && item.tadreeb && (
                          <div className="space-y-1 p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/30 w-full overflow-hidden">
                            <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400">
                              <Heart className="size-3.5 text-rose-500 shrink-0" /> Tadreeb & Seerah Topic
                            </div>
                            <FormattedContentWithLinks content={item.tadreeb} />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            /* Render Mode 2: Formatted Table View */
            <Card className="rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm overflow-hidden p-6 space-y-4 bg-card w-full">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <CalendarDays className="size-4 text-purple-600" /> Active Week Plan Table ({selectedWeekFilter === "active" ? activeWeekName : selectedWeekFilter})
                </h3>
                <Badge className="bg-purple-100 text-purple-800 font-bold text-xs">
                  {filteredMatrix.length} Items
                </Badge>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm min-w-[700px]">
                  <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5 w-36">Week / Day</th>
                      <th className="p-3.5"><div className="flex items-center gap-1.5"><Activity className="size-4 text-slate-500" /> Exercises</div></th>
                      <th className="p-3.5"><div className="flex items-center gap-1.5"><Flame className="size-4 text-orange-500" /> Sports Game</div></th>
                      <th className="p-3.5"><div className="flex items-center gap-1.5"><Brain className="size-4 text-blue-500" /> Skills Module</div></th>
                      <th className="p-3.5"><div className="flex items-center gap-1.5"><Heart className="size-4 text-rose-500" /> Tadreeb & Seerah</div></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                    {filteredMatrix.map((row) => (
                      <tr
                        key={row.id}
                        className={cn(
                          "transition-colors align-top",
                          row.isCurrentWeek
                            ? "bg-purple-50/70 dark:bg-purple-950/30 border-l-4 border-l-purple-600"
                            : "hover:bg-purple-50/20 dark:hover:bg-purple-950/10"
                        )}
                      >
                        <td className="p-3.5 font-bold text-[#4B0A8F]">
                          {row.isCurrentWeek && (
                            <Badge className="bg-purple-600 text-white text-[9px] font-bold mb-1 block w-fit">
                              📌 Pinned Active Week
                            </Badge>
                          )}
                          <div>{row.week} • {row.day}</div>
                          {row.date && <span className="text-[10px] text-muted-foreground font-normal block">{row.date}</span>}
                        </td>
                        <td className="p-3.5 font-medium max-w-xs"><FormattedContentWithLinks content={row.exercises} /></td>
                        <td className="p-3.5 font-bold text-orange-700 dark:text-orange-400">{row.sports || "—"}</td>
                        <td className="p-3.5 font-medium max-w-sm"><FormattedContentWithLinks content={row.skills} /></td>
                        <td className="p-3.5 font-medium max-w-sm"><FormattedContentWithLinks content={row.tadreeb} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create / Edit Plan Modal */}
      <Dialog open={createOpen || !!editingPlan} onOpenChange={(open) => { if (!open) closeCreateDialog(); }}>
        <DialogContent className="rounded-2xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">{editingPlan ? "Edit Content Plan" : "Create Content Plan"}</DialogTitle>
            <DialogDescription className="text-xs">
              {editingPlan ? "Update content plan details for Lahore Batch 4." : "Add a new curriculum syllabus plan."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-3 py-2">
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground">Plan Title *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Lahore Batch 4 Shabab Content & Activity Syllabus 2026"
                className="rounded-xl text-xs font-medium mt-1"
              />
            </div>

            <div>
              <Label className="text-[11px] font-bold text-muted-foreground">Plan Kind</Label>
              <Select value={formKind} onValueChange={(val: "base" | "custom") => setFormKind(val)}>
                <SelectTrigger className="w-full h-10 rounded-xl text-xs font-bold mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">Base Master Syllabus (Standard)</SelectItem>
                  <SelectItem value="custom">Park Override (Custom Plan)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={closeCreateDialog} className="rounded-xl font-bold">Cancel</Button>
              <Button
                type="submit"
                disabled={!formName || createMutation.isPending || updateMutation.isPending}
                className="bg-[#4B0A8F] hover:bg-[#380668] text-white font-bold rounded-xl px-5"
              >
                {createMutation.isPending || updateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : editingPlan ? "Save Changes" : "Create Content Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Plan Confirmation Dialog */}
      <Dialog open={!!deletingPlan} onOpenChange={(open) => !open && setDeletingPlan(null)}>
        <DialogContent className="rounded-2xl max-w-sm p-6 space-y-3">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-red-600 flex items-center gap-2">
              <Trash2 className="size-5" /> Delete Content Plan
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete <span className="font-bold text-slate-900">{deletingPlan?.name}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeletingPlan(null)} className="rounded-xl font-bold">Cancel</Button>
            <Button
              onClick={() => deletingPlan && deleteMutation.mutate(deletingPlan.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl px-4"
            >
              {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
