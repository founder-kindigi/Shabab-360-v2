"use client";

import { type LucideIcon, Construction, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useAppStore } from "@/stores/useAppStore";
import type { PageId } from "@/stores/useAppStore";

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  isComingSoon?: boolean;
  moduleName?: string;
  modulePhase?: string;
  targetPage?: PageId;
}

const phaseLabels: Record<string, { label: string; color: string }> = {
  "phase-1": { label: "Phase 1 — Foundation", color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800" },
  "phase-2": { label: "Phase 2 — Operations", color: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-400 dark:border-sky-800" },
  "phase-3": { label: "Phase 3 — Engagement", color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800" },
  "phase-4": { label: "Phase 4 — Intelligence", color: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-400 dark:border-violet-800" },
};

export function EmptyState({
  icon: Icon = Construction,
  title = "No data yet",
  description = "There is nothing to display at this time.",
  isComingSoon = false,
  moduleName,
  modulePhase = "phase-2",
  targetPage,
}: EmptyStateProps) {
  const { navigateTo } = useAppStore();

  if (isComingSoon) {
    const phase = phaseLabels[modulePhase] || phaseLabels["phase-2"];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center min-h-[50vh] gap-5 text-center px-6"
      >
        {/* Animated icon container */}
        <motion.div
          animate={{ rotate: [0, 2, -2, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          <div className="rounded-2xl bg-gradient-to-br from-muted to-muted/60 p-6 shadow-sm ring-1 ring-border">
            <Icon className="size-10 text-muted-foreground/70" />
          </div>
          {/* Pulsing dot */}
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-1 -right-1 size-3 rounded-full bg-amber-400 ring-2 ring-background"
          />
        </motion.div>

        <div className="max-w-sm space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h3 className="text-lg font-semibold">{title || "Coming Soon"}</h3>
            <Badge variant="outline" className={`text-[10px] ${phase.color}`}>
              {phase.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description || `${moduleName || "This module"} is currently under development and will be available in an upcoming release.`}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-1.5 mt-1">
          {["phase-1", "phase-2", "phase-3", "phase-4"].map((p) => {
            const phaseIdx = ["phase-1", "phase-2", "phase-3", "phase-4"].indexOf(modulePhase);
            const currentIdx = ["phase-1", "phase-2", "phase-3", "phase-4"].indexOf(p);
            const isComplete = currentIdx < phaseIdx;
            const isCurrent = currentIdx === phaseIdx;
            return (
              <motion.div
                key={p}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: currentIdx * 0.1 + 0.3 }}
                className={`h-1.5 rounded-full transition-colors ${
                  isComplete
                    ? "w-8 bg-emerald-500"
                    : isCurrent
                    ? "w-8 bg-emerald-400/50 animate-pulse"
                    : "w-4 bg-muted"
                }`}
              />
            );
          })}
        </div>

        {targetPage && (
          <Button
            variant="outline"
            className="mt-2"
            onClick={() => navigateTo(targetPage)}
          >
            Explore other features
            <ArrowRight className="size-3.5 ml-2" />
          </Button>
        )}
      </motion.div>
    );
  }

  // Default empty state (no data)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center p-6"
    >
      <div className="rounded-2xl bg-muted/60 p-5 ring-1 ring-border">
        <Icon className="size-8 text-muted-foreground/60" />
      </div>
      <div className="max-w-sm">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}