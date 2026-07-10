"use client";

import { useSyncExternalStore, useCallback } from "react";

function subscribeToOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true; // SSR always assumes online
}

/**
 * Hook to detect online/offline status.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribeToOnline,
    getOnlineSnapshot,
    getServerSnapshot
  );
}

/**
 * Get a friendly label for online status.
 */
export function useConnectionStatus(): {
  isOnline: boolean;
  label: string;
  color: "emerald" | "amber" | "red";
} {
  const isOnline = useOnlineStatus();

  // We just went offline
  return {
    isOnline,
    label: isOnline ? "Online" : "Offline",
    color: isOnline ? "emerald" : "red",
  };
}