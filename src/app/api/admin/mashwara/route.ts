import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import {
  paginatedQuerySchema,
  optionalIdentifier,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";

const createSchema = z.object({
  cityId: z.string().min(1, "City is required"),
  title: z.string().trim().min(1, "Title is required").max(200),
  scheduledAt: z.coerce.date(),
  location: z.string().trim().max(200).optional(),
  minutesSummary: z.string().optional(),
});

const listSchema = paginatedQuerySchema().extend({
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
  cityId: optionalIdentifier(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capabilityAuth = await requireCapability("mashwara.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { searchParams } = new URL(request.url);
  const query = listSchema.safeParse(queryParamsToObject(searchParams));
  if (!query.success) {
    return NextResponse.json(queryValidationError(query.error), { status: 400 });
  }

  const { page, pageSize, status, cityId } = query.data;
  const user = auth.user;
  const isHq = user.role === "super_admin" || user.role === "program_admin";

  const where: Record<string, unknown> = {};
  if (!isHq && user.assignedCityId) {
    where.cityId = user.assignedCityId;
  } else if (cityId) {
    where.cityId = cityId;
  }
  if (status) where.status = status;

  const [data, total] = await Promise.all([
    db.mashwaraMeeting.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        location: true,
        status: true,
        cityId: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true } },
      },
    }),
    db.mashwaraMeeting.count({ where }),
  ]);

  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capabilityAuth = await requireCapability("mashwara.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const staffMeta = await db.staffMeta.findFirst({
    where: { userId: auth.user.id, isActive: true },
    select: { id: true },
  });
  if (!staffMeta) {
    return NextResponse.json({ error: "Active staff record not found" }, { status: 403 });
  }

  const meeting = await db.mashwaraMeeting.create({
    data: {
      cityId: parsed.data.cityId,
      title: parsed.data.title,
      scheduledAt: parsed.data.scheduledAt,
      location: parsed.data.location ?? null,
      minutesSummary: parsed.data.minutesSummary ?? null,
      createdById: auth.user.id!,
    },
    select: {
      id: true,
      cityId: true,
      title: true,
      scheduledAt: true,
      location: true,
      status: true,
      minutesSummary: true,
      createdAt: true,
    },
  });

  await logAudit({
    userId: auth.user.id,
    action: "create",
    entityType: "mashwara_meeting",
    entityId: meeting.id,
    newValues: { cityId: meeting.cityId, title: meeting.title },
  });

  return NextResponse.json(meeting, { status: 201 });
}
