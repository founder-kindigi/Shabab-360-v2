import { db as defaultDb } from "@/lib/db";

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
  user: { id: string; role?: string | null },
  requestedCityId?: string | null,
  prisma: any = defaultDb
): Promise<ResolvedActorCityResult> {
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

  const isStaffRole = ["city_head", "park_lead", "park_admin", "murabbi"].includes(role);
  if (!isStaffRole) {
    return { error: "Forbidden", status: 403 };
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
  user: { id: string; role?: string | null },
  eventId: string,
  prisma: any = defaultDb
) {
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
