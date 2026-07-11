"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Reads the NextAuth JWT session token from cookies.
 * With JWT strategy, the token is stored as `next-auth.session-token`.
 * In secure (HTTPS) environments it may be `__Secure-next-auth.session-token`.
 */
function getSessionToken(): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";").map((c) => c.trim());
  const tokenCookie = cookies.find(
    (c) =>
      c.startsWith("next-auth.session-token=") ||
      c.startsWith("__Secure-next-auth.session-token=")
  );
  if (!tokenCookie) return null;
  const eqIndex = tokenCookie.indexOf("=");
  return tokenCookie.slice(eqIndex + 1) || null;
}

/**
 * Hook that connects to the real-time notification WebSocket service.
 *
 * - Authenticates via the NextAuth session token
 * - Joins role-scoped rooms automatically
 * - Listens for `notification` events and invalidates the
 *   `["notifications"]` TanStack Query cache key on receipt
 * - Reconnects when the session changes
 */
export function useRealtimeNotifications() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const prevSessionTokenRef = useRef<string | null>(null);

  const connect = useCallback(() => {
    const token = getSessionToken();
    if (!token) return;

    // Avoid reconnecting if token hasn't changed
    if (prevSessionTokenRef.current === token && socketRef.current?.connected) {
      return;
    }
    prevSessionTokenRef.current = token;

    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Connect to notification WebSocket via Caddy
    // DO NOT change the path — Caddy uses it to forward to the correct port
    const socket = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 15000,
      auth: { token },
    });

    socket.on("connect", () => {
      // Auto-join role-scoped rooms after authentication
      const user = session?.user as
        | {
            role?: string;
            assignedCityId?: string | null;
            assignedParkId?: string | null;
          }
        | undefined;

      if (user?.role) {
        socket.emit("join-role-scope", {
          role: user.role,
          assignedCityId: user.assignedCityId ?? undefined,
          assignedParkId: user.assignedParkId ?? undefined,
        });
      }
    });

    socket.on("notification", () => {
      // Invalidate the notifications query cache to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });

    socket.on("connect_error", (err) => {
      // Silently handle — polling fallback will still work
      console.warn("[realtime] WebSocket connect error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      if (reason !== "io server disconnect") {
        // Reconnection will be handled by Socket.IO automatically
      }
    });

    socketRef.current = socket;
  }, [session, queryClient]);

  // Connect / reconnect when session changes
  useEffect(() => {
    if (status === "authenticated") {
      connect();
    } else if (status === "unauthenticated") {
      // Disconnect when user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      prevSessionTokenRef.current = null;
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        prevSessionTokenRef.current = null;
      }
    };
  }, [status, connect]);
}