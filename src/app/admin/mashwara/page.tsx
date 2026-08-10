"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { AppShell } from "@/components/layout/app-shell";

export default function AdminMashwaraAppPage() {
  const navigateTo = useAppStore((s) => s.navigateTo);

  useEffect(() => {
    navigateTo("admin-mashwara");
  }, [navigateTo]);

  return <AppShell />;
}
