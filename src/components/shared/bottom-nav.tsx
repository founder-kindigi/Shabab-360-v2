"use client";

import { useSession } from "next-auth/react";
import { useAppStore, type PageId } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  CalendarCheck,
  BarChart3,
  Settings,
  TreePine,
  Users,
  Calendar,
  Megaphone,
  DollarSign,
  ClipboardCheck,
  UserCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface BottomNavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
}

function getBottomNavItems(role: string | undefined): BottomNavItem[] {
  if (!role) return [];

  // Super Admin & Program Admin
  if (["super_admin", "program_admin"].includes(role)) {
    return [
      { id: "admin-dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "admin-attendance-events", label: "Attendance", icon: CalendarCheck },
      { id: "admin-reports", label: "Reports", icon: BarChart3 },
      { id: "admin-settings", label: "Settings", icon: Settings },
    ];
  }

  // City Head
  if (role === "city_head") {
    return [
      { id: "city-head-dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "admin-parks", label: "Parks", icon: TreePine },
      { id: "admin-attendance-events", label: "Attendance", icon: CalendarCheck },
      { id: "admin-reports", label: "Reports", icon: BarChart3 },
    ];
  }

  // Park Admin & Park Lead
  if (["park_admin", "park_lead"].includes(role)) {
    return [
      { id: "park-dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "park-attendance", label: "Attendance", icon: CalendarCheck },
      { id: "park-roster", label: "Roster", icon: Users },
      { id: "park-schedule", label: "Schedule", icon: Calendar },
    ];
  }

  // Murabbi
  if (role === "murabbi") {
    return [
      { id: "murabbi-dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "murabbi-groups", label: "My Groups", icon: Users },
      { id: "park-attendance", label: "Attendance", icon: CalendarCheck },
      { id: "park-schedule", label: "Schedule", icon: Calendar },
    ];
  }

  // Guardian
  if (role === "guardian") {
    return [
      { id: "guardian-dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "guardian-schedule", label: "Schedule", icon: Calendar },
      { id: "guardian-announcements", label: "Announcements", icon: Megaphone },
      { id: "guardian-fees", label: "Fees", icon: DollarSign },
    ];
  }

  // Student
  if (role === "student") {
    return [
      { id: "student-dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "student-history", label: "Attendance", icon: ClipboardCheck },
      { id: "student-fees", label: "Fees", icon: DollarSign },
      { id: "student-profile", label: "Profile", icon: UserCircle },
    ];
  }

  return [];
}

// Pages where bottom nav should be hidden
const HIDDEN_PAGES: PageId[] = ["login", "reset-password", "access-pending"];

export function BottomNav() {
  const { currentPage, navigateTo } = useAppStore();
  const { data: session } = useSession();

  const user = session?.user as { role?: string } | undefined;
  const items = getBottomNavItems(user?.role);

  // Don't render on auth pages or if no items
  if (HIDDEN_PAGES.includes(currentPage) || items.length === 0) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 lg:hidden no-print"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
        className="flex items-center gap-1 bg-card/95 backdrop-blur-lg border rounded-2xl px-2 py-1.5 shadow-lg shadow-black/10"
      >
        {items.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A0006B] focus-visible:ring-offset-1",
                "min-w-[56px]",
                isActive
                  ? "bg-[#4B0A8F] dark:bg-[#7B3ADF] text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <motion.div
                animate={{ scale: isActive ? 1.15 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Icon className="size-5" />
              </motion.div>
              <span className="text-[10px] font-medium leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </motion.div>
    </nav>
  );
}