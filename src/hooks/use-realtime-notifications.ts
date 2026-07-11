"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

interface NotificationPayload {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * Hook that connects to the real-time notification WebSocket service (port 3004).
 *
 * Features:
 * - Auto-connects on mount when authenticated, disconnects on unmount
 * - Joins the user's role room for scoped broadcasts
 * - Listens for `attendance:updated` → triggers toast + invalidates relevant queries
 * - Listens for `announcement:received` → triggers toast + invalidates notification queries
 * - Handles reconnection automatically via Socket.IO
 */
export function useRealtimeNotifications() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Connect to notification WebSocket via Caddy gateway
    // Path must match server-side Socket.IO path; XTransformPort routes via Caddy
    const socket = io("/socket.io/?XTransformPort=3004", {
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 15000,
    });

    socket.on("connect", () => {
      console.log("[realtime] Connected to notification service");

      // Auto-join role-based room
      const user = session?.user as
        | { role?: string }
        | undefined;

      if (user?.role) {
        socket.emit("join-room", `role:${user.role}`);
      }
    });

    // ─── Attendance Update ─────────────────────────────────────────────────
    socket.on(
      "attendance:updated",
      (payload: NotificationPayload) => {
        const { data } = payload;

        // Handle batch sync notifications differently
        if (data.isSync) {
          const syncCount = (data.syncCount as number) || 0;
          toast.info(`Attendance synced: ${syncCount} record${syncCount !== 1 ? "s" : ""}`, {
            description: "Batch attendance update in real-time",
            duration: 4000,
          });
        } else {
          const participantName = (data.participantName as string) || "A participant";
          const status = (data.status as string) || "updated";
          const statusLabel: Record<string, string> = {
            present: "Present",
            absent: "Absent",
            late: "Late",
            excused: "Excused",
          };

          toast.info(`${participantName} marked as ${statusLabel[status] || status}`, {
            description: "Attendance record updated in real-time",
            duration: 4000,
          });
        }

        // Invalidate attendance-related queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["attendance"] });
        queryClient.invalidateQueries({ queryKey: ["attendance-event"] });
        queryClient.invalidateQueries({ queryKey: ["roster"] });

        console.log("[realtime] Attendance updated:", data);
      }
    );

    // ─── Announcement Received ─────────────────────────────────────────────
    socket.on(
      "announcement:received",
      (payload: NotificationPayload) => {
        const { data } = payload;
        const title = (data.title as string) || "New Announcement";
        const content = (data.content as string) || "";

        toast.info(title, {
          description: content.length > 100 ? content.slice(0, 100) + "…" : content,
          duration: 5000,
        });

        // Invalidate notifications query to refresh the bell
        queryClient.invalidateQueries({ queryKey: ["notifications"] });

        console.log("[realtime] Announcement received:", data);
      }
    );

    // ─── Generic Notification (backward compat with existing audit system) ─
    socket.on("notification", () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });

    // ─── Connection Events ─────────────────────────────────────────────────
    socket.on("connect_error", (err) => {
      // Silently handle — polling fallback will still work
      console.warn("[realtime] WebSocket connect error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      if (reason !== "io server disconnect") {
        // Reconnection will be handled by Socket.IO automatically
        console.log("[realtime] Disconnected, will auto-reconnect");
      }
    });

    socketRef.current = socket;
  }, [session, queryClient]);

  // Connect / reconnect when session changes
  useEffect(() => {
    if (status === "authenticated") {
      connect();
    } else if (status === "unauthenticated") {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [status, connect]);
}