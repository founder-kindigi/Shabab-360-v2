"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAppStore } from "@/stores/useAppStore";

export default function StudentPortalPage() {
  const { navigateTo } = useAppStore();

  useEffect(() => {
    navigateTo("student-dashboard");
  }, [navigateTo]);

  return <AppShell />;
}
