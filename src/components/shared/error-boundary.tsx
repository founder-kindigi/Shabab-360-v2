"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, LayoutDashboard, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useAppStore } from "@/stores/useAppStore";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorBoundaryFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

function ErrorBoundaryFallback({
  error,
  errorInfo,
  onReset,
}: {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const { navigateTo } = useAppStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-6"
    >
      {/* Error icon */}
      <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 p-5 ring-1 ring-red-200 dark:ring-red-800/50">
        <AlertTriangle className="size-10 text-red-500 dark:text-red-400" />
      </div>

      {/* Message */}
      <div className="max-w-md space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          Something went wrong
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          An unexpected error occurred while rendering this page. You can try
          again or navigate back to the dashboard.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => navigateTo(getDashboardPage())}
          className="gap-2"
        >
          <LayoutDashboard className="size-4" />
          Go to Dashboard
        </Button>
        <Button
          onClick={onReset}
          className="gap-2 bg-[#4B0A8F] hover:bg-[#3A0870] text-white"
        >
          <RotateCcw className="size-4" />
          Try Again
        </Button>
      </div>

      {/* Expandable error details (dev) */}
      {error && (
        <div className="w-full max-w-lg">
          <button
            onClick={() => setShowDetails((s) => !s)}
            className="flex items-center gap-1.5 mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDetails ? (
              <ChevronUp className="size-3" />
            ) : (
              <ChevronDown className="size-3" />
            )}
            {showDetails ? "Hide" : "Show"} error details
          </button>
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 rounded-lg border border-border bg-muted/50 p-3 text-left">
                  <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap break-all font-mono leading-relaxed">
                    {error.message}
                    {"\n\n"}
                    {error.stack}
                  </pre>
                  {errorInfo && (
                    <pre className="mt-2 text-[10px] text-muted-foreground whitespace-pre-wrap break-all font-mono leading-relaxed">
                      {errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

function getDashboardPage() {
  if (typeof window === "undefined") return "admin-dashboard";
  const role = localStorage.getItem("shabab360-role");
  switch (role) {
    case "murabbi":
      return "murabbi-dashboard";
    case "guardian":
      return "guardian-dashboard";
    case "student":
      return "student-dashboard";
    case "city_head":
      return "city-head-dashboard";
    case "park_admin":
    case "park_lead":
      return "park-dashboard";
    default:
      return "admin-dashboard";
  }
}