"use client";

import {
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X, ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
import type { TourStep } from "@/hooks/use-onboarding";

interface OnboardingTourProps {
  steps: TourStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  found: boolean;
}

const PADDING = 10;

function getTargetRect(selector: string): TargetRect {
  if (typeof document === "undefined") return { top: 0, left: 0, width: 0, height: 0, found: false };
  const el = document.querySelector(selector);
  if (!el) return { top: 0, left: 0, width: 0, height: 0, found: false };
  const rect = el.getBoundingClientRect();
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height, found: true };
}

function scrollTargetIntoView(selector: string): Promise<void> {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (!el) {
      resolve();
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    // Give scroll time to complete
    setTimeout(resolve, 400);
  });
}

function getTooltipPosition(
  target: TargetRect,
  position: TourStep["position"],
  tooltipW: number,
  tooltipH: number,
  viewportW: number,
  viewportH: number
): { top: number; left: number; adjustedPosition: TourStep["position"] } {
  if (!target.found) {
    return { top: viewportH / 2 - tooltipH / 2, left: viewportW / 2 - tooltipW / 2, adjustedPosition: "bottom" };
  }

  let pos = position;
  const gap = 14;
  let top = 0;
  let left = 0;

  const cx = target.left + target.width / 2;
  const cy = target.top + target.height / 2;

  switch (pos) {
    case "bottom":
      top = target.top + target.height + gap;
      left = cx - tooltipW / 2;
      break;
    case "top":
      top = target.top - tooltipH - gap;
      left = cx - tooltipW / 2;
      break;
    case "left":
      top = cy - tooltipH / 2;
      left = target.left - tooltipW - gap;
      break;
    case "right":
      top = cy - tooltipH / 2;
      left = target.left + target.width + gap;
      break;
  }

  // Clamp within viewport
  left = Math.max(12, Math.min(left, viewportW - tooltipW - 12));
  top = Math.max(12, Math.min(top, viewportH - tooltipH - 12));

  return { top, left, adjustedPosition: pos };
}

function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  position,
  onNext,
  onPrev,
  onSkip,
  onFinish,
  onDontShowAgain,
  dontShowAgain,
  setDontShowAgain,
}: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  position: { top: number; left: number; adjustedPosition: TourStep["position"] };
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onFinish: () => void;
  onDontShowAgain: () => void;
  dontShowAgain: boolean;
  setDontShowAgain: (v: boolean) => void;
}) {
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: position.adjustedPosition === "bottom" ? 8 : position.adjustedPosition === "top" ? -8 : 0 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: position.adjustedPosition === "bottom" ? 8 : -8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed z-[9999] w-[320px] max-w-[calc(100vw-24px)] rounded-xl border border-[#D4B8E3] dark:border-[#2A0C8F] bg-white dark:bg-[#0F0520] shadow-2xl shadow-[#4B0A8F]/20 dark:shadow-[#4B0A8F]/40"
      style={{ top: position.top, left: position.left }}
    >
      {/* Accent bar */}
      <div className="h-1 rounded-t-xl bg-gradient-to-r from-[#4B0A8F] to-[#A0006B]" />

      <div className="p-4">
        {/* Step counter */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4B0A8F] dark:text-[#8A40B0]">
            Step {stepIndex + 1}/{totalSteps}
          </span>
          <button
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
            aria-label="Close tour"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-foreground mb-1.5">
          {step.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          {step.description}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrev}
                className="h-7 text-xs px-2"
              >
                <ChevronLeft className="size-3.5 mr-1" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isLast ? (
              <Button
                size="sm"
                onClick={onFinish}
                className="h-7 text-xs bg-[#4B0A8F] hover:bg-[#3A0870] text-white px-3"
              >
                Finish
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onNext}
                className="h-7 text-xs bg-[#4B0A8F] hover:bg-[#3A0870] text-white px-3"
              >
                Next
                <ChevronRight className="size-3.5 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Skip + Don't show again */}
        {!isLast && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              className="size-3.5"
            />
            <label
              htmlFor="dont-show-again"
              className="text-[11px] text-muted-foreground cursor-pointer select-none"
            >
              Don&apos;t show again
            </label>
            <button
              onClick={() => {
                if (dontShowAgain) onDontShowAgain();
                onSkip();
              }}
              className="ml-auto text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              Skip tour
              <SkipForward className="size-3" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function OnboardingTour({
  steps,
  isActive,
  onComplete,
  onSkip,
}: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect>({ top: 0, left: 0, width: 0, height: 0, found: false });
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [tooltipKey, setTooltipKey] = useState(0);

  // Update viewport size
  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => {
      setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Measure target element and handle scrolling
  const measureTarget = useCallback(() => {
    if (!isActive || steps.length === 0) return;
    const step = steps[currentStep];
    if (!step) return;
    setIsTransitioning(true);
    scrollTargetIntoView(step.target).then(() => {
      setTimeout(() => {
        const rect = getTargetRect(step.target);
        setTargetRect(rect);
        setIsTransitioning(false);
        setTooltipKey((k) => k + 1);
      }, 100);
    });
  }, [isActive, currentStep, steps]);

  // Initialize or update when step changes
  useEffect(() => {
    if (!isActive || steps.length === 0) return;
    const id = requestAnimationFrame(() => measureTarget());
    return () => cancelAnimationFrame(id);
  }, [measureTarget, isActive, steps.length]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, steps.length]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  // Re-measure on viewport resize
  useEffect(() => {
    if (!isActive || steps.length === 0) return;
    const id = requestAnimationFrame(() => {
      const rect = getTargetRect(steps[currentStep]?.target || "");
      setTargetRect(rect);
    });
    return () => cancelAnimationFrame(id);
  }, [viewportSize, isActive, steps, currentStep]);

  const handleSkip = useCallback(() => {
    if (dontShowAgain) {
      onSkip();
    } else {
      onSkip();
    }
  }, [dontShowAgain, onSkip]);

  const handleDontShowAgain = useCallback(() => {
    onSkip();
  }, [onSkip]);

  const handleFinish = useCallback(() => {
    onComplete();
  }, [onComplete]);

  if (!isActive || steps.length === 0) return null;

  const step = steps[currentStep];
  const tooltipW = 320;
  const tooltipH = 220;
  const tooltipPos = getTooltipPosition(
    targetRect,
    step.position,
    tooltipW,
    tooltipH,
    viewportSize.w,
    viewportSize.h
  );

  // Spotlight cutout values
  const spotlightX = targetRect.found ? targetRect.left - PADDING : 0;
  const spotlightY = targetRect.found ? targetRect.top - PADDING : 0;
  const spotlightW = targetRect.found ? targetRect.width + PADDING * 2 : 0;
  const spotlightH = targetRect.found ? targetRect.height + PADDING * 2 : 0;
  const spotlightR = 8;

  return (
    <div
      className="fixed inset-0 z-[9998]"
      aria-modal="true"
      role="dialog"
      aria-label="Onboarding tour"
    >
      {/* Backdrop with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
        <defs>
          <mask id="tour-spotlight">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect.found && (
              <rect
                x={spotlightX}
                y={spotlightY}
                width={spotlightW}
                height={spotlightH}
                rx={spotlightR}
                ry={spotlightR}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <motion.rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.55)"
          mask="url(#tour-spotlight)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      </svg>

      {/* Highlighted border around target */}
      {targetRect.found && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed z-[9998] pointer-events-none rounded-lg ring-2 ring-[#4B0A8F] dark:ring-[#8A40B0] ring-offset-2 ring-offset-background"
          style={{
            top: spotlightY,
            left: spotlightX,
            width: spotlightW,
            height: spotlightH,
          }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        {!isTransitioning && (
          <TourTooltip
            key={tooltipKey}
            step={step}
            stepIndex={currentStep}
            totalSteps={steps.length}
            position={tooltipPos}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={handleSkip}
            onFinish={handleFinish}
            onDontShowAgain={handleDontShowAgain}
            dontShowAgain={dontShowAgain}
            setDontShowAgain={setDontShowAgain}
          />
        )}
      </AnimatePresence>

      {/* Progress dots at bottom of screen */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-1.5">
        {steps.map((_, idx) => (
          <motion.div
            key={idx}
            animate={{
              width: idx === currentStep ? 20 : 6,
              backgroundColor:
                idx === currentStep
                  ? "#4B0A8F"
                  : idx < currentStep
                    ? "#A0006B"
                    : "rgba(255,255,255,0.3)",
            }}
            transition={{ duration: 0.2 }}
            className="h-1.5 rounded-full"
          />
        ))}
      </div>
    </div>
  );
}

// ── Error boundary children wrapper (class component needs to be separate) ──
export function OnboardingTourWrapper(props: {
  steps: TourStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  children: ReactNode;
}) {
  return (
    <>
      {props.children}
      <OnboardingTour
        steps={props.steps}
        isActive={props.isActive}
        onComplete={props.onComplete}
        onSkip={props.onSkip}
      />
    </>
  );
}