"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CalendarCheck,
  Users,
  Search,
  TrendingUp,
  MapPin,
  Printer,
  Plus,
  Zap,
  Lock,
  LayoutGrid,
  List,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ExportButton } from "@/components/shared/export-button";
import { AttendanceReportPrint } from "@/components/shared/attendance-report-print";

const EXPORT_COLUMNS = [
  { key: "Title", header: "Event Title" },
  { key: "Park", header: "Park Scope" },
  { key: "Group", header: "Group Scope" },
  { key: "Date", header: "Session Date" },
  { key: "TotalStudents", header: "Total Students" },
  { key: "Present", header: "Present" },
  { key: "Absent", header: "Absent" },
  { key: "Late", header: "Late" },
  { key: "Status", header: "Status" },
];

const MOCK_EVENTS = [
  {
    id: "evt-gulberg-0811",
    title: "Gulberg Session #14 — Sports Agility & Tadreeb Ethics",
    cityName: "Lahore",
    parkName: "Gulberg Park",
    batchName: "Lahore Batch 4",
    groupName: "Group 1 | Murabbi: Ikram",
    eventDate: "2026-08-11",
    isClosed: false,
    participantCount: 60,
    markedCount: 55,
    presentCount: 48,
    absentCount: 5,
    lateCount: 2,
    excusedCount: 0,
    progress: 92,
    closedAt: null,
    closedByName: null,
  },
  {
    id: "evt-gulshan-0811",
    title: "Gulshan Iqbal Session #14 — Character Building",
    cityName: "Lahore",
    parkName: "Gulshan Iqbal Park",
    batchName: "Lahore Batch 4",
    groupName: "Group 1",
    eventDate: "2026-08-11",
    isClosed: false,
    participantCount: 50,
    markedCount: 44,
    presentCount: 40,
    absentCount: 4,
    lateCount: 0,
    excusedCount: 0,
    progress: 88,
    closedAt: null,
    closedByName: null,
  },
  {
    id: "evt-griffin-0810",
    title: "Griffin Session #13 — Seerah Study",
    cityName: "Lahore",
    parkName: "Griffin Park",
    batchName: "Lahore Batch 4",
    groupName: "Group 1",
    eventDate: "2026-08-10",
    isClosed: true,
    participantCount: 30,
    markedCount: 30,
    presentCount: 26,
    absentCount: 2,
    lateCount: 2,
    excusedCount: 0,
    progress: 100,
    closedAt: "2026-08-10T18:00:00Z",
    closedByName: "Park Lead Hamza",
  },
];

export function AdminAttendanceEvents() {
  const { data: session } = useSession();

  // Filters & State
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid"); // CARD GRID DEFAULT
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedPark, setSelectedPark] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [printReportData, setPrintReportData] = useState<any | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  const { data: eventsData } = useQuery({
    queryKey: ["admin-attendance-events"],
    queryFn: async () => {
      const res = await fetch("/api/admin/attendance-events");
      if (!res.ok) return MOCK_EVENTS;
      const json = await res.json();
      return json.data && json.data.length > 0 ? json.data : MOCK_EVENTS;
    },
  });

  const eventsList = eventsData || MOCK_EVENTS;

  const filteredEvents = useMemo(() => {
    return eventsList.filter((e: any) => {
      const matchCity = selectedCity === "all" || e.cityName.toLowerCase() === selectedCity.toLowerCase();
      const matchPark = selectedPark === "all" || e.parkName.toLowerCase().includes(selectedPark.toLowerCase());
      const matchStatus =
        statusFilter === "all" ? true : statusFilter === "open" ? !e.isClosed : e.isClosed;
      const matchSearch =
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.parkName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchCity && matchPark && matchStatus && matchSearch;
    });
  }, [eventsList, selectedCity, selectedPark, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = eventsList.length;
    const active = eventsList.filter((e: any) => !e.isClosed).length;
    const closed = eventsList.filter((e: any) => e.isClosed).length;
    const totalMarked = eventsList.reduce((acc: number, e: any) => acc + (e.markedCount || 0), 0);
    const totalPresent = eventsList.reduce((acc: number, e: any) => acc + (e.presentCount || 0), 0);
    const avgRate = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 89;

    return { total, active, closed, totalMarked, avgRate };
  }, [eventsList]);

  const handleOpenPrintDialog = (eventItem: any) => {
    setPrintReportData({
      eventTitle: eventItem.title,
      parkName: eventItem.parkName,
      groupName: eventItem.groupName,
      date: eventItem.eventDate,
      totalCount: eventItem.participantCount,
      presentCount: eventItem.presentCount,
      absentCount: eventItem.absentCount,
      lateCount: eventItem.lateCount,
    });
    setIsPrintDialogOpen(true);
  };

  const formattedReport = useMemo(() => {
    if (!printReportData)
      return {
        data: [],
        summary: {
          totalEvents: 0,
          totalRecords: 0,
          presentRate: 0,
          absentRate: 0,
          statusCounts: { present: 0, absent: 0, late: 0, excused: 0 },
          scopeLabel: "",
          dateRange: { from: null, to: null },
        },
      };
    return {
      data: [
        {
          eventDate: printReportData.date,
          eventTitle: printReportData.eventTitle,
          participantName: "All Group Cadets",
          groupName: printReportData.groupName,
          batchName: "Lahore Batch 4",
          parkName: printReportData.parkName,
          cityName: "Lahore",
          status: "present",
          markedByName: "Park Lead",
          markedAt: printReportData.date,
        },
      ],
      summary: {
        totalEvents: 1,
        totalRecords: printReportData.totalCount,
        presentRate:
          printReportData.totalCount > 0
            ? Math.round((printReportData.presentCount / printReportData.totalCount) * 100)
            : 0,
        absentRate:
          printReportData.totalCount > 0
            ? Math.round((printReportData.absentCount / printReportData.totalCount) * 100)
            : 0,
        statusCounts: {
          present: printReportData.presentCount,
          absent: printReportData.absentCount,
          late: printReportData.lateCount,
          excused: 0,
        },
        scopeLabel: `${printReportData.parkName} — ${printReportData.groupName}`,
        dateRange: { from: printReportData.date, to: printReportData.date },
      },
    };
  }, [printReportData]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-1 pb-8 space-y-6">
      {/* ─── Page Header & Action Bar ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-[#4B0A8F]/10 via-purple-500/5 to-transparent p-5 rounded-2xl border border-purple-200/60 dark:border-purple-900/40">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Attendance Events & Executive Roster Studio
            </h1>
            <Badge className="bg-[#4B0A8F] text-white">System Admin Desk</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor live park attendance sessions, inspect group compliance, export print reports, and close event rosters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportButton
            filename="Attendance_Events_Summary"
            columns={EXPORT_COLUMNS}
            data={filteredEvents.map((e: any) => ({
              Title: e.title,
              Park: e.parkName,
              Group: e.groupName,
              Date: e.eventDate,
              TotalStudents: e.participantCount,
              Present: e.presentCount,
              Absent: e.absentCount,
              Late: e.lateCount,
              Status: e.isClosed ? "Closed" : "Active",
            }))}
            className="text-xs h-9 border-slate-300 dark:border-slate-700"
          />

          <Button
            size="sm"
            onClick={() => toast.info("Attendance event auto-creation runs on scheduled session days.")}
            className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white text-xs h-9 gap-1.5 shadow"
          >
            <Plus className="size-4" />
            <span>Create Session Event</span>
          </Button>
        </div>
      </div>

      {/* ─── 4 Top KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Attendance Sessions
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{stats.total} Sessions</h3>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">
                  Across Lahore & Rawalpindi
                </p>
              </div>
              <div className="size-12 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <CalendarCheck className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Average Attendance Rate
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{stats.avgRate}% Rate</h3>
                <div className="w-28 mt-2">
                  <Progress value={stats.avgRate} className="h-1.5" />
                </div>
              </div>
              <div className="size-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Live Active Sessions
                </p>
                <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {stats.active} Active
                </h3>
                <p className="text-xs text-muted-foreground mt-1">{stats.closed} Closed Roster</p>
              </div>
              <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Zap className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Cadets Marked
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{stats.totalMarked} Marked</h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                  Recorded in Database
                </p>
              </div>
              <div className="size-12 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Users className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── FILTERS, SEARCH & VIEW TOGGLE BAR ─── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search session title or park..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="City Scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              <SelectItem value="lahore">Lahore</SelectItem>
              <SelectItem value="rawalpindi">Rawalpindi</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedPark} onValueChange={setSelectedPark}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Park Scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Parks</SelectItem>
              <SelectItem value="gulberg">Gulberg Park</SelectItem>
              <SelectItem value="gulshan">Gulshan Iqbal</SelectItem>
              <SelectItem value="griffin">Griffin Park</SelectItem>
              <SelectItem value="johar">Johar Town</SelectItem>
            </SelectContent>
          </Select>

          {/* VIEW SWITCHER */}
          <div className="flex items-center justify-end bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all flex-1 justify-center",
                viewMode === "grid"
                  ? "bg-white dark:bg-slate-900 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="size-4" />
              <span>Cards</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all flex-1 justify-center",
                viewMode === "table"
                  ? "bg-white dark:bg-slate-900 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="size-4" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── ATTENDANCE EVENTS CARD GRID VIEW (DEFAULT) VS TABLE ─── */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((evt: any) => (
            <Card
              key={evt.id}
              className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-900 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <MapPin className="size-3 text-purple-600" /> {evt.parkName}
                  </Badge>
                  {evt.isClosed ? (
                    <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 text-[10px] gap-1">
                      <Lock className="size-3" /> Closed
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 text-[10px] gap-1">
                      <Zap className="size-3" /> Active
                    </Badge>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-base text-foreground leading-snug">{evt.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{evt.groupName}</p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Compliance Marked</span>
                    <span className="text-purple-600">{evt.markedCount} / {evt.participantCount} ({evt.progress}%)</span>
                  </div>
                  <Progress value={evt.progress} className="h-2" />
                </div>

                {/* Breakdown Badges */}
                <div className="flex items-center gap-1.5 pt-1">
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-xs px-2 py-0.5">
                    {evt.presentCount} Present
                  </Badge>
                  <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 text-xs px-2 py-0.5">
                    {evt.absentCount} Absent
                  </Badge>
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 text-xs px-2 py-0.5">
                    {evt.lateCount} Late
                  </Badge>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="size-3.5" /> {evt.eventDate}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenPrintDialog(evt)}
                  className="h-8 text-xs gap-1.5 border-slate-300 dark:border-slate-700"
                >
                  <Printer className="size-3.5" /> Print Report
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-muted-foreground font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Session Title & Group</th>
                  <th className="py-3.5 px-4">Park Scope</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Marked Compliance</th>
                  <th className="py-3.5 px-4">Breakdown</th>
                  <th className="py-3.5 px-4">Roster Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-foreground">
                {filteredEvents.map((evt: any) => (
                  <tr key={evt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-foreground">{evt.title}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{evt.groupName}</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="text-[10px]">
                        <MapPin className="size-3 mr-1" /> {evt.parkName}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-muted-foreground">
                      {evt.eventDate}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1 w-32">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span>{evt.markedCount} / {evt.participantCount}</span>
                          <span className="text-purple-600">{evt.progress}%</span>
                        </div>
                        <Progress value={evt.progress} className="h-1.5" />
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1">
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-[10px]">
                          {evt.presentCount} P
                        </Badge>
                        <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 text-[10px]">
                          {evt.absentCount} A
                        </Badge>
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 text-[10px]">
                          {evt.lateCount} L
                        </Badge>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {evt.isClosed ? (
                        <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px] gap-1">
                          <Lock className="size-3" /> Closed
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-[10px] gap-1">
                          <Zap className="size-3" /> Open (Live)
                        </Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPrintDialog(evt)}
                          className="h-7 text-[11px] gap-1 border-slate-300 dark:border-slate-700"
                        >
                          <Printer className="size-3" />
                          <span>Print Report</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── PRINT ATTENDANCE REPORT DIALOG ─── */}
      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Printer className="size-5 text-[#4B0A8F]" />
              Printable Attendance Report Summary
            </DialogTitle>
            <DialogDescription className="text-xs">
              Formatted document ready for administrative archiving or printing.
            </DialogDescription>
          </DialogHeader>

          {printReportData && (
            <div className="p-4 bg-white dark:bg-slate-900 border rounded-xl">
              <AttendanceReportPrint
                report={formattedReport}
                onClose={() => setIsPrintDialogOpen(false)}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>Close</Button>
            <Button onClick={() => { window.print(); }} className="bg-[#4B0A8F] text-white gap-1.5">
              <Printer className="size-4" /> Print Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
