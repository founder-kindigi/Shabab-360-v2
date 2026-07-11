"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion } from "framer-motion";

export interface WaterfallItem {
  label: string;
  value: number;
  isTotal?: boolean;
  color?: string;
}

interface WaterfallChartProps {
  data: WaterfallItem[];
  height?: number;
  className?: string;
  valueFormatter?: (val: number) => string;
  positiveColor?: string;
  negativeColor?: string;
  totalColor?: string;
}

const PADDING = { top: 28, right: 16, bottom: 32, left: 16 };

export function WaterfallChart({
  data,
  height = 160,
  className = "",
  valueFormatter,
  positiveColor = "#16a34a",
  negativeColor = "#dc2626",
  totalColor = "#4B0A8F",
}: WaterfallChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState(300);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

  // Calculate running totals and bar positions
  const bars = useMemo(() => {
    let running = 0;
    const result: Array<{
      label: string;
      value: number;
      isTotal: boolean;
      color: string;
      start: number;
      end: number;
      barTop: number;
      barBottom: number;
      barHeight: number;
    }> = [];

    for (const item of data) {
      const isNeg = item.value < 0;
      const isT = item.isTotal ?? false;

      let start: number;
      let end: number;

      if (isT) {
        // Total bar starts from 0
        start = 0;
        end = running + item.value;
        running = end;
      } else if (isNeg) {
        start = running + item.value;
        end = running;
        running = start;
      } else {
        start = running;
        end = running + item.value;
        running = end;
      }

      const color = item.color ?? (isT ? totalColor : isNeg ? negativeColor : positiveColor);

      result.push({
        label: item.label,
        value: item.value,
        isTotal: isT,
        color,
        start,
        end,
        barTop: 0,
        barBottom: 0,
        barHeight: 0,
      });
    }

    // Find global min/max for scaling
    const allValues = result.flatMap((b) => [b.start, b.end]);
    const minVal = Math.min(0, ...allValues);
    const maxVal = Math.max(0, ...allValues);

    // Add padding
    const range = maxVal - minVal || 1;
    const scaleMax = maxVal + range * 0.1;
    const scaleMin = minVal > 0 ? 0 : minVal - range * 0.1;

    const scaleRange = scaleMax - scaleMin;

    for (const bar of result) {
      const topY = PADDING.top + chartH - ((bar.end - scaleMin) / scaleRange) * chartH;
      const bottomY = PADDING.top + chartH - ((bar.start - scaleMin) / scaleRange) * chartH;
      bar.barTop = Math.min(topY, bottomY);
      bar.barBottom = Math.max(topY, bottomY);
      bar.barHeight = Math.max(bar.barBottom - bar.barTop, 0);
    }

    return { bars: result, scaleMin, scaleMax, zeroY: PADDING.top + chartH - ((0 - scaleMin) / (scaleMax - scaleMin)) * chartH };
  }, [data, chartH, positiveColor, negativeColor, totalColor]);

  const barWidth = useMemo(() => {
    if (data.length === 0) return 0;
    const totalBarSpace = chartW / data.length;
    return Math.max(Math.min(totalBarSpace * 0.5, 36), 8);
  }, [data.length, chartW]);

  const formatVal = (val: number) => {
    if (valueFormatter) return valueFormatter(val);
    return val.toLocaleString();
  };

  // Truncate labels
  const formatLabel = (label: string) => {
    if (label.length <= 8) return label;
    return label.slice(0, 7) + "…";
  };

  const handleBarHover = useCallback((i: number) => {
    setHoveredIndex(i);
  }, []);

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

  const cornerRadius = Math.min(barWidth / 2, 3);

  return (
    <div className={`w-full ${className}`}>
      <div className="relative w-full" style={{ height }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${containerWidth} ${height}`}
          className="w-full h-full"
          style={{ overflow: "visible" }}
        >
          {/* Zero line */}
          <line
            x1={PADDING.left}
            y1={bars.zeroY}
            x2={PADDING.left + chartW}
            y2={bars.zeroY}
            className="stroke-border/60"
            strokeWidth={0.5}
          />

          {bars.bars.map((bar, i) => {
            const x =
              PADDING.left +
              (i / data.length) * chartW +
              chartW / data.length / 2 -
              barWidth / 2;
            const labelX =
              PADDING.left +
              (i / data.length) * chartW +
              chartW / data.length / 2;
            const valueText = formatVal(Math.abs(bar.value));
            const displayValue = bar.isTotal
              ? formatVal(bar.end)
              : `${bar.value > 0 ? "+" : ""}${formatVal(bar.value)}`;

            return (
              <g key={`wf-${i}`}>
                {/* Invisible hit area */}
                <rect
                  x={x - 4}
                  y={PADDING.top}
                  width={barWidth + 8}
                  height={chartH}
                  fill="transparent"
                  onMouseEnter={() => handleBarHover(i)}
                  onMouseLeave={handleBarLeave}
                  style={{ cursor: "pointer" }}
                />

                {/* Connecting line to next bar (dashed) */}
                {!bar.isTotal && i < bars.bars.length - 1 && (
                  <line
                    x1={labelX + barWidth / 2}
                    y1={bars.zeroY}
                    x2={
                      PADDING.left +
                      ((i + 1) / data.length) * chartW +
                      chartW / data.length / 2 -
                      barWidth / 2
                    }
                    y2={bars.zeroY}
                    stroke="currentColor"
                    strokeWidth={0.8}
                    strokeDasharray="3 2"
                    className="text-muted-foreground/30"
                  />
                )}

                {/* Bar */}
                {bar.barHeight > 0 && (
                  <motion.rect
                    x={x}
                    y={bar.barTop}
                    width={barWidth}
                    height={0}
                    rx={cornerRadius}
                    ry={cornerRadius}
                    fill={bar.color}
                    opacity={hoveredIndex !== null && hoveredIndex !== i ? 0.4 : 0.85}
                    initial={{ height: 0, y: bars.zeroY }}
                    animate={{ height: bar.barHeight, y: bar.barTop }}
                    transition={{
                      duration: 0.5,
                      delay: i * 0.07,
                      ease: "easeOut",
                    }}
                  />
                )}

                {/* Value label */}
                <motion.text
                  x={labelX}
                  y={bar.barTop - 6}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  style={{ fontSize: "9px", fontWeight: 600 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.07 }}
                >
                  {displayValue}
                </motion.text>

                {/* X-axis label */}
                <text
                  x={labelX}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  style={{ fontSize: "9px" }}
                >
                  {formatLabel(bar.label)}
                </text>

                {/* Hover tooltip */}
                {hoveredIndex === i && (
                  <g>
                    <rect
                      x={labelX - 48}
                      y={bar.barTop - 34}
                      width={96}
                      height={24}
                      rx={6}
                      fill="#1e1e2e"
                    />
                    <polygon
                      points={`${labelX - 5},${bar.barTop - 10} ${labelX + 5},${bar.barTop - 10} ${labelX},${bar.barTop - 4}`}
                      fill="#1e1e2e"
                    />
                    <text
                      x={labelX}
                      y={bar.barTop - 18}
                      textAnchor="middle"
                      fill="white"
                      style={{ fontSize: "10px", fontWeight: 600 }}
                    >
                      {bar.label}: {displayValue}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}