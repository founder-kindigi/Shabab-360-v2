"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useAppStore, type PageId } from "@/stores/useAppStore";
import { Sidebar } from "@/components/layout/sidebar";
import { NotificationBell } from "@/components/layout/notification-bell";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, LogOut, User, ChevronDown, Construction, Settings } from "lucide-react";

// Page components
import { AdminDashboard } from "@/components/modules/admin/admin-dashboard";
import { CitiesPage } from "@/components/modules/admin/cities-page";
import { BatchesPage } from "@/components/modules/admin/batches-page";
import { GroupsPage } from "@/components/modules/admin/groups-page";
import { ParksPage } from "@/components/modules/admin/parks-page";
import { UsersPage } from "@/components/modules/admin/users-page";
import { AuditLogPage } from "@/components/modules/admin/audit-log-page";
import { PeoplePage } from "@/components/modules/admin/people-page";
import { AdminAttendanceEvents } from "@/components/modules/admin/admin-attendance-events";
import { AnnouncementsPage } from "@/components/modules/admin/announcements-page";
import { SettingsPage } from "@/components/modules/admin/settings-page";
import { ReportsPage } from "@/components/modules/admin/reports-page";
import { AccessProvisioningPage } from "@/components/modules/admin/access-provisioning-page";
import { MurabbiDashboard } from "@/components/modules/murabbi/murabbi-dashboard";
import { ParkDashboard } from "@/components/modules/park/park-dashboard";
import { ParkAttendancePage } from "@/components/modules/park/park-attendance-page";
import { ParkRosterPage } from "@/components/modules/park/park-roster-page";
import { AttendanceRoster } from "@/components/modules/park/attendance-roster";
import { GuardianDashboard } from "@/components/modules/guardian/guardian-dashboard";
import { GuardianHistoryPage } from "@/components/modules/guardian/guardian-history-page";
import { GuardianAnnouncementsPage } from "@/components/modules/guardian/guardian-announcements-page";
import { CityHeadDashboard } from "@/components/modules/city-head/city-head-dashboard";
import { StudentDashboard } from "@/components/modules/student/student-dashboard";
import { StudentHistoryPage } from "@/components/modules/student/student-history-page";
import { StudentAnnouncementsPage } from "@/components/modules/student/student-announcements-page";

// Shared components
import { ScopeSelector } from "@/components/shared/scope-selector";
import { KeyboardShortcutsDialog } from "@/components/shared/keyboard-shortcuts-dialog";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

// Icons for coming-soon pages
import {
  TreePine, Users, GraduationCap, ShieldCheck, CalendarCheck,
  DollarSign, FileText, Megaphone,
  BarChart3, ClipboardList, Clock,
} from "lucide-react";

const pageTitles: Record<PageId, string> = {
  login: "Sign In",
  "reset-password": "Reset Password",
  "access-pending": "Access Pending",
  "city-head-dashboard": "Dashboard",
  "admin-dashboard": "Dashboard",
  "admin-cities": "Cities",
  "admin-parks": "Parks",
  "admin-batches": "Batches",
  "admin-groups": "Groups",
  "admin-people": "People",
  "admin-students": "Students",
  "admin-guardians": "Guardians",
  "admin-attendance-events": "Attendance Events",
  "admin-settings": "Settings",
  "admin-users": "Users",
  "admin-access": "Access Provisioning",
  "admin-admissions": "Admissions",
  "admin-fees": "Fees",
  "admin-announcements": "Announcements",
  "admin-reports": "Reports",
  "admin-audit-log": "Audit Log",
  "murabbi-dashboard": "Dashboard",
  "park-dashboard": "Dashboard",
  "park-attendance": "Attendance",
  "park-attendance-roster": "Mark Attendance",
  "park-roster": "Roster",
  "park-participants": "Participants",
  "park-guardians": "Families",
  "park-schedule": "Schedule",
  "guardian-dashboard": "Dashboard",
  "guardian-history": "History",
  "guardian-schedule": "Schedule",
  "guardian-announcements": "Announcements",
  "student-dashboard": "Dashboard",
  "student-history": "History",
  "student-schedule": "Schedule",
  "student-announcements": "Announcements",
};

const comingSoonConfig: Record<string, { icon: typeof TreePine; module: string; phase: string; description: string }> = {
  "admin-students": { icon: GraduationCap, module: "Students", phase: "phase-4", description: "Student profiles, academic progress tracking, and batch assignments." },
  "admin-guardians": { icon: ShieldCheck, module: "Guardians", phase: "phase-4", description: "Guardian profiles, family linking, and contact management." },
  "admin-admissions": { icon: FileText, module: "Admissions", phase: "phase-4", description: "Student admission workflow, form management, and approval pipeline." },
  "admin-fees": { icon: DollarSign, module: "Fee Management", phase: "phase-4", description: "Fee collection, payment tracking, installments, and financial reports." },
  
  "park-participants": { icon: GraduationCap, module: "Participants", phase: "phase-3", description: "Participant profiles, contact info, and group assignments." },
  "park-guardians": { icon: ShieldCheck, module: "Families", phase: "phase-3", description: "Family contacts and guardian-linked participant views." },
  "park-schedule": { icon: Clock, module: "Schedule", phase: "phase-3", description: "Weekly schedule view and session planning for your park." },
  "guardian-schedule": { icon: Clock, module: "Schedule", phase: "phase-3", description: "View upcoming sessions and schedules for your children." },
  "student-schedule": { icon: Clock, module: "Schedule", phase: "phase-3", description: "View your upcoming sessions and batch schedule." },
};

function ComingSoonPage({ pageId }: { pageId: PageId }) {
  const config = comingSoonConfig[pageId];
  const Icon = config?.icon || Construction;
  return (
    <EmptyState
      icon={Icon}
      title={config?.module || "Coming Soon"}
      description={config?.description || "This module is under development."}
      isComingSoon
      moduleName={config?.module}
      modulePhase={config?.phase || "phase-2"}
      targetPage="admin-dashboard"
    />
  );
}

function PageContent({ pageId }: { pageId: PageId }) {
  switch (pageId) {
    // Built pages
    case "city-head-dashboard":
      return <CityHeadDashboard />;
    case "admin-dashboard":
      return <AdminDashboard />;
    case "admin-cities":
      return <CitiesPage />;
    case "admin-parks":
      return <ParksPage />;
    case "admin-batches":
      return <BatchesPage />;
    case "admin-groups":
      return <GroupsPage />;
    case "admin-users":
      return <UsersPage />;
    case "admin-access":
      return <AccessProvisioningPage />;
    case "admin-audit-log":
      return <AuditLogPage />;
    case "admin-settings":
      return <SettingsPage />;
    case "admin-attendance-events":
      return <AdminAttendanceEvents />;
    case "admin-people":
      return <PeoplePage />;
    case "admin-announcements":
      return <AnnouncementsPage />;
    case "admin-reports":
      return <ReportsPage />;
    case "murabbi-dashboard":
      return <MurabbiDashboard />;
    case "park-dashboard":
      return <ParkDashboard />;
    case "park-attendance":
      return <ParkAttendancePage />;
    case "park-attendance-roster":
      return <AttendanceRoster />;
    case "park-roster":
      return <ParkRosterPage />;
    case "guardian-dashboard":
      return <GuardianDashboard />;
    case "guardian-history":
      return <GuardianHistoryPage />;
    case "guardian-announcements":
      return <GuardianAnnouncementsPage />;
    case "student-dashboard":
      return <StudentDashboard />;
    case "student-history":
      return <StudentHistoryPage />;
    case "student-announcements":
      return <StudentAnnouncementsPage />;

    // Everything else: coming soon
    default:
      return <ComingSoonPage pageId={pageId} />;
  }
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { currentPage, navigateTo } = useAppStore();
  const { data: session } = useSession();

  // Keyboard shortcuts
  useKeyboardShortcuts();

  // Close mobile sidebar on Escape
  useEffect(() => {
    function handleEscape() {
      setMobileOpen(false);
    }
    document.addEventListener("shortcut:escape", handleEscape);
    return () => document.removeEventListener("shortcut:escape", handleEscape);
  }, []);
  const user = session?.user as {
    name?: string;
    email?: string;
    role?: string;
  } | undefined;

  const pageTitle = pageTitles[currentPage] || "Dashboard";
  const showPageHeader = !["admin-dashboard", "city-head-dashboard", "murabbi-dashboard", "park-dashboard", "park-attendance-roster", "park-roster", "guardian-dashboard", "guardian-history", "guardian-announcements", "student-dashboard", "student-history", "student-announcements", "admin-cities", "admin-parks", "admin-batches", "admin-groups", "admin-users", "admin-access", "admin-audit-log", "admin-settings", "admin-attendance-events", "admin-people", "admin-announcements", "admin-reports"].includes(currentPage);

  // Show scope selector on admin pages (not dashboard, settings, or audit-log)
  const showScopeSelector = currentPage.startsWith("admin-") && !(["admin-dashboard", "admin-settings", "admin-audit-log", "admin-people", "admin-announcements", "admin-access"] as const).includes(currentPage as any);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card px-4 shrink-0">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>

          {/* Page title on mobile */}
          <h2 className="lg:hidden text-sm font-medium truncate">
            {pageTitle}
          </h2>

          {/* Spacer */}
          <div className="flex-1 hidden lg:block" />

          {/* Notification bell */}
          <NotificationBell />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-2 h-9"
              >
                <div className="flex items-center justify-center size-7 rounded-full bg-[#F3ECF6] dark:bg-[#1F086080]">
                  <User className="size-3.5 text-[#4B0A8F] dark:text-[#8A40B0]" />
                </div>
                <div className="hidden sm:flex flex-col items-start text-left">
                  <span className="text-xs font-medium leading-tight truncate max-w-[120px]">
                    {user?.name || "User"}
                  </span>
                  <span className="text-[10px] text-muted-foreground capitalize leading-tight">
                    {user?.role?.replace(/_/g, " ") || ""}
                  </span>
                </div>
                <ChevronDown className="size-3 text-muted-foreground hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigateTo("admin-settings")}
                className="cursor-pointer"
              >
                <Settings className="size-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-red-600 focus:text-red-600 cursor-pointer"
              >
                <LogOut className="size-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Keyboard shortcuts dialog */}
        <KeyboardShortcutsDialog />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 space-y-4">
            {showScopeSelector && <ScopeSelector />}
            {showPageHeader && <PageHeader title={pageTitle} />}
            {!showPageHeader && !showScopeSelector && <div className="mb-6" />}
            <PageContent pageId={currentPage} />
          </div>
        </main>
      </div>
    </div>
  );
}