"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Clipboard, ClipboardList, Plus, FileText, AlertTriangle, Eye, BarChart3, Settings, Loader2 } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { useSession } from "next-auth/react";

// --- Types ---

interface FormItem {
  id: string;
  slug: string;
  ownerCityId: string;
  title: string;
  status: "draft" | "published" | "closed";
  version: number;
  publishedVersion: number | null;
  createdAt: string;
}

interface FormsResponse {
  data: FormItem[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function RegistrationFormsPage() {
  const selectedCityId = useAppStore((s) => s.selectedCityId);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const setSelectedFormId = useAppStore((s) => s.setSelectedFormId);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const params = new URLSearchParams();
  if (selectedCityId) params.set("cityId", selectedCityId);
  params.set("page", String(page));
  params.set("pageSize", "20");

  const { data, isLoading, error } = useQuery<FormsResponse>({
    queryKey: ["admin-registration-forms", selectedCityId, page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/registration-forms?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load forms");
      return res.json();
    },
  });

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  const navigateToForm = (id: string, view: "edit" | "submissions") => {
    setSelectedFormId(id);
    navigateTo(view === "edit" ? "admin-registration-forms-edit" : "admin-registration-forms-submissions");
  };

  const copyPublicLink = async (slug: string) => {
    const publicUrl = `${window.location.origin}/register/forms/${encodeURIComponent(slug)}`;

    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Public form link copied");
    } catch {
      toast.error("Unable to copy the public form link");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-background">
      <PageHeader title="Registration Forms" description="Build and manage registration forms for programs and events." actions={<Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" /> Create Form</Button>} />

      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/30">
            <AlertTriangle className="size-4 text-red-500" />
            <p className="text-sm text-red-700">Failed to load registration forms. Please try again.</p>
          </div>
        )}

        {data?.data?.length === 0 && !isLoading && (
          <div className="flex flex-col items-center gap-4"><EmptyState icon={ClipboardList} title="No registration forms found" description="Create your first form to start collecting registrations." /><Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" /> Create Form</Button></div>
        )}

        <div className="grid gap-4">
          {data?.data?.map((formItem) => (
            <motion.div
              key={formItem.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center p-5 gap-4">
                    <div className="flex items-center justify-center size-12 rounded-full bg-primary/10 shrink-0">
                      <FileText className="size-6 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg truncate">{formItem.title}</h3>
                        <Badge variant="outline" className={STATUS_COLORS[formItem.status]}>
                          {formItem.status.charAt(0).toUpperCase() + formItem.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        <span className="truncate">/{formItem.slug}</span>
                        <span>Created {format(new Date(formItem.createdAt), "MMM d, yyyy")}</span>
                        {formItem.status === "published" && (
                          <span className="text-primary font-medium flex items-center gap-1">
                            <Eye className="size-3" /> Live (v{formItem.publishedVersion})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-0 border-border">
                      {formItem.status === "published" && (
                        <Button variant="outline" size="sm" onClick={() => copyPublicLink(formItem.slug)}>
                          <Clipboard className="size-4 mr-2" /> Copy Link
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => navigateToForm(formItem.id, "submissions")}>
                        <BarChart3 className="size-4 mr-2" /> Submissions
                      </Button>
                      <Button variant="default" size="sm" onClick={() => navigateToForm(formItem.id, "edit")}>
                        <Settings className="size-4 mr-2" /> Manage
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>

      <CreateFormDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

function CreateFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const selectedCityId = useAppStore((s) => s.selectedCityId);
  const { data: session } = useSession();
  const assignedCityId = session?.user?.assignedCityId;
  const [formCityId, setFormCityId] = useState<string>(selectedCityId || "");

  const { data: cities, isLoading: citiesLoading, error: citiesError } = useQuery<{id: string, name: string}[]>({
    queryKey: ["admin-cities-list"],
    queryFn: async () => {
      const res = await fetch("/api/admin/cities");
      if (res.ok) {
        const json = await res.json();
        return json.data || json;
      }
      if (res.status === 403) {
        throw new Error("403");
      }
      if (res.status === 401) {
        throw new Error("401");
      }
      throw new Error("Failed to load cities context");
    },
    retry: false
  });
  const navigateTo = useAppStore((s) => s.navigateTo);
  const setSelectedFormId = useAppStore((s) => s.setSelectedFormId);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [template, setTemplate] = useState<"blank" | "atfal_style">("atfal_style");

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/registration-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to create form" }));
        throw new Error(data.error || "Failed to create form");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Form created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-registration-forms"] });
      onClose();
      // Navigate to builder
      setSelectedFormId(data.id);
      navigateTo("admin-registration-forms-edit");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const resolvedCityId = citiesError?.message === "403" ? assignedCityId : formCityId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedCityId) {
      toast.error("Please select a city context first");
      return;
    }
    createMutation.mutate({
      title,
      slug,
      template,
      ownerCityId: resolvedCityId,
      intro: "Welcome to the registration form.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Registration Form</DialogTitle>
          <DialogDescription>
            Create a new form to collect registrations. The form will be owned by your currently selected city context.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {citiesError?.message === "403" ? null : (
          <div className="space-y-2">
            <Label>Owner City</Label>
            {citiesLoading ? (
              <div className="h-10 px-3 py-2 border rounded-md text-sm text-muted-foreground flex items-center">Loading context...</div>
            ) : citiesError ? (
              <div className="h-10 px-3 py-2 border border-red-200 bg-red-50 text-red-600 rounded-md text-sm flex items-center">Failed to load city context</div>
            ) : (
              <Select value={formCityId} onValueChange={setFormCityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an owner city" />
                </SelectTrigger>
                <SelectContent>
                  {cities?.map((city: any) => (
                    <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="title">Form Title</Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Murabbi Training 2026" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug</Label>
            <Input id="slug" required value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. murabbi-training-2026" />
            <p className="text-[10px] text-muted-foreground">The public URL will be /register/forms/{slug || "slug"}</p>
          </div>
          <div className="space-y-2">
            <Label>Starter Template</Label>
            <Select value={template} onValueChange={(v: "blank" | "atfal_style") => setTemplate(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="atfal_style">Atfal-style Starter (Recommended)</SelectItem>
                <SelectItem value="blank">Blank Form</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || !(citiesError?.message === "403" ? assignedCityId : formCityId)}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Draft
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}






