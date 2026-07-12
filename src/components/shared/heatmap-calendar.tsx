"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

// ─── Types ───────────────────────────────────────────────────────────

type AttendanceStatus = "present" | "absent" | "late" | "excused" | "unmarked";

interface HeatmapCalendarProps {
  /** Map of date string (YYYY-MM-DD) → attendance status */
  data: Record<string, string>;
  /** Number of months to show (default 6) */
  months?: number;
  /** Callback when a day cell is clicked */
  onDayClick?: (date: string) => void;
}

interface DayCell {
  date: string;
  dateObj: Date;
  status: AttendanceStatus;
  dayOfWeek: number; // 0=Mon ... 6=Sun
  weekIndex: number;
}

interface TooltipState {
  x: number;
  y: number;
  date: string;
  status: AttendanceStatus;
}

// ─── Constants ───────────────────────────────────────────────────────

const CELL_SIZE = 12;
const CELL_GAP = 2;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const MONTH_LABEL_HEIGHT = 16;
const DAY_LABEL_WIDTH = 28;
const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const STATUS_COLORS_LIGHT: Record<AttendanceStatus, string> = {
  present: "#22c55e",
  absent: "#ef4444",
  late: "#f59e0b",
  excused: "#3b82f6",
  unmarked: "#e5e7eb",
};

const STATUS_COLORS_DARK: Record<AttendanceStatus, string> = {
  present: "#22c55e",
  absent: "#ef4444",
  late: "#f59e0b",
  excused: "#3b82f6",
  unmarked: "#374151",
};

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
  unmarked: "No event",
};

function resolveStatus(raw: string | undefined): AttendanceStatus {
  if (!raw) return "unmarked";
  const normalized = raw.toLowerCase();
  if (["present", "p"].includes(normalized)) return "present";
  if (["absent", "a"].includes(normalized)) return "absent";
  if (["late", "l"].includes(normalized)) return "late";
  if (["excused", "e"].includes(normalized)) return "excused";
  return "unmarked";
}

// ─── Component ───────────────────────────────────────────────────────

export function HeatmapCalendar({
  data,
  months = 6,
  onDayClick,
}: HeatmapCalendarProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute cells: group days into weeks (Mon–Sun columns)
  const { cells, monthPositions } = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - months + 1, 1);
    // Align to the Monday on or before startDate
    const startDow = (startDate.getDay() + 6) % 7; // Mon=0
    const alignedStart = new Date(startDate);
    alignedStart.setDate(alignedStart.getDate() - startDow);

    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1, 0); // last day of current month

    const dayCells: DayCell[] = [];
    const cur = new Date(alignedStart);
    let weekIdx = 0;
    let lastWeekStart = cur.getDate();

    while (cur <= endDate) {
      const dow = (cur.getDay() + 6) % 7; // Mon=0 ... Sun=6

      // Check if we crossed a week boundary
      if (dow === 0 && dayCells.length > 0) {
        weekIdx++;
      }

      const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;

      dayCells.push({
        date: dateStr,
        dateObj: new Date(cur),
        status: resolveStatus(data[dateStr]),
        dayOfWeek: dow,
        weekIndex: weekIdx,
      });

      cur.setDate(cur.getDate() + 1);
    }

    // Month label positions (column index where each month starts)
    const monthPositions: Array<{ label: string; colIndex: number }> = [];
    let lastMonth = -1;
    for (const cell of dayCells) {
      const m = cell.dateObj.getMonth();
      if (m !== lastMonth && cell.dateObj >= startDate) {
        monthPositions.push({
          label: MONTH_NAMES[m],
          colIndex: cell.weekIndex,
        });
        lastMonth = m;
      }
    }

    const totalWeeks = weekIdx + 1;

    return { cells: dayCells, monthPositions, totalWeeks };
  }, [data, months]);

  const svgWidth = DAY_LABEL_WIDTH + cells.length > 0
    ? Math.max(...cells.map((c) => c.weekIndex)) * CELL_STEP + CELL_SIZE + 8
    : 400;
  const svgHeight = MONTH_LABEL_HEIGHT + 7 * CELL_STEP + 8;

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent, cell: DayCell) => {
      const rect = (e.currentTarget as SVGElement).closest("svg")?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setTooltip({ x, y, date: cell.date, status: cell.status });
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const colors = isDark ? STATUS_COLORS_DARK : STATUS_COLORS_LIGHT;

  return (
    <div ref={containerRef} className="w-full">
      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="min-w-full"
          role="img"
          aria-label="Attendance heatmap calendar"
        >
          {/* Month labels */}
          {monthPositions.map((mp, i) => (
            <text
              key={`month-${i}`}
              x={DAY_LABEL_WIDTH + mp.colIndex * CELL_STEP}
              y={MONTH_LABEL_HEIGHT - 4}
              className="fill-muted-foreground"
              style={{ fontSize: "10px" }}
            >
              {mp.label}
            </text>
          ))}

          {/* Day-of-week labels */}
          {DAY_LABELS.map((label, i) => (
            <text
              key={`daylabel-${i}`}
              x={0}
              y={MONTH_LABEL_HEIGHT + i * CELL_STEP + CELL_SIZE - 1}
              textAnchor="start"
              className="fill-muted-foreground"
              style={{ fontSize: "9px" }}
            >
              {label}
            </text>
          ))}

          {/* Day cells */}
          {cells.map((cell, idx) => {
            const x = DAY_LABEL_WIDTH + cell.weekIndex * CELL_STEP;
            const y = MONTH_LABEL_HEIGHT + cell.dayOfWeek * CELL_STEP;
            const color = colors[cell.status];

            return (
              <motion.rect
                key={cell.date}
                x={x}
                y={y}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={2}
                ry={2}
                fill={color}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  delay: idx * 0.0008,
                  duration: 0.25,
                  ease: "easeOut",
                }}
                style={{
                  cursor: onDayClick ? "pointer" : "default",
                }}
                onMouseEnter={(e) => handleMouseEnter(e as unknown as React.MouseEvent, cell)}
                onMouseLeave={handleMouseLeave}
                onClick={() => onDayClick?.(cell.date)}
              />
            );
          })}

          {/* Tooltip */}
          <AnimatePresence>
            {tooltip && (
              <g>
                <motion.rect
                  x={tooltip.x - 60}
                  y={tooltip.y - 46}
                  width={120}
                  height={40}
                  rx={6}
                  fill="#1e1e2e"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.95 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                />
                <motion.polygon
                  points={`${tooltip.x - 5},${tooltip.y - 6} ${tooltip.x + 5},${tooltip.y - 6} ${tooltip.x},${tooltip.y}`}
                  fill="#1e1e2e"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.95 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                />
                <motion.text
                  x={tooltip.x}
                  y={tooltip.y - 28}
                  textAnchor="middle"
                  fill="white"
                  style={{ fontSize: "10px", fontWeight: 600 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  {tooltip.date}
                </motion.text>
                <motion.text
                  x={tooltip.x}
                  y={tooltip.y - 14}
                  textAnchor="middle"
                  fill={colors[tooltip.status]}
                  style={{ fontSize: "9px", fontWeight: 500 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  {STATUS_LABELS[tooltip.status]}
                </motion.text>
              </g>
            )}
          </AnimatePresence>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap mt-2">
        {(["present", "absent", "late", "excused"] as AttendanceStatus[]).map(
          (status) => (
            <div key={status} className="flex items-center gap-1">
              <div
                className="size-3 rounded-sm"
                style={{ backgroundColor: colors[status] }}
              />
              <span className="text-[10px] text-muted-foreground">
                {STATUS_LABELS[status]}
              </span>
            </div>
          )
        )}
        <div className="flex items-center gap-1">
          <div
            className="size-3 rounded-sm"
            style={{ backgroundColor: colors.unmarked }}
          />
          <span className="text-[10px] text-muted-foreground">
            No event
          </span>
        </div>
      </div>
    </div>
  );
}