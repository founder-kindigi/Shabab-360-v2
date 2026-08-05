/**
 * Collaboration Teams Membership & Badge Helper
 * Teams: Sports, Skills, Tadreeb, Media, Muawin
 */

export const COLLABORATION_TEAM_CODES = [
  "sports",
  "skills",
  "tadreeb",
  "media",
  "muawin",
] as const;

export type CollaborationTeamCode = (typeof COLLABORATION_TEAM_CODES)[number];

export const COLLABORATION_TEAM_META: Record<
  CollaborationTeamCode,
  { name: string; description: string; badgeColor: string }
> = {
  sports: {
    name: "Sports & Physical Fitness",
    description: "Athletics, tournaments, and physical conditioning programs",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300",
  },
  skills: {
    name: "Life Skills & Leadership",
    description: "Personal development, communication, and time management",
    badgeColor: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border-sky-300",
  },
  tadreeb: {
    name: "Tadreeb & Tarbiyah",
    description: "Islamic character building, mentoring, and ethics",
    badgeColor: "bg-purple-100 text-[#4B0A8F] dark:bg-purple-950/40 dark:text-purple-300 border-purple-300",
  },
  media: {
    name: "Media & Communications",
    description: "Content creation, photography, and event coverage",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300",
  },
  muawin: {
    name: "Muawin Support Team",
    description: "Operational support, logistics, and volunteer coordination",
    badgeColor: "bg-[#D90429]/10 text-[#D90429] dark:bg-rose-950/40 dark:text-rose-300 border-rose-300",
  },
};

export function isCollaborationTeamCode(code: string): code is CollaborationTeamCode {
  return COLLABORATION_TEAM_CODES.includes(code.toLowerCase() as CollaborationTeamCode);
}

export function getCollaborationTeamMeta(code: string) {
  const normalized = code.toLowerCase() as CollaborationTeamCode;
  if (isCollaborationTeamCode(normalized)) {
    return COLLABORATION_TEAM_META[normalized];
  }
  return {
    name: code,
    description: "Operational Collaboration Team",
    badgeColor: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300",
  };
}

export function canManageTeamMemberships(role?: string | null): boolean {
  if (!role) return false;
  return role === "super_admin" || role === "program_admin" || role === "city_head";
}
