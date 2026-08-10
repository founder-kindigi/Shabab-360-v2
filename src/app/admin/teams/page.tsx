"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { AppShell } from "@/components/layout/app-shell";

export default function AdminTeamsAppPage() {
  const navigateTo = useAppStore((s) => s.navigateTo);

  useEffect(() => {
    navigateTo("admin-collaboration-teams");
  }, [navigateTo]);

  return <AppShell />;
}
