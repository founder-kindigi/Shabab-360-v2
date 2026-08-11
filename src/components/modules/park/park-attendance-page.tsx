"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/stores/useAppStore";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CalendarCheck,
  Circle,
  Lock,
  ChevronRight,
  CalendarDays,
  Check,
  Clock3,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EventItem = {
  id: string | null;
  title: string;
  groupId: string;
  groupName: string;
  batchName?: string;
  isScheduled?: boolean;
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
};

type AttendanceStatus = "present" | "absent" | "late" | "excused";

type StaffAttendanceSummary = {
  park: { id: string; name: string };
  date: string;
  isScheduled: boolean;
  canFinalize: boolean;
  event: {
    id: string;
    title: string;
    isClosed: boolean;
    closedAt: string | null;
    eventDate: string;
    markedCount: number;
  } | null;
};

type StaffRoster = {
  event: { id: string; title: string; eventDate: string; isClosed: boolean; closedAt: string | null };
  roster: Array<{
    staffId: string;
    name: string;
    role: string;
    status: AttendanceStatus | null;
    recordId: string | null;
    markedAt: string | null;
  }>;
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: "easeOut" },
  }),
};

function progressColor(progress: number) {
  if (progress >= 80) return "bg-[#4B0A8F]";
  if (progress >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function getDateLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-PK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function localDateInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ParkAttendancePage() {
  const { navigateTo, setSelectedEventId } = useAppStore();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(() => localDateInputValue());
  const [staffSheetOpen, setStaffSheetOpen] = useState(false);

  // Fetch today's events
  const { data, isLoading, error } = useQuery<{
    date: string;
    parkId: string;
    events: EventItem[];
  }>({
    queryKey: ["park-attendance", selectedDate],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("date", selectedDate);
      return fetch(`/api/park/attendance?${params}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load events");
        return r.json();
      });
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const materializeMutation = useMutation({
    mutationFn: (body: { groupId: string; eventDate: string }) =>
      fetch("/api/park/attendance/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => { throw new Error(e.error || "Failed"); });
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Attendance session is ready");
      queryClient.invalidateQueries({ queryKey: ["park-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["park-dashboard"] });
    },
    onError: (err: Error) => {
      if (err.message.includes("already exists")) {
        toast.error("This attendance session is already being opened. Please try again.");
      } else {
        toast.error(err.message || "Could not open attendance");
      }
    },
  });

  const staffSummaryQuery = useQuery<StaffAttendanceSummary>({
    queryKey: ["park-staff-attendance", data?.parkId, selectedDate],
    enabled: Boolean(data?.parkId),
    queryFn: () => fetch(
      `/api/park/staff-attendance?${new URLSearchParams({ parkId: data!.parkId, date: selectedDate })}`,
    ).then(async (response) => {
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Could not load staff attendance");
      }
      return response.json();
    }),
    staleTime: 15000,
  });

  const staffEventId = staffSummaryQuery.data?.event?.id;
  const staffRosterQuery = useQuery<StaffRoster>({
    queryKey: ["park-staff-attendance-roster", staffEventId],
    enabled: staffSheetOpen && Boolean(staffEventId),
    queryFn: () => fetch(`/api/park/staff-attendance/${staffEventId}`).then(async (response) => {
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Could not load the staff roster");
      }
      return response.json();
    }),
  });

  const openStaffRollCallMutation = useMutation({
    mutationFn: () => fetch("/api/park/staff-attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parkId: data!.parkId,
        eventDate: `${selectedDate}T12:00:00+05:00`,
      }),
    }).then(async (response) => {
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Could not start staff attendance");
      }
      return response.json();
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["park-staff-attendance"] });
      toast.success("Park staff roll-call is ready");
      setStaffSheetOpen(true);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const markStaffMutation = useMutation({
    mutationFn: ({ staffId, status }: { staffId: string; status: AttendanceStatus }) => fetch(
      `/api/park/staff-attendance/${staffEventId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, status }),
      },
    ).then(async (response) => {
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Could not save staff attendance");
      }
      return response.json();
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["park-staff-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["park-staff-attendance-roster"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const closeStaffMutation = useMutation({
    mutationFn: () => fetch(`/api/park/staff-attendance/${staffEventId}/close`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Park staff roll-call verified" }),
    }).then(async (response) => {
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Could not finalize staff attendance");
      }
      return response.json();
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["park-staff-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["park-staff-attendance-roster"] });
      toast.success("Park staff attendance finalized");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleMarkAttendance = (event: EventItem) => {
    if (!event.id) {
      materializeMutation.mutate(
        { groupId: event.groupId, eventDate: event.eventDate },
        {
          onSuccess: (result) => {
            setSelectedEventId(result.event.id);
            navigateTo("park-attendance-roster");
          },
        },
      );
      return;
    }
    setSelectedEventId(event.id);
    navigateTo("park-attendance-roster");
  };

  const events = data?.events || [];
  const selectedDateLabel = getDateLabel(data?.date || selectedDate);
  const staffSummary = staffSummaryQuery.data;
  const staffRoster = staffRosterQuery.data?.roster || [];
  const markedStaffCount = staffRoster.filter((member) => member.status !== null).length;

  const openStaffAttendance = () => {
    if (staffSummary?.event) {
      setStaffSheetOpen(true);
      return;
    }
    openStaffRollCallMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Attendance"
          description="Mark and manage daily attendance"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-2 bg-muted rounded-full w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Attendance" description="Mark and manage daily attendance" />
        <EmptyState
          icon={CalendarCheck}
          title="Could not load events"
          description="There was an error fetching today's events. Please try again."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Mark and manage daily attendance"
      />

      {/* Date header */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="size-4" />
        <label className="font-medium" htmlFor="attendance-date">Select class date</label>
        <input
          id="attendance-date"
          type="date"
          value={selectedDate}
          onChange={(event) => {
            setStaffSheetOpen(false);
            setSelectedDate(event.target.value);
          }}
          className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
        />
        <span className="w-full text-xs sm:w-auto">{selectedDateLabel}</span>
      </div>

      <p className="text-sm text-muted-foreground">
        Every active group in your park is ready here on scheduled class days. Choose a group and start marking.
      </p>

      <Card className="border-[#D4B8E3] bg-gradient-to-br from-[#FCFAFD] to-[#F4ECF8]">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#4B0A8F] text-white shadow-sm">
                <UsersRound className="size-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold">Park Staff Attendance</h2>
                  {staffSummary?.event?.isClosed ? <Badge variant="secondary">Finalized</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  Park Lead, Park Admin and Muawins. This does not duplicate student group attendance.
                </p>
                {!staffSummaryQuery.isLoading && !staffSummary?.isScheduled ? (
                  <p className="text-xs font-medium text-amber-700">
                    No class is scheduled on this date, so staff roll-call is unavailable.
                  </p>
                ) : null}
              </div>
            </div>
            <Button
              className="min-h-11 w-full bg-[#4B0A8F] text-white hover:bg-[#4B0A8F]/90 sm:w-auto"
              disabled={!staffSummary?.isScheduled || openStaffRollCallMutation.isPending}
              onClick={openStaffAttendance}
            >
              {staffSummary?.event ? (staffSummary.event.isClosed ? "View staff roll-call" : "Mark staff attendance") : "Start staff roll-call"}
              <ChevronRight className="ml-1.5 size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Events grid */}
      {events.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No events today"
          description="No class is scheduled for this date. Classes run on Saturdays and Sundays, excluding configured off days."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                layout
              >
                <Card
                  className={cn(
                    "overflow-hidden transition-shadow hover:shadow-md cursor-pointer border",
                    event.isClosed
                      ? "border-border/60"
                      : "border-[#D4B8E3] dark:border-[#2A0C8F80]"
                  )}
                  onClick={() =>
                    event.isClosed
                      ? null
                      : handleMarkAttendance(event)
                  }
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Top row: status + title */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {event.isClosed ? (
                          <Lock className="size-4 text-muted-foreground shrink-0" />
                        ) : (
                          <Circle className="size-4 text-[#4B0A8F] dark:text-[#8A40B0] fill-[#4B0A8F] dark:fill-[#8A40B0] shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-base font-semibold leading-tight">
                            {event.groupName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {event.batchName ? `${event.batchName} · ` : ""}Student attendance
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={event.isClosed ? "secondary" : "default"}
                        className={cn(
                          "shrink-0 text-[10px] px-2 py-0",
                          event.isClosed
                            ? "bg-muted text-muted-foreground"
                            : "bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F0860] dark:text-[#8A40B0]"
                        )}
                      >
                        {event.isClosed ? "Closed" : "Open"}
                      </Badge>
                    </div>

                    {/* Progress section */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {event.markedCount} / {event.participantCount} marked
                        </span>
                        <span
                          className={cn(
                            "font-semibold",
                            event.progress >= 80
                              ? "text-[#4B0A8F] dark:text-[#8A40B0]"
                              : event.progress >= 50
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {event.progress}%
                        </span>
                      </div>
                      <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className={cn(
                            "h-full rounded-full",
                            progressColor(event.progress)
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${event.progress}%` }}
                          transition={{ duration: 0.6, delay: i * 0.06 + 0.2 }}
                        />
                      </div>
                    </div>

                    {/* Breakdown mini badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {event.presentCount > 0 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F0860] dark:text-[#8A40B0]">
                          P:{event.presentCount}
                        </span>
                      )}
                      {event.absentCount > 0 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                          A:{event.absentCount}
                        </span>
                      )}
                      {event.lateCount > 0 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                          L:{event.lateCount}
                        </span>
                      )}
                      {event.excusedCount > 0 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400">
                          E:{event.excusedCount}
                        </span>
                      )}
                    </div>

                    {/* Action button */}
                    <Button
                      variant={event.isClosed ? "outline" : "default"}
                      size="sm"
                      className={cn(
                        "w-full mt-1",
                        !event.isClosed &&
                          "bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!event.isClosed) {
                          handleMarkAttendance(event);
                        }
                      }}
                    >
                      {event.isClosed ? (
                        <>
                          View Summary
                          <ChevronRight className="size-3.5 ml-1.5" />
                        </>
                      ) : (
                        <>
                          Mark Attendance
                          <ChevronRight className="size-3.5 ml-1.5" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Sheet open={staffSheetOpen} onOpenChange={setStaffSheetOpen}>
        <SheetContent side="bottom" className="h-[min(82dvh,46rem)] rounded-t-2xl p-0">
          <SheetHeader className="border-b pr-12">
            <SheetTitle>Park Staff Attendance</SheetTitle>
            <SheetDescription>
              {staffSummary?.park.name || "Park"} · {selectedDateLabel}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            {staffRosterQuery.isLoading ? (
              <div className="space-y-3 py-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : staffRosterQuery.error ? (
              <EmptyState
                icon={UsersRound}
                title="Could not load staff"
                description="Please close this sheet and try again."
              />
            ) : staffRoster.length === 0 ? (
              <EmptyState
                icon={UsersRound}
                title="No active staff in this park"
                description="Assign active Park staff or group staff before marking their attendance."
              />
            ) : (
              <div className="space-y-3 py-4">
                <div className="flex items-center justify-between rounded-xl bg-muted/70 px-3 py-2 text-sm">
                  <span className="font-medium">{markedStaffCount} of {staffRoster.length} marked</span>
                  {staffRosterQuery.data?.event.isClosed ? (
                    <Badge variant="secondary">Finalized</Badge>
                  ) : (
                    <Badge className="bg-[#F3ECF6] text-[#4B0A8F]">Open</Badge>
                  )}
                </div>

                {staffRoster.map((member) => (
                  <article key={member.staffId} className="rounded-xl border bg-card p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold">{member.name}</h3>
                        <p className="text-xs capitalize text-muted-foreground">
                          {member.role.replace(/_/g, " ")}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "shrink-0 capitalize",
                          member.status === "present" && "bg-emerald-100 text-emerald-800",
                          member.status === "absent" && "bg-red-100 text-red-800",
                          member.status === "late" && "bg-amber-100 text-amber-800",
                          member.status === "excused" && "bg-sky-100 text-sky-800",
                        )}
                      >
                        {member.status || "Unmarked"}
                      </Badge>
                    </div>

                    {!staffRosterQuery.data?.event.isClosed ? (
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Button
                          variant={member.status === "present" ? "default" : "outline"}
                          className="min-h-11 gap-1.5 text-xs"
                          onClick={() => markStaffMutation.mutate({ staffId: member.staffId, status: "present" })}
                          disabled={markStaffMutation.isPending}
                        >
                          <Check className="size-4" /> Present
                        </Button>
                        <Button
                          variant={member.status === "absent" ? "destructive" : "outline"}
                          className="min-h-11 gap-1.5 text-xs"
                          onClick={() => markStaffMutation.mutate({ staffId: member.staffId, status: "absent" })}
                          disabled={markStaffMutation.isPending}
                        >
                          <X className="size-4" /> Absent
                        </Button>
                        <Button
                          variant="outline"
                          className={cn("min-h-11 gap-1.5 text-xs", member.status === "late" && "border-amber-500 bg-amber-50 text-amber-900")}
                          onClick={() => markStaffMutation.mutate({ staffId: member.staffId, status: "late" })}
                          disabled={markStaffMutation.isPending}
                        >
                          <Clock3 className="size-4" /> Late
                        </Button>
                        <Button
                          variant="outline"
                          className={cn("min-h-11 gap-1.5 text-xs", member.status === "excused" && "border-sky-500 bg-sky-50 text-sky-900")}
                          onClick={() => markStaffMutation.mutate({ staffId: member.staffId, status: "excused" })}
                          disabled={markStaffMutation.isPending}
                        >
                          <ShieldCheck className="size-4" /> Excused
                        </Button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>

          {!staffRosterQuery.data?.event.isClosed && staffRoster.length > 0 && staffSummary?.canFinalize ? (
            <SheetFooter className="border-t bg-background">
              <Button
                className="min-h-11 w-full bg-[#4B0A8F] text-white hover:bg-[#4B0A8F]/90"
                disabled={closeStaffMutation.isPending || markedStaffCount !== staffRoster.length}
                onClick={() => closeStaffMutation.mutate()}
              >
                <Lock className="mr-2 size-4" />
                Finalize staff attendance
              </Button>
              {markedStaffCount !== staffRoster.length ? (
                <p className="text-center text-xs text-muted-foreground">
                  Mark every active staff member before finalizing.
                </p>
              ) : null}
            </SheetFooter>
          ) : !staffRosterQuery.data?.event.isClosed && staffRoster.length > 0 ? (
            <SheetFooter className="border-t bg-background">
              <p className="text-center text-xs text-muted-foreground">
                A Park Lead or a user granted attendance correction can finalize this roll-call.
              </p>
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>

    </div>
  );
}
