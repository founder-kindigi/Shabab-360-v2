import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireCapability,
  requireResourceScope,
} from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  optionalIdentifier,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().trim().min(2, "Batch name must be at least 2 characters").max(120),
  parkId: z.string().min(1, "Park is required"),
  startDate: z.string().date("Start date must be a valid date"),
  endDate: z.string().date("End date must be a valid date").optional(),
}).refine((data) => !data.endDate || data.endDate >= data.startDate, {
  message: "End date must be on or after the start date",
  path: ["endDate"],
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
  let scopeWhere: any = {};
  let selectedPark: { id: string; cityId: string } | null = null;

  if (parkId) {
    selectedPark = await db.park.findUnique({ where: { id: parkId }, select: { id: true, cityId: true } });
    if (!selectedPark) return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  if (isHQ) {
    if (selectedPark) {
      scopeWhere = {
        OR: [
          { cityId: selectedPark.cityId },
          { cityId: null, parkId: selectedPark.id },
        ],
      };
    }
  } else if (user.role === "city_head" && user.assignedCityId) {
    if (selectedPark && selectedPark.cityId !== user.assignedCityId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    scopeWhere = {
      OR: [
        { cityId: user.assignedCityId },
        { cityId: null, park: { cityId: user.assignedCityId } },
      ],
    };
  } else if (
    ["park_admin", "park_lead", "murabbi"].includes(user.role || "") &&
    user.assignedParkId
  ) {
    scopeWhere = {
      OR: [
        { groups: { some: { parkId: user.assignedParkId } } },
        { cityId: null, parkId: user.assignedParkId },
      ],
    };
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const batches = await db.batch.findMany({
    where: { isActive: true, ...scopeWhere },
    orderBy: { createdAt: "desc" },
    include: {
      park: {
        select: {
          id: true,
          name: true,
          city: { select: { id: true, name: true } },
        },
      },
      city: { select: { id: true, name: true } },
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

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Verify target park access
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

  // Dynamic capability + scope check using target park and city
  const scopeError = requireResourceScope(user, {
    cityId: park.cityId,
    parkId: park.id,
  });
  if (scopeError) return scopeError;

  const batch = await db.batch.create({
    data: {
      name: parsed.data.name,
      parkId: parsed.data.parkId,
      cityId: park.cityId,
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
