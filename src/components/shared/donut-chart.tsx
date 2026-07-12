"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  className?: string;
  centerLabel?: string;
  centerValue?: string;
  legendPosition?: "bottom" | "right";
}

/**
 * Pure SVG donut chart — no external libraries.
 * Uses stroke-dasharray on circles for each segment.
 * Supports interactive legend with toggle visibility.
 */
export function DonutChart({
  segments,
  size = 160,
  strokeWidth = 28,
  className = "",
  centerLabel,
  centerValue,
  legendPosition = "bottom",
}: DonutChartProps) {
  const [hiddenSegments, setHiddenSegments] = useState<Set<string>>(new Set());

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Filter visible segments
  const visibleSegments = useMemo(
    () => segments.filter((s) => !hiddenSegments.has(s.label)),
    [segments, hiddenSegments]
  );

  const total = visibleSegments.reduce((sum, s) => sum + s.value, 0);

  // Calculate cumulative offsets for each segment
  const arcs = useMemo(() => {
    let cumulativePct = 0;
    const result: Array<{
      label: string;
      value: number;
      color: string;
      pct: number;
      arcLength: number;
      startAngle: number;
    }> = [];

    for (const seg of visibleSegments) {
      if (seg.value === 0 || total === 0) continue;
      const pct = seg.value / total;
      const arcLength = pct * circumference;
      const startAngle = cumulativePct * 360;
      cumulativePct += pct;
      result.push({
        label: seg.label,
        value: seg.value,
        color: seg.color,
        pct,
        arcLength,
        startAngle,
      });
    }

    return result;
  }, [visibleSegments, total, circumference]);

  function toggleSegment(label: string) {
    setHiddenSegments((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        // Don't allow hiding the last visible segment
        if (segments.length - next.size > 1) {
          next.add(label);
        }
      }
      return next;
    });
  }

  const isHorizontal = legendPosition === "bottom";

  return (
    <div
      className={`inline-flex ${isHorizontal ? "flex-col items-center" : "flex-row items-center"} gap-4 ${className}`}
    >
      {/* Donut */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`Donut chart: ${visibleSegments.map((s) => `${s.label} ${total > 0 ? Math.round((s.value / total) * 100) : 0}%`).join(", ")}`}
        >
          {/* Background ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted"
            style={{ opacity: 0.2 }}
          />

          {/* Segment arcs */}
          {arcs.map((arc, idx) => (
            <motion.circle
              key={arc.label}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              strokeDasharray={`${arc.arcLength} ${circumference - arc.arcLength}`}
              style={{
                transform: `rotate(${arc.startAngle - 90}deg)`,
                transformOrigin: "50% 50%",
              }}
              initial={{ opacity: 0, strokeDasharray: `0 ${circumference}` }}
              animate={{
                opacity: 1,
                strokeDasharray: `${arc.arcLength} ${circumference - arc.arcLength}`,
              }}
              transition={{ delay: idx * 0.15, duration: 0.5, ease: "easeOut" }}
            />
          ))}

          {/* Empty state when all hidden */}
          {arcs.length === 0 && (
            <text
              x={center}
              y={center}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-muted-foreground"
              style={{ fontSize: "12px" }}
            >
              No data
            </text>
          )}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerValue !== undefined && (
            <p className="text-lg font-bold text-foreground leading-tight">
              {centerValue}
            </p>
          )}
          {centerLabel && (
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
              {centerLabel}
            </p>
          )}
        </div>
      </div>

      {/* Legend */}
      <div
        className={`${
          isHorizontal
            ? "flex items-center justify-center gap-3 flex-wrap"
            : "flex flex-col gap-2.5"
        }`}
      >
        {segments.map((seg) => {
          const pct =
            total > 0 ? Math.round((seg.value / total) * 100) : 0;
          const isHidden = hiddenSegments.has(seg.label);

          return (
            <button
              key={seg.label}
              type="button"
              onClick={() => toggleSegment(seg.label)}
              className={`flex items-center gap-2 group cursor-pointer rounded-md px-1.5 py-1 -mx-1.5 transition-colors ${
                isHidden
                  ? "opacity-40"
                  : "hover:bg-muted/60"
              }`}
              aria-label={`${isHidden ? "Show" : "Hide"} ${seg.label}`}
            >
              <span
                className="inline-block size-3 rounded-sm shrink-0 transition-transform group-hover:scale-110"
                style={{
                  backgroundColor: isHidden ? "currentColor" : seg.color,
                  opacity: isHidden ? 0.3 : 1,
                }}
              />
              <span
                className={`text-[11px] leading-tight ${
                  isHidden ? "text-muted-foreground line-through" : "text-foreground"
                }`}
              >
                {seg.label}
              </span>
              <span
                className={`text-[11px] font-semibold tabular-nums leading-tight ${
                  isHidden ? "text-muted-foreground/60" : "text-foreground"
                }`}
              >
                {seg.value.toLocaleString()}
              </span>
              <span
                className={`text-[11px] tabular-nums leading-tight ${
                  isHidden ? "text-muted-foreground/50" : "text-muted-foreground"
                }`}
              >
                ({pct}%)
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}