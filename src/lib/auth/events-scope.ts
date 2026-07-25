import { db as defaultDb } from "@/lib/db";
import type { PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | typeof defaultDb;

type DbClient = PrismaClient | typeof defaultDb;

export interface ResolvedActorCitySuccess {
  cityId: string;
  isHQ: boolean;
  error?: undefined;
  status?: undefined;
}

export interface ResolvedActorCityError {
  cityId?: undefined;
  isHQ?: undefined;
  error: string;
  status: number;
}

export type ResolvedActorCityResult = ResolvedActorCitySuccess | ResolvedActorCityError;

export async function resolveActorCity(
  user: { id?: string; role?: string | null },
  requestedCityId?: string | null,
  prisma: any = defaultDb
): Promise<ResolvedActorCityResult> {
  if (!user.id) {
    return { error: "Unauthorized: missing user id", status: 401 };
  }

  const role = user.role || "";
  const isHQ = ["super_admin", "program_admin"].includes(role);

  if (isHQ) {
    if (!requestedCityId || typeof requestedCityId !== "string" || !requestedCityId.trim()) {
      return { error: "HQ actor must supply a valid cityId", status: 400 };
    }
    const targetCity = await prisma.city.findUnique({
      where: { id: requestedCityId.trim() },
    });
    if (!targetCity || !targetCity.isActive) {
      return { error: "City not found or inactive", status: 400 };
    }
    return { cityId: targetCity.id, isHQ: true };
  }

  const staffMeta = await prisma.staffMeta.findUnique({
    where: { userId: user.id },
    include: {
      assignedCity: true,
      assignedPark: { include: { city: true } },
      assignedGroup: { include: { batch: { include: { city: true } }, park: { include: { city: true } } } },
    },
  });

  if (!staffMeta || !staffMeta.isActive) {
    return { error: "Actor staff assignment is inactive or missing", status: 403 };
  }

  let derivedCityId: string | null = null;
  if (staffMeta.assignedCityId) {
    derivedCityId = staffMeta.assignedCityId;
  } else if (staffMeta.assignedPark?.cityId) {
    derivedCityId = staffMeta.assignedPark.cityId;
  } else if (staffMeta.assignedGroup?.batch?.cityId) {
    derivedCityId = staffMeta.assignedGroup.batch.cityId;
  } else if (staffMeta.assignedGroup?.park?.cityId) {
    derivedCityId = staffMeta.assignedGroup.park.cityId;
  }

  if (!derivedCityId) {
    return { error: "Actor city scope cannot be resolved", status: 403 };
  }

  if (requestedCityId && typeof requestedCityId === "string" && requestedCityId.trim()) {
    if (requestedCityId.trim() !== derivedCityId) {
      return { error: "Forbidden: requested cityId does not match actor city scope", status: 403 };
    }
  }

  return { cityId: derivedCityId, isHQ: false };
}

export async function verifyEventCityAccess(
  user: { id?: string; role?: string | null },
  eventId: string,
  prisma: any = defaultDb
) {
  if (!user.id) {
    return { error: "Unauthorized: missing user id", status: 401, event: null };
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return { error: "Event not found", status: 404, event: null };
  }

  const resolved = await resolveActorCity(user, event.cityId, prisma);
  if (resolved.error) {
    return { error: resolved.error, status: resolved.status, event: null };
  }

  return { event, cityId: resolved.cityId, isHQ: resolved.isHQ, error: null, status: 200 };
}

export function isResponsibilityActive(
  resp: { isActive: boolean; endDate: Date | string; revokedAt?: Date | string | null; startDate?: Date | string },
  now: Date = new Date()
): boolean {
  if (!resp || !resp.isActive || resp.revokedAt) return false;
  const end = new Date(resp.endDate);
  if (end.getTime() <= now.getTime()) return false;
  if (resp.startDate) {
    const start = new Date(resp.startDate);
    if (start.getTime() > now.getTime()) return false;
  }
  return true;
}
