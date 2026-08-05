"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/components/providers/theme-provider";

// ─── Types ───────────────────────────────────────────────────────────

interface GaugeRingProps {
  /** Value from 0 to 100 */
  value: number;
  /** Label shown below the value */
  label: string;
  /** SVG size in pixels (default 120) */
  size?: number;
  /** Ring color — brand (#4B0A8F), green (#22c55e), amber (#f59e0b), red (#ef4444), or any hex */
  color?: string;
  /** Show the percentage number (default true) */
  showValue?: boolean;
  /** Stroke width of the ring (default 10) */
  strokeWidth?: number;
  /** Additional CSS classes */
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const BG_LIGHT = "#e5e7eb";
const BG_DARK = "#374151";

// ─── Component ───────────────────────────────────────────────────────

export function GaugeRing({
  value,
  label,
  size = 120,
  color = "#4B0A8F",
  showValue = true,
  strokeWidth = 10,
  className = "",
}: GaugeRingProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const clampedValue = Math.min(100, Math.max(0, value));
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillOffset = circumference - (clampedValue / 100) * circumference;

  const bgColor = isDark ? BG_DARK : BG_LIGHT;

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
          role="img"
          aria-label={`${label}: ${clampedValue}%`}
        >
          {/* Background ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={bgColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Animated foreground ring */}
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
            transition={{
              duration: 1,
              ease: "easeOut",
              delay: 0.2,
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {showValue && (
            <p
              className="font-bold leading-none tabular-nums"
              style={{
                fontSize: size * 0.22,
                color,
              }}
            >
              {Math.round(clampedValue)}%
            </p>
          )}
          <p
            className="text-muted-foreground leading-tight mt-1"
            style={{ fontSize: size * 0.09 }}
          >
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}