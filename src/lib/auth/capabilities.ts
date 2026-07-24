import type { UserRole } from "@/types";

/**
 * Fixed capability catalogue. Values are stored by later schema work, so a
 * capability is never accepted from a free-text request or route name.
 */
export const ACCESS_CAPABILITIES = [
  "dashboard.view",
  "organisation.view",
  "organisation.manage",
  "people.view",
  "students.manage",
  "guardians.manage",
  "admissions.manage",
  "attendance.mark",
  "attendance.correct",
  "fees.manage",
  "announcements.manage",
  "reports.view",
  "audit.view",
  "settings.manage",
  "content.view",
  "content.manage",
  "teams.memberships.manage",
  "teams.workspace.view",
  "teams.workspace.manage",
  "events.view",
  "events.manage",
  "events.responsibilities.manage",
  "calling.view",
  "calling.poc.manage",
  "calling.templates.manage",
  "calling.export.manage",
  "access.role_defaults.manage",
  "access.user_overrides.manage",
  "access.scope.manage",
  "access.city_staff.manage",
  "students.profile.view",
  "students.profile.manage",
  "students.profile.sensitive.view",
  "students.profile.sensitive.manage",
] as const;
