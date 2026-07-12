"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Printer, X } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AttendanceReportRow {
  eventDate: string;
  eventTitle: string;
  participantName: string;
  groupName: string;
  batchName: string;
  parkName: string;
  cityName: string;
  status: string;
  markedByName: string | null;
  markedAt: string;
}

interface AttendanceReportData {
  data: AttendanceReportRow[];
  summary: {
    totalEvents: number;
    totalRecords: number;
    presentRate: number;
    absentRate: number;
    statusCounts: {
      present: number;
      absent: number;
      late: number;
      excused: number;
    };
    scopeLabel: string;
    dateRange: {
      from: string | null;
      to: string | null;
    };
  };
}

interface AttendanceReportPrintProps {
  report: AttendanceReportData;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Status badge colors                                               */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<string, string> = {
  present: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400",
  absent: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400",
  late: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400",
  excused: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AttendanceReportPrint({ report, onClose }: AttendanceReportPrintProps) {
  const { data: rows, summary } = report;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="print-area">
      {/* Action bar — hidden in print */}
      <div className="no-print flex items-center justify-between p-4 border-b">
        <div className="text-sm font-medium text-muted-foreground">
          Preview — use Print button to save as PDF
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handlePrint} className="bg-[#4B0A8F] hover:bg-[#3A0870] text-white gap-1.5">
            <Printer className="size-3.5" />
            Print / Save PDF
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Printable content */}
      <div className="p-6 space-y-6" id="attendance-report-print">
        {/* Header */}
        <div className="text-center space-y-2 border-b pb-4">
          <h1 className="text-xl font-bold text-[#4B0A8F] dark:text-[#B87EE0]">
            Shabab360
          </h1>
          <h2 className="text-lg font-semibold">Attendance Report</h2>
          <p className="text-sm text-muted-foreground">
            {summary.scopeLabel}
            {summary.dateRange.from && summary.dateRange.to && (
              <> &mdash; {summary.dateRange.from} to {summary.dateRange.to}</>
            )}
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
          <div className="rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-[#4B0A8F]">{summary.totalEvents}</div>
            <div className="text-xs text-muted-foreground mt-1">Events</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-emerald-600">{summary.presentRate}%</div>
            <div className="text-xs text-muted-foreground mt-1">Present Rate</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{summary.absentRate}%</div>
            <div className="text-xs text-muted-foreground mt-1">Absent Rate</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold">{summary.totalRecords}</div>
            <div className="text-xs text-muted-foreground mt-1">Records</div>
          </div>
        </div>

        {/* Status counts */}
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-500" />
            Present: <strong>{summary.statusCounts.present}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-red-500" />
            Absent: <strong>{summary.statusCounts.absent}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-500" />
            Late: <strong>{summary.statusCounts.late}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-sky-500" />
            Excused: <strong>{summary.statusCounts.excused}</strong>
          </span>
        </div>

        {/* Data table */}
        <div className="overflow-x-auto max-h-[50vh] overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#4B0A8F] hover:bg-[#4B0A8F]">
                <TableHead className="text-white font-semibold text-xs">Date</TableHead>
                <TableHead className="text-white font-semibold text-xs">Event</TableHead>
                <TableHead className="text-white font-semibold text-xs">Participant</TableHead>
                <TableHead className="text-white font-semibold text-xs hidden md:table-cell">Group</TableHead>
                <TableHead className="text-white font-semibold text-xs hidden lg:table-cell">Batch</TableHead>
                <TableHead className="text-white font-semibold text-xs hidden lg:table-cell">Park</TableHead>
                <TableHead className="text-white font-semibold text-xs hidden xl:table-cell">City</TableHead>
                <TableHead className="text-white font-semibold text-xs text-center">Status</TableHead>
                <TableHead className="text-white font-semibold text-xs hidden xl:table-cell">Marked By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i} className="text-xs">
                  <TableCell className="whitespace-nowrap font-medium">{row.eventDate}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.eventTitle}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.participantName}</TableCell>
                  <TableCell className="whitespace-nowrap hidden md:table-cell">{row.groupName}</TableCell>
                  <TableCell className="whitespace-nowrap hidden lg:table-cell">{row.batchName}</TableCell>
                  <TableCell className="whitespace-nowrap hidden lg:table-cell">{row.parkName}</TableCell>
                  <TableCell className="whitespace-nowrap hidden xl:table-cell">{row.cityName}</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[row.status] ?? ""}`}
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap hidden xl:table-cell text-muted-foreground">
                    {row.markedByName ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          Generated by Shabab360 &mdash; {new Date().toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>
    </div>
  );
}