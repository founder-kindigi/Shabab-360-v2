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
  variant?: "brand" | "amber" | "sky" | "violet" | "rose" | "slate";
  pulse?: boolean;
}

const variantStyles = {
  brand: {
    bg: "bg-gradient-to-br from-[#2A0C8F] via-[#A0006B] to-[#FF0015]",
    iconBg: "bg-white/20",
    iconColor: "text-white",
    valueColor: "text-white",
    titleColor: "text-white/80",
    border: "border-[#D4B8E3] dark:border-[#2A0C8F]",
    shadow: "shadow-[#4B0A8F4D] dark:shadow-[#4B0A8F33]",
    accent: "border-l-[#A0006B]",
    accentDark: "dark:border-l-[#A0006B]",
  },
  amber: {
    bg: "bg-gradient-to-br from-amber-500 to-orange-500",
    iconBg: "bg-white/20",
    iconColor: "text-white",
    valueColor: "text-white",
    titleColor: "text-amber-100",
    border: "border-amber-200 dark:border-amber-800",
    shadow: "shadow-amber-200/50 dark:shadow-amber-900/30",
    accent: "border-l-amber-300",
    accentDark: "dark:border-l-amber-700",
  },
  sky: {
    bg: "bg-gradient-to-br from-[#A0006B] to-[#E0002A]",
    iconBg: "bg-white/20",
    iconColor: "text-white",
    valueColor: "text-white",
    titleColor: "text-white/80",
    border: "border-[#D4B8E3] dark:border-[#2A0C8F]",
    shadow: "shadow-[#A0006B4D] dark:shadow-[#A0006B33]",
    accent: "border-l-[#A0006B]",
    accentDark: "dark:border-l-[#A0006B]",
  },
  violet: {
    bg: "bg-gradient-to-br from-[#2A0C8F] to-[#4B0A8F]",
    iconBg: "bg-white/20",
    iconColor: "text-white",
    valueColor: "text-white",
    titleColor: "text-white/80",
    border: "border-[#D4B8E3] dark:border-[#2A0C8F]",
    shadow: "shadow-[#4B0A8F4D] dark:shadow-[#4B0A8F33]",
    accent: "border-l-[#A0006B]",
    accentDark: "dark:border-l-[#A0006B]",
  },
  rose: {
    bg: "bg-gradient-to-br from-rose-500 to-pink-500",
    iconBg: "bg-white/20",
    iconColor: "text-white",
    valueColor: "text-white",
    titleColor: "text-rose-100",
    border: "border-rose-200 dark:border-rose-800",
    shadow: "shadow-rose-200/50 dark:shadow-rose-900/30",
    accent: "border-l-rose-300",
    accentDark: "dark:border-l-rose-700",
  },
  slate: {
    bg: "bg-gradient-to-br from-slate-600 to-slate-700",
    iconBg: "bg-white/20",
    iconColor: "text-white",
    valueColor: "text-white",
    titleColor: "text-slate-300",
    border: "border-slate-300 dark:border-slate-600",
    shadow: "shadow-slate-200/50 dark:shadow-slate-900/30",
    accent: "border-l-slate-400",
    accentDark: "dark:border-l-slate-500",
  },
};

export function DataCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  className,
  variant = "brand",
  pulse = false,
}: DataCardProps) {
  const style = variantStyles[variant];

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Card
        className={cn(
          "border-0 shadow-md hover:shadow-lg hover:shadow-inner transition-shadow duration-300 overflow-hidden",
          "border-l-[3px]",
          style.accent,
          style.accentDark,
          style.shadow,
          className
        )}
      >
        <div className={cn("relative p-5", style.bg)}>
          {/* Decorative circles */}
          <div className="absolute -top-4 -right-4 size-16 rounded-full bg-white/10" />
          <div className="absolute -bottom-2 -right-2 size-10 rounded-full bg-white/5" />

          <CardContent className="relative p-0 flex flex-col justify-between min-h-[104px]">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <p className={cn("text-xs font-semibold uppercase tracking-wider", style.titleColor)}>
                  {title}
                </p>
                <p className={cn("text-3xl font-bold tracking-tight", style.valueColor)}>
                  {value}
                </p>
              </div>
              <div className={cn("rounded-xl p-2.5 transition-all duration-300", style.iconBg, pulse && "animate-pulse")}>
                <Icon className={cn("size-5", style.iconColor)} />
              </div>
            </div>
            {/* Always reserve space for trend area to keep card heights consistent */}
            <div className="mt-3 min-h-[24px] flex items-center">
              {trend && trendValue && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full transition-all duration-200",
                    trend === "up" && "bg-white/25 text-white",
                    trend === "down" && "bg-white/25 text-white",
                    trend === "neutral" && "bg-white/15 text-white/70"
                  )}
                >
                  {trend === "up" && <TrendingUp className="size-3" />}
                  {trend === "down" && <TrendingDown className="size-3" />}
                  {trend === "neutral" && <Minus className="size-3" />}
                  {trendValue}
                </motion.span>
              )}
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}