"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarDays, CheckCircle2, LayoutGrid, List, Lock, Play, Users } from "lucide-react";
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

type ParkOption = {
  id: string;
  name: string;
};

async function fetchAttendanceEvents(date: string, parkId?: string): Promise<AttendanceListResponse> {
  const query = new URLSearchParams({ date });
  if (parkId) query.set("parkId", parkId);
  const response = await fetch(`/api/park/attendance?${query.toString()}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Could not load attendance sessions");
  return body;
}

async function fetchParks(): Promise<ParkOption[]> {
  const response = await fetch("/api/park/attendance/parks");
  const body = await response.json().catch(() => []);
  if (!response.ok || !Array.isArray(body)) throw new Error("Could not load parks");
  return body;
}

export function ParkAttendancePage() {
  const navigateTo = useAppStore((state) => state.navigateTo);
  const setSelectedEventId = useAppStore((state) => state.setSelectedEventId);
  const { data: session, status: sessionStatus } = useSession();
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [view, setView] = useState<"cards" | "table">("cards");
  const [selectedParkId, setSelectedParkId] = useState("");
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
    queryFn: () => fetchAttendanceEvents(selectedDate, effectiveParkId || undefined),
    enabled: sessionStatus !== "loading" && (!requiresParkSelection || Boolean(effectiveParkId)),
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
        <Card><CardContent className="p-8 text-center"><p className="font-semibold">No group sessions for this date</p><p className="mt-1 text-sm text-muted-foreground">Sessions appear here when the scheduled class date is prepared for your scoped groups.</p></CardContent></Card>
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
    </div>
  );
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
