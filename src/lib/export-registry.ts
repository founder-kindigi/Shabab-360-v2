/**
 * Simple module-scoped export data registry.
 * Tab components register their current export data here,
 * so the Reports page header ExportButton can read it.
 *
 * Uses a listener pattern so React components can re-render on changes.
 */

import { useSyncExternalStore } from "react";
import type { ExportColumn } from "@/lib/export-utils";

export interface ExportRegistryEntry {
  data: Record<string, unknown>[];
  filename: string;
  columns: ExportColumn[];
}

let currentEntry: ExportRegistryEntry | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export function registerExportData(entry: ExportRegistryEntry): void {
  currentEntry = entry;
  notify();
}

export function getExportData(): ExportRegistryEntry | null {
  return currentEntry;
}

export function clearExportData(): void {
  currentEntry = null;
  notify();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot(): ExportRegistryEntry | null {
  return currentEntry;
}

function getServerSnapshot(): null {
  return null;
}

/**
 * React hook to get the current export data reactively.
 * Uses useSyncExternalStore for proper concurrent mode support.
 */
export function useExportRegistry(): ExportRegistryEntry | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}