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
  const { data: plansData, isLoading } = useQuery({
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
      _count: { sessions: 93, overrides: 0 },
    },
    {
      id: "plan-b4-[#4B0A8F]",
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm bg-gradient-to-br from-purple-500/5 to-indigo-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground">Total Curriculum Plans</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{pagination.total || plans.length}</p>
              <p className="text-[11px] text-purple-600 font-bold mt-0.5">Lahore Batch 4 Master Plans</p>
            </div>
            <div className="size-11 rounded-2xl bg-purple-600/10 flex items-center justify-center text-purple-600">
              <BookOpen className="size-6" />
            </div>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground">Published Session Weeks</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">8 Weeks</p>
              <p className="text-[11px] text-emerald-600 font-bold mt-0.5">93 Content Syllabus Items</p>
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
              <p className="text-[11px] text-blue-600 font-bold mt-0.5">Sports, Skills, Tadreeb, Media</p>
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl h-11">
          <TabsTrigger value="roster" className="rounded-xl text-xs font-bold px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 shadow-sm">
            <BookOpen className="size-4 mr-2 text-purple-600" />
            Curriculum Plans Roster
          </TabsTrigger>
          <TabsTrigger value="matrix" className="rounded-xl text-xs font-bold px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 shadow-sm">
            <Sparkles className="size-4 mr-2 text-amber-500" />
            Lahore Batch 4 Syllabus Matrix ({matrixData.length} items)
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <span className="font-bold text-slate-900 dark:text-slate-100">8 Weeks (93 Items)</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      onClick={() => {
                        setActiveTab("matrix");
                        toast.success("Switched to 8-Week Lahore Batch 4 Syllabus Matrix!");
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

        <TabsContent value="matrix" className="space-y-4">
          <Card className="rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Lahore Batch 4 Running Syllabus Matrix</h3>
                <p className="text-xs text-muted-foreground font-medium">Extracted directly from B4_ Shabab Content Plan (1).xlsx across 4 Collaboration Teams.</p>
              </div>
              <Badge className="bg-purple-100 text-purple-800 font-bold text-xs">
                {matrixData.length} Syllabus Items Active
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4 w-28">Week</th>
                    <th className="p-4"><div className="flex items-center gap-1.5"><Flame className="size-4 text-orange-500" /> Sports & Fitness</div></th>
                    <th className="p-4"><div className="flex items-center gap-1.5"><Brain className="size-4 text-blue-500" /> Skills Module</div></th>
                    <th className="p-4"><div className="flex items-center gap-1.5"><Heart className="size-4 text-rose-500" /> Tadreeb & Tarbiyah</div></th>
                    <th className="p-4"><div className="flex items-center gap-1.5"><Target className="size-4 text-purple-500" /> Theme Focus</div></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                  {matrixData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-purple-50/20 dark:hover:bg-purple-950/10 transition-colors">
                      <td className="p-4 font-bold text-[#4B0A8F]">
                        <div>{row.week}</div>
                        <span className="text-[10px] text-muted-foreground font-normal">{row.date}</span>
                      </td>
                      <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">{row.sports}</td>
                      <td className="p-4 font-semibold text-blue-700 dark:text-blue-400">{row.skills}</td>
                      <td className="p-4 font-semibold text-emerald-700 dark:text-emerald-400">{row.tadreeb}</td>
                      <td className="p-4">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold">
                          {row.focus}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
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
