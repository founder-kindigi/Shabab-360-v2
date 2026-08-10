"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAppStore } from "@/stores/useAppStore";

export default function AdminAlumniPage() {
  const { navigateTo } = useAppStore();

  useEffect(() => {
    navigateTo("admin-alumni");
  }, [navigateTo]);

  return <AppShell />;
}
