"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAppStore } from "@/stores/useAppStore";

export default function AdminIslahMamulatPage() {
  const { navigateTo } = useAppStore();

  useEffect(() => {
    navigateTo("admin-islah-mamulat");
  }, [navigateTo]);

  return <AppShell />;
}
