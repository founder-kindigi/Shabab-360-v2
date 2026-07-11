"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
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
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";

// Page components
import { AdminDashboard } from "@/components/modules/admin/admin-dashboard";
import { CitiesPage } from "@/components/modules/admin/cities-page";
import { BatchesPage } from "@/components/modules/admin/batches-page";
import { GroupsPage } from "@/components/modules/admin/groups-page";
import { ParksPage } from "@/components/modules/admin/parks-page";
import { UsersPage } from "@/components/modules/admin/users-page";
import { AuditLogPage } from "@/components/modules/admin/audit-log-page";
import { PeoplePage } from "@/components/modules/admin/people-page";
import { StudentsPage } from "@/components/modules/admin/students-page";
import { GuardiansPage } from "@/components/modules/admin/guardians-page";
import { AdminAttendanceEvents } from "@/components/modules/admin/admin-attendance-events";
import { AnnouncementsPage } from "@/components/modules/admin/announcements-page";
import { SettingsPage } from "@/components/modules/admin/settings-page";
import { ReportsPage } from "@/components/modules/admin/reports-page";
import { AccessProvisioningPage } from "@/components/modules/admin/access-provisioning-page";
import { FeesPage } from "@/components/modules/admin/fees-page";
import { MurabbiDashboard } from "@/components/modules/murabbi/murabbi-dashboard";
import { MurabbiGroupsPage } from "@/components/modules/murabbi/murabbi-groups-page";
import { ParkDashboard } from "@/components/modules/park/park-dashboard";
import { ParkAttendancePage } from "@/components/modules/park/park-attendance-page";
import { ParkRosterPage } from "@/components/modules/park/park-roster-page";
import { ParkParticipantsPage } from "@/components/modules/park/park-participants-page";
import { ParkGuardiansPage } from "@/components/modules/park/park-guardians-page";
import { AttendanceRoster } from "@/components/modules/park/attendance-roster";
import { GuardianDashboard } from "@/components/modules/guardian/guardian-dashboard";
import { GuardianHistoryPage } from "@/components/modules/guardian/guardian-history-page";
import { GuardianAnnouncementsPage } from "@/components/modules/guardian/guardian-announcements-page";
import { CityHeadDashboard } from "@/components/modules/city-head/city-head-dashboard";
import { StudentDashboard } from "@/components/modules/student/student-dashboard";
import { StudentHistoryPage } from "@/components/modules/student/student-history-page";
import { StudentAnnouncementsPage } from "@/components/modules/student/student-announcements-page";
import { ParkSchedulePage } from "@/components/modules/park/park-schedule-page";
import { GuardianSchedulePage } from "@/components/modules/guardian/guardian-schedule-page";
import { StudentSchedulePage } from "@/components/modules/student/student-schedule-page";
import { StudentFeesPage } from "@/components/modules/student/student-fees-page";
import { StudentProfilePage } from "@/components/modules/student/student-profile-page";
import { GuardianFeesPage } from "@/components/modules/guardian/guardian-fees-page";
import { AdmissionsPage } from "@/components/modules/admin/admissions-page";

// Shared components
import { ScopeSelector } from "@/components/shared/scope-selector";
import { BottomNav } from "@/components/shared/bottom-nav";
import { KeyboardShortcutsDialog } from "@/components/shared/keyboard-shortcuts-dialog";
import {
  CommandPalette,
  CommandPaletteTrigger,
  CommandPaletteMobileTrigger,
} from "@/components/shared/command-palette";
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
  "murabbi-groups": "My Groups",
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
  "student-fees": "Fees",
  "student-profile": "My Profile",
  "guardian-fees": "Fees",
};

const comingSoonConfig: Record<string, { icon: typeof TreePine; module: string; phase: string; description: string }> = {
  // All pages built — no coming-soon pages remaining
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
    case "admin-students":
      return <StudentsPage />;
    case "admin-guardians":
      return <GuardiansPage />;
    case "admin-admissions":
      return <AdmissionsPage />;
    case "admin-fees":
      return <FeesPage />;
    case "murabbi-dashboard":
      return <MurabbiDashboard />;
    case "murabbi-groups":
      return <MurabbiGroupsPage />;
    case "park-dashboard":
      return <ParkDashboard />;
    case "park-attendance":
      return <ParkAttendancePage />;
    case "park-attendance-roster":
      return <AttendanceRoster />;
    case "park-roster":
      return <ParkRosterPage />;
    case "park-participants":
      return <ParkParticipantsPage />;
    case "park-guardians":
      return <ParkGuardiansPage />;
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
    case "park-schedule":
      return <ParkSchedulePage />;
    case "guardian-schedule":
      return <GuardianSchedulePage />;
    case "student-schedule":
      return <StudentSchedulePage />;
    case "student-fees":
      return <StudentFeesPage />;
    case "student-profile":
      return <StudentProfilePage />;
    case "guardian-fees":
      return <GuardianFeesPage />;

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

  // Real-time notifications (WebSocket)
  useRealtimeNotifications();

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
  const showPageHeader = !["admin-dashboard", "city-head-dashboard", "murabbi-dashboard", "park-dashboard", "park-attendance-roster", "park-roster", "park-participants", "park-guardians", "park-schedule", "guardian-dashboard", "guardian-history", "guardian-announcements", "guardian-schedule", "guardian-fees", "student-dashboard", "student-history", "student-announcements", "student-schedule", "student-fees", "student-profile", "admin-cities", "admin-parks", "admin-batches", "admin-groups", "admin-users", "admin-access", "admin-audit-log", "admin-settings", "admin-attendance-events", "admin-people", "admin-announcements", "admin-reports", "admin-students", "admin-guardians", "admin-fees"].includes(currentPage);

  // Show scope selector on admin pages (not dashboard, settings, or audit-log)
  const showScopeSelector = currentPage.startsWith("admin-") && !(["admin-dashboard", "admin-settings", "admin-audit-log", "admin-people", "admin-announcements", "admin-access", "admin-students", "admin-guardians", "admin-fees", "admin-admissions"] as const).includes(currentPage as any);

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

          {/* Search — desktop: full bar, mobile: icon only */}
          <div className="hidden sm:block">
            <CommandPaletteTrigger />
          </div>
          <div className="sm:hidden">
            <CommandPaletteMobileTrigger />
          </div>

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

        {/* Command palette */}
        <CommandPalette />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="p-4 md:p-6 space-y-4">
            {showScopeSelector && <ScopeSelector />}
            {showPageHeader && <PageHeader title={pageTitle} />}
            {!showPageHeader && !showScopeSelector && <div className="mb-6" />}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <PageContent pageId={currentPage} />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <BottomNav />
      </div>
    </div>
  );
}