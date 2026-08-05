import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import {
  optionalIdentifier,
  optionalQueryText,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";

const createSchema = z.object({
  name: z.string().trim().min(2, "Group name must be at least 2 characters").max(120),
  batchId: z.string().min(1, "Batch is required"),
  parkId: z.string().min(1, "Park is required"),
});

const HIERARCHY_MANAGER_ROLES = ["super_admin", "program_admin", "city_head"];

function canManageHierarchy(role?: string | null) {
  return HIERARCHY_MANAGER_ROLES.includes(role || "");
}

const groupListQuerySchema = z.object({
  batchId: optionalIdentifier(),
  parkId: optionalIdentifier(),
  search: optionalQueryText(),
  status: z.enum(["all", "active", "inactive"]).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("organisation.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { searchParams } = new URL(request.url);
  const query = groupListQuerySchema.safeParse(queryParamsToObject(searchParams));
  if (!query.success) {
    return NextResponse.json(queryValidationError(query.error), { status: 400 });
  }
  const { batchId, parkId, search, status } = query.data;

  const userRole = (user.role || "").toLowerCase().trim();
  const isHQ = ["super_admin", "program_admin"].includes(userRole);

  // Build where clause based on role
  let where: any = {};

  // Status filter (default: active only)
  if (status === "inactive") {
    where.isActive = false;
  } else if (status !== "all") {
    where.isActive = true;
  }

  if (isHQ) {
    if (parkId) {
      where.OR = [
        { parkId },
        { parkId: null, batch: { parkId } },
      ];
    }
    if (batchId) where.batchId = batchId;
  } else if (userRole === "city_head" && user.assignedCityId) {
    where.OR = [
      { park: { cityId: user.assignedCityId } },
      { parkId: null, batch: { park: { cityId: user.assignedCityId } } },
    ];
    if (parkId) {
      const requestedPark = await db.park.findUnique({ where: { id: parkId }, select: { cityId: true } });
      if (!requestedPark) return NextResponse.json({ error: "Park not found" }, { status: 404 });
      if (requestedPark.cityId !== user.assignedCityId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      where.AND = [{ OR: where.OR }, { OR: [{ parkId }, { parkId: null, batch: { parkId } }] }];
      delete where.OR;
    }
    if (batchId) where.batchId = batchId;
  } else if (
    ["park_admin", "park_lead"].includes(userRole) &&
    user.assignedParkId
  ) {
    where.OR = [
      { parkId: user.assignedParkId },
      { parkId: null, batch: { parkId: user.assignedParkId } },
    ];
    if (batchId) where.batchId = batchId;
  } else if (userRole === "murabbi" && user.assignedGroupId) {
    // Murabbi: only their own group
    where.id = user.assignedGroupId;
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Search by group name
  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  const url = new URL(request.url);
  const limitParam = parseInt(url.searchParams.get("limit") || "100", 10);
  const pageParam = parseInt(url.searchParams.get("page") || "1", 10);
  const take = Math.min(isNaN(limitParam) || limitParam <= 0 ? 100 : limitParam, 100);
  const skip = Math.max(0, (isNaN(pageParam) || pageParam <= 0 ? 1 : pageParam) - 1) * take;

  const groups = await db.group.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    skip,
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          park: { select: { id: true, name: true } },
        },
      },
      park: { select: { id: true, name: true, cityId: true } },
      _count: { select: { participants: true } },
    },
  });

  return NextResponse.json(groups);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("organisation.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;
  if (!canManageHierarchy(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isHQ = ["super_admin", "program_admin"].includes(user.role || "");

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Verify batch access
  const batch = await db.batch.findUnique({
    where: { id: parsed.data.batchId, isActive: true },
    include: { park: true, city: true },
  });
  if (!batch) {
    return NextResponse.json(
      { error: "Batch not found" },
      { status: 404 }
    );
  }

  const batchCityId = batch.cityId ?? batch.park.cityId;
  const park = await db.park.findUnique({ where: { id: parsed.data.parkId, isActive: true } });
  if (!park) return NextResponse.json({ error: "Park not found" }, { status: 404 });
  if (park.cityId !== batchCityId) {
    return NextResponse.json({ error: "Group park must belong to the batch city" }, { status: 400 });
  }

  // Scope check
  if (!isHQ && user.role === "city_head" && user.assignedCityId) {
    if (batchCityId !== user.assignedCityId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (!isHQ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const group = await db.group.create({
    data: {
      name: parsed.data.name,
      batchId: parsed.data.batchId,
      parkId: parsed.data.parkId,
    },
  });

  await logAudit({
    userId: user.id,
    action: "create",
    entityType: "group",
    entityId: group.id,
    newValues: parsed.data,
  });

  return NextResponse.json(group, { status: 201 });
}
