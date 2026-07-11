"use client";

import { useCallback } from "react";
import { en } from "./i18n/en";
import { ur } from "./i18n/ur";
import { useAppStore } from "@/stores/useAppStore";

type Language = "en" | "ur";

const translations: Record<Language, Record<string, string>> = { en, ur };

// Simple interpolation: {n} → value
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (str, [key, val]) => str.replace(new RegExp(`\\{${key}\\}`, "g"), String(val)),
    template
  );
}

export function useTranslation() {
  const language = useAppStore((s) => s.language);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const value = translations[language]?.[key] ?? translations.en[key] ?? key;
      return interpolate(value, params);
    },
    [language]
  );

  return { t, language, isUrdu: language === "ur" };
}

export type { Language };
export { translations };