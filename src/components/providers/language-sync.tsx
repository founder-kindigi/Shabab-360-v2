"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";

export function LanguageSync() {
  const language = useAppStore((s) => s.language);

  useEffect(() => {
    // Update HTML attributes for locale and RTL support
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ur" ? "rtl" : "ltr";
  }, [language]);

  return null;
}
