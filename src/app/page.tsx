"use client";

import { useSession, signOut } from "next-auth/react";
import { useAppStore, type PageId } from "@/stores/useAppStore";
import { useEffect, useRef } from "react";
import { PageRouter } from "@/components/layout/page-router";
import { LoadingState } from "@/components/layout/loading-state";
import { useServiceWorker } from "@/hooks/use-service-worker";

function AuthenticatedApp() {
  const { data: session, status } = useSession();
  const { setUserRole, navigateTo, currentPage, setSelectedEventId } = useAppStore();
  const wasAuthenticated = useRef(false);
  const sessionUser = session?.user as { id?: string } | undefined;
  const hasInvalidatedSession = status === "authenticated" && !sessionUser?.id;

  // Register PWA service worker (production only)
  useServiceWorker();

  useEffect(() => {
    if (session?.user && sessionUser?.id) {
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
  }, [session?.user, sessionUser?.id, setUserRole, navigateTo, currentPage]);

  // Direct Mashwara URLs are redirected to the SPA shell. Rehydrate the
  // workspace state from the URL only after a valid session is available.
  useEffect(() => {
    if (status !== "authenticated" || !sessionUser?.id) return;

    const search = new URLSearchParams(window.location.search);
    const page = search.get("page");
    if (page !== "admin-mashwara" && page !== "admin-mashwara-detail") return;

    const meetingId = search.get("id");
    if (page === "admin-mashwara-detail" && !meetingId) return;

    setSelectedEventId(meetingId);
    navigateTo(page as PageId);
  }, [navigateTo, sessionUser?.id, setSelectedEventId, status]);

  // Token-version invalidation leaves no usable identity in the JWT session.
  // Clear it rather than presenting the account-provisioning screen.
  useEffect(() => {
    if (hasInvalidatedSession) {
      void signOut({ callbackUrl: "/" });
    }
  }, [hasInvalidatedSession]);

  // When session is cleared AFTER being authenticated (sign out), reload
  useEffect(() => {
    if (!session && status !== "loading" && wasAuthenticated.current) {
      // Clear client state and reload to reset
      window.location.href = "/";
    }
  }, [session, status]);

  if (status === "loading" || hasInvalidatedSession) {
    return <LoadingState message="Signing you out..." />;
  }
  if (!session) return <PageRouter />;

  const user = session.user as any;
  if (user.mustResetPwd) return <PageRouter />;
  if (!user.role) return <PageRouter />;

  return <PageRouter />;
}

export default function Home() {
  return <AuthenticatedApp />;
}
