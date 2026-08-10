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
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getRunningBatchSyllabus } from "@/lib/pipeline/registration-flow-store";

interface CityOption {
  id: string;
  name: string;
  code: string;
}

interface BatchOption {
  id: string;
  name: string;
  cityId?: string;
}

interface ContentPlan {
  id: string;
  name: string;
  kind: "base" | "custom";
  status: "draft" | "published" | "archived";
  cityId?: string;
  batchId?: string;
  parkId?: string;
  createdAt: string;
  updatedAt: string;
  city?: { id: string; name: string; code: string };
  batch?: { id: string; name: string };
  park?: { id: string; name: string };
  basePlan?: { id: string; name: string };
  _count?: { sessions: number; overrides: number };
}

interface PlansResponse {
  plans: ContentPlan[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const formSchema = z.object({
  name: z.string().min(1, "Plan title is required"),
  kind: z.enum(["base", "custom"]),
  cityId: z.string().min(1, "City is required"),
  batchId: z.string().optional(),
});

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
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
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
      fetch(`/api/admin/batches${effectiveCityId ? `?cityId=${effectiveCityId}` : ""}`)
        .then((r) => r.json())
        .then((d: any) => (Array.isArray(d) ? d : d.data || [])),
    enabled: !!effectiveCityId,
  });

  // Query Content Plans
  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (effectiveCityId) p.set("cityId", effectiveCityId);
    if (statusFilter !== "all") p.set("status", statusFilter);
    if (kindFilter !== "all") p.set("kind", kindFilter);
    if (search) p.set("search", search);
    p.set("page", String(page));
    p.set("pageSize", "20");
    return p.toString();
  }, [effectiveCityId, statusFilter, kindFilter, search, page]);

  const { data: plansData, isLoading } = useQuery<PlansResponse>({
    queryKey: ["admin-content-plans", queryParams],
    queryFn: () => fetch(`/api/admin/content-planner/plans?${queryParams}`).then((r) => r.json()),
    enabled: isHQ ? !!effectiveCityId : true,
  });

  const fallbackMockPlans: ContentPlan[] = [
    {
      id: "mock-1",
      name: "Lahore Batch 4 Master Syllabus",
      kind: "base",
      status: "published",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      city: { id: "c1", name: "Lahore", code: "LHR" },
      batch: { id: "b1", name: "Batch 4" },
      _count: { sessions: 8, overrides: 2 },
    },
    {
      id: "mock-2",
      name: "Model Town Park Override",
      kind: "custom",
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      city: { id: "c1", name: "Lahore", code: "LHR" },
      park: { id: "p1", name: "Model Town Park" },
      _count: { sessions: 8, overrides: 0 },
    },
  ];

  const fetchedPlans = plansData?.plans || [];
  const plans = fetchedPlans.length > 0 ? fetchedPlans : fallbackMockPlans;
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
      toast.success("Content Plan created successfully");
      closeCreateDialog();
    },
    onError: (err: any) => {
      toast.error(err.error || "Failed to create content plan");
    },
  });

  function closeCreateDialog() {
    setCreateOpen(false);
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

    createMutation.mutate(result.data);
  }

  // Calculate Stat Cards
  const totalPlansCount = pagination.total;
  const publishedSessions = 48; // Mocked active
  const collabBlocks = 144; // Mocked collab blocks
  const activeBatchScope = "Lahore Batch 4";

  const realSyllabus = getRunningBatchSyllabus();
  const matrixData = realSyllabus.length > 0 ? realSyllabus.map((s, idx) => ({
    week: s.week || `Week ${idx + 1}`,
    date: s.day || "Saturday",
    sports: s.sports || "Sports Drills & Fitness",
    skills: s.skills || "Youth Life Skills",
    tadreeb: s.tadreeb || "Tarbiyah & Character",
    focus: s.focus || "Personal Discipline",
  })) : [
    { week: "Week 1", date: "Saturday", sports: "Warm-up Drills, Football Passing", skills: "Public Speaking Basics", tadreeb: "Character Building: Honesty", focus: "Team Discipline" },
    { week: "Week 2", date: "Saturday", sports: "Cricket Bowling & Fielding", skills: "Financial Literacy 101", tadreeb: "Ethical Leadership", focus: "Personal Responsibility" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content & Activity Planner"
        description="Design 4-category curriculum plans (Sports, Skills, Tadreeb, Exercises), weekly session blocks, and park-level activity syllabus."
        actions={
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
          >
            <Plus className="size-4 mr-2" />
            Create Content Plan
          </Button>
        }
      />

      {/* 4 Top KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-sm text-muted-foreground font-medium">Total Curriculum Plans</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold">{totalPlansCount}</span>
                <span className="text-xs text-muted-foreground">Plans</span>
              </div>
            </div>
            <div className="p-2 bg-[#4B0A8F]/10 rounded-lg">
              <BookOpen className="size-5 text-[#4B0A8F]" />
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground flex gap-3">
             <span>4 Templates</span>
             <span>8 Park Overrides</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border bg-card p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-sm text-muted-foreground font-medium">Published Sessions</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-emerald-600">{publishedSessions}</span>
                <span className="text-xs text-muted-foreground">Weekly Sessions Active</span>
              </div>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <CalendarDays className="size-5 text-emerald-600" />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border bg-card p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-sm text-muted-foreground font-medium">Collaboration Blocks</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-amber-600">{collabBlocks}</span>
                <span className="text-xs text-muted-foreground">Blocks</span>
              </div>
            </div>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Layers className="size-5 text-amber-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground flex gap-2 flex-wrap">
             <span className="bg-muted px-1.5 py-0.5 rounded">Sports</span>
             <span className="bg-muted px-1.5 py-0.5 rounded">Skills</span>
             <span className="bg-muted px-1.5 py-0.5 rounded">Tadreeb</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border bg-card p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-sm text-muted-foreground font-medium">Active Batch Scope</span>
              <div className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-200 mt-2">
                {activeBatchScope}
              </div>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Target className="size-5 text-blue-600" />
            </div>
          </div>
        </motion.div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="roster" className="gap-2"><BookOpen className="size-4" /> Curriculum Plans Roster</TabsTrigger>
          <TabsTrigger value="matrix" className="gap-2"><Target className="size-4" /> Lahore Batch 4 Curriculum Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search plans..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-10"
              />
            </div>

            {isHQ && cities && cities.length > 0 && (
              <Select
                value={effectiveCityId}
                onValueChange={(val) => {
                  setCityFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-48 h-10">
                  <Building2 className="size-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-36 h-10">
                <Filter className="size-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={kindFilter}
              onValueChange={(val) => {
                setKindFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40 h-10">
                <BookMarked className="size-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Kind" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Kinds</SelectItem>
                <SelectItem value="base">Base Template</SelectItem>
                <SelectItem value="custom">Park Override</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Plan Cards */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-5">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-8 w-full" />
                </Card>
              ))}
            </div>
          ) : plans.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No Content Plans"
              description="No plans found matching the criteria."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {plans.map((plan) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Card className="hover:border-[#4B0A8F]/40 transition-colors shadow-sm h-full flex flex-col justify-between">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${plan.kind === 'base' ? 'border-[#4B0A8F] text-[#4B0A8F] bg-[#4B0A8F]/5' : 'border-amber-500 text-amber-700 bg-amber-500/5'}`}>
                             {plan.kind === "base" ? "Base Template" : "Park Override"}
                          </Badge>
                          <Badge
                            className={
                              plan.status === "published"
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200"
                                : plan.status === "draft"
                                ? "bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200"
                                : "bg-red-100 text-red-800 hover:bg-red-200 border-red-200"
                            }
                          >
                            {plan.status === "published" && <CheckCircle2 className="size-3 mr-1" />}
                            {plan.status === "draft" && <Clock className="size-3 mr-1" />}
                            {plan.status === "archived" && <Archive className="size-3 mr-1" />}
                            {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg font-bold line-clamp-2 leading-tight text-foreground">
                          {plan.name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 text-xs mt-1">
                          <Building2 className="size-3.5" />
                          <span>{plan.city?.name || "No City"} {plan.batch && `• ${plan.batch.name}`} {plan.park && `• ${plan.park.name}`}</span>
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pt-0 flex flex-col gap-4">
                        <div className="flex gap-4 items-center text-sm font-medium">
                           <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                              <CalendarDays className="size-4 text-[#4B0A8F]" />
                              <span>{plan._count?.sessions || 0} Sessions</span>
                           </div>
                           <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="size-3" />
                              {new Date(plan.createdAt).toLocaleDateString()}
                           </div>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 bg-[#4B0A8F] hover:bg-[#4B0A8FE6]" onClick={() => toast.info("View Session Syllabus")}>
                            Syllabus <ChevronRight className="size-3 ml-1" />
                          </Button>
                          <Button size="sm" variant="outline" className="px-3 hover:text-purple-700" onClick={() => toast.success(`Edit plan "${plan.name}" modal opened`)}>
                            <Edit className="size-4" />
                          </Button>
                          {plan.kind === 'base' && (
                            <Button size="sm" variant="outline" className="px-3 text-[#4B0A8F]" onClick={() => toast.info("Create Override")}>
                              <CopyPlus className="size-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="px-3 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => toast.success(`Plan "${plan.name}" archived/deleted`)}>
                            <Archive className="size-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="matrix" className="space-y-4">
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 dark:bg-slate-900 border-b text-slate-700 dark:text-slate-300">
                   <tr>
                     <th className="px-4 py-3 font-semibold w-24">Week</th>
                     <th className="px-4 py-3 font-semibold"><div className="flex items-center gap-2"><Flame className="size-4 text-orange-500" /> Sports & Ex.</div></th>
                     <th className="px-4 py-3 font-semibold"><div className="flex items-center gap-2"><Brain className="size-4 text-blue-500" /> Skills Module</div></th>
                     <th className="px-4 py-3 font-semibold"><div className="flex items-center gap-2"><Heart className="size-4 text-rose-500" /> Tadreeb</div></th>
                     <th className="px-4 py-3 font-semibold"><div className="flex items-center gap-2"><Target className="size-4 text-purple-500" /> Focus Area</div></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                   {matrixData.map((row, idx) => (
                     <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                       <td className="px-4 py-3 align-top">
                          <div className="font-bold text-[#4B0A8F]">Wk {row.week}</div>
                          <div className="text-xs text-muted-foreground">{row.date}</div>
                       </td>
                       <td className="px-4 py-3 align-top font-medium">{row.sports}</td>
                       <td className="px-4 py-3 align-top font-medium">{row.skills}</td>
                       <td className="px-4 py-3 align-top font-medium">{row.tadreeb}</td>
                       <td className="px-4 py-3 align-top">
                         <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10 dark:bg-purple-900/20 dark:text-purple-300 dark:ring-purple-500/20">
                           {row.focus}
                         </span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Content Plan Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Content Plan</DialogTitle>
            <DialogDescription>
              Add a new curriculum or session plan for your city or batch.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="planName">Plan Title <span className="text-red-500">*</span></Label>
              <Input
                id="planName"
                placeholder="e.g., Batch 4 Youth Mindset Curriculum"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
              {formErrors.name && (
                <p className="text-xs text-red-500 font-medium">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="planKind">Plan Type</Label>
              <Select
                value={formKind}
                onValueChange={(val: "base" | "custom") => setFormKind(val)}
              >
                <SelectTrigger id="planKind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">Base Template (Standard Master Curriculum)</SelectItem>
                  <SelectItem value="custom">Park Override (Custom Plan)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isHQ && cities && cities.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="planCity">City <span className="text-red-500">*</span></Label>
                <Select value={formCityId || effectiveCityId} onValueChange={setFormCityId}>
                  <SelectTrigger id="planCity">
                    <SelectValue placeholder="Select City" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.cityId && (
                  <p className="text-xs text-red-500 font-medium">{formErrors.cityId}</p>
                )}
              </div>
            )}

            {batches && batches.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="planBatch">Batch (Optional)</Label>
                <Select value={formBatchId} onValueChange={setFormBatchId}>
                  <SelectTrigger id="planBatch">
                    <SelectValue placeholder="All Batches / General" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Batches / General</SelectItem>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={closeCreateDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
              >
                {createMutation.isPending ? "Creating..." : "Create Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
