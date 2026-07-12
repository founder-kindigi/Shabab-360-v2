"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPKT } from "@/lib/timezone";
import { motion } from "framer-motion";
import { Printer, X } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AttendanceReportRow {
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

export interface AttendanceReportSummary {
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
}

export interface AttendanceReportData {
  data: AttendanceReportRow[];
  summary: AttendanceReportSummary;
}

/* ------------------------------------------------------------------ */
/*  Status badge config                                                */
/* ------------------------------------------------------------------ */

const STATUS_STYLE: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  present: { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-400", label: "Present" },
  absent: { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-400", label: "Absent" },
  late: { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-400", label: "Late" },
  excused: { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-400", label: "Excused" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400", label: status };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold print:px-1.5 print:py-0 ${s.bg} ${s.text}`}
    >
      <span className="inline-block size-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface AttendanceReportPrintProps {
  report: AttendanceReportData;
  onClose?: () => void;
}

export function AttendanceReportPrint({
  report,
  onClose,
}: AttendanceReportPrintProps) {
  const { data: rows, summary } = report;

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const generatedAt = formatPKT(new Date(), "dd MMM yyyy 'at' hh:mm a");

  const dateRangeText =
    summary.dateRange.from && summary.dateRange.to
      ? `${summary.dateRange.from} — ${summary.dateRange.to}`
      : summary.dateRange.from
        ? `From ${summary.dateRange.from}`
        : summary.dateRange.to
          ? `Until ${summary.dateRange.to}`
          : "All time";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="print-area"
    >
      {/* Action buttons — hidden when printing */}
      <div className="no-print flex items-center justify-end gap-2 mb-4">
        <Button
          onClick={handlePrint}
          className="bg-[#4B0A8F] hover:bg-[#3A0870] text-white gap-2"
        >
          <Printer className="size-4" />
          Print Report
        </Button>
        {onClose && (
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="size-4" />
            Close
          </Button>
        )}
      </div>

      {/* Printable report container */}
      <div className="bg-white dark:bg-background rounded-xl border border-border/50 shadow-sm overflow-hidden">
        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-[#4B0A8F] via-[#6B1AAE] to-[#A0006B] px-6 py-5 text-white print:px-4 print:py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                SHABAB360
              </h1>
              <p className="text-sm font-medium text-white/80 mt-0.5">
                Attendance Report
              </p>
            </div>
            <div className="text-right text-sm text-white/80 space-y-0.5">
              <p>
                <span className="text-white/60">Period:</span>{" "}
                {dateRangeText}
              </p>
              <p>
                <span className="text-white/60">Scope:</span>{" "}
                {summary.scopeLabel}
              </p>
            </div>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-border/50 print:grid-cols-4">
          <div className="px-6 py-4 border-r border-b md:border-b-0 border-border/50 print:px-3 print:py-2.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Events
            </p>
            <p className="text-2xl font-bold text-[#4B0A8F] dark:text-[#8A40B0] mt-0.5">
              {summary.totalEvents}
            </p>
          </div>
          <div className="px-6 py-4 md:border-r border-b md:border-b-0 border-border/50 print:px-3 print:py-2.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Records
            </p>
            <p className="text-2xl font-bold text-[#4B0A8F] dark:text-[#8A40B0] mt-0.5">
              {summary.totalRecords.toLocaleString()}
            </p>
          </div>
          <div className="px-6 py-4 border-r border-border/50 print:px-3 print:py-2.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Present Rate
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {summary.presentRate}%
            </p>
          </div>
          <div className="px-6 py-4 print:px-3 print:py-2.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Absent Rate
            </p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-0.5">
              {summary.absentRate}%
            </p>
          </div>
        </div>

        {/* ── Status breakdown row ── */}
        <div className="px-6 py-3 bg-muted/30 border-b border-border/50 flex flex-wrap items-center gap-4 text-sm print:px-3 print:py-2">
          <span className="text-muted-foreground text-xs font-medium">Breakdown:</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-emerald-500" />
            Present{" "}
            <span className="font-semibold">
              {summary.statusCounts.present}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-amber-500" />
            Late{" "}
            <span className="font-semibold">
              {summary.statusCounts.late}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-red-500" />
            Absent{" "}
            <span className="font-semibold">
              {summary.statusCounts.absent}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-blue-500" />
            Excused{" "}
            <span className="font-semibold">
              {summary.statusCounts.excused}
            </span>
          </span>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted/80 text-muted-foreground print:bg-muted print:text-foreground">
                <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider print:py-2 print:px-2.5">
                  Event Date
                </th>
                <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider print:py-2 print:px-2.5">
                  Event Title
                </th>
                <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider print:py-2 print:px-2.5">
                  Participant
                </th>
                <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider print:py-2 print:px-2.5 hidden lg:table-cell">
                  Group
                </th>
                <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider print:py-2 print:px-2.5 hidden md:table-cell">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider print:py-2 print:px-2.5 hidden xl:table-cell">
                  Marked By
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No attendance records found for the selected criteria.
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr
                    key={`${row.eventDate}-${row.participantName}-${i}`}
                    className="border-b border-border/30 hover:bg-muted/30 transition-colors print:hover:bg-transparent"
                  >
                    <td className="py-2.5 px-4 whitespace-nowrap print:py-2 print:px-2.5">
                      {row.eventDate}
                    </td>
                    <td className="py-2.5 px-4 font-medium max-w-[200px] truncate print:py-2 print:px-2.5">
                      {row.eventTitle}
                    </td>
                    <td className="py-2.5 px-4 print:py-2 print:px-2.5">
                      {row.participantName}
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground hidden lg:table-cell print:py-2 print:px-2.5">
                      {row.groupName}
                    </td>
                    <td className="py-2.5 px-4 hidden md:table-cell print:py-2 print:px-2.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground text-xs hidden xl:table-cell print:py-2 print:px-2.5">
                      {row.markedByName || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 bg-muted/20 border-t border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-muted-foreground print:px-3 print:py-2">
          <p>Generated by Shabab360</p>
          <p>Generated on {generatedAt}</p>
        </div>
      </div>
    </motion.div>
  );
}