import { resolveActorCity } from "@/lib/auth/events-scope";
import { userHasCapability } from "@/lib/auth/capability-access";
import type { SessionUser } from "@/lib/auth/scope";
import type { AccessCapability } from "@/lib/auth/capabilities";
import { db } from "@/lib/db";
import { ACTIVE_MEMBERSHIP_FILTER } from "@/lib/collaboration-teams/schemas";

type WorkspaceCapability = Extract<
  AccessCapability,
  "teams.workspace.view" | "teams.workspace.manage"
>;

export type TeamWorkspaceAccess =
  | { ok: true; teamId: string; cityId: string; staffMetaId: string }
  | { ok: false; status: 401 | 403 | 404; error: string };

/**
 * Resolves all workspace authority from database state. A team membership is
 * an additional predicate; it never broadens the actor's normal city scope.
 */
export async function requireTeamWorkspaceAccess(
  user: SessionUser,
  teamId: string,
  capability: WorkspaceCapability
): Promise<TeamWorkspaceAccess> {
  if (!user.id) return { ok: false, status: 401, error: "Unauthorized" };

  const [team, hasCapability, staffMeta] = await Promise.all([
    db.collaborationTeam.findUnique({
      where: { id: teamId },
      select: { id: true, cityId: true, isActive: true },
    }),
    userHasCapability(user, capability),
    db.staffMeta.findUnique({
      where: { userId: user.id },
      select: { id: true, isActive: true },
    }),
  ]);

  if (!team || !team.isActive) return { ok: false, status: 404, error: "Team not found" };
  if (!hasCapability) return { ok: false, status: 403, error: "Forbidden" };
  if (!staffMeta?.isActive) return { ok: false, status: 403, error: "Forbidden" };

  const city = await resolveActorCity(user, team.cityId);
  if ("error" in city) return { ok: false, status: 403, error: "Forbidden" };

  const membership = await db.staffTeamMembership.findFirst({
    where: { teamId: team.id, staffMetaId: staffMeta.id, ...ACTIVE_MEMBERSHIP_FILTER },
    select: { id: true },
  });
  if (!membership) return { ok: false, status: 403, error: "Forbidden" };

  return { ok: true, teamId: team.id, cityId: team.cityId, staffMetaId: staffMeta.id };
}
