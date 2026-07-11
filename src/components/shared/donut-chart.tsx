"use client";

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
}

/**
 * Pure SVG donut chart — no external libraries.
 * Uses stroke-dasharray on circles for each segment.
 */
export function DonutChart({
  segments,
  size = 160,
  strokeWidth = 28,
  className = "",
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  // Calculate cumulative offsets for each segment
  let cumulativePct = 0;
  const arcs: Array<{
    label: string;
    value: number;
    color: string;
    pct: number;
    arcLength: number;
    startAngle: number;
  }> = [];

  for (const seg of segments) {
    if (seg.value === 0) continue;
    const pct = seg.value / total;
    const arcLength = pct * circumference;
    const startAngle = cumulativePct * 360;
    cumulativePct += pct;
    arcs.push({
      label: seg.label,
      value: seg.value,
      color: seg.color,
      pct,
      arcLength,
      startAngle,
    });
  }

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`Donut chart: ${segments.map((s) => `${s.label} ${total > 0 ? Math.round((s.value / total) * 100) : 0}%`).join(", ")}`}
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
      <div className="flex items-center justify-center gap-3 flex-wrap mt-2">
        {segments.map((seg) => {
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
          return (
            <div key={seg.label} className="flex items-center gap-1.5">
              <span
                className="inline-block size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-[11px] text-muted-foreground">{seg.label}</span>
              <span className="text-[11px] font-semibold tabular-nums text-foreground">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}