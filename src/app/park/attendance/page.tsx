"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { AppShell } from "@/components/layout/app-shell";

export default function ParkAttendanceAppPage() {
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);

  useEffect(() => {
    setCurrentPage("park-attendance");
  }, [setCurrentPage]);

  return <AppShell />;
}
