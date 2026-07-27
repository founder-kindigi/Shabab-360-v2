"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  ChevronLeft,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
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

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "null";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

// ---------------------------------------------------------------------------
// Diff Component
// ---------------------------------------------------------------------------

function DiffDisplay({ oldValues, newValues }: { oldValues: string | null; newValues: string | null }) {
  let oldParsed: Record<string, unknown> = {};
  let newParsed: Record<string, unknown> = {};

  try { oldParsed = oldValues ? JSON.parse(oldValues) : {}; } catch { oldParsed = {}; }
  try { newParsed = newValues ? JSON.parse(newValues) : {}; } catch { newParsed = {}; }

  if (oldValues && newValues && Object.keys(oldParsed).length > 0 && Object.keys(newParsed).length > 0) {
    const allKeys = Array.from(new Set([...Object.keys(oldParsed), ...Object.keys(newParsed)])).sort();
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

          if (!changed && !removed && !added) return null;

          return (
            <div key={key} className="text-xs">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-medium text-muted-foreground font-mono">{key}</span>
              </div>
              <div className="space-y-0.5 ml-1">
                {removed ? (
                  <div className="flex items-start gap-1.5">
                    <Minus className="size-3 text-red-500 mt-0.5 shrink-0" />
                    <code className="bg-red-50 text-red-700 rounded px-1.5 py-0.5 break-all font-mono">{oldStr}</code>
                  </div>
                ) : added ? (
                  <div className="flex items-start gap-1.5">
                    <Plus className="size-3 text-green-600 mt-0.5 shrink-0" />
                    <code className="bg-green-50 text-green-700 rounded px-1.5 py-0.5 break-all font-mono">{newStr}</code>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-1.5">
                      <Minus className="size-3 text-red-500 mt-0.5 shrink-0" />
                      <code className="bg-red-50 text-red-700 rounded px-1.5 py-0.5 break-all font-mono line-through opacity-70">{oldStr}</code>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Plus className="size-3 text-green-600 mt-0.5 shrink-0" />
                      <code className="bg-green-50 text-green-700 rounded px-1.5 py-0.5 break-all font-mono">{newStr}</code>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (newValues && Object.keys(newParsed).length > 0) {
    return (
      <div className="space-y-1">
        {Object.entries(newParsed).map(([key, value]) => (
          <div key={key} className="text-xs flex items-start gap-1.5">
            <Plus className="size-3 text-green-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="font-medium text-muted-foreground font-mono">{key}: </span>
              <code className="bg-green-50 text-green-700 rounded px-1 py-0.5 break-all font-mono">{formatValue(value)}</code>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (oldValues && Object.keys(oldParsed).length > 0) {
    return (
      <div className="space-y-1">
        {Object.entries(oldParsed).map(([key, value]) => (
          <div key={key} className="text-xs flex items-start gap-1.5">
            <Minus className="size-3 text-red-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="font-medium text-muted-foreground font-mono">{key}: </span>
              <code className="bg-red-50 text-red-700 rounded px-1 py-0.5 break-all font-mono">{formatValue(value)}</code>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (newValues) return <pre className="text-[10px] bg-muted/50 rounded-md p-2 overflow-x-auto font-mono whitespace-pre-wrap break-all">{newValues}</pre>;
  if (oldValues) return <pre className="text-[10px] bg-muted/50 rounded-md p-2 overflow-x-auto font-mono whitespace-pre-wrap break-all">{oldValues}</pre>;
  return null;
}

// ---------------------------------------------------------------------------
// Card Component
// ---------------------------------------------------------------------------

function AuditLogCard({ log }: { log: AuditLogEntry }) {
  const [showDetails, setShowDetails] = useState(false);
  const hasDetails = log.oldValues || log.newValues || log.reason;
  const hasDiff = (log.oldValues && log.newValues) || log.newValues || log.oldValues;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border bg-card p-4 space-y-3 shadow-sm"
      onClick={() => hasDetails && setShowDetails(!showDetails)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-xl bg-[#F3ECF6] p-2.5 dark:bg-[#1F0860] shrink-0">
            <ScrollText className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold truncate">
                {log.user?.name || log.user?.email || "System"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPKT(new Date(log.createdAt), "dd MMM, hh:mm a")}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={`text-[10px] font-mono shrink-0 ${getActionBadgeStyle(log.action)}`}>
          {log.action}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1 pl-11 border-t border-border/40 mt-2">
        <span className="font-medium text-foreground capitalize">
          {log.entityType.replace(/_/g, " ")}
        </span>
        {log.entityId && (
          <code className="bg-muted px-1 py-0.5 rounded text-[10px] font-mono">
            ID: {log.entityId.slice(0, 8)}
          </code>
        )}
      </div>

      <AnimatePresence>
        {showDetails && hasDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-xl border bg-muted/20 p-3 space-y-3">
              {hasDiff && <DiffDisplay oldValues={log.oldValues} newValues={log.newValues} />}
              {log.reason && (
                <div className="space-y-1 pt-2 border-t border-border/50">
                  <span className="text-xs font-semibold text-muted-foreground">Reason</span>
                  <p className="text-xs bg-[#F3ECF6]/50 dark:bg-[#1F086080]/50 rounded-md p-2 border border-[#D4B8E3]/30 dark:border-[#2A0C8F]/30">
                    {log.reason}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function MobileAuditLogPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [page, setPage] = useState(1);

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

  const { data, isLoading, isFetching, refetch } = useQuery<AuditLogResponse>({
    queryKey: ["audit-log", actionFilter, entityFilter, fromDate, toDate, page],
    queryFn: () => fetch(`/api/admin/audit-log?${buildQueryParams()}`).then((r) => r.json()),
    staleTime: 10000,
  });

  const logs = data?.data || [];
  const totalItems = data?.pagination?.totalItems || 0;
  const totalPages = data?.pagination?.totalPages || 1;
  const showFrom = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showTo = Math.min(page * PAGE_SIZE, totalItems);

  function clearAllFilters() {
    setActionFilter("");
    setEntityFilter("");
    setFromDate(undefined);
    setToDate(undefined);
    setPage(1);
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header & Filters */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pt-2 pb-3 border-b border-border/50 px-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate text-[#4B0A8F] dark:text-purple-300">Audit Log</h1>
            <p className="text-xs text-muted-foreground truncate">
              System changes & user actions
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()} className="rounded-xl">
            <RefreshCw className="size-5" />
          </Button>
        </div>

        {/* Scrollable Filters */}
        <div className="flex overflow-x-auto gap-2 pb-1 -mx-4 px-4 scrollbar-hide">
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v === "__all__" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-[130px] h-10 rounded-xl text-xs bg-card shrink-0">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {ACTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value || "__all__"} value={opt.value || "__all__"}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v === "__all__" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-[130px] h-10 rounded-xl text-xs bg-card shrink-0">
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {ENTITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value || "__all__"} value={opt.value || "__all__"}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover open={fromOpen} onOpenChange={setFromOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[120px] h-10 justify-start text-xs rounded-xl shrink-0">
                <CalendarIcon className="mr-2 size-3.5" />
                {fromDate ? format(fromDate, "dd MMM yyyy") : "From Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-xl">
              <Calendar mode="single" selected={fromDate} onSelect={(d) => { setFromDate(d); setFromOpen(false); setPage(1); }} />
            </PopoverContent>
          </Popover>

          <Popover open={toOpen} onOpenChange={setToOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[120px] h-10 justify-start text-xs rounded-xl shrink-0">
                <CalendarIcon className="mr-2 size-3.5" />
                {toDate ? format(toDate, "dd MMM yyyy") : "To Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-xl">
              <Calendar mode="single" selected={toDate} onSelect={(d) => { setToDate(d); setToOpen(false); setPage(1); }} />
            </PopoverContent>
          </Popover>

          {(actionFilter || entityFilter || fromDate || toDate) && (
            <Button variant="ghost" className="h-10 text-xs rounded-xl shrink-0" onClick={clearAllFilters}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 px-4 pt-4">
        {(isLoading || (isFetching && logs.length === 0)) ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground flex flex-col items-center">
            <ScrollText className="size-10 opacity-30 mb-2" />
            <p className="text-sm">No audit logs found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <AuditLogCard key={log.id} log={log} />
            ))}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  {showFrom}–{showTo} of {totalItems}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="size-10 rounded-xl" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="size-10 rounded-xl" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {isFetching && logs.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Loading...</span>
          </div>
        )}
        
        <div className="h-6" />
      </div>
    </div>
  );
}
