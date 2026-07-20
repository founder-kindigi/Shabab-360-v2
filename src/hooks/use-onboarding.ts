"use client";

import { useState, useCallback, useEffect } from "react";
import type { UserRole } from "@/types";

export interface TourStep {
  target: string;
  title: string;
  description: string;
  position: "bottom" | "top" | "left" | "right";
}

const TOUR_STEPS: Record<string, TourStep[]> = {
  admin: [
    {
      target: "[data-tour='dashboard']",
      title: "Welcome to Shabab360!",
      description:
        "This is your admin dashboard. Here you'll see an overview of all activities across your organization.",
      position: "bottom",
    },
    {
      target: "[data-tour='dashboard-cards']",
      title: "Dashboard Overview",
      description:
        "Key metrics at a glance — attendance, enrollment, fees, and more. Cards update in real-time.",
      position: "bottom",
    },
    {
      target: "[data-tour='sidebar']",
      title: "Sidebar Navigation",
      description:
        "Use the sidebar to navigate between modules. Click to expand/collapse on desktop.",
      position: "right",
    },
    {
      target: "[data-tour='command-palette']",
      title: "Command Palette",
      description:
        "Press Cmd+K (Mac) or Ctrl+K (Windows) to quickly search and navigate to any page or action.",
      position: "bottom",
    },
    {
      target: "[data-tour='notifications']",
      title: "Notifications",
      description:
        "Stay updated with notifications. The bell icon shows your unread count and refreshes securely in the background.",
      position: "left",
    },
    {
      target: "[data-tour='user-menu']",
      title: "User Menu & Settings",
      description:
        "Click your avatar to access settings, profile, and sign out. Navigate to Settings to manage your preferences.",
      position: "left",
    },
  ],
  murabbi: [
    {
      target: "[data-tour='dashboard']",
      title: "Welcome, Murabbi!",
      description:
        "Your dashboard gives you a quick overview of your assigned groups and recent attendance.",
      position: "bottom",
    },
    {
      target: "[data-tour='sidebar']",
      title: "My Groups",
      description:
        "Navigate to your groups from the sidebar. Each group shows its members and attendance stats.",
      position: "right",
    },
    {
      target: "[data-tour='sidebar']",
      title: "Mark Attendance",
      description:
        "Go to a group's attendance section to mark daily attendance for your students.",
      position: "right",
    },
    {
      target: "[data-tour='sidebar']",
      title: "Schedule",
      description:
        "View the weekly schedule for your groups, including session times and locations.",
      position: "right",
    },
  ],
  guardian: [
    {
      target: "[data-tour='dashboard']",
      title: "Welcome to Shabab360!",
      description:
        "As a guardian, you can track your children's attendance, schedules, and fee status.",
      position: "bottom",
    },
    {
      target: "[data-tour='sidebar']",
      title: "My Children",
      description:
        "Use the sidebar to view your children's profiles, attendance history, and announcements.",
      position: "right",
    },
    {
      target: "[data-tour='sidebar']",
      title: "Fees",
      description:
        "Check fee statuses, view receipts, and track payment history for your children.",
      position: "right",
    },
  ],
  student: [
    {
      target: "[data-tour='dashboard']",
      title: "Welcome to Shabab360!",
      description:
        "Your personal dashboard shows your attendance, schedule, and upcoming events.",
      position: "bottom",
    },
    {
      target: "[data-tour='sidebar']",
      title: "My Schedule",
      description:
        "View your weekly class schedule with times and locations.",
      position: "right",
    },
    {
      target: "[data-tour='sidebar']",
      title: "My Fees",
      description:
        "Check your fee status and download receipts.",
      position: "right",
    },
  ],
};

const STORAGE_KEY = "shabab360-tour-completed";

function getRoleKey(role: UserRole | null): string {
  if (!role) return "admin";
  if (role === "guardian" || role === "student") return role;
  if (role === "murabbi") return "murabbi";
  // All admin-type roles get the admin tour
  return "admin";
}

function getStorageKey(role: UserRole | null): string {
  return `${STORAGE_KEY}-${getRoleKey(role)}`;
}

export function useOnboarding(role: UserRole | null) {
  const [isActive, setIsActive] = useState(false);
  const roleKey = getRoleKey(role);
  const storageKey = getStorageKey(role);
  const steps = TOUR_STEPS[roleKey] || TOUR_STEPS.admin;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      // Delay slightly so the layout has time to render
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const completeTour = useCallback(() => {
    localStorage.setItem(storageKey, "true");
    setIsActive(false);
  }, [storageKey]);

  const skipTour = useCallback(() => {
    localStorage.setItem(storageKey, "true");
    setIsActive(false);
  }, [storageKey]);

  const startTour = useCallback(() => {
    localStorage.removeItem(storageKey);
    setIsActive(true);
  }, [storageKey]);

  const resetTour = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return {
    isActive,
    startTour,
    completeTour,
    skipTour,
    resetTour,
    steps,
  };
}
