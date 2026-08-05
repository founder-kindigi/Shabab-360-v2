"use client";

import { lazy, Suspense, useEffect, useState } from "react";
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
import { Menu, LogOut, User, ChevronDown, Construction, Settings, Sun, Moon, Search } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { useNotificationPolling } from "@/hooks/use-realtime-notifications";

// ── Lazy-loaded page components (code splitting) ──────────────────────
const AdminDashboard = lazy(() => import("@/components/modules/admin/admin-dashboard").then(m => ({ default: m.AdminDashboard })));
const CitiesPage = lazy(() => import("@/components/modules/admin/cities-page").then(m => ({ default: m.CitiesPage })));
const BatchesPage = lazy(() => import("@/components/modules/admin/batches-page").then(m => ({ default: m.BatchesPage })));
const GroupsPage = lazy(() => import("@/components/modules/admin/groups-page").then(m => ({ default: m.GroupsPage })));
const ParksPage = lazy(() => import("@/components/modules/admin/parks-page").then(m => ({ default: m.ParksPage })));
const UsersPage = lazy(() => import("@/components/modules/admin/users-page").then(m => ({ default: m.UsersPage })));
const AuditLogPage = lazy(() => import("@/components/modules/admin/audit-log-page").then(m => ({ default: m.AuditLogPage })));
const PeoplePage = lazy(() => import("@/components/modules/admin/people-page").then(m => ({ default: m.PeoplePage })));
const StudentsPage = lazy(() => import("@/components/modules/admin/students-page").then(m => ({ default: m.StudentsPage })));
const GuardiansPage = lazy(() => import("@/components/modules/admin/guardians-page").then(m => ({ default: m.GuardiansPage })));
const AdminAttendanceEvents = lazy(() => import("@/components/modules/admin/admin-attendance-events").then(m => ({ default: m.AdminAttendanceEvents })));
const AnnouncementsPage = lazy(() => import("@/components/modules/admin/announcements-page").then(m => ({ default: m.AnnouncementsPage })));
const SettingsPage = lazy(() => import("@/components/modules/admin/settings-page").then(m => ({ default: m.SettingsPage })));
const ReportsPage = lazy(() => import("@/components/modules/admin/reports-page").then(m => ({ default: m.ReportsPage })));
const AccessProvisioningPage = lazy(() => import("@/components/modules/admin/access-provisioning-page").then(m => ({ default: m.AccessProvisioningPage })));
const AccessManagementPage = lazy(() => import("@/components/modules/admin/access-management-page").then(m => ({ default: m.AccessManagementPage })));
const CollaborationTeamsPage = lazy(() => import("@/components/modules/admin/collaboration-teams-page").then(m => ({ default: m.CollaborationTeamsPage })));
const MashwaraPage = lazy(() => import("@/app/admin/mashwara/page").then(m => ({ default: m.default })));
const MashwaraDetailPage = lazy(() => import("@/app/admin/mashwara/[id]/page").then(m => ({ default: m.default })));
const CallingPage = lazy(() => import("@/app/admin/calling/page").then(m => ({ default: m.default })));
const EventsPage = lazy(() => import("@/app/admin/events/page").then(m => ({ default: m.default })));
const FeesPage = lazy(() => import("@/components/modules/admin/fees-page").then(m => ({ default: m.FeesPage })));
const NotificationsPage = lazy(() => import("@/components/modules/admin/notifications-page").then(m => ({ default: m.NotificationsPage })));
const AdmissionsPage = lazy(() => import("@/components/modules/admin/admissions-page").then(m => ({ default: m.AdmissionsPage })));
const ContentPlannerPage = lazy(() => import("@/components/modules/admin/content-planner-page").then(m => ({ default: m.ContentPlannerPage })));
const MurabbiDashboard = lazy(() => import("@/components/modules/murabbi/murabbi-dashboard").then(m => ({ default: m.MurabbiDashboard })));
const MurabbiGroupsPage = lazy(() => import("@/components/modules/murabbi/murabbi-groups-page").then(m => ({ default: m.MurabbiGroupsPage })));
const ParkDashboard = lazy(() => import("@/components/modules/park/park-dashboard").then(m => ({ default: m.ParkDashboard })));
const ParkAttendancePage = lazy(() => import("@/components/modules/park/park-attendance-page").then(m => ({ default: m.ParkAttendancePage })));
const AttendanceRoster = lazy(() => import("@/components/modules/park/attendance-roster").then(m => ({ default: m.AttendanceRoster })));
const ParkRosterPage = lazy(() => import("@/components/modules/park/park-roster-page").then(m => ({ default: m.ParkRosterPage })));
const ParkParticipantsPage = lazy(() => import("@/components/modules/park/park-participants-page").then(m => ({ default: m.ParkParticipantsPage })));
const ParkGuardiansPage = lazy(() => import("@/components/modules/park/park-guardians-page").then(m => ({ default: m.ParkGuardiansPage })));
const ParkSchedulePage = lazy(() => import("@/components/modules/park/park-schedule-page").then(m => ({ default: m.ParkSchedulePage })));
const GuardianDashboard = lazy(() => import("@/components/modules/guardian/guardian-dashboard").then(m => ({ default: m.GuardianDashboard })));
const GuardianHistoryPage = lazy(() => import("@/components/modules/guardian/guardian-history-page").then(m => ({ default: m.GuardianHistoryPage })));
const GuardianAnnouncementsPage = lazy(() => import("@/components/modules/guardian/guardian-announcements-page").then(m => ({ default: m.GuardianAnnouncementsPage })));
const GuardianSchedulePage = lazy(() => import("@/components/modules/guardian/guardian-schedule-page").then(m => ({ default: m.GuardianSchedulePage })));
const GuardianFeesPage = lazy(() => import("@/components/modules/guardian/guardian-fees-page").then(m => ({ default: m.GuardianFeesPage })));
const CityHeadDashboard = lazy(() => import("@/components/modules/city-head/city-head-dashboard").then(m => ({ default: m.CityHeadDashboard })));
const StudentDashboard = lazy(() => import("@/components/modules/student/student-dashboard").then(m => ({ default: m.StudentDashboard })));
const StudentHistoryPage = lazy(() => import("@/components/modules/student/student-history-page").then(m => ({ default: m.StudentHistoryPage })));
const StudentAnnouncementsPage = lazy(() => import("@/components/modules/student/student-announcements-page").then(m => ({ default: m.StudentAnnouncementsPage })));
const StudentSchedulePage = lazy(() => import("@/components/modules/student/student-schedule-page").then(m => ({ default: m.StudentSchedulePage })));
const StudentFeesPage = lazy(() => import("@/components/modules/student/student-fees-page").then(m => ({ default: m.StudentFeesPage })));
const StudentProfilePage = lazy(() => import("@/components/modules/student/student-profile-page").then(m => ({ default: m.StudentProfilePage })));

// Shared components (always loaded — used on every page)
import { ScopeSelector } from "@/components/shared/scope-selector";
import { BreadcrumbNav } from "@/components/shared/breadcrumb-nav";
import { KeyboardShortcutsDialog } from "@/components/shared/keyboard-shortcuts-dialog";
import { CommandPalette } from "@/components/shared/command-palette";
import { OfflineIndicator } from "@/components/shared/offline-indicator";
import { InstallPrompt } from "@/components/shared/install-prompt";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { BottomNav } from "@/components/shared/bottom-nav";
import { OnboardingTour } from "@/components/shared/onboarding-tour";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useOnboarding } from "@/hooks/use-onboarding";

// Icons for coming-soon pages
import {
  TreePine, Users, GraduationCap, ShieldCheck, CalendarCheck,
  DollarSign, FileText, Megaphone,
  BarChart3, ClipboardList, Clock,
} from "lucide-react";

// ── Page loading fallback ─────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 border-2 border-[#4B0A8F] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

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
  "admin-events": "Events",
  "admin-events-detail": "Event Detail",
  "admin-calling": "Calling System",
  "admin-calling-campaign-detail": "Campaign Detail",
  "admin-calling-templates": "Templates",
  "admin-settings": "Settings",
  "admin-users": "Users",
  "admin-access": "Access Provisioning",
  "admin-access-management": "Access Management",
  "admin-collaboration-teams": "Collaboration Teams",
  "admin-mashwara": "Weekly Mashwara",
  "admin-mashwara-detail": "Mashwara Detail",
  "admin-admissions": "Admissions",
  "admin-fees": "Fees",
  "admin-content-planner": "Content Planner",
  "admin-announcements": "Announcements",
  "admin-reports": "Reports",
  "admin-audit-log": "Audit Log",
  "notifications": "Notifications",
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

function isKnownPage(pageId: PageId): boolean {
  const knownPages: PageId[] = [
    "login", "reset-password", "access-pending",
    "city-head-dashboard",
    "admin-dashboard", "admin-cities", "admin-parks", "admin-batches",
    "admin-groups", "admin-people", "admin-students", "admin-guardians",
    "admin-attendance-events", "admin-settings", "admin-users",
    "admin-admissions", "admin-fees", "admin-content-planner", "admin-announcements",
    "admin-events", "admin-events-detail",
    "admin-reports", "admin-audit-log", "admin-access", "admin-access-management", "admin-collaboration-teams", "notifications",
    "admin-mashwara",
    "admin-mashwara-detail",
    "murabbi-dashboard", "murabbi-groups",
    "park-dashboard", "park-attendance", "park-attendance-roster",
    "park-roster", "park-participants", "park-guardians", "park-schedule",
    "guardian-dashboard", "guardian-history", "guardian-schedule",
    "guardian-announcements", "guardian-fees",
    "student-dashboard", "student-history", "student-schedule",
    "student-announcements", "student-fees", "student-profile",
  ];
  return knownPages.includes(pageId);
}

function NotFoundPage() {
  const { navigateTo } = useAppStore();
  return (
    <EmptyState
      icon={Construction}
      title="Page not found"
      description="The page you're looking for doesn't exist or has been moved."
      targetPage={"admin-dashboard" as PageId}
    />
  );
}

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
  return (
    <Suspense fallback={<PageLoader />}>
      <PageContentInner pageId={pageId} />
    </Suspense>
  );
}

function PageContentInner({ pageId }: { pageId: PageId }) {
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
    case "admin-access-management":
      return <AccessManagementPage />;
    case "admin-collaboration-teams":
      return <CollaborationTeamsPage />;
    case "admin-mashwara":
      return <MashwaraPage />;
    case "admin-mashwara-detail":
      return <MashwaraDetailPage />;
    case "admin-calling":
      return <CallingPage />;
    case "admin-audit-log":
      return <AuditLogPage />;
    case "notifications":
      return <NotificationsPage />;
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
    case "admin-content-planner":
      return <ContentPlannerPage />;
    case "admin-events":
      return <EventsPage />;
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

    // 404 — unknown page
    default:
      if (isKnownPage(pageId)) {
        return <ComingSoonPage pageId={pageId} />;
      }
      return <NotFoundPage />;
  }
}

// ─── Theme Toggle ──────────────────────────────────────────────────

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();

  // next-themes returns undefined for resolvedTheme during SSR
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9 text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="size-[18px]" />
      ) : (
        <Moon className="size-[18px]" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { currentPage, navigateTo } = useAppStore();
  const { data: session } = useSession();
  const user = session?.user as {
    name?: string;
    email?: string;
    role?: string;
  } | undefined;
  const userRole = (user?.role as import("@/types").UserRole) || null;

  // Onboarding tour
  const { isActive: tourActive, completeTour, skipTour, steps: tourSteps } = useOnboarding(userRole);

  // Keyboard shortcuts
  useKeyboardShortcuts();

  // Vercel-compatible authenticated notification polling.
  useNotificationPolling();

  // Close mobile sidebar on Escape
  useEffect(() => {
    function handleEscape() {
      setMobileOpen(false);
    }
    document.addEventListener("shortcut:escape", handleEscape);
    return () => document.removeEventListener("shortcut:escape", handleEscape);
  }, []);
  const pageTitle = pageTitles[currentPage] || "Dashboard";
  const showPageHeader = !["admin-dashboard", "city-head-dashboard", "murabbi-dashboard", "park-dashboard", "park-attendance-roster", "park-roster", "park-participants", "park-guardians", "park-schedule", "guardian-dashboard", "guardian-history", "guardian-announcements", "guardian-schedule", "guardian-fees", "student-dashboard", "student-history", "student-announcements", "student-schedule", "student-fees", "student-profile", "admin-cities", "admin-parks", "admin-batches", "admin-groups", "admin-users", "admin-access", "admin-audit-log", "admin-settings", "admin-attendance-events", "admin-people", "admin-announcements", "admin-reports", "admin-students", "admin-guardians", "admin-fees", "admin-admissions", "notifications"].includes(currentPage);

  // Show scope selector on admin pages (not dashboard, settings, or audit-log)
  const showScopeSelector = currentPage.startsWith("admin-") && !(["admin-dashboard", "admin-settings", "admin-audit-log", "admin-people", "admin-announcements", "admin-access", "admin-students", "admin-guardians", "admin-fees", "admin-admissions"] as const).includes(currentPage as any);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Offline indicator banner */}
        <OfflineIndicator />

        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card px-4 flex-none">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden flex-none"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>

          {/* Page title on mobile */}
          <h2 className="lg:hidden text-sm font-medium truncate">
            {pageTitle}
          </h2>

          {/* Breadcrumb (desktop only) */}
          <BreadcrumbNav />

          {/* Spacer */}
          <div className="flex-1 hidden lg:block" />

          {/* Command palette trigger (desktop) */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex size-9 text-muted-foreground"
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))}
          >
            <Search className="size-4" />
            <span className="sr-only">Search pages</span>
          </Button>

          {/* Notification bell */}
          <NotificationBell />

          {/* Theme toggle */}
          <ThemeToggle />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                data-tour="user-menu"
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
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-0">
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
                <ErrorBoundary>
                  <PageContent pageId={currentPage} />
                </ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <BottomNav />
      </div>

      {/* Onboarding Tour Overlay */}
      <OnboardingTour
        steps={tourSteps}
        isActive={tourActive}
        onComplete={completeTour}
        onSkip={skipTour}
      />

      {/* PWA install prompt */}
      <InstallPrompt />
    </div>
  );
}
