"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useDebounce } from "@/hooks/use-debounce";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Search,
  Filter,
  X,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PIPELINE_STATUSES = [
  "submitted",
  "screening",
  "interview_scheduled",
  "interviewed",
  "accepted",
  "rejected",
  "enrolled",
] as const;

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  submitted: { label: "Submitted", bg: "bg-slate-100", text: "text-slate-700" },
  screening: { label: "Screening", bg: "bg-amber-50", text: "text-amber-700" },
  interview_scheduled: { label: "Interview Scheduled", bg: "bg-blue-50", text: "text-blue-700" },
  interviewed: { label: "Interviewed", bg: "bg-[#F3ECF6]", text: "text-[#4B0A8F]" },
  accepted: { label: "Accepted", bg: "bg-green-50", text: "text-green-700" },
  rejected: { label: "Rejected", bg: "bg-red-50", text: "text-red-600" },
  enrolled: { label: "Enrolled", bg: "bg-emerald-50", text: "text-emerald-700" },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: "easeOut" },
  }),
};

export function MobileAdmissionsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admissions", debouncedSearch, statusFilter, "", page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("pageSize", "20");
      return fetch(`/api/admin/admissions?${params}`).then((r) => r.json());
    },
  });

  const applications = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col min-h-screen bg-muted/30 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Admissions</h1>
            <p className="text-sm text-muted-foreground">Manage applications</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="size-11 rounded-full relative"
            onClick={() => setFilterOpen(true)}
          >
            <Filter className="size-5" />
            {statusFilter !== "all" && (
              <span className="absolute top-0 right-0 size-3 rounded-full bg-[#4B0A8F]" />
            )}
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search applications..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 pr-9 h-11 bg-background rounded-xl"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center justify-center size-8 rounded-full"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="rounded-2xl border-border/50">
                <CardContent className="p-4 flex gap-3">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && applications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <FileText className="size-8 text-muted-foreground/50" />
            </div>
            <p className="font-semibold text-lg mb-1">No applications</p>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              {search ? "Try adjusting your search" : "No admissions available"}
            </p>
          </div>
        )}

        <AnimatePresence>
          {!isLoading && applications.map((app: any, i: number) => {
            const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.submitted;
            return (
              <motion.div
                key={app.id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                layout
              >
                <Card className="rounded-2xl overflow-hidden active:scale-[0.98] transition-transform">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate leading-tight">{app.applicantName}</h3>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{app.trackingCode}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 border-0 shrink-0", cfg.bg, cfg.text)}>
                        {cfg.label}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t text-xs text-muted-foreground">
                      <span>{app.preferredPark?.name || "No Park"}</span>
                      <span>{format(new Date(app.createdAt), "dd MMM yyyy")}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" className="h-10 rounded-xl" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <span className="text-sm font-medium text-muted-foreground">{page} / {pagination.totalPages}</span>
            <Button variant="outline" className="h-10 rounded-xl" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      <div className="h-6" />

      {/* Filter Sheet */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-8 pt-6">
          <SheetTitle className="mb-4">Filter Admissions</SheetTitle>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {PIPELINE_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full h-12 rounded-xl bg-[#4B0A8F] text-white mt-4" onClick={() => setFilterOpen(false)}>
              Apply
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
