"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAppStore } from "@/stores/useAppStore";
import { useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/sonner";
import { PageRouter } from "@/components/layout/page-router";
import { LoadingState } from "@/components/layout/loading-state";
import { useServiceWorker } from "@/hooks/use-service-worker";

const queryClient = new QueryClient();

function AuthenticatedApp() {
  const { data: session, status } = useSession();
  const { setUserRole, navigateTo, currentPage, userRole } = useAppStore();
  const wasAuthenticated = useRef(false);

  // Register PWA service worker (production only)
  useServiceWorker();

  useEffect(() => {
    if (session?.user) {
      wasAuthenticated.current = true;
      const user = session.user as any;

      setUserRole(user.role);

      // Only navigate if still on an auth page
      if (
        currentPage === "login" ||
        currentPage === "reset-password" ||
        currentPage === "access-pending"
      ) {
        if (user.mustResetPwd) {
          navigateTo("reset-password");
          return;
        }
        if (!user.role) {
          navigateTo("access-pending");
          return;
        }

        // Navigate to default page based on role
        if (user.role === "city_head") {
          navigateTo("city-head-dashboard");
        } else if (["super_admin", "program_admin"].includes(user.role)) {
          navigateTo("admin-dashboard");
        } else if (user.role === "murabbi") {
          navigateTo("murabbi-dashboard");
        } else if (["park_admin", "park_lead"].includes(user.role)) {
          navigateTo("park-dashboard");
        } else if (user.role === "guardian") {
          navigateTo("guardian-dashboard");
        } else if (user.role === "student") {
          navigateTo("student-dashboard");
        }
      }
    }
  }, [session?.user, setUserRole, navigateTo, currentPage]);

  // When session is cleared AFTER being authenticated (sign out), reload
  useEffect(() => {
    if (!session && status !== "loading" && wasAuthenticated.current) {
      // Clear client state and reload to reset
      window.location.href = "/";
    }
  }, [session, status]);

  if (status === "loading") return <LoadingState message="Loading..." />;
  if (!session) return <PageRouter />;

  const user = session.user as any;
  if (user.mustResetPwd) return <PageRouter />;
  if (!user.role) return <PageRouter />;

  return <PageRouter />;
}

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <AuthenticatedApp />
        <Toaster position="top-right" />
      </SessionProvider>
    </QueryClientProvider>
  );
}