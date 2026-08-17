"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, BarChart3, CalendarDays, CheckCircle2, LayoutGrid, List, Lock, Play, Users } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type AttendanceEvent = {
  id: string;
  title: string;
  groupId: string;
  groupName: string;
  eventDate: string;
  isClosed: boolean;
  participantCount: number;
  markedCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  progress: number;
};

type AttendanceListResponse = {
  date: string;
  parkId: string;
  events: AttendanceEvent[];
};

type AttendancePreparation = {
  prepared: number;
  eligibleGroups?: number;
  isOffDate: boolean;
  reason?: string;
};

type ParkOption = {
  id: string;
  name: string;
};

type StaffAttendanceSummary = {
  event: { id: string; isClosed: boolean; _count: { records: number } } | null;
  park: ParkOption;
  date: string;
};

type StaffRosterMember = {
  staffMetaId: string;
  name: string;
  role: string;
  status: "present" | "absent" | "late" | "excused" | null;
};

type StaffAttendanceDetail = {
  event: { id: string; title: string; isClosed: boolean };
  roster: StaffRosterMember[];
};

type AttendanceSummaries = {
  scope: { parkName: string; from: string; to: string };
  overview: { groups: number; students: number; closedSessions: number; attendanceRate: number; warnings: number; dropouts: number };
  groupStats: Array<{ groupId: string; groupName: string; batchName: string; studentCount: number; sessionCount: number; attendanceRate: number; warnings: number; dropouts: number; murabbis: Array<{ name: string }> }>;
  students: Array<{ participantId: string; name: string; groupName: string; state: string; attendanceRate: number; present: number; late: number; absent: number; excused: number; unmarked: number; total: number; consecutiveAbsentWeeks: number; warning: boolean }>;
  murabbis: Array<{ staffMetaId: string; name: string; groupName: string; studentAttendanceRate: number; staffAttendanceRate: number; staffSessions: number; warningStudents: number }>;
};

async function prepareAndFetchAttendance(date: string, parkId?: string): Promise<AttendanceListResponse & { preparation: AttendancePreparation }> {
  const preparationResponse = await fetch("/api/park/attendance/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, ...(parkId ? { parkId } : {}) }),
  });
  const preparation = await preparationResponse.json().catch(() => ({}));
  if (!preparationResponse.ok) throw new Error(preparation.error || "Could not prepare attendance sessions");
  const query = new URLSearchParams({ date });
  if (parkId) query.set("parkId", parkId);
  const response = await fetch(`/api/park/attendance?${query.toString()}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Could not load attendance sessions");
  return { ...body, preparation };
}

async function fetchParks(): Promise<ParkOption[]> {
  const response = await fetch("/api/park/attendance/parks");
  const body = await response.json().catch(() => []);
  if (!response.ok || !Array.isArray(body)) throw new Error("Could not load parks");
  return body;
}

async function fetchStaffAttendance(date: string, parkId: string): Promise<StaffAttendanceSummary | null> {
  const response = await fetch(`/api/park/staff-attendance?${new URLSearchParams({ date, parkId })}`);
  if (response.status === 403) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Could not load staff attendance");
  return body;
}

export function ParkAttendancePage() {
  const queryClient = useQueryClient();
  const navigateTo = useAppStore((state) => state.navigateTo);
  const setSelectedEventId = useAppStore((state) => state.setSelectedEventId);
  const { data: session, status: sessionStatus } = useSession();
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [view, setView] = useState<"cards" | "table">("cards");
  const [selectedParkId, setSelectedParkId] = useState("");
  const [staffEventId, setStaffEventId] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const assignedParkId = session?.user?.assignedParkId;
  const isMurabbi = session?.user?.role === "murabbi";
  const requiresParkSelection = sessionStatus === "authenticated" && !assignedParkId && !isMurabbi;
  const effectiveParkId = assignedParkId || selectedParkId;

  const parksQuery = useQuery({
    queryKey: ["attendance-parks"],
    queryFn: fetchParks,
    enabled: requiresParkSelection,
    staleTime: 5 * 60 * 1000,
  });

  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["park-attendance", selectedDate, effectiveParkId],
    queryFn: () => prepareAndFetchAttendance(selectedDate, effectiveParkId || undefined),
    enabled: sessionStatus === "authenticated" && (!requiresParkSelection || Boolean(effectiveParkId)),
  });

  const staffSummaryQuery = useQuery({
    queryKey: ["park-staff-attendance", selectedDate, effectiveParkId],
    queryFn: () => fetchStaffAttendance(selectedDate, effectiveParkId!),
    enabled: Boolean(effectiveParkId) && sessionStatus === "authenticated",
    retry: false,
  });
  const insightsQuery = useQuery<AttendanceSummaries>({
    queryKey: ["attendance-summaries", effectiveParkId],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (effectiveParkId) query.set("parkId", effectiveParkId);
      const response = await fetch(`/api/park/attendance/summaries?${query}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not load attendance summaries");
      return body;
    },
    enabled: showInsights && sessionStatus === "authenticated" && (!requiresParkSelection || Boolean(effectiveParkId)),
    staleTime: 60 * 1000,
  });

  const prepareStaffMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/park/staff-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parkId: effectiveParkId, date: selectedDate }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not start staff roll-call");
      return body.event as { id: string };
    },
    onSuccess: (event) => {
      setStaffEventId(event.id);
      queryClient.invalidateQueries({ queryKey: ["park-staff-attendance", selectedDate, effectiveParkId] });
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const events = data?.events ?? [];
  const summary = useMemo(() => {
    const total = events.reduce((sum, event) => sum + event.participantCount, 0);
    const marked = events.reduce((sum, event) => sum + event.markedCount, 0);
    const open = events.filter((event) => !event.isClosed).length;
    return { total, marked, open, progress: total ? Math.round((marked / total) * 100) : 0 };
  }, [events]);

  const startStudentAttendance = (eventId: string) => {
    setSelectedEventId(eventId);
    navigateTo("park-attendance-roster");
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-3 pb-24 pt-1 sm:px-6 sm:pb-10 lg:px-8">
      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Attendance sessions</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Choose a group, then start student attendance. Locked sessions remain read-only.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              aria-pressed={showInsights}
              className="h-10"
              onClick={() => setShowInsights((value) => !value)}
              type="button"
              variant={showInsights ? "default" : "outline"}
            >
              <BarChart3 className="mr-2 size-4" />
              <span className="hidden sm:inline">Summaries</span>
            </Button>
            {requiresParkSelection && (
              <Select
                onValueChange={setSelectedParkId}
                value={selectedParkId}
                disabled={parksQuery.isLoading || parksQuery.isError}
              >
                <SelectTrigger aria-label="Attendance park" className="h-10 w-[172px]">
                  <SelectValue placeholder={parksQuery.isLoading ? "Loading parks..." : "Select a park"} />
                </SelectTrigger>
                <SelectContent>
                  {parksQuery.data?.map((park) => (
                    <SelectItem key={park.id} value={park.id}>{park.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Attendance date"
                className="h-10 w-[168px] pl-9"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </div>
            <div className="flex rounded-lg border bg-muted/40 p-1" aria-label="Attendance layout">
              <Button
                aria-pressed={view === "cards"}
                className={cn("h-8 px-2", view === "cards" ? "bg-background shadow-sm" : "text-muted-foreground")}
                onClick={() => setView("cards")}
                size="sm"
                type="button"
                variant="ghost"
              >
                <LayoutGrid className="size-4" />
                <span className="sr-only">Cards</span>
              </Button>
              <Button
                aria-pressed={view === "table"}
                className={cn("h-8 px-2", view === "table" ? "bg-background shadow-sm" : "text-muted-foreground")}
                onClick={() => setView("table")}
                size="sm"
                type="button"
                variant="ghost"
              >
                <List className="size-4" />
                <span className="sr-only">Table</span>
              </Button>
            </div>
          </div>
        </div>

        {!isLoading && !error && (
          <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 sm:max-w-md">
            <div><p className="text-[11px] text-muted-foreground">Groups</p><p className="font-semibold">{events.length}</p></div>
            <div><p className="text-[11px] text-muted-foreground">Open</p><p className="font-semibold">{summary.open}</p></div>
            <div><p className="text-[11px] text-muted-foreground">Marked</p><p className="font-semibold">{summary.marked}/{summary.total}</p></div>
          </div>
        )}
      </section>

      {showInsights && (
        <AttendanceInsights data={insightsQuery.data} error={insightsQuery.error} loading={insightsQuery.isLoading} onRetry={() => insightsQuery.refetch()} />
      )}

      {staffSummaryQuery.data && (
        <Card className="overflow-hidden border-[#D8B4FE] bg-gradient-to-br from-[#FAF5FF] to-card shadow-sm">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#4B0A8F] text-white"><Users className="size-5" /></div>
              <div className="min-w-0"><p className="font-semibold">Park staff attendance</p><p className="text-xs text-muted-foreground">Park Lead, Park Admin, Murabbis and other active park staff</p></div>
            </div>
            <Button
              className="h-11 w-full sm:w-auto"
              disabled={prepareStaffMutation.isPending}
              onClick={() => staffSummaryQuery.data?.event ? setStaffEventId(staffSummaryQuery.data.event.id) : prepareStaffMutation.mutate()}
            >
              {staffSummaryQuery.data.event?.isClosed ? <><Lock className="mr-2 size-4" />View locked roll-call</> : <><Play className="mr-2 size-4" />{staffSummaryQuery.data.event ? "Continue staff roll-call" : "Start staff roll-call"}</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {requiresParkSelection && parksQuery.isError ? (
        <Card className="border-destructive/30"><CardContent className="space-y-3 p-5"><p className="font-medium">Could not load parks</p><p className="text-sm text-muted-foreground">Choose a different account or try again.</p><Button onClick={() => parksQuery.refetch()} variant="outline">Try again</Button></CardContent></Card>
      ) : requiresParkSelection && !effectiveParkId ? (
        <Card><CardContent className="p-8 text-center"><p className="font-semibold">Select a park to view attendance</p><p className="mt-1 text-sm text-muted-foreground">City-scoped attendance stays separated by park.</p></CardContent></Card>
      ) : isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => <Skeleton className="h-52 rounded-2xl" key={item} />)}
        </div>
      ) : error ? (
        <Card className="border-destructive/30"><CardContent className="space-y-3 p-5"><p className="font-medium">Could not load attendance</p><p className="text-sm text-muted-foreground">{error.message}</p><Button onClick={() => refetch()} variant="outline">Try again</Button></CardContent></Card>
      ) : events.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><p className="font-semibold">{data?.preparation.isOffDate ? "Operational day off" : "No classes scheduled for this date"}</p><p className="mt-1 text-sm text-muted-foreground">{data?.preparation.isOffDate ? data.preparation.reason : "Choose a configured class day within the active batch dates."}</p></CardContent></Card>
      ) : view === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => <AttendanceSessionCard event={event} key={event.id} onStart={() => startStudentAttendance(event.id)} />)}
        </div>
      ) : (
        <section className="rounded-2xl border bg-card shadow-sm">
          <div className="hidden grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-4 border-b px-4 py-3 text-xs font-semibold text-muted-foreground md:grid">
            <span>Group</span><span>Progress</span><span>Status</span><span>Action</span>
          </div>
          <div className="divide-y">
            {events.map((event) => (
              <div className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_180px_auto_auto] md:items-center" key={event.id}>
                <div><p className="font-semibold">{event.groupName}</p><p className="text-xs text-muted-foreground">{event.markedCount} of {event.participantCount} students marked</p></div>
                <div className="space-y-1"><Progress value={event.progress} className="h-2" /><p className="text-right text-xs text-muted-foreground">{event.progress}%</p></div>
                <Badge className={event.isClosed ? "w-fit bg-muted text-muted-foreground" : "w-fit bg-[#F3ECF6] text-[#4B0A8F]"} variant="secondary">{event.isClosed ? "Locked" : "Open"}</Badge>
                <Button className="w-full md:w-auto" disabled={event.isClosed} onClick={() => startStudentAttendance(event.id)}>{event.isClosed ? <><Lock className="mr-2 size-4" />Locked</> : <><Play className="mr-2 size-4" />Start student attendance</>}</Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {isFetching && !isLoading && <p className="text-center text-xs text-muted-foreground">Refreshing sessions…</p>}
      <StaffRollCallDialog eventId={staffEventId} onOpenChange={(open) => !open && setStaffEventId(null)} />
    </div>
  );
}

function AttendanceInsights({ data, error, loading, onRetry }: { data?: AttendanceSummaries; error: Error | null; loading: boolean; onRetry: () => void }) {
  const [section, setSection] = useState<"groups" | "students" | "murabbis">("groups");
  if (loading) return <div className="grid gap-3 sm:grid-cols-3">{[1, 2, 3].map((item) => <Skeleton className="h-28 rounded-2xl" key={item} />)}</div>;
  if (error) return <Card className="border-destructive/30"><CardContent className="space-y-3 p-5"><p className="font-semibold">Could not load summaries</p><p className="text-sm text-muted-foreground">{error.message}</p><Button onClick={onRetry} variant="outline">Try again</Button></CardContent></Card>;
  if (!data) return null;
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="font-semibold">Attendance insights</p><p className="text-xs text-muted-foreground">Last 90 days · {data.scope.parkName}</p></div>
        <p className="text-2xl font-bold text-[#4B0A8F]">{data.overview.attendanceRate}% <span className="text-xs font-normal text-muted-foreground">attendance</span></p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <InsightMetric label="Students" value={data.overview.students} />
        <InsightMetric label="Closed sessions" value={data.overview.closedSessions} />
        <InsightMetric label="Warnings" tone="warning" value={data.overview.warnings} />
        <InsightMetric label="Dropouts" tone="danger" value={data.overview.dropouts} />
      </div>
      <div className="grid grid-cols-3 rounded-xl bg-muted p-1">
        {(["groups", "students", "murabbis"] as const).map((item) => <Button className="h-9 capitalize" key={item} onClick={() => setSection(item)} variant={section === item ? "default" : "ghost"}>{item}</Button>)}
      </div>
      {section === "groups" && <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{data.groupStats.map((group) => (
        <div className="rounded-xl border p-3" key={group.groupId}><div className="flex items-center justify-between"><p className="font-semibold">{group.groupName}</p><Badge variant="secondary">{group.attendanceRate}%</Badge></div><p className="text-xs text-muted-foreground">{group.batchName} · {group.studentCount} students · {group.sessionCount} sessions</p><Progress className="my-3 h-2" value={group.attendanceRate} /><div className="flex flex-wrap gap-2 text-xs"><span>{group.murabbis.map((item) => item.name).join(", ") || "Murabbi unassigned"}</span>{group.warnings > 0 && <span className="text-amber-700">{group.warnings} warning</span>}{group.dropouts > 0 && <span className="text-red-700">{group.dropouts} dropout</span>}</div></div>
      ))}</div>}
      {section === "students" && <div className="space-y-2">{data.students.map((student) => (
        <div className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center" key={student.participantId}><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate font-semibold">{student.name}</p>{student.warning && <AlertTriangle className="size-4 text-amber-600" />}{student.state === "dropout" && <Badge variant="destructive">Dropout</Badge>}</div><p className="text-xs text-muted-foreground">{student.groupName} · P {student.present} · L {student.late} · A {student.absent} · E {student.excused}{student.unmarked ? ` · U ${student.unmarked}` : ""}</p></div><p className="font-bold">{student.attendanceRate}%</p><p className="text-xs text-muted-foreground">{student.consecutiveAbsentWeeks} absent week(s)</p></div>
      ))}</div>}
      {section === "murabbis" && <div className="grid gap-2 sm:grid-cols-2">{data.murabbis.map((murabbi) => (
        <div className="rounded-xl border p-3" key={`${murabbi.staffMetaId}-${murabbi.groupName}`}><p className="font-semibold">{murabbi.name}</p><p className="text-xs text-muted-foreground">{murabbi.groupName}</p><div className="mt-3 grid grid-cols-2 gap-2"><InsightMetric label="Student attendance" value={`${murabbi.studentAttendanceRate}%`} /><InsightMetric label="Own attendance" value={murabbi.staffSessions ? `${murabbi.staffAttendanceRate}%` : "—"} /></div>{murabbi.warningStudents > 0 && <p className="mt-2 text-xs text-amber-700">{murabbi.warningStudents} student(s) need follow-up</p>}</div>
      ))}</div>}
    </section>
  );
}

function InsightMetric({ label, value, tone }: { label: string; value: string | number; tone?: "warning" | "danger" }) {
  return <div className={cn("rounded-xl bg-muted/50 p-3", tone === "warning" && "bg-amber-50 text-amber-900", tone === "danger" && "bg-red-50 text-red-900")}><p className="text-xl font-bold">{value}</p><p className="text-[11px] opacity-70">{label}</p></div>;
}

function AttendanceSessionCard({ event, onStart }: { event: AttendanceEvent; onStart: () => void }) {
  return (
    <Card className="overflow-hidden border shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><p className="truncate font-semibold">{event.groupName}</p><p className="mt-1 text-xs text-muted-foreground">{event.title}</p></div>
          <Badge className={event.isClosed ? "bg-muted text-muted-foreground" : "bg-[#F3ECF6] text-[#4B0A8F]"} variant="secondary">{event.isClosed ? "Locked" : "Open"}</Badge>
        </div>
        <div className="rounded-xl bg-muted/40 p-3"><div className="mb-2 flex items-center justify-between text-xs"><span className="flex items-center gap-1 text-muted-foreground"><Users className="size-3.5" />{event.participantCount} students</span><span className="font-semibold">{event.markedCount}/{event.participantCount} marked</span></div><Progress value={event.progress} className="h-2" /></div>
        <div className="flex gap-2 text-xs text-muted-foreground"><span className="text-emerald-700">{event.presentCount} present</span><span>{event.lateCount} late</span><span className="text-red-700">{event.absentCount} absent</span></div>
        <Button className="h-11 w-full" disabled={event.isClosed} onClick={onStart}>{event.isClosed ? <><Lock className="mr-2 size-4" />Attendance locked</> : <><CheckCircle2 className="mr-2 size-4" />Start student attendance</>}</Button>
      </CardContent>
    </Card>
  );
}

function StaffRollCallDialog({ eventId, onOpenChange }: { eventId: string | null; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const detail = useQuery<StaffAttendanceDetail>({
    queryKey: ["staff-attendance-detail", eventId],
    queryFn: async () => {
      const response = await fetch(`/api/park/staff-attendance/${eventId}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not load staff roster");
      return body;
    },
    enabled: Boolean(eventId),
  });
  const mark = useMutation({
    mutationFn: async ({ staffMetaId, status }: { staffMetaId: string; status: Exclude<StaffRosterMember["status"], null> }) => {
      const response = await fetch(`/api/park/staff-attendance/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffMetaId, status }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not mark attendance");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff-attendance-detail", eventId] }),
    onError: (error) => toast.error(error.message),
  });
  const lock = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/park/staff-attendance/${eventId}/close`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Completed park staff roll-call" }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not lock staff attendance");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-attendance-detail", eventId] });
      queryClient.invalidateQueries({ queryKey: ["park-staff-attendance"] });
      toast.success("Staff attendance locked");
    },
    onError: (error) => toast.error(error.message),
  });
  const marked = detail.data?.roster.filter((member) => member.status).length ?? 0;
  const total = detail.data?.roster.length ?? 0;

  return (
    <Dialog open={Boolean(eventId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-1rem)] max-w-2xl overflow-hidden p-0 sm:w-full">
        <DialogHeader className="border-b px-4 py-4 text-left">
          <DialogTitle>Park staff roll-call</DialogTitle>
          <DialogDescription>{marked} of {total} staff marked. Active park and group staff are included.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[65dvh] space-y-2 overflow-y-auto px-3 py-3 sm:px-4">
          {detail.isLoading ? [1, 2, 3].map((item) => <Skeleton className="h-24 rounded-xl" key={item} />) : detail.error ? (
            <div className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{detail.error.message}</div>
          ) : detail.data?.roster.length === 0 ? (
            <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">No active staff are assigned to this park.</div>
          ) : detail.data?.roster.map((member) => (
            <div className="rounded-xl border bg-card p-3" key={member.staffMetaId}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0"><p className="truncate font-semibold">{member.name}</p><p className="text-xs capitalize text-muted-foreground">{member.role.replaceAll("_", " ")}</p></div>
                {member.status && <Badge className="capitalize" variant="secondary">{member.status}</Badge>}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(["present", "absent", "late", "excused"] as const).map((status) => (
                  <Button
                    aria-label={`Mark ${member.name} ${status}`}
                    className={cn("h-11 px-1 text-[11px] capitalize sm:text-xs", member.status === status && status === "present" && "bg-emerald-600 hover:bg-emerald-600", member.status === status && status === "absent" && "bg-red-600 hover:bg-red-600", member.status === status && status === "late" && "bg-amber-600 hover:bg-amber-600", member.status === status && status === "excused" && "bg-sky-600 hover:bg-sky-600")}
                    disabled={detail.data?.event.isClosed || mark.isPending}
                    key={status}
                    onClick={() => mark.mutate({ staffMetaId: member.staffMetaId, status })}
                    variant={member.status === status ? "default" : "outline"}
                  >{status}</Button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t bg-background px-4 py-3 sm:flex-row sm:justify-end">
          <Button onClick={() => onOpenChange(false)} variant="outline">Close</Button>
          <Button disabled={!total || marked !== total || detail.data?.event.isClosed || lock.isPending} onClick={() => lock.mutate()}><Lock className="mr-2 size-4" />{detail.data?.event.isClosed ? "Attendance locked" : "Lock staff attendance"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
