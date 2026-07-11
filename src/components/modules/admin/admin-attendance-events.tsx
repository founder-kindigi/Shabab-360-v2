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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { formatPKT } from "@/lib/timezone";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarCheck,
  CalendarIcon,
  Filter,
  Lock,
  Loader2,
  MapPin,
  TreePine,
  Users,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AttendanceEvent {
  id: string;
  title: string;
  groupId: string;
  groupName: string;
  batchName: string;
  parkName: string;
  cityName: string;
  eventDate: string;
  isClosed: boolean;
  participantCount: number;
  markedCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  progress: number;
  closedAt: string | null;
  closedByName: string | null;
}

interface AttendanceEventsResponse {
  data: AttendanceEvent[];
  total: number;
  limit: number;
  offset: number;
}

interface CityOption {
  id: string;
  name: string;
}

interface ParkOption {
  id: string;
  name: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS = [
  { value: "", label: "All Events" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

const PAGE_LIMIT = 50;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getStatusBadge(isClosed: boolean) {
  if (isClosed) {
    return (
      <Badge
        variant="outline"
        className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700 gap-1"
      >
        <Lock className="size-3" />
        Closed
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="bg-[#F3ECF6] text-[#4B0A8F] border-[#D4B8E3] dark:bg-[#1F0860] dark:text-[#8A40B0] dark:border-[#2A0C8F] gap-1"
    >
      Open
    </Badge>
  );
}

function getProgressColor(progress: number): string {
  if (progress >= 80) return "bg-[#4B0A8F] dark:bg-[#4B0A8F]";
  if (progress >= 50) return "bg-amber-500 dark:bg-amber-400";
  return "bg-red-500 dark:bg-red-400";
}

function MiniProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-primary/20 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${getProgressColor(value)}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function AdminAttendanceEvents() {
  const [cityId, setCityId] = useState("");
  const [parkId, setParkId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE_LIMIT);

  /* ---- Cities query ---- */
  const { data: citiesData } = useQuery<{ data: CityOption[] }>({
    queryKey: ["admin-cities-list"],
    queryFn: () => fetch("/api/admin/cities").then((r) => r.json()),
    staleTime: 60_000,
  });

  /* ---- Parks query (depends on city) ---- */
  const { data: parksData } = useQuery<{ data: ParkOption[] }>({
    queryKey: ["admin-parks-list", cityId],
    queryFn: () =>
      fetch(`/api/admin/parks${cityId ? `?cityId=${cityId}` : ""}`).then((r) =>
        r.json()
      ),
    staleTime: 60_000,
  });

  /* ---- Build query params ---- */
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    if (cityId) params.set("cityId", cityId);
    if (parkId) params.set("parkId", parkId);
    if (statusFilter)
      params.set("isClosed", statusFilter === "closed" ? "true" : "false");
    if (dateFrom) params.set("dateFrom", format(dateFrom, "yyyy-MM-dd"));
    if (dateTo) params.set("dateTo", format(dateTo, "yyyy-MM-dd"));
    params.set("limit", String(limit));
    params.set("offset", "0");
    return params.toString();
  }, [cityId, parkId, statusFilter, dateFrom, dateTo, limit]);

  /* ---- Events query ---- */
  const {
    data: eventsResponse,
    isLoading,
    isFetching,
    isError,
  } = useQuery<AttendanceEventsResponse>({
    queryKey: [
      "admin-attendance-events",
      cityId,
      parkId,
      statusFilter,
      dateFrom,
      dateTo,
      limit,
    ],
    queryFn: () =>
      fetch(`/api/admin/attendance-events?${buildQueryParams()}`).then((r) => {
        if (!r.ok) throw new Error("Failed to fetch events");
        return r.json();
      }),
    staleTime: 15_000,
  });

  const total = eventsResponse?.total || 0;
  const visibleEvents = eventsResponse?.data || [];

  const hasMore = visibleEvents.length < total;
  const hasActiveFilters =
    cityId || parkId || statusFilter || dateFrom || dateTo;

  /* ---- Reset limit when filters change ---- */
  function handleFilterChange() {
    setLimit(PAGE_LIMIT);
  }

  function clearAllFilters() {
    setCityId("");
    setParkId("");
    setStatusFilter("");
    setDateFrom(undefined);
    setDateTo(undefined);
    setLimit(PAGE_LIMIT);
  }

  function loadMore() {
    setLimit((prev) => prev + PAGE_LIMIT);
  }

  /* ---- Stats summary ---- */
  const openCount = visibleEvents.filter((e) => !e.isClosed).length;
  const closedCount = visibleEvents.filter((e) => e.isClosed).length;
  const totalMarked = visibleEvents.reduce((sum, e) => sum + e.markedCount, 0);
  const totalParticipants = visibleEvents.reduce(
    (sum, e) => sum + e.participantCount,
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Events"
        description="Monitor attendance across all parks"
      />

      {/* Summary cards */}
      {!isLoading && visibleEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <SummaryCard
            label="Total Events"
            value={total}
            icon={CalendarCheck}
            color="brand"
          />
          <SummaryCard
            label="Open"
            value={openCount}
            icon={CalendarCheck}
            color="amber"
          />
          <SummaryCard
            label="Closed"
            value={closedCount}
            icon={Lock}
            color="slate"
          />
          <SummaryCard
            label="Overall Marked"
            value={`${totalMarked}/${totalParticipants}`}
            icon={Users}
            color="sky"
          />
        </motion.div>
      )}

      {/* Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        className="rounded-xl border bg-card p-4 space-y-4"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="size-4" />
          Filters
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {/* City select */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              City
            </label>
            <Select
              value={cityId}
              onValueChange={(v) => {
                setCityId(v === "__all__" ? "" : v);
                setParkId("");
                handleFilterChange();
              }}
            >
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Cities</SelectItem>
                {citiesData?.data?.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Park select */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Park
            </label>
            <Select
              value={parkId}
              onValueChange={(v) => {
                setParkId(v === "__all__" ? "" : v);
                handleFilterChange();
              }}
              disabled={!cityId}
            >
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <SelectValue
                  placeholder={cityId ? "All Parks" : "Select city first"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Parks</SelectItem>
                {parksData?.data?.map((park) => (
                  <SelectItem key={park.id} value={park.id}>
                    {park.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status select */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Status
            </label>
            <Select
              value={statusFilter || "__all__"}
              onValueChange={(v) => {
                setStatusFilter(v === "__all__" ? "" : v);
                handleFilterChange();
              }}
            >
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value || "__all__"}
                    value={opt.value || "__all__"}
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date from */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              From
            </label>
            <Popover open={fromOpen} onOpenChange={setFromOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[150px] h-9 justify-start text-xs font-normal"
                >
                  <CalendarIcon className="mr-2 size-3.5" />
                  {dateFrom ? format(dateFrom, "dd MMM yyyy") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={(d) => {
                    setDateFrom(d);
                    setFromOpen(false);
                    handleFilterChange();
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Date to */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              To
            </label>
            <Popover open={toOpen} onOpenChange={setToOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[150px] h-9 justify-start text-xs font-normal"
                >
                  <CalendarIcon className="mr-2 size-3.5" />
                  {dateTo ? format(dateTo, "dd MMM yyyy") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={(d) => {
                    setDateTo(d);
                    setToOpen(false);
                    handleFilterChange();
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Clear all button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs"
              onClick={clearAllFilters}
            >
              <X className="size-3 mr-1" />
              Clear all
            </Button>
          )}

          {/* Total count */}
          <div className="ml-auto text-xs text-muted-foreground">
            {total} {total === 1 ? "event" : "events"}
          </div>
        </div>
      </motion.div>

      {/* Loading state */}
      {(isLoading || (isFetching && visibleEvents.length === 0)) && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <EmptyState
          icon={CalendarCheck}
          title="Failed to load events"
          description="Something went wrong. Please try again later."
        />
      )}

      {/* Desktop table + Mobile cards */}
      {!isLoading && !isError && visibleEvents.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${cityId}-${parkId}-${statusFilter}-${dateFrom?.toISOString()}-${dateTo?.toISOString()}-${limit}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Desktop table */}
            <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/80 backdrop-blur-sm hover:bg-muted/80">
                      <TableHead className="text-xs font-medium text-muted-foreground px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="size-3" /> Date
                        </div>
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="size-3" /> City
                        </div>
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <TreePine className="size-3" /> Park
                        </div>
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground px-4 py-3">
                        Group
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground px-4 py-3">
                        Status
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground px-4 py-3">
                        Marked / Total
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground px-4 py-3 min-w-[140px]">
                        Progress
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground px-4 py-3">
                        Closed By
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y">
                    {visibleEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="px-4 py-3">
                          <div className="text-sm font-medium">
                            {formatPKT(new Date(event.eventDate), "dd MMM yyyy")}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <span className="text-sm">{event.cityName}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <span className="text-sm">{event.parkName}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="text-sm font-medium">
                            {event.groupName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {event.batchName}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {getStatusBadge(event.isClosed)}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="text-sm font-medium">
                            {event.markedCount}
                            <span className="text-muted-foreground font-normal">
                              {" "}
                              / {event.participantCount}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                            <span className="text-[#4B0A8F] dark:text-[#8A40B0]">
                              P: {event.presentCount}
                            </span>
                            <span className="text-red-500 dark:text-red-400">
                              A: {event.absentCount}
                            </span>
                            <span className="text-amber-600 dark:text-amber-400">
                              L: {event.lateCount}
                            </span>
                            {event.excusedCount > 0 && (
                              <span className="text-sky-500 dark:text-sky-400">
                                E: {event.excusedCount}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <MiniProgressBar value={event.progress} />
                            <span className="text-xs font-medium text-muted-foreground w-9 text-right shrink-0">
                              {event.progress}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">
                            {event.closedByName || "—"}
                          </span>
                          {event.closedAt && (
                            <div className="text-[10px] text-muted-foreground/70">
                              {formatPKT(
                                new Date(event.closedAt),
                                "dd MMM, hh:mm a"
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {visibleEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Loading more indicator */}
      {isFetching && visibleEvents.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-2">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Loading more...
          </span>
        </div>
      )}

      {/* Load more button */}
      {!isLoading && hasMore && !isFetching && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center"
        >
          <Button variant="outline" onClick={loadMore}>
            Load More ({total - visibleEvents.length} remaining)
          </Button>
        </motion.div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && !isFetching && visibleEvents.length === 0 && (
        <EmptyState
          icon={CalendarCheck}
          title="No attendance events found"
          description={
            hasActiveFilters
              ? "Try adjusting your filters to see more results."
              : "Attendance events will appear here once sessions are created and attendance is tracked."
          }
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary Card                                                       */
/* ------------------------------------------------------------------ */

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: typeof CalendarCheck;
  color: "brand" | "amber" | "slate" | "sky";
}) {
  const colorMap = {
    brand:
      "bg-[#F3ECF6] dark:bg-[#1F0860] text-[#4B0A8F] dark:text-[#8A40B0] border-[#D4B8E399] dark:border-[#2A0C8F66]",
    amber:
      "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40",
    slate:
      "bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-700/40",
    sky: "bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 border-sky-200/60 dark:border-sky-800/40",
  };

  const iconColorMap = {
    brand: "text-[#4B0A8F] dark:text-[#8A40B0]",
    amber: "text-amber-600 dark:text-amber-400",
    slate: "text-slate-500 dark:text-slate-400",
    sky: "text-sky-600 dark:text-sky-400",
  };

  return (
    <div
      className={`rounded-xl p-4 border ${colorMap[color]} transition-colors`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium opacity-80">{label}</span>
        <Icon className={`size-4 ${iconColorMap[color]} shrink-0`} />
      </div>
      <p className="text-xl font-bold mt-1 tracking-tight">{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile Event Card                                                  */
/* ------------------------------------------------------------------ */

function EventCard({ event }: { event: AttendanceEvent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-card p-4 space-y-3"
    >
      {/* Header row: Date + Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-lg bg-[#F3ECF6] p-2 dark:bg-[#1F0860] shrink-0">
            <CalendarCheck className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">
              {event.groupName}
            </div>
            <div className="text-xs text-muted-foreground">
              {event.batchName}
            </div>
          </div>
        </div>
        <div className="shrink-0">{getStatusBadge(event.isClosed)}</div>
      </div>

      {/* Location info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1">
          <MapPin className="size-3" />
          {event.cityName}
        </div>
        <span className="text-muted-foreground/50">·</span>
        <div className="flex items-center gap-1">
          <TreePine className="size-3" />
          {event.parkName}
        </div>
        <span className="text-muted-foreground/50">·</span>
        <div className="flex items-center gap-1">
          <CalendarIcon className="size-3" />
          {formatPKT(new Date(event.eventDate), "dd MMM yyyy")}
        </div>
      </div>

      {/* Progress section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Marked / Total
          </span>
          <span className="text-sm font-bold">
            {event.markedCount}{" "}
            <span className="text-muted-foreground font-normal">
              / {event.participantCount}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MiniProgressBar value={event.progress} />
          <span className="text-xs font-medium text-muted-foreground w-9 text-right shrink-0">
            {event.progress}%
          </span>
        </div>
        {/* Status breakdown */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="text-[#4B0A8F] dark:text-[#8A40B0]">
            P: {event.presentCount}
          </span>
          <span className="text-red-500 dark:text-red-400">
            A: {event.absentCount}
          </span>
          <span className="text-amber-600 dark:text-amber-400">
            L: {event.lateCount}
          </span>
          {event.excusedCount > 0 && (
            <span className="text-sky-500 dark:text-sky-400">
              E: {event.excusedCount}
            </span>
          )}
        </div>
      </div>

      {/* Closed by */}
      {event.closedByName && (
        <div className="text-xs text-muted-foreground pt-1 border-t">
          Closed by{" "}
          <span className="font-medium text-foreground">
            {event.closedByName}
          </span>
          {event.closedAt && (
            <span className="ml-1">
              on{" "}
              {formatPKT(new Date(event.closedAt), "dd MMM, hh:mm a")}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}