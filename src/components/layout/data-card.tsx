"use client";

import { type LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface DataCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  variant?: "emerald" | "amber" | "sky" | "violet" | "rose" | "slate";
}

const variantStyles = {
  emerald: {
    bg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    iconBg: "bg-white/20",
    iconColor: "text-white",
    valueColor: "text-white",
    titleColor: "text-emerald-100",
    border: "border-emerald-200 dark:border-emerald-800",
    shadow: "shadow-emerald-200/50 dark:shadow-emerald-900/30",
  },
  amber: {
    bg: "bg-gradient-to-br from-amber-500 to-orange-500",
    iconBg: "bg-white/20",
    iconColor: "text-white",
    valueColor: "text-white",
    titleColor: "text-amber-100",
    border: "border-amber-200 dark:border-amber-800",
    shadow: "shadow-amber-200/50 dark:shadow-amber-900/30",
  },
  sky: {
    bg: "bg-gradient-to-br from-sky-500 to-blue-500",
    iconBg: "bg-white/20",
    iconColor: "text-white",
    valueColor: "text-white",
    titleColor: "text-sky-100",
    border: "border-sky-200 dark:border-sky-800",
    shadow: "shadow-sky-200/50 dark:shadow-sky-900/30",
  },
  violet: {
    bg: "bg-gradient-to-br from-violet-500 to-purple-500",
    iconBg: "bg-white/20",
    iconColor: "text-white",
    valueColor: "text-white",
    titleColor: "text-violet-100",
    border: "border-violet-200 dark:border-violet-800",
    shadow: "shadow-violet-200/50 dark:shadow-violet-900/30",
  },
  rose: {
    bg: "bg-gradient-to-br from-rose-500 to-pink-500",
    iconBg: "bg-white/20",
    iconColor: "text-white",
    valueColor: "text-white",
    titleColor: "text-rose-100",
    border: "border-rose-200 dark:border-rose-800",
    shadow: "shadow-rose-200/50 dark:shadow-rose-900/30",
  },
  slate: {
    bg: "bg-gradient-to-br from-slate-600 to-slate-700",
    iconBg: "bg-white/20",
    iconColor: "text-white",
    valueColor: "text-white",
    titleColor: "text-slate-300",
    border: "border-slate-300 dark:border-slate-600",
    shadow: "shadow-slate-200/50 dark:shadow-slate-900/30",
  },
};

export function DataCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  className,
  variant = "emerald",
}: DataCardProps) {
  const style = variantStyles[variant];

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Card
        className={cn(
          "border-0 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden",
          style.shadow,
          className
        )}
      >
        <div className={cn("relative p-5", style.bg)}>
          {/* Decorative circles */}
          <div className="absolute -top-4 -right-4 size-16 rounded-full bg-white/10" />
          <div className="absolute -bottom-2 -right-2 size-10 rounded-full bg-white/5" />

          <CardContent className="relative p-0">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <p className={cn("text-xs font-semibold uppercase tracking-wider", style.titleColor)}>
                  {title}
                </p>
                <p className={cn("text-3xl font-bold tracking-tight", style.valueColor)}>
                  {value}
                </p>
              </div>
              <div className={cn("rounded-xl p-2.5", style.iconBg)}>
                <Icon className={cn("size-5", style.iconColor)} />
              </div>
            </div>
            {trend && trendValue && (
              <div className="mt-3 flex items-center gap-1.5">
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
                    trend === "up" && "bg-white/25 text-white",
                    trend === "down" && "bg-white/25 text-white",
                    trend === "neutral" && "bg-white/15 text-white/70"
                  )}
                >
                  {trend === "up" && <TrendingUp className="size-3" />}
                  {trend === "down" && <TrendingDown className="size-3" />}
                  {trend === "neutral" && <Minus className="size-3" />}
                  {trendValue}
                </span>
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}