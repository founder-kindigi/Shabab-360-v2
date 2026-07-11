"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { formatPKT } from "@/lib/timezone";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScrollText,
  Filter,
  CalendarIcon,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  FileText,
  Loader2,
  Minus,
  Plus,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: string | null;
  newValues: string | null;
  reason: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string } | null;
}

interface AuditLogResponse {
  data: AuditLogEntry[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "CREATE", label: "CREATE" },
  { value: "UPDATE", label: "UPDATE" },
  { value: "DELETE", label: "DELETE" },
  { value: "LOGIN", label: "LOGIN" },
  { value: "LOGOUT", label: "LOGOUT" },
  { value: "RESET_PASSWORD", label: "RESET_PASSWORD" },
];

const ENTITY_OPTIONS = [
  { value: "", label: "All Entities" },
  { value: "city", label: "City" },
  { value: "park", label: "Park" },
  { value: "batch", label: "Batch" },
  { value: "group", label: "Group" },
  { value: "user", label: "User" },
  { value: "participant", label: "Participant" },
  { value: "guardian", label: "Guardian" },
  { value: "attendanceEvent", label: "AttendanceEvent" },
  { value: "fee_event", label: "FeeEvent" },
  { value: "payment", label: "Payment" },
  { value: "announcement", label: "Announcement" },
];

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getActionBadgeStyle(action: string) {
  switch (action.toUpperCase()) {
    case "CREATE":
      return "bg-[#F3ECF6] text-[#4B0A8F] border-[#D4B8E3] dark:bg-[#1F0860] dark:text-[#8A40B0] dark:border-[#2A0C8F]";
    case "UPDATE":
      return "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-400 dark:border-sky-800";
    case "DELETE":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800";
    default:
      return "bg-muted text-muted-foreground border-muted-foreground/20";
  }
}

// ---------------------------------------------------------------------------
// Diff Component
// ---------------------------------------------------------------------------

function DiffDisplay({
  oldValues,
  newValues,
}: {
  oldValues: string | null;
  newValues: string | null;
}) {
  let oldParsed: Record<string, unknown> = {};
  let newParsed: Record<string, unknown> = {};

  try {
    oldParsed = oldValues ? JSON.parse(oldValues) : {};
  } catch {
    oldParsed = {};
  }
  try {
    newParsed = newValues ? JSON.parse(newValues) : {};
  } catch {
    newParsed = {};
  }

  // If we have both old and new, show a field-level diff
  if (oldValues && newValues && Object.keys(oldParsed).length > 0 && Object.keys(newParsed).length > 0) {
    const allKeys = Array.from(
      new Set([...Object.keys(oldParsed), ...Object.keys(newParsed)])
    ).sort();

    return (
      <div className="space-y-1.5">
        {allKeys.map((key) => {
          const oldVal = oldParsed[key];
          const newVal = newParsed[key];
          const oldStr = formatValue(oldVal);
          const newStr = formatValue(newVal);
          const changed = oldStr !== newStr;
          const removed = !(key in newParsed);
          const added = !(key in oldParsed);

          return (
            <div key={key} className="text-xs">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-medium text-muted-foreground font-mono">{key}</span>
                {changed && !removed && !added && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800">
                    changed
                  </Badge>
                )}
                {added && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
                    added
                  </Badge>
                )}
                {removed && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">
                    removed
                  </Badge>
                )}
              </div>
              <div className="space-y-0.5 ml-1">
                {removed ? (
                  <div className="flex items-start gap-1.5">
                    <Minus className="size-3 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
                    <code className="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 rounded px-1.5 py-0.5 break-all font-mono">
                      {oldStr}
                    </code>
                  </div>
                ) : added ? (
                  <div className="flex items-start gap-1.5">
                    <Plus className="size-3 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                    <code className="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 rounded px-1.5 py-0.5 break-all font-mono">
                      {newStr}
                    </code>
                  </div>
                ) : changed ? (
                  <>
                    <div className="flex items-start gap-1.5">
                      <Minus className="size-3 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
                      <code className="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 rounded px-1.5 py-0.5 break-all font-mono line-through opacity-70">
                        {oldStr}
                      </code>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Plus className="size-3 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                      <code className="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 rounded px-1.5 py-0.5 break-all font-mono">
                        {newStr}
                      </code>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start gap-1.5">
                    <span className="size-3 shrink-0" />
                    <code className="bg-muted/50 rounded px-1.5 py-0.5 break-all font-mono text-muted-foreground">
                      {oldStr}
                    </code>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // If only new values (CREATE action)
  if (newValues && Object.keys(newParsed).length > 0) {
    return (
      <div className="space-y-1">
        {Object.entries(newParsed).map(([key, value]) => (
          <div key={key} className="text-xs flex items-start gap-1.5">
            <Plus className="size-3 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="font-medium text-muted-foreground font-mono">{key}: </span>
              <code className="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 rounded px-1 py-0.5 break-all font-mono">
                {formatValue(value)}
              </code>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // If only old values (DELETE action)
  if (oldValues && Object.keys(oldParsed).length > 0) {
    return (
      <div className="space-y-1">
        {Object.entries(oldParsed).map(([key, value]) => (
          <div key={key} className="text-xs flex items-start gap-1.5">
            <Minus className="size-3 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="font-medium text-muted-foreground font-mono">{key}: </span>
              <code className="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 rounded px-1 py-0.5 break-all font-mono">
                {formatValue(value)}
              </code>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Fallback: raw text display
  if (newValues) {
    return (
      <pre className="text-xs bg-muted/50 rounded-md p-2 overflow-x-auto font-mono whitespace-pre-wrap break-all">
        {newValues}
      </pre>
    );
  }
  if (oldValues) {
    return (
      <pre className="text-xs bg-muted/50 rounded-md p-2 overflow-x-auto font-mono whitespace-pre-wrap break-all">
        {oldValues}
      </pre>
    );
  }

  return null;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "null";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [page, setPage] = useState(1);

  const hasActiveFilters = !!(actionFilter || entityFilter || fromDate || toDate);

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    if (actionFilter) params.set("action", actionFilter);
    if (entityFilter) params.set("entityType", entityFilter);
    if (fromDate) params.set("from", format(fromDate, "yyyy-MM-dd"));
    if (toDate) params.set("to", format(toDate, "yyyy-MM-dd"));
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    return params.toString();
  }, [actionFilter, entityFilter, fromDate, toDate, page]);

  const { data, isLoading, isFetching } = useQuery<AuditLogResponse>({
    queryKey: ["audit-log", actionFilter, entityFilter, fromDate, toDate, page],
    queryFn: () => {
      const qs = buildQueryParams();
      return fetch(`/api/admin/audit-log?${qs}`).then((r) => r.json());
    },
    staleTime: 10000,
  });

  const logs = data?.data || [];
  const totalItems = data?.pagination?.totalItems || 0;
  const totalPages = data?.pagination?.totalPages || 1;
  const showFrom = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showTo = Math.min(page * PAGE_SIZE, totalItems);

  function handleFilterChange() {
    setPage(1);
  }

  function clearAllFilters() {
    setActionFilter("");
    setEntityFilter("");
    setFromDate(undefined);
    setToDate(undefined);
    setPage(1);
  }

  // Generate page numbers to show
  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("ellipsis");
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  }, [page, totalPages]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Track all system changes and user actions"
      />

      {/* Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Filter className="size-3" /> Action
          </label>
          <Select
            value={actionFilter}
            onValueChange={(v) => {
              setActionFilter(v === "__all__" ? "" : v);
              handleFilterChange();
            }}
          >
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value || "__all__"} value={opt.value || "__all__"}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Filter className="size-3" /> Entity
          </label>
          <Select
            value={entityFilter}
            onValueChange={(v) => {
              setEntityFilter(v === "__all__" ? "" : v);
              handleFilterChange();
            }}
          >
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="All Entities" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value || "__all__"} value={opt.value || "__all__"}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">From</label>
          <Popover open={fromOpen} onOpenChange={setFromOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[150px] h-9 justify-start text-xs font-normal"
              >
                <CalendarIcon className="mr-2 size-3.5" />
                {fromDate ? format(fromDate, "dd MMM yyyy") : "Pick date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={(d) => {
                  setFromDate(d);
                  setFromOpen(false);
                  handleFilterChange();
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">To</label>
          <Popover open={toOpen} onOpenChange={setToOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[150px] h-9 justify-start text-xs font-normal"
              >
                <CalendarIcon className="mr-2 size-3.5" />
                {toDate ? format(toDate, "dd MMM yyyy") : "Pick date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={(d) => {
                  setToDate(d);
                  setToOpen(false);
                  handleFilterChange();
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs"
            onClick={clearAllFilters}
          >
            Clear all
          </Button>
        )}
      </motion.div>

      {/* Loading state */}
      {(isLoading || (isFetching && logs.length === 0)) && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Desktop table */}
      {!isLoading && logs.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${actionFilter}-${entityFilter}-${page}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Desktop view */}
            <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-muted/80 backdrop-blur-sm">
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3" /> Timestamp
                        </div>
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <User className="size-3" /> User
                        </div>
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                        Action
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                        Entity
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <FileText className="size-3" /> Details
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {logs.map((log) => (
                      <AuditLogRow key={log.id} log={log} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-[#F3ECF6]/30 dark:bg-[#1F086080]/30">
                  <p className="text-xs text-muted-foreground">
                    Showing {showFrom}–{showTo} of {totalItems}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      disabled={page <= 1 || isFetching}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    {pageNumbers.map((p, idx) =>
                      p === "ellipsis" ? (
                        <span key={`e-${idx}`} className="px-1 text-xs text-muted-foreground">
                          ...
                        </span>
                      ) : (
                        <Button
                          key={p}
                          variant={p === page ? "default" : "outline"}
                          size="icon"
                          className={cn(
                            "size-8 text-xs",
                            p === page && "bg-[#4B0A8F] hover:bg-[#3A0870] text-white"
                          )}
                          onClick={() => setPage(p)}
                          disabled={isFetching}
                        >
                          {p}
                        </Button>
                      )
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      disabled={page >= totalPages || isFetching}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {logs.map((log) => (
                <AuditLogCard key={log.id} log={log} />
              ))}

              {/* Mobile pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    {showFrom}–{showTo} of {total}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Loading more indicator */}
      {isFetching && logs.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-2">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isFetching && logs.length === 0 && (
        <EmptyState
          icon={ScrollText}
          title="No audit logs found"
          description={
            hasActiveFilters
              ? "Try adjusting your filters to see more results."
              : "Audit logs will appear here as actions are performed in the system."
          }
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers for className
// ---------------------------------------------------------------------------
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Desktop Row
// ---------------------------------------------------------------------------

function AuditLogRow({ log }: { log: AuditLogEntry }) {
  const [showDetails, setShowDetails] = useState(false);
  const hasDetails = log.oldValues || log.newValues || log.reason;
  const hasDiff = (log.oldValues && log.newValues) || log.newValues || log.oldValues;

  return (
    <>
      <tr
        className={cn(
          "hover:bg-muted/30 transition-colors group cursor-pointer",
          showDetails && "bg-muted/20"
        )}
        onClick={() => hasDetails && setShowDetails(!showDetails)}
      >
        <td className="px-4 py-3 align-top">
          <div className="text-xs text-muted-foreground">
            {formatPKT(new Date(log.createdAt), "dd MMM yyyy")}
          </div>
          <div className="text-xs font-mono text-muted-foreground/70">
            {formatPKT(new Date(log.createdAt), "hh:mm a")}
          </div>
        </td>
        <td className="px-4 py-3 align-top">
          <span className="text-sm font-medium">
            {log.user?.name || log.user?.email || "System"}
          </span>
        </td>
        <td className="px-4 py-3 align-top">
          <Badge
            variant="outline"
            className={`text-xs font-mono ${getActionBadgeStyle(log.action)}`}
          >
            {log.action}
          </Badge>
        </td>
        <td className="px-4 py-3 align-top">
          <div className="text-sm">
            <span className="capitalize">{log.entityType.replace(/_/g, " ")}</span>
          </div>
          {log.entityId && (
            <code className="text-[10px] font-mono text-muted-foreground">
              {log.entityId.slice(0, 8)}…
            </code>
          )}
        </td>
        <td className="px-4 py-3 align-top">
          <div className="flex items-center gap-1.5">
            {hasDetails && (
              <button
                className="text-xs text-[#4B0A8F] hover:text-[#4B0A8FCC] dark:text-[#8A40B0] dark:hover:text-[#8A40B0CC] cursor-pointer flex items-center gap-1"
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="size-3" /> Hide
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3" /> View details
                  </>
                )}
              </button>
            )}
            {log.reason && !showDetails && (
              <span className="text-[10px] text-muted-foreground italic truncate max-w-[150px]">
                "{log.reason}"
              </span>
            )}
            {!hasDetails && (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded diff row */}
      <AnimatePresence>
        {showDetails && hasDetails && (
          <tr>
            <td colSpan={5} className="px-4 pb-3 pt-0">
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="rounded-lg border bg-muted/20 p-3 space-y-3 max-w-2xl ml-4">
                  {hasDiff && (
                    <DiffDisplay oldValues={log.oldValues} newValues={log.newValues} />
                  )}

                  {log.reason && (
                    <div className="space-y-1 pt-1 border-t border-border/50">
                      <span className="text-xs font-medium text-muted-foreground">Reason</span>
                      <p className="text-xs bg-[#F3ECF6]/50 dark:bg-[#1F086080]/50 rounded-md p-2 border border-[#D4B8E3]/30 dark:border-[#2A0C8F]/30">
                        {log.reason}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------
// Mobile Card
// ---------------------------------------------------------------------------

function AuditLogCard({ log }: { log: AuditLogEntry }) {
  const [showDetails, setShowDetails] = useState(false);
  const hasDetails = log.oldValues || log.newValues || log.reason;
  const hasDiff = (log.oldValues && log.newValues) || log.newValues || log.oldValues;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-card p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-lg bg-[#F3ECF6] p-2 dark:bg-[#1F0860] shrink-0">
            <ScrollText className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium truncate">
                {log.user?.name || log.user?.email || "System"}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-mono shrink-0 ${getActionBadgeStyle(log.action)}`}
              >
                {log.action}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground capitalize">
                {log.entityType.replace(/_/g, " ")}
              </span>
              {log.entityId && (
                <code className="text-[10px] font-mono text-muted-foreground/70">
                  {log.entityId.slice(0, 8)}…
                </code>
              )}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-muted-foreground">
            {formatPKT(new Date(log.createdAt), "dd MMM yyyy")}
          </div>
          <div className="text-[10px] font-mono text-muted-foreground/70">
            {formatPKT(new Date(log.createdAt), "hh:mm a")}
          </div>
        </div>
      </div>

      {hasDetails && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-[#4B0A8F] hover:text-[#4B0A8FCC] dark:text-[#8A40B0] dark:hover:text-[#8A40B0CC] cursor-pointer flex items-center gap-1"
        >
          {showDetails ? (
            <>
              <ChevronUp className="size-3" /> Hide details
            </>
          ) : (
            <>
              <ChevronDown className="size-3" /> View details
            </>
          )}
        </button>
      )}

      <AnimatePresence>
        {showDetails && hasDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            {hasDiff && (
              <div className="rounded-lg border bg-muted/20 p-3">
                <DiffDisplay oldValues={log.oldValues} newValues={log.newValues} />
              </div>
            )}

            {log.reason && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Reason</span>
                <p className="text-xs bg-[#F3ECF6]/50 dark:bg-[#1F086080]/50 rounded-md p-2 border border-[#D4B8E3]/30 dark:border-[#2A0C8F]/30">
                  {log.reason}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}