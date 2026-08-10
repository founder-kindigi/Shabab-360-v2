"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { AppShell } from "@/components/layout/app-shell";

export default function AdminContentPlannerAppPage() {
  const navigateTo = useAppStore((s) => s.navigateTo);

  useEffect(() => {
    navigateTo("admin-content-planner");
  }, [navigateTo]);

  return <AppShell />;
}
