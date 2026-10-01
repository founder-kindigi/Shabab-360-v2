import type { AccessCapability } from "./capabilities";
const screenCapabilities: Record<string, AccessCapability[]> = {
  parks: ["organisation.view"], "park-detail": ["organisation.view"], inventory: ["organisation.view"], evaluation: ["students.manage"], analysis: ["reports.view"], admissions: ["admissions.manage"], calling: ["calling.view"], mashwara: ["mashwara.view"], fees: ["fees.manage"], gamification: ["students.manage"], certificates: ["reports.view"], "content-planner": ["content.view"], sync: ["attendance.mark"], events: ["events.view"], "knowledge-base": ["content.view"], procurement: ["organisation.view"], "security-access": ["access.role_defaults.manage"], "portal-import": ["admissions.manage"], alumni: ["students.manage"], teams: ["organisation.view"], "custom-reports": ["reports.view"], "staff-directory": ["people.view"], "audit-log": ["audit.view"], "student-profile": ["students.profile.view", "students.manage"],
};
export function canOpenScreen(screen: string, role: string, has: (capability: AccessCapability) => boolean) {
  if (!["super_admin", "program_admin", "city_head", "park_lead", "park_admin", "murabbi", "student", "guardian"].includes(role)) return false;
  if (screen === "home") return has("dashboard.view");
  if (["home", "info", "more", "login", "splash", "notifications", "community", "islah"].includes(screen)) return true;
  if ((role === "guardian" || role === "student") && screen === "fees") return true;
  return Boolean(screenCapabilities[screen]?.some(has));
}
