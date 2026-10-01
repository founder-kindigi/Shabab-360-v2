"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { format, parseISO } from "date-fns";

interface AttendanceChartProps {
  data: { date: string; present: number; late: number; absent: number }[];
  height?: number;
  showLegend?: boolean;
}

// Brand colors
const COLORS = {
  present: { stroke: "#4B0A8F", fill: "rgba(75,10,143,0.15)" },
  late: { stroke: "#A0006B", fill: "rgba(160,0,107,0.12)" },
  absent: { stroke: "#FF0015", fill: "rgba(255,0,21,0.10)" },
};

const PADDING = { top: 20, right: 16, bottom: 36, left: 44 };

export function AttendanceChart({
  data,
  height = 200,
  showLegend = true,
}: AttendanceChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    data: (typeof data)[number];
  } | null>(null);
  const [containerWidth, setContainerWidth] = useState(600);
  const uniqueId = useMemo(
    () => `chart-${Math.random().toString(36).slice(2, 8)}`,
    []
  );

  // Responsive width
  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const chartW = containerWidth - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  // Compute max value across all series for Y axis
  const maxValue = useMemo(() => {
    if (data.length === 0) return 10;
    const vals = data.flatMap((d) => [d.present, d.late, d.absent]);
    const max = Math.max(...vals, 1);
    // Round up to a nice number
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    return Math.ceil(max / magnitude) * magnitude || 10;
  }, [data]);

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const count = 5;
    const ticks: number[] = [];
    for (let i = 0; i <= count; i++) {
      ticks.push(Math.round((maxValue / count) * i));
    }
    return ticks;
  }, [maxValue]);

  // X-axis label step (show every Nth label to avoid crowding)
  const xLabelStep = useMemo(() => {
    if (data.length <= 7) return 1;
    if (data.length <= 14) return 2;
    return 3;
  }, [data.length]);

  // Map data to SVG coordinates
  const getX = useCallback(
    (i: number) => PADDING.left + (i / Math.max(data.length - 1, 1)) * chartW,
    [data.length, chartW]
  );
  const getY = useCallback(
    (val: number) => PADDING.top + chartH - (val / maxValue) * chartH,
    [chartH, maxValue]
  );

  // Build series points
  const seriesPoints = useMemo(() => {
    const present: { x: number; y: number }[] = [];
    const late: { x: number; y: number }[] = [];
    const absent: { x: number; y: number }[] = [];

    data.forEach((d, i) => {
      present.push({ x: getX(i), y: getY(d.present) });
      late.push({ x: getX(i), y: getY(d.late) });
      absent.push({ x: getX(i), y: getY(d.absent) });
    });

    return { present, late, absent };
  }, [data, getX, getY]);

  // Build smooth SVG paths
  const buildAreaPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return "";
    const linePath = buildSmoothPath(points);
    const baseY = PADDING.top + chartH;
    return `${linePath} L${points[points.length - 1].x},${baseY} L${points[0].x},${baseY} Z`;
  };

  const presentLinePath = buildSmoothPath(seriesPoints.present);
  const presentAreaPath = buildAreaPath(seriesPoints.present);
  const lateLinePath = buildSmoothPath(seriesPoints.late);
  const lateAreaPath = buildAreaPath(seriesPoints.late);
  const absentLinePath = buildSmoothPath(seriesPoints.absent);
  const absentAreaPath = buildAreaPath(seriesPoints.absent);

  // Hover handling
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg || data.length === 0) return;
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;

      // Find nearest data point
      let closestIdx = 0;
      let closestDist = Infinity;
      data.forEach((_, i) => {
        const dist = Math.abs(getX(i) - mx);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      });

      if (closestDist < chartW / data.length) {
        setTooltip({
          x: getX(closestIdx),
          y: 0,
          data: data[closestIdx],
        });
      } else {
        setTooltip(null);
      }
    },
    [data, getX, chartW]
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  const formatLabel = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd MMM");
    } catch {
      return dateStr.slice(5);
    }
  };

  const formatTooltipDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd MMM yyyy");
    } catch {
      return dateStr;
    }
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
        No attendance data available
      </div>
    );
  }

  return (
    <div className="w-full">
      {showLegend && (
        <div className="flex items-center gap-5 mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.present.stroke }} />
            <span className="text-xs text-muted-foreground">Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.late.stroke }} />
            <span className="text-xs text-muted-foreground">Late</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.absent.stroke }} />
            <span className="text-xs text-muted-foreground">Absent</span>
          </div>
        </div>
      )}

      <div className="relative w-full" style={{ height }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${containerWidth} ${height}`}
          className="w-full h-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id={`${uniqueId}-present`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.present.stroke} stopOpacity="0.25" />
              <stop offset="100%" stopColor={COLORS.present.stroke} stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id={`${uniqueId}-late`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.late.stroke} stopOpacity="0.2" />
              <stop offset="100%" stopColor={COLORS.late.stroke} stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id={`${uniqueId}-absent`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.absent.stroke} stopOpacity="0.15" />
              <stop offset="100%" stopColor={COLORS.absent.stroke} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map((val, index) => {
            const y = getY(val);
            return (
              <line
                key={`grid-${index}-${val}`}
                x1={PADDING.left}
                y1={y}
                x2={PADDING.left + chartW}
                y2={y}
                className="stroke-border/40"
                strokeWidth={0.5}
                strokeDasharray={val === 0 ? "none" : "4 3"}
              />
            );
          })}

          {/* Y-axis labels */}
          {yTicks.map((val, index) => {
            const y = getY(val);
            return (
              <text
                key={`label-${index}-${val}`}
                x={PADDING.left - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-muted-foreground"
                style={{ fontSize: "10px" }}
              >
                {val}
              </text>
            );
          })}

          {/* X-axis labels */}
          {data.map((d, i) => {
            if (i % xLabelStep !== 0 && i !== data.length - 1) return null;
            return (
              <text
                key={d.date}
                x={getX(i)}
                y={height - 8}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: "10px" }}
              >
                {formatLabel(d.date)}
              </text>
            );
          })}

          {/* Absent area (bottom layer) */}
          <path d={absentAreaPath} fill={`url(#${uniqueId}-absent)`} />
          <path
            d={absentLinePath}
            fill="none"
            stroke={COLORS.absent.stroke}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />

          {/* Late area (middle layer) */}
          <path d={lateAreaPath} fill={`url(#${uniqueId}-late)`} />
          <path
            d={lateLinePath}
            fill="none"
            stroke={COLORS.late.stroke}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />

          {/* Present area (top layer) */}
          <path d={presentAreaPath} fill={`url(#${uniqueId}-present)`} />
          <path
            d={presentLinePath}
            fill="none"
            stroke={COLORS.present.stroke}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover vertical line */}
          {tooltip && (
            <line
              x1={tooltip.x}
              y1={PADDING.top}
              x2={tooltip.x}
              y2={PADDING.top + chartH}
              className="stroke-border"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}

          {/* Hover dots */}
          {tooltip &&
            data
              .map((d, i) => ({ d, i }))
              .filter(({ i }) => getX(i) === tooltip.x)
              .map(({ i }) => (
                <g key={`dots-${i}`}>
                  <circle
                    cx={getX(i)}
                    cy={getY(data[i].present)}
                    r={4}
                    fill="white"
                    stroke={COLORS.present.stroke}
                    strokeWidth={2}
                  />
                  <circle
                    cx={getX(i)}
                    cy={getY(data[i].late)}
                    r={3.5}
                    fill="white"
                    stroke={COLORS.late.stroke}
                    strokeWidth={1.5}
                  />
                  <circle
                    cx={getX(i)}
                    cy={getY(data[i].absent)}
                    r={3.5}
                    fill="white"
                    stroke={COLORS.absent.stroke}
                    strokeWidth={1.5}
                  />
                </g>
              ))}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-50 pointer-events-none rounded-lg border bg-popover px-3 py-2 text-xs shadow-md"
            style={{
              left: `${tooltip.x}px`,
              top: `${8}px`,
              transform: `translateX(${tooltip.x > containerWidth / 2 ? "-100%" : "0"}px)`,
            }}
          >
            <p className="font-semibold text-foreground mb-1.5">
              {formatTooltipDate(tooltip.data.date)}
            </p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.present.stroke }} />
                <span className="text-muted-foreground">Present:</span>
                <span className="font-medium">{tooltip.data.present}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.late.stroke }} />
                <span className="text-muted-foreground">Late:</span>
                <span className="font-medium">{tooltip.data.late}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.absent.stroke }} />
                <span className="text-muted-foreground">Absent:</span>
                <span className="font-medium">{tooltip.data.absent}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Build a smooth cubic bezier path through the given points
 * using catmull-rom to bezier conversion with tension 0.3.
 */
function buildSmoothPath(
  points: { x: number; y: number }[]
): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  }

  let d = `M${points[0].x},${points[0].y}`;
  const tension = 0.3;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return d;
}
