"use client";

import { useEffect, useCallback, useState, type RefObject } from "react";
import { useAppStore, type PageId } from "@/stores/useAppStore";
import { useSession } from "next-auth/react";

// ---------------------------------------------------------------------------
// Shared open state for the shortcuts dialog (tiny zustand slice)
// ---------------------------------------------------------------------------

import { create } from "zustand";
import { useCommandPaletteStore } from "@/components/shared/command-palette";

interface ShortcutsDialogState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useShortcutsDialogStore = create<ShortcutsDialogState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));

// ---------------------------------------------------------------------------
// Helper: get the first N sidebar nav items for the current role
// ---------------------------------------------------------------------------

function getNavItemsForRole(role: string | undefined): PageId[] {
  if (!role) return [];

  if (["super_admin", "program_admin"].includes(role)) {
    return [
      "admin-dashboard",
      "admin-cities",
      "admin-parks",
      "admin-batches",
      "admin-groups",
      "admin-people",
      "admin-students",
      "admin-guardians",
      "admin-attendance-events",
    ];
  }

  if (role === "city_head") {
    return [
      "city-head-dashboard",
      "admin-cities",
      "admin-parks",
      "admin-batches",
      "admin-groups",
      "admin-people",
      "admin-students",
      "admin-attendance-events",
      "admin-announcements",
    ];
  }

  if (["park_admin", "park_lead"].includes(role)) {
    return [
      "park-dashboard",
      "park-attendance",
      "park-roster",
      "park-participants",
      "park-guardians",
      "park-schedule",
    ];
  }

  if (role === "murabbi") {
    return [
      "murabbi-dashboard",
      "park-attendance",
      "park-roster",
      "park-participants",
    ];
  }

  if (role === "guardian") {
    return [
      "guardian-dashboard",
      "guardian-history",
      "guardian-schedule",
      "guardian-announcements",
    ];
  }

  if (role === "student") {
    return [
      "student-dashboard",
      "student-history",
      "student-schedule",
      "student-announcements",
    ];
  }

  return [];
}

// ---------------------------------------------------------------------------
// Helper: check if the target is an input element
// ---------------------------------------------------------------------------

function isInputTarget(e: KeyboardEvent): boolean {
  const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
  return ["input", "textarea", "select"].includes(tag ?? "");
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useKeyboardShortcuts() {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const { setOpen } = useShortcutsDialogStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;

      // Ctrl/Cmd + / → Open shortcuts dialog
      if (mod && e.key === "/") {
        e.preventDefault();
        setOpen(true);
        return;
      }

      // Ctrl/Cmd + K → Open command palette (handled by CommandPalette component)
      if (mod && e.key === "k") {
        e.preventDefault();
        return;
      }

      // Escape → Close any open dialog
      if (e.key === "Escape") {
        // Dispatch a custom event that Dialog/Sheet can listen to
        document.dispatchEvent(new CustomEvent("shortcut:escape"));
        return;
      }

      // Ctrl/Cmd + 1-9 → Navigate to sidebar item
      if (mod && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        const navItems = getNavItemsForRole(role);
        if (navItems[index]) {
          navigateTo(navItems[index]);
        }
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigateTo, role, setOpen]);
}