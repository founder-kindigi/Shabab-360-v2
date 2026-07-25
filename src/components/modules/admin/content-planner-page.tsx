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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Plus,
  Search,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  Building2,
  FileCheck,
  Archive,
  CheckCircle2,
  Clock,
  ChevronRight,
  Brain,
  Dumbbell,
  Heart,
  BookMarked,
  Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  // ─── Fetch Cities ────────────────────────────────────────────────────────
  const { data: cities } = useQuery<CityOption[]>({
    queryKey: ["cities-select-content-planner"],
    queryFn: () => fetch("/api/admin/cities").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  // Default city for HQ if not selected
  const effectiveCityId = cityFilter || (cities && cities.length > 0 ? cities[0].id : "");

  // ─── Fetch Batches ───────────────────────────────────────────────────────
  const { data: batches } = useQuery<BatchOption[]>({
    queryKey: ["batches-select-content-planner", effectiveCityId],
    queryFn: () =>
      fetch(`/api/admin/batches${effectiveCityId ? `?cityId=${effectiveCityId}` : ""}`)
        .then((r) => r.json())
        .then((d: any) => (Array.isArray(d) ? d : d.data || [])),
    enabled: !!effectiveCityId,
  });

  // ─── Query Content Plans ──────────────────────────────────────────────────
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

  const plans = plansData?.plans || [];
  const pagination = plansData?.pagination || { page: 1, totalPages: 1, total: 0 };

  // ─── Create Mutation ──────────────────────────────────────────────────────
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
    if (!formName.trim()) {
      setFormErrors({ name: "Plan title is required" });
      return;
    }
    const targetCity = formCityId || effectiveCityId;
    if (!targetCity) {
      setFormErrors({ cityId: "Please select a city" });
      return;
    }
    createMutation.mutate({
      name: formName.trim(),
      kind: formKind,
      cityId: targetCity,
      batchId: formBatchId || undefined,
    });
  }

  // Calculate Stat Cards
  const totalPlansCount = pagination.total || plans.length;
  const publishedCount = plans.filter((p) => p.status === "published").length;
  const totalSessionsCount = plans.reduce((acc, p) => acc + (p._count?.sessions || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Planner"
        description="Design four-category curriculum plans (Mind, Body, Soul), session blocks, and city-level publishing workflows."
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

      {/* ─── Metric Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-[#4B0A8F]/10">
              <BookOpen className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Total Plans</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className="text-2xl font-bold tabular-nums">{totalPlansCount}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-500/10">
              <FileCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Published</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {publishedCount}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-amber-500/10">
              <Layers className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Total Sessions</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className="text-2xl font-bold tabular-nums">{totalSessionsCount}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-[#A0006B]/10">
              <Sparkles className="size-4 text-[#A0006B] dark:text-[#E06BAF]" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Pillars</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              <Brain className="size-3 mr-1" /> Mind
            </Badge>
            <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300">
              <Dumbbell className="size-3 mr-1" /> Body
            </Badge>
            <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
              <Heart className="size-3 mr-1" /> Soul
            </Badge>
          </div>
        </motion.div>
      </div>

      {/* ─── Filters & Controls ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search plans by name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-10"
          />
        </div>

        {/* City Filter */}
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
                  {city.name} ({city.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Status Filter */}
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

        {/* Kind Filter */}
        <Select
          value={kindFilter}
          onValueChange={(val) => {
            setKindFilter(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-36 h-10">
            <BookMarked className="size-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="base">Base Plans</SelectItem>
            <SelectItem value="custom">Custom Plans</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ─── Plan Cards List ───────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
          title="No Content Plans Found"
          description={
            search || statusFilter !== "all"
              ? "No content plans match your selected filters. Try clearing your search."
              : "Get started by creating your first curriculum content plan."
          }
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-bold text-foreground">
                          {plan.name}
                        </CardTitle>
                        {plan.city && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="size-3" /> {plan.city.name}
                            {plan.batch && ` · ${plan.batch.name}`}
                          </p>
                        )}
                      </div>

                      <Badge
                        className={
                          plan.status === "published"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200"
                            : plan.status === "draft"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200"
                        }
                      >
                        {plan.status === "published" && <CheckCircle2 className="size-3 mr-1" />}
                        {plan.status === "draft" && <Clock className="size-3 mr-1" />}
                        {plan.status === "archived" && <Archive className="size-3 mr-1" />}
                        {plan.status.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    <div className="flex items-center gap-2 pt-2 border-t text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[11px]">
                        {plan.kind === "base" ? "Base Curriculum" : "Custom Plan"}
                      </Badge>

                      <span className="flex items-center gap-1 ml-auto font-medium text-foreground">
                        <Layers className="size-3.5 text-[#4B0A8F] dark:text-[#B87EE0]" />
                        {plan._count?.sessions || 0} Sessions
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full text-xs font-semibold hover:bg-[#F3ECF6] dark:hover:bg-[#1F086080] text-[#4B0A8F] dark:text-[#B87EE0] border-[#4B0A8F]/20"
                      onClick={() => {
                        toast.info(`Plan "${plan.name}" selected. Sessions view initialized.`);
                      }}
                    >
                      View & Manage Plan
                      <ChevronRight className="size-3.5 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ─── Create Content Plan Dialog ────────────────────────────────────── */}
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
              <Label htmlFor="planName">Plan Title *</Label>
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
                  <SelectItem value="base">Base Plan (Standard Master Curriculum)</SelectItem>
                  <SelectItem value="custom">Custom Plan (Batch/Park Specific)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isHQ && cities && cities.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="planCity">City *</Label>
                <Select value={formCityId || effectiveCityId} onValueChange={setFormCityId}>
                  <SelectTrigger id="planCity">
                    <SelectValue placeholder="Select City" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.code})
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
