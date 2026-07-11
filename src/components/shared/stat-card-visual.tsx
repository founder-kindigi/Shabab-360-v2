"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// ─── Types ───────────────────────────────────────────────────────────

type VisualType = "sparkline" | "bar" | "gauge" | "none";

interface StatCardVisualProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  visual?: VisualType;
  data?: number[];
  color?: string;
  className?: string;
}

// ─── Mini Sparkline (inline) ────────────────────────────────────────

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 32;
  const pad = 2;
  const chartW = w - pad * 2;
  const chartH = h - pad * 2;

  const points = data.map((val, i) => ({
    x: pad + (i / (data.length - 1)) * chartW,
    y: pad + chartH - ((val - min) / range) * chartH,
  }));

  const linePath = points.reduce(
    (d, p, i) =>
      i === 0 ? `M${p.x},${p.y}` : `${d} L${p.x},${p.y}`,
    ""
  );
  const areaPath = `${linePath} L${points[points.length - 1].x},${h - pad} L${points[0].x},${h - pad} Z`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="overflow-visible opacity-30"
    >
      <defs>
        <linearGradient
          id={`stat-spark-${color.replace("#", "")}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#stat-spark-${color.replace("#", "")})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Mini Gauge (inline) ─────────────────────────────────────────────

function MiniGauge({
  value,
  color,
}: {
  value: number;
  color: string;
}) {
  const size = 48;
  const strokeWidth = 5;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const fillOffset = circumference - (clamped / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="transform -rotate-90 opacity-30"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className="text-muted/30"
      />
      <motion.circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: fillOffset }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
      />
    </svg>
  );
}

// ─── Mini Bar (inline) ───────────────────────────────────────────────

function MiniBar({ value, color }: { value: number; color: string }) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className="w-full h-2 rounded-full bg-muted/30 overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{
          background: `linear-gradient(90deg, ${color}, ${color}BB)`,
        }}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
      />
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────

export function StatCardVisual({
  title,
  value,
  icon: Icon,
  trend,
  visual = "none",
  data,
  color = "#4B0A8F",
  className = "",
}: StatCardVisualProps) {
  // Derive a numeric value for gauge/bar if possible
  const numericValue = useMemo(() => {
    if (typeof value === "number") return Math.min(100, Math.max(0, value));
    const parsed = parseFloat(String(value).replace(/[%,]/g, ""));
    return isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed));
  }, [value]);

  return (
    <Card className={`overflow-hidden relative ${className}`}>
      <CardContent className="p-3 sm:p-4 relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center size-8 rounded-lg shrink-0"
                style={{
                  backgroundColor: `${color}18`,
                }}
              >
                <Icon className="size-4" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  {title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-lg sm:text-xl font-bold text-foreground tabular-nums leading-tight">
                    {value}
                  </p>
                  {trend && trend.value !== 0 && (
                    <span
                      className={`flex items-center gap-0.5 text-[9px] sm:text-[10px] font-semibold px-1 py-0.5 rounded-full ${
                        trend.direction === "up"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-red-500/10 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {trend.direction === "up" ? (
                        <TrendingUp className="size-2.5" />
                      ) : (
                        <TrendingDown className="size-2.5" />
                      )}
                      {Math.abs(trend.value)}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Inline mini-visualizations (below the value) */}
            <div className="mt-2">
              {visual === "sparkline" && data && data.length > 1 && (
                <MiniSparkline data={data} color={color} />
              )}
              {visual === "bar" && (
                <MiniBar value={numericValue} color={color} />
              )}
              {visual === "gauge" && (
                <MiniGauge value={numericValue} color={color} />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}