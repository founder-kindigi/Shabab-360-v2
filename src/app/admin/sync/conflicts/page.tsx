"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAppStore } from "@/stores/useAppStore";

export default function AdminSyncConflictsPage() {
  const { navigateTo } = useAppStore();

  useEffect(() => {
    navigateTo("admin-sync-conflicts");
  }, [navigateTo]);

  return <AppShell />;
}
