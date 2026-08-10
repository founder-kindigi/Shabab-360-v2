"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { AppShell } from "@/components/layout/app-shell";

export default function AdminCommunityAppPage() {
  const navigateTo = useAppStore((s) => s.navigateTo);

  useEffect(() => {
    navigateTo("admin-community");
  }, [navigateTo]);

  return <AppShell />;
}
