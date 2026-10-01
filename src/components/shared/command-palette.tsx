"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore, type PageId } from "@/stores/useAppStore";
import { useSession } from "next-auth/react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Building2,
  TreePine,
  CalendarCheck,
  Users,
  GraduationCap,
  ShieldCheck,
  UserCog,
  DollarSign,
  FileText,
  Megaphone,
  BarChart3,
  ScrollText,
  Settings,
  ClipboardList,
  Clock,
  UserPlus,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

interface NavItemDef {
  id: PageId;
  label: string;
  icon: LucideIcon;
  section: string;
}

// ─── Navigation config per role ──────────────────────────────────────

function getNavItemsForRole(role: string | undefined): NavItemDef[] {
  if (!role) return [];

  if (["super_admin", "program_admin"].includes(role)) {
    return [
      { id: "admin-dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
      { id: "admin-cities", label: "Cities", icon: Building2, section: "Organization" },
      { id: "admin-parks", label: "Parks", icon: TreePine, section: "Organization" },
      { id: "admin-batches", label: "Batches", icon: CalendarCheck, section: "Organization" },
      { id: "admin-groups", label: "Groups", icon: Users, section: "Organization" },
      { id: "admin-people", label: "People", icon: Users, section: "People" },
      { id: "admin-students", label: "Students", icon: GraduationCap, section: "People" },
      { id: "admin-guardians", label: "Guardians", icon: ShieldCheck, section: "People" },
      { id: "admin-attendance-events", label: "Attendance", icon: CalendarCheck, section: "Operations" },
      { id: "admin-users", label: "Users", icon: UserCog, section: "Operations" },
      { id: "admin-access", label: "Access Provisioning", icon: UserPlus, section: "Operations" },
      { id: "admin-admissions", label: "Admissions", icon: FileText, section: "Operations" },
      { id: "admin-fees", label: "Fees", icon: DollarSign, section: "Operations" },
      { id: "admin-content-planner", label: "Content Planner", icon: BookOpen, section: "Operations" },
      { id: "admin-announcements", label: "Announcements", icon: Megaphone, section: "Communication" },
      { id: "admin-reports", label: "Reports", icon: BarChart3, section: "Communication" },
      { id: "admin-audit-log", label: "Audit Log", icon: ScrollText, section: "System" },
      { id: "admin-settings", label: "Settings", icon: Settings, section: "System" },
    ];
  }

  if (role === "city_head") {
    return [
      { id: "city-head-dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
      { id: "admin-parks", label: "Parks", icon: TreePine, section: "Organization" },
      { id: "admin-batches", label: "Batches", icon: CalendarCheck, section: "Organization" },
      { id: "admin-groups", label: "Groups", icon: Users, section: "Organization" },
      { id: "admin-people", label: "People", icon: Users, section: "People" },
      { id: "admin-students", label: "Students", icon: GraduationCap, section: "People" },
      { id: "admin-attendance-events", label: "Attendance", icon: CalendarCheck, section: "Operations" },
      { id: "admin-access", label: "Access Provisioning", icon: UserPlus, section: "Operations" },
      { id: "admin-announcements", label: "Announcements", icon: Megaphone, section: "Communication" },
      { id: "admin-reports", label: "Reports", icon: BarChart3, section: "Communication" },
    ];
  }

  if (role === "park_admin") {
    return [
      { id: "park-dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
      { id: "park-attendance", label: "Attendance", icon: CalendarCheck, section: "Daily" },
    ];
  }

  if (role === "park_lead") {
    return [
      { id: "park-dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
      { id: "admin-groups", label: "Groups", icon: Users, section: "Organization" },
      { id: "park-attendance", label: "Attendance", icon: CalendarCheck, section: "Daily" },
    ];
  }

  if (role === "murabbi") {
    return [
      { id: "murabbi-dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
      { id: "park-attendance", label: "Attendance", icon: CalendarCheck, section: "Daily" },
    ];
  }

  if (role === "guardian") {
    return [
      { id: "guardian-dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
      { id: "guardian-history", label: "Attendance History", icon: ClipboardList, section: "Tracking" },
      { id: "guardian-schedule", label: "Schedule", icon: Clock, section: "Tracking" },
      { id: "guardian-announcements", label: "Announcements", icon: Megaphone, section: "Updates" },
    ];
  }

  if (role === "student") {
    return [
      { id: "student-dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
      { id: "student-history", label: "My Attendance", icon: ClipboardList, section: "Tracking" },
      { id: "student-schedule", label: "Schedule", icon: Clock, section: "Tracking" },
      { id: "student-announcements", label: "Announcements", icon: Megaphone, section: "Updates" },
    ];
  }

  return [];
}

// ─── Component ──────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { currentPage, navigateTo } = useAppStore();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const navItems = getNavItemsForRole(role);

  // Group items by section
  const groupedItems = navItems.reduce<Record<string, NavItemDef[]>>((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

  // Keyboard shortcut to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close on navigate
  const handleNavigate = useCallback((pageId: PageId) => {
    navigateTo(pageId);
    setOpen(false);
  }, [navigateTo]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages..." />
      <CommandList className="max-h-[320px]">
        <CommandEmpty>No pages found.</CommandEmpty>
        {Object.entries(groupedItems).map(([section, items], idx) => (
          <div key={section}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={section}>
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${item.section}`}
                    onSelect={() => handleNavigate(item.id)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div
                      className={`flex items-center justify-center size-8 rounded-lg shrink-0 ${
                        isActive
                          ? "bg-[#4B0A8F]/10 text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0]"
                          : "text-muted-foreground"
                      }`}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${isActive ? "font-semibold" : "font-medium"}`}>
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{section}</p>
                    </div>
                    {isActive && (
                      <span className="text-[10px] font-medium text-[#4B0A8F] dark:text-[#8A40B0] bg-[#F3ECF6] dark:bg-[#1F0860] px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
      {/* Footer hint */}
      <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">&#8679;</span>K
          </kbd>
          Toggle
        </span>
        <span className="flex items-center gap-1">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            &#8593;&#8595;
          </kbd>
          Navigate
        </span>
        <span className="flex items-center gap-1">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            &#9166;
          </kbd>
          Open
        </span>
      </div>
    </CommandDialog>
  );
}
