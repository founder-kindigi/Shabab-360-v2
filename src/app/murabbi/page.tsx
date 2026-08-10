"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAppStore } from "@/stores/useAppStore";

export default function MurabbiPortalPage() {
  const { navigateTo } = useAppStore();

  useEffect(() => {
    navigateTo("murabbi-dashboard");
  }, [navigateTo]);

  return <AppShell />;
}
