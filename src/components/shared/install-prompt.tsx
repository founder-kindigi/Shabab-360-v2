"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "shabab360-install-prompt-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Captures the `beforeinstallprompt` event and shows a dismissible
 * "Install App" banner. Only renders on browsers that support PWA install.
 * Dismissal is persisted in localStorage so it won't re-appear.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  // ── Capture the browser's install prompt event ──────────────────
  useEffect(() => {
    // Don't show if previously dismissed
    if (localStorage.getItem(DISMISS_KEY)) return;

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    // If the event already fired (race condition), check window
    // The event should be captured here
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setVisible(false);
    }

    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }, []);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-80"
        >
          <div className="rounded-xl bg-[#4B0A8F] p-4 shadow-lg shadow-[#4B0A8F]/25 text-white">
            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="absolute top-2.5 right-2.5 text-white/60 hover:text-white transition-colors"
              aria-label="Dismiss install prompt"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-white/15 flex-none">
                <Smartphone className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm">Install Shabab360</p>
                <p className="text-xs text-white/70 mt-0.5">
                  Add to your home screen for faster access and offline support.
                </p>
                <Button
                  onClick={handleInstall}
                  className="mt-3 h-8 bg-white text-[#4B0A8F] hover:bg-white/90 text-xs font-semibold gap-1.5 px-3"
                >
                  <Download className="size-3.5" />
                  Install App
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}