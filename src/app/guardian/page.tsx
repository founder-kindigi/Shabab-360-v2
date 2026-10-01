"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAppStore } from "@/stores/useAppStore";

export default function GuardianPortalPage() {
  const { navigateTo } = useAppStore();

  useEffect(() => {
    navigateTo("guardian-dashboard");
  }, [navigateTo]);

  return <AppShell />;
}
