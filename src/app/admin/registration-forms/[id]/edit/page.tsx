"use client";

import { useEffect, use } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { AppShell } from "@/components/layout/app-shell";

export default function RegistrationFormBuilderAppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const setSelectedFormId = useAppStore((s) => s.setSelectedFormId);

  useEffect(() => {
    setSelectedFormId(id);
    navigateTo("admin-registration-forms-edit");
  }, [id, navigateTo, setSelectedFormId]);

  return <AppShell />;
}
