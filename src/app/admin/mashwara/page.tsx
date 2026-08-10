"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { AppShell } from "@/components/layout/app-shell";

export default function AdminMashwaraAppPage() {
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);

  useEffect(() => {
    setCurrentPage("admin-mashwara");
  }, [setCurrentPage]);

  return <AppShell />;
}
