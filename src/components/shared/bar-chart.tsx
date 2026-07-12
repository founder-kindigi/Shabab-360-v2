"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  barColor?: string;
  showValues?: boolean;
  animate?: boolean;
  className?: string;
  valueFormatter?: (val: number) => string;
}

const PADDING = { top: 24, right: 8, bottom: 28, left: 8 };

export function BarChart({
  data,
  height = 120,
  barColor = "#4B0A8F",
  showValues = true,
  animate = true,
  className = "",
  valueFormatter,
}: BarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState(300);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

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

  const maxValue = useMemo(() => {
    if (data.length === 0) return 10;
    const max = Math.max(...data.map((d) => d.value), 1);
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    return Math.ceil((max * 1.15) / magnitude) * magnitude || 10;
  }, [data]);

  // Grid lines (3 lines: 0, mid, max)
  const gridLines = useMemo(() => {
    const count = 3;
    const lines: number[] = [];
    for (let i = 0; i <= count; i++) {
      lines.push(Math.round((maxValue / count) * i));
    }
    return lines;
  }, [maxValue]);

  const barWidth = useMemo(() => {
    if (data.length === 0) return 0;
    const totalBarSpace = chartW / data.length;
    return Math.max(Math.min(totalBarSpace * 0.6, 40), 6);
  }, [data.length, chartW]);

  const getY = (val: number) =>
    PADDING.top + chartH - (val / maxValue) * chartH;

  const formatVal = (val: number) => {
    if (valueFormatter) return valueFormatter(val);
    return val.toLocaleString();
  };

  // Truncate long month labels
  const formatLabel = (label: string) => {
    // Handle "2025-01" format → "Jan", "Feb", etc.
    const parts = label.split("-");
    if (parts.length === 2) {
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      const monthIdx = parseInt(parts[1], 10) - 1;
      return monthNames[monthIdx] || label;
    }
    // For short labels, use as-is; for longer ones, truncate
    if (label.length <= 6) return label;
    return label.slice(0, 5) + "…";
  };

  const handleBarHover = useCallback(
    (i: number, barX: number, barY: number) => {
      const labelX =
        PADDING.left +
        (i / data.length) * chartW +
        chartW / data.length / 2;
      setHoveredIndex(i);
      setTooltipPos({ x: labelX, y: barY - 8 });
    },
    [data.length, chartW]
  );

  const handleBarLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center text-sm text-muted-foreground ${className}`} style={{ height }}>
        No data available
      </div>
    );
  }

  const cornerRadius = Math.min(barWidth / 2, 4);

  return (
    <div className={`w-full ${className}`}>
      <div className="relative w-full" style={{ height }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${containerWidth} ${height}`}
          className="w-full h-full"
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id={`bar-grad-${barColor.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={barColor} stopOpacity="1" />
              <stop offset="100%" stopColor={barColor} stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridLines.map((val) => {
            const y = getY(val);
            return (
              <line
                key={`grid-${val}`}
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

          {/* Bars */}
          {data.map((d, i) => {
            const x =
              PADDING.left +
              (i / data.length) * chartW +
              chartW / data.length / 2 -
              barWidth / 2;
            const barH = Math.max((d.value / maxValue) * chartH, 0);
            const y = PADDING.top + chartH - barH;
            const labelX =
              PADDING.left +
              (i / data.length) * chartW +
              chartW / data.length / 2;

            return (
              <g key={`bar-${i}`}>
                {/* Invisible hit area for hover */}
                <rect
                  x={x - 4}
                  y={PADDING.top}
                  width={barWidth + 8}
                  height={chartH}
                  fill="transparent"
                  onMouseEnter={() => handleBarHover(i, x, y)}
                  onMouseLeave={handleBarLeave}
                  style={{ cursor: "pointer" }}
                />

                {/* Bar (with rounded top corners) */}
                {d.value > 0 ? (
                  <motion.rect
                    x={x}
                    y={animate ? PADDING.top + chartH : y}
                    width={barWidth}
                    height={animate ? 0 : barH}
                    rx={cornerRadius}
                    ry={cornerRadius}
                    fill={`url(#bar-grad-${barColor.replace("#", "")})`}
                    animate={
                      animate
                        ? { y, height: barH }
                        : undefined
                    }
                    transition={{
                      duration: 0.5,
                      delay: i * 0.05,
                      ease: "easeOut",
                    }}
                    style={{ opacity: hoveredIndex !== null && hoveredIndex !== i ? 0.4 : 1 }}
                  />
                ) : (
                  /* Zero value: thin baseline tick */
                  <line
                    x1={labelX}
                    y1={PADDING.top + chartH}
                    x2={labelX}
                    y2={PADDING.top + chartH + 4}
                    stroke={barColor}
                    strokeWidth={1.5}
                    strokeOpacity={0.4}
                  />
                )}

                {/* Value label above bar */}
                {showValues && d.value > 0 && (
                  <motion.text
                    x={labelX}
                    y={y - 5}
                    textAnchor="middle"
                    className="fill-muted-foreground"
                    style={{ fontSize: "9px", fontWeight: 600 }}
                    initial={animate ? { opacity: 0, y: y + 8 } : undefined}
                    animate={
                      animate
                        ? { opacity: 1, y: y - 5 }
                        : undefined
                    }
                    transition={{
                      duration: 0.4,
                      delay: 0.3 + i * 0.05,
                    }}
                  >
                    {formatVal(d.value)}
                  </motion.text>
                )}

                {/* X-axis label */}
                <text
                  x={labelX}
                  y={height - 6}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  style={{ fontSize: "9px" }}
                >
                  {formatLabel(d.label)}
                </text>

                {/* Hover tooltip */}
                <AnimatePresence>
                  {hoveredIndex === i && d.value > 0 && (
                    <g>
                      <motion.rect
                        x={labelX - 42}
                        y={y - 38}
                        width={84}
                        height={26}
                        rx={6}
                        fill="#1e1e2e"
                        initial={{ opacity: 0, y: y - 28 }}
                        animate={{ opacity: 1, y: y - 38 }}
                        exit={{ opacity: 0, y: y - 28 }}
                        transition={{ duration: 0.15 }}
                      />
                      {/* Tooltip arrow */}
                      <motion.polygon
                        points={`${labelX - 5},${y - 12} ${labelX + 5},${y - 12} ${labelX},${y - 6}`}
                        fill="#1e1e2e"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      />
                      <motion.text
                        x={labelX}
                        y={y - 21}
                        textAnchor="middle"
                        fill="white"
                        style={{ fontSize: "10px", fontWeight: 600 }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        {formatVal(d.value)}
                      </motion.text>
                      <motion.text
                        x={labelX}
                        y={y - 30}
                        textAnchor="middle"
                        fill="#a0a0b8"
                        style={{ fontSize: "8px" }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        {d.label}
                      </motion.text>
                    </g>
                  )}
                </AnimatePresence>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}