"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useAppStore, type PageId } from "@/stores/useAppStore";
import { Sidebar } from "@/components/layout/sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, LogOut, User, ChevronDown } from "lucide-react";

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

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { currentPage } = useAppStore();
  const { data: session } = useSession();
  const user = session?.user as {
    name?: string;
    email?: string;
    role?: string;
  } | undefined;

  const pageTitle = pageTitles[currentPage] || "Dashboard";

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

          {/* Spacer */}
          <div className="flex-1" />

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
          <div className="p-6">
            <PageHeader title={pageTitle} />
            <div className="mt-6 flex items-center justify-center min-h-[40vh]">
              <p className="text-muted-foreground text-sm">
                Module not yet built
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}