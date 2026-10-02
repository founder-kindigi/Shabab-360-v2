import type { AccessCapability } from "./capabilities";
const screenCapabilities: Record<string, AccessCapability[]> = {
  attendance: ["attendance.mark"],
  parks: ["organisation.view"], "park-detail": ["organisation.view"], inventory: ["organisation.view"], evaluation: ["students.manage"], analysis: ["reports.view"], admissions: ["admissions.manage"], calling: ["calling.view"], mashwara: ["mashwara.view"], fees: ["fees.manage"], gamification: ["students.manage"], certificates: ["reports.view"], "content-planner": ["content.view"], sync: ["attendance.mark"], events: ["events.view"], "knowledge-base": ["content.view"], procurement: ["organisation.view"], "security-access": ["access.role_defaults.manage"], "portal-import": ["admissions.manage"], alumni: ["students.manage"], teams: ["organisation.view"], "custom-reports": ["reports.view"], "staff-directory": ["people.view"], "audit-log": ["audit.view"], "student-profile": ["students.profile.view", "students.manage"],
};
export function canOpenScreen(screen: string, role: string, has: (capability: AccessCapability) => boolean) {
  if (!["super_admin", "program_admin", "city_head", "park_lead", "park_admin", "murabbi", "muawin", "student", "guardian"].includes(role)) return false;
  if (screen === "home") return has("dashboard.view");
  if (["home", "info", "more", "login", "splash", "notifications", "community", "islah"].includes(screen)) return true;
  // The scoped Park workspace is only for the park roles that own it, and only
  // when the dashboard capability is actually granted. It grants no wider scope:
  // every API behind it stays server-scoped to the assignment.
  if (screen === "park-workspace") return (role === "park_lead" || role === "park_admin") && has("dashboard.view");
  if ((role === "guardian" || role === "student") && screen === "fees") return true;
  return Boolean(screenCapabilities[screen]?.some(has));
}
