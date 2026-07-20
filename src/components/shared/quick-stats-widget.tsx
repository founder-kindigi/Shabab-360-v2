"use client";

import { motion, type Variants } from "framer-motion";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatItem {
  label: string;
  value: string | number;
  change?: number | string;
  changeType?: "up" | "down" | "neutral";
  icon: LucideIcon;
}

interface QuickStatsWidgetProps {
  stats: StatItem[];
  className?: string;
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.19, 1, 0.22, 1] },
  },
};

// ---------------------------------------------------------------------------
// Quick Stats Widget
// ---------------------------------------------------------------------------

export function QuickStatsWidget({ stats, className }: QuickStatsWidgetProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={cn(
        "grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4",
        className
      )}
    >
      {stats.map((stat) => {
        const Icon = stat.icon;
        const isUp = stat.changeType === "up";
        const isDown = stat.changeType === "down";
        const isNeutral = !stat.changeType || stat.changeType === "neutral";

        return (
          <motion.div
            key={stat.label}
            variants={itemVariants}
            className={cn(
              "group relative rounded-xl border bg-card p-4 transition-colors",
              "hover:border-[#D4B8E3] dark:hover:border-[#4B0A8F]/50",
              "hover:shadow-sm"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="rounded-lg bg-[#F3ECF6] p-2 dark:bg-[#1F086080]">
                <Icon className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>

              {/* Change indicator */}
              {stat.change !== undefined && !isNeutral && (
                <div
                  className={cn(
                    "flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md",
                    isUp &&
                      "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50",
                    isDown &&
                      "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/50"
                  )}
                >
                  {isUp && <ArrowUp className="size-3" />}
                  {isDown && <ArrowDown className="size-3" />}
                  <span>{stat.change}</span>
                </div>
              )}

              {isNeutral && stat.change !== undefined && (
                <div className="flex items-center gap-0.5 text-[11px] font-semibold text-muted-foreground px-1.5 py-0.5 rounded-md bg-muted">
                  <Minus className="size-3" />
                  <span>{stat.change}</span>
                </div>
              )}
            </div>

            <div className="mt-3">
              <p className="text-2xl font-bold tracking-tight leading-none">
                {stat.value}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                {stat.label}
              </p>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
