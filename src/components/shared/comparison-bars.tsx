"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────

interface ComparisonItem {
  label: string;
  value: number;
  maxValue?: number;
  color?: string;
}

interface ComparisonBarsProps {
  items: ComparisonItem[];
  title?: string;
  showValues?: boolean;
  className?: string;
}

// ─── Default Colors ──────────────────────────────────────────────────

const BAR_COLORS = [
  "#4B0A8F",
  "#A0006B",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

// ─── Component ───────────────────────────────────────────────────────

export function ComparisonBars({
  items,
  title,
  showValues = true,
  className = "",
}: ComparisonBarsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Sort by value (highest first) and compute max
  const { sorted, maxValue } = useMemo(() => {
    const withMax = items.map((item) => ({
      ...item,
      effectiveMax: item.maxValue,
    }));
    const sortedItems = [...withMax].sort((a, b) => b.value - a.value);
    const globalMax =
      withMax.reduce((m, item) => Math.max(m, item.effectiveMax ?? item.value), 0) || 1;
    return { sorted: sortedItems, maxValue: globalMax };
  }, [items]);

  const handleMouseEnter = useCallback((i: number) => {
    setHoveredIndex(i);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  if (sorted.length === 0) {
    return (
      <div className={`text-sm text-muted-foreground text-center py-6 ${className}`}>
        No data available
      </div>
    );
  }

  return (
    <div className={`w-full space-y-3 ${className}`}>
      {title && (
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      )}

      <div className="space-y-2.5">
        {sorted.map((item, i) => {
          const pct = item.effectiveMax
            ? (item.value / item.effectiveMax) * 100
            : (item.value / maxValue) * 100;
          const barColor = item.color ?? BAR_COLORS[i % BAR_COLORS.length];

          return (
            <div
              key={`${item.label}-${i}`}
              className="relative group"
              onMouseEnter={() => handleMouseEnter(i)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex items-center gap-3">
                {/* Label */}
                <span className="text-xs font-medium text-foreground min-w-0 shrink-0 sm:w-28 sm:shrink-0 truncate">
                  {item.label}
                </span>

                {/* Bar track */}
                <div className="flex-1 h-7 bg-muted/40 dark:bg-muted/20 rounded-full overflow-hidden relative">
                  <motion.div
                    className="h-full rounded-full relative"
                    style={{
                      background: `linear-gradient(90deg, ${barColor}, ${barColor}CC)`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{
                      duration: 0.6,
                      delay: i * 0.08,
                      ease: "easeOut",
                    }}
                  >
                    {/* Shine effect */}
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)",
                      }}
                    />
                  </motion.div>
                </div>

                {/* Value */}
                {showValues && (
                  <span className="text-xs font-semibold tabular-nums text-foreground min-w-[40px] text-right shrink-0">
                    {item.value.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Hover tooltip */}
              <AnimatePresence>
                {hoveredIndex === i && (
                  <motion.div
                    className="absolute -top-8 left-1/2 -translate-x-1/2 z-10 px-2.5 py-1 rounded-md bg-[#1e1e2e] text-white text-[10px] font-semibold whitespace-nowrap pointer-events-none"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.12 }}
                  >
                    {item.label}: {item.value.toLocaleString()}
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45 bg-[#1e1e2e]" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}