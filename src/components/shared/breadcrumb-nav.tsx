"use client";

import { useSession } from "next-auth/react";
import { useAppStore, type PageId } from "@/stores/useAppStore";
import { ChevronRight } from "lucide-react";

// ─── Section mapping: pageId → { section display name, optional clickable section page } ───

interface BreadcrumbSection {
  section: string;
  /** If set, clicking the section crumb navigates here */
  sectionPage: PageId | null;
}

const pageSectionMap: Partial<Record<PageId, BreadcrumbSection>> = {
  // Admin – Organization
  "admin-cities": { section: "Organization", sectionPage: null },
  "admin-parks": { section: "Organization", sectionPage: null },
  "admin-batches": { section: "Organization", sectionPage: null },
  "admin-groups": { section: "Organization", sectionPage: null },

  // Admin – People
  "admin-people": { section: "People", sectionPage: null },
  "admin-students": { section: "People", sectionPage: null },
  "admin-guardians": { section: "People", sectionPage: null },

  // Admin – Operations
  "admin-attendance-events": { section: "Operations", sectionPage: null },
  "admin-users": { section: "Operations", sectionPage: null },
  "admin-access": { section: "Operations", sectionPage: null },
  "admin-admissions": { section: "Operations", sectionPage: null },
  "admin-fees": { section: "Operations", sectionPage: null },

  // Admin – Communication
  "admin-announcements": { section: "Communication", sectionPage: null },
  "admin-reports": { section: "Communication", sectionPage: null },

  // Admin – System
  "admin-audit-log": { section: "System", sectionPage: null },
  "admin-access-management": { section: "System", sectionPage: null },
  "admin-collaboration-teams": { section: "System", sectionPage: null },
  "admin-settings": { section: "System", sectionPage: null },

  // Park – Daily
  "park-attendance": { section: "Daily", sectionPage: null },
  "park-roster": { section: "Daily", sectionPage: null },

  // Park – Attendance (sub-page)
  "park-attendance-roster": { section: "Attendance", sectionPage: "park-attendance" },

  // Park – Directory
  "park-participants": { section: "Directory", sectionPage: null },
  "park-guardians": { section: "Directory", sectionPage: null },
  "park-schedule": { section: "Directory", sectionPage: null },

  // Guardian – Tracking
  "guardian-history": { section: "Tracking", sectionPage: null },
  "guardian-schedule": { section: "Tracking", sectionPage: null },

  // Guardian – Updates
  "guardian-announcements": { section: "Updates", sectionPage: null },

  // Student – Tracking
  "student-history": { section: "Tracking", sectionPage: null },
  "student-schedule": { section: "Tracking", sectionPage: null },

  // Student – Updates
  "student-announcements": { section: "Updates", sectionPage: null },
};

// ─── Page titles (same as app-shell but we avoid a circular import) ───

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
  "admin-access-management": "Access Management",
  "admin-collaboration-teams": "Collaboration Teams",
  "admin-admissions": "Admissions",
  "admin-fees": "Fees",
  "admin-announcements": "Announcements",
  "admin-reports": "Reports",
  "admin-audit-log": "Audit Log",
  notifications: "Notifications",
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
  "guardian-fees": "Fees",
  "student-dashboard": "Dashboard",
  "student-history": "History",
  "student-schedule": "Schedule",
  "student-announcements": "Announcements",
  "student-fees": "Fees",
  "student-profile": "Profile",
};

// ─── Dashboard page per role ───

function getDashboardPage(role: string | undefined): PageId {
  if (!role) return "login" as PageId;
  switch (role) {
    case "super_admin":
    case "program_admin":
      return "admin-dashboard";
    case "city_head":
      return "city-head-dashboard";
    case "park_admin":
    case "park_lead":
      return "park-dashboard";
    case "murabbi":
      return "murabbi-dashboard";
    case "guardian":
      return "guardian-dashboard";
    case "student":
      return "student-dashboard";
    default:
      return "login" as PageId;
  }
}

// ─── Component ───

export function BreadcrumbNav() {
  const { currentPage, navigateTo } = useAppStore();
  const { data: session } = useSession();
  const user = session?.user as { role?: string; name?: string; email?: string } | undefined;

  const dashboardPage = getDashboardPage(user?.role);

  // Don't show breadcrumb on auth pages or dashboard pages
  const isAuthPage = ["login", "reset-password", "access-pending"].includes(currentPage);
  const isDashboardPage = currentPage === dashboardPage;
  if (isAuthPage || isDashboardPage) return null;

  const sectionInfo = pageSectionMap[currentPage];
  if (!sectionInfo) return null;

  const currentPageTitle = pageTitles[currentPage] || "Page";

  // Build crumb items
  const crumbs: { label: string; page: PageId | null; isCurrent: boolean }[] = [
    { label: "Dashboard", page: dashboardPage, isCurrent: false },
  ];

  // If the section page differs from the current page, add a section crumb
  if (sectionInfo.sectionPage && sectionInfo.sectionPage !== currentPage) {
    crumbs.push({
      label: sectionInfo.section,
      page: sectionInfo.sectionPage,
      isCurrent: false,
    });
  } else {
    // Section label is just decorative (non-clickable)
    crumbs.push({
      label: sectionInfo.section,
      page: null,
      isCurrent: false,
    });
  }

  // Current page
  crumbs.push({ label: currentPageTitle, page: null, isCurrent: true });

  return (
    <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-1 text-sm min-w-0">
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;

        return (
          <span key={idx} className="flex items-center gap-1">
            {idx > 0 && (
              <ChevronRight className="size-3.5 text-muted-foreground/50 shrink-0" />
            )}
            {crumb.isCurrent || !crumb.page ? (
              <span
                className={crumb.isCurrent ? "text-foreground font-medium truncate" : "text-muted-foreground truncate"}
                aria-current={crumb.isCurrent ? "page" : undefined}
              >
                {crumb.label}
              </span>
            ) : (
              <button
                onClick={() => navigateTo(crumb.page!)}
                className="text-muted-foreground hover:text-foreground transition-colors truncate"
              >
                {crumb.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
