"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { AppShell } from "@/components/layout/app-shell";

export default function AdminAdmissionsAppPage() {
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);

  useEffect(() => {
    setCurrentPage("admin-admissions");
  }, [setCurrentPage]);

  return <AppShell />;
}
