"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Tips that rotate
// ---------------------------------------------------------------------------

const tips = [
  "Tip: Use ⌘K to quickly search and navigate",
  "Tip: Click the globe icon to switch between English and Urdu",
  "Tip: Use the command palette to find any page instantly",
  "Tip: Export data to CSV from any list page",
  "Tip: Record fee payments and print receipts from the Fees page",
];

// ---------------------------------------------------------------------------
// LocalStorage key
// ---------------------------------------------------------------------------

const DISMISSED_KEY = "shabab360-welcome-dismissed";

// ---------------------------------------------------------------------------
// Welcome Widget
// ---------------------------------------------------------------------------

function isDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function WelcomeWidget() {
  const [dismissed, setDismissed] = useState(() => isDismissed());
  const [collapsed, setCollapsed] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);

  // Rotate tips every 5 seconds
  useEffect(() => {
    if (dismissed) return;
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [dismissed]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // ignore
    }
  }, []);

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
      className="relative"
    >
      {/* Gradient border card */}
      <div
        className={cn(
          "relative rounded-xl overflow-hidden",
          "border border-transparent",
          "bg-gradient-to-r from-[#4B0A8F] via-[#A0006B] to-[#4B0A8F] p-[1.5px]"
        )}
      >
        <div className="rounded-[10px] bg-card">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-0">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-[#F3ECF6] p-2 dark:bg-[#1F086080]">
                <Sparkles className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">
                  Welcome to Shabab360!
                </h3>
                <p className="text-xs text-muted-foreground">
                  Getting started with your dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className={cn(
                  "p-1.5 rounded-md text-muted-foreground transition-colors",
                  "hover:bg-muted hover:text-foreground",
                  "cursor-pointer"
                )}
                aria-label={collapsed ? "Expand" : "Collapse"}
              >
                {collapsed ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronUp className="size-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className={cn(
                  "p-1.5 rounded-md text-muted-foreground transition-colors",
                  "hover:bg-muted hover:text-foreground",
                  "cursor-pointer"
                )}
                aria-label="Dismiss"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Collapsible body */}
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                key="content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.19, 1, 0.22, 1] }}
                className="overflow-hidden"
              >
                <div className="px-4 py-3">
                  {/* Rotating tip */}
                  <div className="relative min-h-[48px] flex items-center">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentTip}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{
                          duration: 0.3,
                          ease: [0.19, 1, 0.22, 1],
                        }}
                        className="flex items-start gap-2.5 w-full"
                      >
                        <Lightbulb className="size-4 text-[#A0006B] dark:text-[#D4B8E3] shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {tips[currentTip]}
                        </p>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Tip indicators */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {tips.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCurrentTip(i)}
                        className={cn(
                          "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                          i === currentTip
                            ? "w-5 bg-[#4B0A8F] dark:bg-[#8A40B0]"
                            : "w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/40"
                        )}
                        aria-label={`Tip ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}