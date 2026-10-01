"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAppStore } from "@/stores/useAppStore";
import { CustomReportBuilderPage } from "@/components/modules/admin/custom-report-builder-page";

export default function AdminReportsBuilderPage() {
  const { navigateTo } = useAppStore();

  useEffect(() => {
    navigateTo("admin-reports-builder");
  }, [navigateTo]);

  return <AppShell />;
}
