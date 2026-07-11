"use client";

import { useSession, signOut } from "next-auth/react";
import { useAppStore, type PageId } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  LogOut,
  ChevronLeft,
  ClipboardList,
  Clock,
  X,
  UserPlus,
} from "lucide-react";
import { type LucideIcon, motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
  badge?: string;
  section?: string;
}

// Section groupings per role tier
function getNavSections(items: NavItem[]): { section: string | null; items: NavItem[] }[] {
  const sections: { section: string | null; items: NavItem[] }[] = [];
  let current: string | null = null;
  for (const item of items) {
    if (item.section !== current) {
      sections.push({ section: item.section || null, items: [item] });
      current = item.section;
    } else {
      sections[sections.length - 1].items.push(item);
    }
  }
  return sections;
}

// Navigation configuration per role tier
function getNavItems(role: string | undefined): NavItem[] {
  if (!role) return [];

  // Super Admin & Program Admin — full access
  if (["super_admin", "program_admin"].includes(role)) {
    return [
      { id: "admin-dashboard", label: "Dashboard", icon: LayoutDashboard, section: "overview" },
      { id: "admin-cities", label: "Cities", icon: Building2, section: "organization" },
      { id: "admin-parks", label: "Parks", icon: TreePine, section: "organization" },
      { id: "admin-batches", label: "Batches", icon: CalendarCheck, section: "organization" },
      { id: "admin-groups", label: "Groups", icon: Users, section: "organization" },
      { id: "admin-people", label: "People", icon: Users, section: "people" },
      { id: "admin-students", label: "Students", icon: GraduationCap, section: "people" },
      { id: "admin-guardians", label: "Guardians", icon: ShieldCheck, section: "people" },
      { id: "admin-attendance-events", label: "Attendance", icon: CalendarCheck, section: "operations" },
      { id: "admin-users", label: "Users", icon: UserCog, section: "operations" },
      { id: "admin-access", label: "Access Provisioning", icon: UserPlus, section: "operations" },
      { id: "admin-admissions", label: "Admissions", icon: FileText, section: "operations" },
      { id: "admin-fees", label: "Fees", icon: DollarSign, section: "operations" },
      { id: "admin-announcements", label: "Announcements", icon: Megaphone, section: "communication" },
      { id: "admin-reports", label: "Reports", icon: BarChart3, section: "communication" },
      { id: "admin-audit-log", label: "Audit Log", icon: ScrollText, section: "system" },
      { id: "admin-settings", label: "Settings", icon: Settings, section: "system" },
    ];
  }

  // City Head — city-scoped admin
  if (role === "city_head") {
    return [
      { id: "city-head-dashboard", label: "Dashboard", icon: LayoutDashboard, section: "overview" },
      { id: "admin-cities", label: "My City", icon: Building2, section: "organization" },
      { id: "admin-parks", label: "Parks", icon: TreePine, section: "organization" },
      { id: "admin-batches", label: "Batches", icon: CalendarCheck, section: "organization" },
      { id: "admin-groups", label: "Groups", icon: Users, section: "organization" },
      { id: "admin-people", label: "People", icon: Users, section: "people" },
      { id: "admin-students", label: "Students", icon: GraduationCap, section: "people" },
      { id: "admin-attendance-events", label: "Attendance", icon: CalendarCheck, section: "operations" },
      { id: "admin-announcements", label: "Announcements", icon: Megaphone, section: "communication" },
      { id: "admin-reports", label: "Reports", icon: BarChart3, section: "communication" },
    ];
  }

  // Park Admin & Park Lead — park-scoped
  if (["park_admin", "park_lead"].includes(role)) {
    return [
      { id: "park-dashboard", label: "Dashboard", icon: LayoutDashboard, section: "overview" },
      { id: "park-attendance", label: "Attendance", icon: CalendarCheck, section: "daily" },
      { id: "park-roster", label: "Roster", icon: ClipboardList, section: "daily" },
      { id: "park-participants", label: "Participants", icon: GraduationCap, section: "directory" },
      { id: "park-guardians", label: "Families", icon: ShieldCheck, section: "directory" },
      { id: "park-schedule", label: "Schedule", icon: Clock, section: "directory" },
    ];
  }

  // Murabbi — group-scoped
  if (role === "murabbi") {
    return [
      { id: "murabbi-dashboard", label: "Dashboard", icon: LayoutDashboard, section: "overview" },
      { id: "park-attendance", label: "Attendance", icon: CalendarCheck, section: "daily" },
      { id: "park-roster", label: "Roster", icon: ClipboardList, section: "daily" },
      { id: "park-participants", label: "My Group", icon: GraduationCap, section: "group" },
    ];
  }

  // Guardian
  if (role === "guardian") {
    return [
      { id: "guardian-dashboard", label: "Dashboard", icon: LayoutDashboard, section: "overview" },
      { id: "guardian-history", label: "Attendance History", icon: ClipboardList, section: "tracking" },
      { id: "guardian-schedule", label: "Schedule", icon: Clock, section: "tracking" },
      { id: "guardian-announcements", label: "Announcements", icon: Megaphone, section: "updates" },
    ];
  }

  // Student
  if (role === "student") {
    return [
      { id: "student-dashboard", label: "Dashboard", icon: LayoutDashboard, section: "overview" },
      { id: "student-history", label: "My Attendance", icon: ClipboardList, section: "tracking" },
      { id: "student-schedule", label: "Schedule", icon: Clock, section: "tracking" },
      { id: "student-announcements", label: "Announcements", icon: Megaphone, section: "updates" },
    ];
  }

  return [];
}

// Role display labels
function getRoleLabel(role: string | undefined): string {
  if (!role) return "User";
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface SidebarProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

// Desktop nav item
function SidebarNavItem({
  item,
  isActive,
  collapsed,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  const button = (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300 relative",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A0006B] focus-visible:ring-offset-1",
        isActive
          ? "bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0] shadow-sm"
          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
        collapsed && "justify-center px-2"
      )}
      title={collapsed ? item.label : undefined}
    >
      <div
        className={cn(
          "flex items-center justify-center shrink-0 transition-colors duration-300",
          isActive
            ? "text-[#4B0A8F] dark:text-[#8A40B0]"
            : "text-muted-foreground group-hover:text-foreground"
        )}
      >
        <Icon className="size-[18px]" />
      </div>
      {!collapsed && (
        <span className="truncate">{item.label}</span>
      )}
      {!collapsed && item.badge && (
        <span className="ml-auto rounded-full bg-[#F3ECF6] px-2 py-0.5 text-[10px] font-semibold text-[#4B0A8F] dark:bg-[#1F0860] dark:text-[#8A40B0]">
          {item.badge}
        </span>
      )}
      {isActive && !collapsed && (
        <motion.div
          layoutId="sidebar-active-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-[#2A0C8F] to-[#A0006B]"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}
    </button>
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}

// Desktop sidebar
function DesktopSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { currentPage, navigateTo } = useAppStore();
  const { data: session } = useSession();
  const user = session?.user as { role?: string; name?: string; email?: string } | undefined;
  const navItems = getNavItems(user?.role);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="hidden lg:flex flex-col h-screen border-r bg-card/50 backdrop-blur-sm shrink-0 overflow-hidden relative"
    >
      {/* Header / Brand */}
      <div className="group/brand flex items-center gap-3 px-4 h-14 border-b shrink-0 transition-shadow duration-500 hover:shadow-[0_0_20px_rgba(75,10,143,0.15)]">
        <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-[#2A0C8F] via-[#A0006B] to-[#FF0015] text-white font-bold text-sm shrink-0 shadow-sm transition-transform duration-300 group-hover/brand:scale-105">
          S
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <p className="text-sm font-bold whitespace-nowrap bg-gradient-to-r from-[#4B0A8F] to-[#A0006B] bg-clip-text text-transparent">
                Shabab360
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3 px-2">
        <nav className="flex flex-col gap-0.5">
          {getNavSections(navItems).map((group, gIdx) => (
            <div key={group.section || `s-${gIdx}`}>
              {group.section && !collapsed && (
                <div className="flex items-center gap-2 px-3 pt-4 pb-1.5">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                    {group.section}
                  </p>
                  <div className="flex-1 h-px bg-border/60" />
                </div>
              )}
              {group.section && collapsed && gIdx > 0 && (
                <div className="my-2 mx-2 h-px bg-border/40" />
              )}
              {group.items.map((item) => (
                <div key={item.id} className="relative">
                  <SidebarNavItem
                    item={item}
                    isActive={currentPage === item.id}
                    collapsed={collapsed}
                    onClick={() => navigateTo(item.id)}
                  />
                </div>
              ))}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer: User info + Sign out + Collapse toggle */}
      <div className="border-t p-2 shrink-0 space-y-1">
        {/* User info */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="rounded-lg bg-muted/50 px-3 py-2 mb-2">
                <p className="text-xs font-medium truncate">{user?.name || "User"}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-[#F3ECF6] px-2 py-0.5 text-[10px] font-medium text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0] capitalize">
                  {getRoleLabel(user?.role)}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className={cn(
            "flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors",
            collapsed && "justify-center px-2"
          )}
        >
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronLeft className="size-4" />
          </motion.div>
          {!collapsed && <span>Collapse</span>}
        </button>

        {/* Sign out */}
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
    </motion.aside>
  );
}

// Mobile sidebar (Sheet)
function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { currentPage, navigateTo } = useAppStore();
  const { data: session } = useSession();
  const user = session?.user as { role?: string; name?: string; email?: string } | undefined;
  const navItems = getNavItems(user?.role);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0">
        {/* Header */}
        <div className="group/brand flex items-center justify-between px-4 h-14 border-b transition-shadow duration-500 hover:shadow-[0_0_20px_rgba(75,10,143,0.15)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-[#2A0C8F] via-[#A0006B] to-[#FF0015] text-white font-bold text-sm shadow-sm transition-transform duration-300 group-hover/brand:scale-105">
              S
            </div>
            <p className="text-sm font-bold bg-gradient-to-r from-[#4B0A8F] to-[#A0006B] bg-clip-text text-transparent">
              Shabab360
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b bg-muted/30">
          <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-[#F3ECF6] px-2 py-0.5 text-[10px] font-medium text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0] capitalize">
            {getRoleLabel(user?.role)}
          </span>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 py-3 px-2" style={{ height: "calc(100vh - 140px)" }}>
          <nav className="flex flex-col gap-0.5">
            {getNavSections(navItems).map((group, gIdx) => (
              <div key={group.section || `ms-${gIdx}`}>
                {group.section && (
                  <div className="flex items-center gap-2 px-3 pt-4 pb-1.5">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                      {group.section}
                    </p>
                    <div className="flex-1 h-px bg-border/60" />
                  </div>
                )}
                {group.section && gIdx > 0 && (
                  <div className="my-1 mx-2 h-px bg-border/40" />
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        navigateTo(item.id);
                        onOpenChange(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300 relative",
                        isActive
                          ? "bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0] shadow-sm"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      )}
                    >
                      <Icon className="size-[18px] shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-[#2A0C8F] to-[#A0006B]" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer: Sign out */}
        <div className="border-t p-2">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="size-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps) {
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <>
      <DesktopSidebar collapsed={!sidebarOpen} onToggle={toggleSidebar} />
      <MobileSidebar open={mobileOpen} onOpenChange={onMobileOpenChange} />
    </>
  );
}