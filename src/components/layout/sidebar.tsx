"use client";

import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  MapPin,
  TreePine,
  Users,
  GraduationCap,
  ShieldCheck,
  CalendarCheck,
  Settings,
  UserCog,
  DollarSign,
  FileText,
  Megaphone,
  BarChart3,
  ScrollText,
  ClipboardList,
  Clock,
  LogOut,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useAppStore, type PageId } from "@/stores/useAppStore";
import type { UserRole } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  pageId: PageId;
  icon: LucideIcon;
}

const roleNavMap: Record<UserRole, NavItem[]> = {
  super_admin: [
    { label: "Dashboard", pageId: "admin-dashboard", icon: LayoutDashboard },
    { label: "Cities", pageId: "admin-cities", icon: MapPin },
    { label: "Parks", pageId: "admin-parks", icon: TreePine },
    { label: "People", pageId: "admin-people", icon: Users },
    { label: "Students", pageId: "admin-students", icon: GraduationCap },
    { label: "Guardians", pageId: "admin-guardians", icon: ShieldCheck },
    { label: "Attendance Events", pageId: "admin-attendance-events", icon: CalendarCheck },
    { label: "Users", pageId: "admin-users", icon: UserCog },
    { label: "Fees", pageId: "admin-fees", icon: DollarSign },
    { label: "Admissions", pageId: "admin-admissions", icon: FileText },
    { label: "Announcements", pageId: "admin-announcements", icon: Megaphone },
    { label: "Reports", pageId: "admin-reports", icon: BarChart3 },
    { label: "Audit Log", pageId: "admin-audit-log", icon: ScrollText },
  ],
  program_admin: [
    { label: "Dashboard", pageId: "admin-dashboard", icon: LayoutDashboard },
    { label: "Cities", pageId: "admin-cities", icon: MapPin },
    { label: "Parks", pageId: "admin-parks", icon: TreePine },
    { label: "People", pageId: "admin-people", icon: Users },
    { label: "Students", pageId: "admin-students", icon: GraduationCap },
    { label: "Guardians", pageId: "admin-guardians", icon: ShieldCheck },
    { label: "Attendance Events", pageId: "admin-attendance-events", icon: CalendarCheck },
    { label: "Users", pageId: "admin-users", icon: UserCog },
    { label: "Fees", pageId: "admin-fees", icon: DollarSign },
    { label: "Admissions", pageId: "admin-admissions", icon: FileText },
    { label: "Announcements", pageId: "admin-announcements", icon: Megaphone },
    { label: "Reports", pageId: "admin-reports", icon: BarChart3 },
    { label: "Audit Log", pageId: "admin-audit-log", icon: ScrollText },
  ],
  city_head: [
    { label: "Dashboard", pageId: "admin-dashboard", icon: LayoutDashboard },
    { label: "Parks", pageId: "admin-parks", icon: TreePine },
    { label: "People", pageId: "admin-people", icon: Users },
    { label: "Students", pageId: "admin-students", icon: GraduationCap },
    { label: "Guardians", pageId: "admin-guardians", icon: ShieldCheck },
    { label: "Attendance Events", pageId: "admin-attendance-events", icon: CalendarCheck },
    { label: "Settings", pageId: "admin-settings", icon: Settings },
    { label: "Users", pageId: "admin-users", icon: UserCog },
    { label: "Fees", pageId: "admin-fees", icon: DollarSign },
    { label: "Admissions", pageId: "admin-admissions", icon: FileText },
    { label: "Announcements", pageId: "admin-announcements", icon: Megaphone },
    { label: "Reports", pageId: "admin-reports", icon: BarChart3 },
  ],
  park_admin: [
    { label: "Dashboard", pageId: "park-dashboard", icon: LayoutDashboard },
    { label: "Attendance", pageId: "park-attendance", icon: CalendarCheck },
    { label: "Participants", pageId: "park-participants", icon: GraduationCap },
    { label: "Families", pageId: "park-guardians", icon: ShieldCheck },
    { label: "Schedule", pageId: "park-schedule", icon: Clock },
    { label: "Announcements", pageId: "park-announcements", icon: Megaphone },
  ],
  park_lead: [
    { label: "Dashboard", pageId: "park-dashboard", icon: LayoutDashboard },
    { label: "Attendance", pageId: "park-attendance", icon: CalendarCheck },
    { label: "Participants", pageId: "park-participants", icon: GraduationCap },
    { label: "Families", pageId: "park-guardians", icon: ShieldCheck },
    { label: "Schedule", pageId: "park-schedule", icon: Clock },
    { label: "Announcements", pageId: "park-announcements", icon: Megaphone },
  ],
  murabbi: [
    { label: "Dashboard", pageId: "park-dashboard", icon: LayoutDashboard },
    { label: "Attendance", pageId: "park-attendance", icon: CalendarCheck },
    { label: "Schedule", pageId: "park-schedule", icon: Clock },
    { label: "Announcements", pageId: "park-announcements", icon: Megaphone },
  ],
  guardian: [
    { label: "Dashboard", pageId: "guardian-dashboard", icon: LayoutDashboard },
    { label: "History", pageId: "guardian-history", icon: ClipboardList },
    { label: "Schedule", pageId: "guardian-schedule", icon: Clock },
    { label: "Announcements", pageId: "guardian-announcements", icon: Megaphone },
  ],
  student: [
    { label: "Dashboard", pageId: "student-dashboard", icon: LayoutDashboard },
    { label: "History", pageId: "student-history", icon: ClipboardList },
    { label: "Schedule", pageId: "student-schedule", icon: Clock },
    { label: "Announcements", pageId: "student-announcements", icon: Megaphone },
  ],
};

function NavItemButton({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        "hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-400",
        active &&
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
        !active && "text-muted-foreground",
        collapsed && "justify-center px-2"
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </button>
  );
}

interface SidebarNavProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  const { data: session } = useSession();
  const { currentPage, navigateTo } = useAppStore();

  const user = session?.user as { role?: string; name?: string } | undefined;
  const role = (user?.role || "student") as UserRole;
  const navItems = roleNavMap[role] || [];

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-4 border-b",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-600 text-white font-bold text-sm shrink-0">
          S
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">Shabab360</p>
            <p className="text-[10px] text-muted-foreground truncate">
              Program Operations
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavItemButton
              key={item.pageId}
              item={item}
              active={currentPage === item.pageId}
              collapsed={collapsed}
              onClick={() => {
                navigateTo(item.pageId);
                onNavigate?.();
              }}
            />
          ))}
        </nav>
      </ScrollArea>

      <Separator />

      {/* Footer */}
      <div className="p-3 space-y-1">
        {!collapsed && user?.name && (
          <div className="px-3 py-1.5">
            <p className="text-xs font-medium truncate">{user.name}</p>
            <p className="text-[10px] text-muted-foreground capitalize truncate">
              {role.replace(/_/g, " ")}
            </p>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className={cn(
            "flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            "text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Sign Out" : undefined}
        >
          <LogOut className="size-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
}

interface SidebarProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps) {
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r bg-card h-screen sticky top-0 transition-all duration-300 shrink-0",
          sidebarOpen ? "w-60" : "w-16"
        )}
      >
        <SidebarNav collapsed={!sidebarOpen} />
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={toggleSidebar}
          >
            {sidebarOpen ? (
              <ChevronLeft className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </Button>
        </div>
      </aside>

      {/* Mobile sidebar sheet */}
      {mobileOpen && (
        <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <SidebarNav
              collapsed={false}
              onNavigate={() => onMobileOpenChange(false)}
            />
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}