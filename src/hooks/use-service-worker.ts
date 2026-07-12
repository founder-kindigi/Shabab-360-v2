"use client";

import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

/**
 * Hook to register the PWA service worker (production only).
 *
 * - Registers `/sw.js` on mount when `process.env.NODE_ENV === "production"`.
 * - Listens for `updatefound` → shows a toast when a new version is available.
 * - Exposes `updateServiceWorker()` to manually activate the waiting SW.
 */
export function useServiceWorker() {
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  /** Tell the waiting SW to skip waiting, then reload the page */
  const updateServiceWorker = useCallback(() => {
    if (waitingWorkerRef.current) {
      waitingWorkerRef.current.postMessage({ type: "SKIP_WAITING" });
    }
  }, []);

  // Register the service worker
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    async function register() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        // A new version was found while we have an existing one
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // A new SW is waiting — stash reference and notify user
              waitingWorkerRef.current = newWorker;
              toast("A new version of Shabab360 is available", {
                description: "Tap to update now.",
                action: {
                  label: "Update",
                  onClick: updateServiceWorker,
                },
                duration: 15_000,
              });
            }
          });
        });

        // Handle controller change (after skipWaiting)
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
      } catch (error) {
        // Service worker registration failed — non-critical, just log
        console.warn("[PWA] Service worker registration failed:", error);
      }
    }

    register();
  }, [updateServiceWorker]);

  return { updateServiceWorker };
}