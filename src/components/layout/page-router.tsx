"use client";

import { useAppStore, type PageId } from "@/stores/useAppStore";
import { LoginPage } from "@/components/modules/auth/login-page";
import { ResetPasswordPage } from "@/components/modules/auth/reset-password-page";
import { AccessPendingPage } from "@/components/modules/auth/access-pending-page";
import { AppShell } from "@/components/layout/app-shell";

export function PageRouter() {
  const { currentPage } = useAppStore();

  if (currentPage === "login") {
    return <LoginPage />;
  }

  if (currentPage === "reset-password") {
    return <ResetPasswordPage />;
  }

  if (currentPage === "access-pending") {
    return <AccessPendingPage />;
  }

  // All workspace pages render inside the app shell
  return <AppShell />;
}