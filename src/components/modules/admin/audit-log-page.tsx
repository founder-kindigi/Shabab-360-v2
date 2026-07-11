"use client";

import { useState, useCallback } from "react";
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
  User,
  Clock,
  FileText,
  Loader2,
} from "lucide-react";

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
];

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

function truncateJson(str: string | null, maxLen = 80): string {
  if (!str) return "—";
  try {
    const parsed = JSON.parse(str);
    const formatted = JSON.stringify(parsed);
    if (formatted.length <= maxLen) return formatted;
    return formatted.slice(0, maxLen) + "…";
  } catch {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + "…";
  }
}

function MetadataBlock({ label, value }: { label: string; value: string | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!value) return null;

  let parsed: string;
  try {
    parsed = JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    parsed = value;
  }

  const isLong = parsed.length > 80;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-0.5 text-xs text-[#4B0A8F] hover:text-[#4B0A8FCC] dark:text-[#8A40B0] dark:hover:text-[#8A40B0CC] cursor-pointer"
          >
            {expanded ? (
              <>
                <ChevronUp className="size-3" /> Collapse
              </>
            ) : (
              <>
                <ChevronDown className="size-3" /> Expand
              </>
            )}
          </button>
        )}
      </div>
      <pre
        className={`text-xs bg-muted/50 rounded-md p-2 overflow-x-auto font-mono whitespace-pre-wrap break-all ${
          !expanded && isLong ? "max-h-16 overflow-hidden" : ""
        }`}
      >
        {expanded || !isLong ? parsed : truncateJson(value, 80)}
      </pre>
    </div>
  );
}

export function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    if (actionFilter) params.set("action", actionFilter);
    if (entityFilter) params.set("entityType", entityFilter);
    if (fromDate) params.set("from", format(fromDate, "yyyy-MM-dd"));
    if (toDate) params.set("to", format(toDate, "yyyy-MM-dd"));
    params.set("limit", String(visibleCount));
    params.set("offset", "0");
    return params.toString();
  }, [actionFilter, entityFilter, fromDate, toDate, visibleCount]);

  const { data, isLoading, isFetching } = useQuery<{
    data: AuditLogEntry[];
    total: number;
  }>({
    queryKey: ["audit-log", actionFilter, entityFilter, fromDate, toDate, visibleCount],
    queryFn: () => {
      const qs = buildQueryParams();
      return fetch(`/api/admin/audit-log?${qs}`).then((r) => r.json());
    },
    staleTime: 10000,
  });

  const logs = data?.data || [];
  const total = data?.total || 0;
  const hasMore = logs.length < total;

  // Reset visible count when filters change
  function handleFilterChange() {
    setVisibleCount(50);
  }

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

        {(actionFilter || entityFilter || fromDate || toDate) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs"
            onClick={() => {
              setActionFilter("");
              setEntityFilter("");
              setFromDate(undefined);
              setToDate(undefined);
              handleFilterChange();
            }}
          >
            Clear all
          </Button>
        )}

        <div className="ml-auto text-xs text-muted-foreground">
          {total} {total === 1 ? "entry" : "entries"}
        </div>
      </motion.div>

      {/* Loading state */}
      {(isLoading || isFetching) && logs.length === 0 && (
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
            key={`${actionFilter}-${entityFilter}-${visibleCount}`}
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
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {logs.map((log) => (
                <AuditLogCard key={log.id} log={log} />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Loading more indicator */}
      {isFetching && logs.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-2">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading more...</span>
        </div>
      )}

      {/* Load more button */}
      {!isLoading && hasMore && !isFetching && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((prev) => prev + 50)}
          >
            Load More
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isFetching && logs.length === 0 && (
        <EmptyState
          icon={ScrollText}
          title="No audit logs found"
          description={
            actionFilter || entityFilter || fromDate || toDate
              ? "Try adjusting your filters to see more results."
              : "Audit logs will appear here as actions are performed in the system."
          }
        />
      )}
    </div>
  );
}

function AuditLogRow({ log }: { log: AuditLogEntry }) {
  const [showDetails, setShowDetails] = useState(false);
  const hasDetails = log.oldValues || log.newValues || log.reason;

  return (
    <tr className="hover:bg-muted/30 transition-colors group">
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
        {hasDetails ? (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-[#4B0A8F] hover:text-[#4B0A8FCC] dark:text-[#8A40B0] dark:hover:text-[#8A40B0CC] cursor-pointer"
          >
            {showDetails ? "Hide details" : "View details"}
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}

        {showDetails && hasDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 space-y-2 max-w-sm"
          >
            {log.oldValues && (
              <MetadataBlock label="Old Values" value={log.oldValues} />
            )}
            {log.newValues && (
              <MetadataBlock label="New Values" value={log.newValues} />
            )}
            {log.reason && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Reason</span>
                <p className="text-xs bg-muted/50 rounded-md p-2">{log.reason}</p>
              </div>
            )}
          </motion.div>
        )}
      </td>
    </tr>
  );
}

function AuditLogCard({ log }: { log: AuditLogEntry }) {
  const [showDetails, setShowDetails] = useState(false);
  const hasDetails = log.oldValues || log.newValues || log.reason;

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
          className="text-xs text-[#4B0A8F] hover:text-[#4B0A8FCC] dark:text-[#8A40B0] dark:hover:text-[#8A40B0CC] cursor-pointer"
        >
          {showDetails ? "Hide details" : "View details"}
        </button>
      )}

      <AnimatePresence>
        {showDetails && hasDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {log.oldValues && (
              <MetadataBlock label="Old Values" value={log.oldValues} />
            )}
            {log.newValues && (
              <MetadataBlock label="New Values" value={log.newValues} />
            )}
            {log.reason && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Reason</span>
                <p className="text-xs bg-muted/50 rounded-md p-2">{log.reason}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}