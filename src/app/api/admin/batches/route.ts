import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  optionalIdentifier,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2, "Batch name must be at least 2 characters"),
  parkId: z.string().min(1, "Park is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
});

const listQuerySchema = z.object({
  parkId: optionalIdentifier(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("organisation.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { searchParams } = new URL(request.url);
  const parsedQuery = listQuerySchema.safeParse(queryParamsToObject(searchParams));
  if (!parsedQuery.success) {
    return NextResponse.json(queryValidationError(parsedQuery.error), { status: 400 });
  }
  const { parkId } = parsedQuery.data;

  const isHQ = ["super_admin", "program_admin"].includes(user.role || "");

  // Build where clause based on role
  let where: any = { isActive: true };

  if (isHQ) {
    if (parkId) where.parkId = parkId;
  } else if (user.role === "city_head" && user.assignedCityId) {
    where.park = { cityId: user.assignedCityId };
    if (parkId) where.parkId = parkId;
  } else if (
    ["park_admin", "park_lead", "murabbi"].includes(user.role || "") &&
    user.assignedParkId
  ) {
    where.parkId = user.assignedParkId;
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const batches = await db.batch.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      park: {
        select: {
          id: true,
          name: true,
          city: { select: { id: true, name: true } },
        },
      },
      _count: { select: { groups: true } },
    },
  });

  return NextResponse.json(batches);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("organisation.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const isHQ = ["super_admin", "program_admin"].includes(user.role || "");

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Verify park access
  const park = await db.park.findUnique({
    where: { id: parsed.data.parkId, isActive: true },
    include: { city: true },
  });
  if (!park) {
    return NextResponse.json(
      { error: "Park not found" },
      { status: 404 }
    );
  }

  // Scope check
  if (!isHQ && user.role === "city_head" && user.assignedCityId) {
    if (park.cityId !== user.assignedCityId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (
    !isHQ &&
    ["park_admin", "park_lead", "murabbi"].includes(user.role || "") &&
    user.assignedParkId
  ) {
    if (park.id !== user.assignedParkId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (!isHQ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const batch = await db.batch.create({
    data: {
      name: parsed.data.name,
      parkId: parsed.data.parkId,
      startDate: new Date(parsed.data.startDate),
      endDate: parsed.data.endDate
        ? new Date(parsed.data.endDate)
        : null,
    },
  });

  await logAudit({
    userId: user.id,
    action: "create",
    entityType: "batch",
    entityId: batch.id,
    newValues: parsed.data,
  });

  return NextResponse.json(batch, { status: 201 });
}
