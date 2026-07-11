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
  UserCircle,
  Bell,
} from "lucide-react";
import { type LucideIcon, motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { OnlineStatus } from "@/components/shared/online-status";
import { useTranslation } from "@/lib/i18n";

export interface NavItem {
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

// Nav item config: key maps to translation keys
const navConfig: Record<string, { tKey: string; section: string }> = {
  "admin-dashboard": { tKey: "nav.dashboard", section: "overview" },
  "admin-cities": { tKey: "nav.cities", section: "organization" },
  "admin-parks": { tKey: "nav.parks", section: "organization" },
  "admin-batches": { tKey: "nav.batches", section: "organization" },
  "admin-groups": { tKey: "nav.groups", section: "organization" },
  "admin-people": { tKey: "nav.people", section: "people" },
  "admin-students": { tKey: "nav.students", section: "people" },
  "admin-guardians": { tKey: "nav.guardians", section: "people" },
  "admin-attendance-events": { tKey: "nav.attendance", section: "operations" },
  "admin-users": { tKey: "nav.users", section: "operations" },
  "admin-access": { tKey: "nav.access", section: "operations" },
  "admin-admissions": { tKey: "nav.admissions", section: "operations" },
  "admin-fees": { tKey: "nav.fees", section: "operations" },
  "admin-announcements": { tKey: "nav.announcements", section: "communication" },
  "admin-reports": { tKey: "nav.reports", section: "communication" },
  "admin-audit-log": { tKey: "nav.auditLog", section: "system" },
  "notifications": { tKey: "nav.notifications", section: "system" },
  "admin-settings": { tKey: "nav.settings", section: "system" },
  "city-head-dashboard": { tKey: "nav.dashboard", section: "overview" },
  "park-dashboard": { tKey: "nav.dashboard", section: "overview" },
  "park-attendance": { tKey: "nav.attendance", section: "daily" },
  "park-roster": { tKey: "nav.roster", section: "daily" },
  "park-participants": { tKey: "nav.participants", section: "directory" },
  "park-guardians": { tKey: "nav.families", section: "directory" },
  "park-schedule": { tKey: "nav.schedule", section: "directory" },
  "murabbi-dashboard": { tKey: "nav.dashboard", section: "overview" },
  "murabbi-groups": { tKey: "nav.myGroups", section: "overview" },
  "guardian-dashboard": { tKey: "nav.dashboard", section: "overview" },
  "guardian-history": { tKey: "nav.attendanceHistory", section: "tracking" },
  "guardian-schedule": { tKey: "nav.schedule", section: "tracking" },
  "guardian-fees": { tKey: "nav.fees", section: "tracking" },
  "guardian-announcements": { tKey: "nav.announcements", section: "updates" },
  "student-dashboard": { tKey: "nav.dashboard", section: "overview" },
  "student-history": { tKey: "nav.myAttendance", section: "tracking" },
  "student-schedule": { tKey: "nav.schedule", section: "tracking" },
  "student-fees": { tKey: "nav.fees", section: "tracking" },
  "student-announcements": { tKey: "nav.announcements", section: "updates" },
  "student-profile": { tKey: "nav.profile", section: "updates" },
};

const sectionTKeys: Record<string, string> = {
  overview: "nav.section.overview",
  organization: "nav.section.organization",
  people: "nav.section.people",
  operations: "nav.section.operations",
  communication: "nav.section.communication",
  system: "nav.section.system",
  daily: "nav.section.daily",
  directory: "nav.section.directory",
  group: "nav.section.group",
  tracking: "nav.section.tracking",
  updates: "nav.section.updates",
};

const iconMap: Record<string, LucideIcon> = {
  "admin-dashboard": LayoutDashboard,
  "admin-cities": Building2,
  "admin-parks": TreePine,
  "admin-batches": CalendarCheck,
  "admin-groups": Users,
  "admin-people": Users,
  "admin-students": GraduationCap,
  "admin-guardians": ShieldCheck,
  "admin-attendance-events": CalendarCheck,
  "admin-users": UserCog,
  "admin-access": UserPlus,
  "admin-admissions": FileText,
  "admin-fees": DollarSign,
  "admin-announcements": Megaphone,
  "admin-reports": BarChart3,
  "admin-audit-log": ScrollText,
  "notifications": Bell,
  "admin-settings": Settings,
  "city-head-dashboard": LayoutDashboard,
  "park-dashboard": LayoutDashboard,
  "park-attendance": CalendarCheck,
  "park-roster": ClipboardList,
  "park-participants": GraduationCap,
  "park-guardians": ShieldCheck,
  "park-schedule": Clock,
  "murabbi-dashboard": LayoutDashboard,
  "murabbi-groups": Users,
  "guardian-dashboard": LayoutDashboard,
  "guardian-history": ClipboardList,
  "guardian-schedule": Clock,
  "guardian-fees": DollarSign,
  "guardian-announcements": Megaphone,
  "student-dashboard": LayoutDashboard,
  "student-history": ClipboardList,
  "student-schedule": Clock,
  "student-fees": DollarSign,
  "student-announcements": Megaphone,
  "student-profile": UserCircle,
};

const roleNavPages: Record<string, PageId[]> = {
  super_admin: ["admin-dashboard","admin-cities","admin-parks","admin-batches","admin-groups","admin-people","admin-students","admin-guardians","admin-attendance-events","admin-users","admin-access","admin-admissions","admin-fees","admin-announcements","admin-reports","notifications","admin-audit-log","admin-settings"],
  program_admin: ["admin-dashboard","admin-cities","admin-parks","admin-batches","admin-groups","admin-people","admin-students","admin-guardians","admin-attendance-events","admin-users","admin-access","admin-admissions","admin-fees","admin-announcements","admin-reports","notifications","admin-audit-log","admin-settings"],
  city_head: ["city-head-dashboard","admin-cities","admin-parks","admin-batches","admin-groups","admin-people","admin-students","admin-attendance-events","admin-announcements","admin-reports","notifications"],
  park_admin: ["park-dashboard","park-attendance","park-roster","park-participants","park-guardians","park-schedule","notifications"],
  park_lead: ["park-dashboard","park-attendance","park-roster","park-participants","park-guardians","park-schedule","notifications"],
  murabbi: ["murabbi-dashboard","murabbi-groups","park-attendance","park-roster","park-participants","notifications"],
  guardian: ["guardian-dashboard","guardian-history","guardian-schedule","guardian-fees","guardian-announcements"],
  student: ["student-dashboard","student-history","student-schedule","student-fees","student-announcements","student-profile"],
};

// Navigation configuration per role tier
export function getNavItems(role: string | undefined, t: (key: string) => string): NavItem[] {
  if (!role) return [];

  const pages = roleNavPages[role];
  if (!pages) return [];

  return pages.map((pageId) => {
    const config = navConfig[pageId];
    const icon = iconMap[pageId] || LayoutDashboard;
    return {
      id: pageId,
      label: config ? t(config.tKey) : pageId,
      icon,
      section: config?.section || null,
    };
  });
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
  const { t } = useTranslation();
  const user = session?.user as { role?: string; name?: string; email?: string; id?: string } | undefined;
  const navItems = getNavItems(user?.role, t);

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
                    {t(sectionTKeys[group.section || ""] || group.section)}
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
                <div className="flex items-center gap-1.5">
                  {user?.id && <OnlineStatus userId={user.id} />}
                  <p className="text-xs font-medium truncate">{user?.name || "User"}</p>
                </div>
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
          {!collapsed && <span>{t("app.collapse")}</span>}
        </button>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className={cn(
            "flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            "text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? t("auth.signOut") : undefined}
        >
          <LogOut className="size-4 shrink-0" />
          {!collapsed && <span>{t("auth.signOut")}</span>}
        </button>
      </div>
    </motion.aside>
  );
}

// Mobile sidebar (Sheet)
function getTranslatedSection(section: string | null, t: (key: string) => string): string {
  if (!section) return "";
  return t(sectionTKeys[section] || section);
}

function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { currentPage, navigateTo } = useAppStore();
  const { data: session } = useSession();
  const { t } = useTranslation();
  const user = session?.user as { role?: string; name?: string; email?: string; id?: string } | undefined;
  const navItems = getNavItems(user?.role, t);

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
          <div className="flex items-center gap-2">
            {user?.id && <OnlineStatus userId={user.id} />}
            <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
          </div>
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
                      {getTranslatedSection(group.section, t)}
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
            <span>{t("auth.signOut")}</span>
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