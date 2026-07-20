import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/scope";
import {
  isUserRole,
  resolveEffectiveCapability,
  type AccessCapability,
} from "@/lib/auth/capabilities";

/**
 * Resolves current module access from fixed defaults plus active exceptions.
 * Any database failure denies access rather than falling back to a broader
 * role grant. Resource-scope authorization remains a separate required step.
 */
export async function userHasCapability(
  user: SessionUser,
  capability: AccessCapability,
  now = new Date()
): Promise<boolean> {
  if (!user.id || !isUserRole(user.role)) return false;

  try {
    const [roleOverride, userOverride] = await Promise.all([
      db.roleCapabilityOverride.findUnique({
        where: { role_capability: { role: user.role, capability } },
        select: { effect: true },
      }),
      db.userCapabilityOverride.findUnique({
        where: { userId_capability: { userId: user.id, capability } },
        select: { effect: true, isActive: true, expiresAt: true },
      }),
    ]);

    return resolveEffectiveCapability(
      user.role,
      capability,
      roleOverride?.effect,
      userOverride,
      now
    );
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      event: "capability_access_check_failed",
      errorType: error instanceof Error ? error.name : "UnknownError",
      timestamp: new Date().toISOString(),
    }));
    return false;
  }
}
