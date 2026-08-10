"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { AppShell } from "@/components/layout/app-shell";

export default function AdminContentPlannerAppPage() {
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);

  useEffect(() => {
    setCurrentPage("admin-content-planner");
  }, [setCurrentPage]);

  return <AppShell />;
}
