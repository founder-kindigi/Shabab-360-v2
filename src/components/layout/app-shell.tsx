"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useAppStore, type PageId } from "@/stores/useAppStore";
import { Sidebar } from "@/components/layout/sidebar";
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
import { Menu, LogOut, User, ChevronDown, Construction } from "lucide-react";

// Page components
import { AdminDashboard } from "@/components/modules/admin/admin-dashboard";
import { CitiesPage } from "@/components/modules/admin/cities-page";
import { ParkDashboard } from "@/components/modules/park/park-dashboard";
import { GuardianDashboard } from "@/components/modules/guardian/guardian-dashboard";
import { StudentDashboard } from "@/components/modules/student/student-dashboard";

// Icons for coming-soon pages
import {
  TreePine, Users, GraduationCap, ShieldCheck, CalendarCheck,
  Settings, UserCog, DollarSign, FileText, Megaphone,
  BarChart3, ScrollText, ClipboardList, Clock,
} from "lucide-react";

const pageTitles: Record<PageId, string> = {
  login: "Sign In",
  "reset-password": "Reset Password",
  "access-pending": "Access Pending",
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
  "admin-admissions": "Admissions",
  "admin-fees": "Fees",
  "admin-announcements": "Announcements",
  "admin-reports": "Reports",
  "admin-audit-log": "Audit Log",
  "park-dashboard": "Dashboard",
  "park-attendance": "Attendance",
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

const comingSoonIcons: Record<string, typeof TreePine> = {
  "admin-parks": TreePine,
  "admin-batches": CalendarCheck,
  "admin-groups": Users,
  "admin-people": Users,
  "admin-students": GraduationCap,
  "admin-guardians": ShieldCheck,
  "admin-attendance-events": CalendarCheck,
  "admin-settings": Settings,
  "admin-users": UserCog,
  "admin-admissions": FileText,
  "admin-fees": DollarSign,
  "admin-announcements": Megaphone,
  "admin-reports": BarChart3,
  "admin-audit-log": ScrollText,
  "park-attendance": CalendarCheck,
  "park-roster": ClipboardList,
  "park-participants": GraduationCap,
  "park-guardians": ShieldCheck,
  "park-schedule": Clock,
  "guardian-history": ClipboardList,
  "guardian-schedule": Clock,
  "guardian-announcements": Megaphone,
  "student-history": ClipboardList,
  "student-schedule": Clock,
  "student-announcements": Megaphone,
};

function ComingSoonPage({ pageId }: { pageId: PageId }) {
  const Icon = comingSoonIcons[pageId] || Construction;
  return (
    <EmptyState
      icon={Icon}
      title="Coming Soon"
      description="This module is under development. Check back later for updates."
    />
  );
}

function PageContent({ pageId }: { pageId: PageId }) {
  switch (pageId) {
    // Built pages
    case "admin-dashboard":
      return <AdminDashboard />;
    case "admin-cities":
      return <CitiesPage />;
    case "park-dashboard":
      return <ParkDashboard />;
    case "guardian-dashboard":
      return <GuardianDashboard />;
    case "student-dashboard":
      return <StudentDashboard />;

    // Everything else: coming soon
    default:
      return <ComingSoonPage pageId={pageId} />;
  }
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

  const pageTitle = pageTitles[currentPage] || "Dashboard";
  const showPageHeader = !["admin-dashboard", "park-dashboard", "guardian-dashboard", "student-dashboard", "admin-cities"].includes(currentPage);

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

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-2 h-9"
              >
                <div className="flex items-center justify-center size-7 rounded-full bg-emerald-100 dark:bg-emerald-950">
                  <User className="size-3.5 text-emerald-700 dark:text-emerald-400" />
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
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-red-600 focus:text-red-600 cursor-pointer"
              >
                <LogOut className="size-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">
            {showPageHeader && <PageHeader title={pageTitle} />}
            {!showPageHeader && <div className="mb-6" />}
            <PageContent pageId={currentPage} />
          </div>
        </main>
      </div>
    </div>
  );
}