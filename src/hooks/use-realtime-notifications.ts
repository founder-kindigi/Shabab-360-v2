"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";

const NOTIFICATION_POLL_INTERVAL_MS = 60_000;

/**
 * Refresh notifications through the authenticated application API. This avoids
 * a separate unauthenticated socket service, which is not supported on Vercel.
 */
export function useNotificationPolling() {
  const { status } = useSession();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (status !== "authenticated") return;

    const refreshNotifications = () => {
      void queryClient.refetchQueries({
        queryKey: ["notifications"],
        type: "active",
      });
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refreshNotifications();
      }
    };

    const intervalId = window.setInterval(
      refreshNotifications,
      NOTIFICATION_POLL_INTERVAL_MS
    );

    window.addEventListener("focus", refreshNotifications);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshNotifications);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [queryClient, status]);
}
