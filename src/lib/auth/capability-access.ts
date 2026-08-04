import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/scope";
import {
  isUserRole,
  resolveEffectiveCapability,
  type AccessCapability,
} from "@/lib/auth/capabilities";

// Short-lived cache: (userId:role:capability) → { result, cachedAt }
// Capability overrides are changed only by Super Admin actions, so a 30-second
// TTL is safe and saves 2 DB queries on every capability-gated API request.
const CAP_CACHE = new Map<string, { result: boolean; cachedAt: number }>();
const CAP_CACHE_TTL_MS = 30_000;
const CAP_CACHE_MAX_ENTRIES = 2_000;

function capCacheKey(userId: string, role: string, capability: string): string {
  return `${userId}:${role}:${capability}`;
}

/**
 * Evict all cache entries for a given user so the next capability check
 * re-fetches from the DB. Call this after writing a user capability override.
 */
export function invalidateCapabilityCache(userId: string): void {
  for (const key of CAP_CACHE.keys()) {
    if (key.startsWith(`${userId}:`)) CAP_CACHE.delete(key);
  }
}

/**
 * Evict all cache entries for a given role so the next capability check
 * re-fetches from the DB. Call this after writing a role capability override.
 */
export function invalidateRoleCapabilityCache(role: string): void {
  for (const [key] of CAP_CACHE) {
    // key format: userId:role:capability — check the second segment
    const segments = key.split(":");
    if (segments[1] === role) CAP_CACHE.delete(key);
  }
}

export function clearCapabilityCache(): void {
  CAP_CACHE.clear();
}

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

  const cacheKey = capCacheKey(user.id, user.role, capability);
  const cached = CAP_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CAP_CACHE_TTL_MS) {
    return cached.result;
  }

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

    const result = resolveEffectiveCapability(
      user.role,
      capability,
      roleOverride?.effect,
      userOverride,
      now
    );

    // Populate cache (evict oldest entry if at capacity)
    if (CAP_CACHE.size >= CAP_CACHE_MAX_ENTRIES) {
      const firstKey = CAP_CACHE.keys().next().value;
      if (firstKey) CAP_CACHE.delete(firstKey);
    }
    CAP_CACHE.set(cacheKey, { result, cachedAt: Date.now() });

    return result;
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
