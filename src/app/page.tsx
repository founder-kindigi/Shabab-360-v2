"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { PageRouter } from "@/components/layout/page-router";
import { LoadingState } from "@/components/layout/loading-state";

function AuthenticatedApp() {
  const { data: session, status } = useSession();
  const { setUserRole, navigateTo, currentPage } = useAppStore();

  useEffect(() => {
    if (session?.user) {
      const user = session.user as any;
      setUserRole(user.role);

      // Only navigate to dashboard if we're still on an auth page
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
        if (
          ["super_admin", "program_admin", "city_head"].includes(user.role)
        ) {
          navigateTo("admin-dashboard");
        } else if (
          ["park_admin", "park_lead", "murabbi"].includes(user.role)
        ) {
          navigateTo("park-dashboard");
        } else if (user.role === "guardian") {
          navigateTo("guardian-dashboard");
        } else if (user.role === "student") {
          navigateTo("student-dashboard");
        }
      }
    }
  }, [session?.user, setUserRole, navigateTo, currentPage]);

  if (status === "loading") return <LoadingState message="Loading..." />;
  if (!session) return <PageRouter />;

  const user = session.user as any;
  if (user.mustResetPwd) return <PageRouter />;
  if (!user.role) return <PageRouter />;

  return <PageRouter />;
}

export default function Home() {
  return (
    <SessionProvider>
      <AuthenticatedApp />
      <Toaster position="top-right" />
    </SessionProvider>
  );
}