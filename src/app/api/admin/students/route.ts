import { resolveRequestedHierarchy, hierarchyGroupWhere } from "@/lib/auth/hierarchy";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { isHqRole } from "@/lib/auth/scope";
import { db } from "@/lib/db";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import {
  optionalIdentifier,
  optionalQueryText,
  paginatedQuerySchema,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { subDays } from "date-fns";
import { participantProfileFieldsSchema } from "@/lib/participants/profile-fields";

const createSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  groupId: z.string().trim().min(1, "Group must not be blank").optional(),
}).merge(participantProfileFieldsSchema);

const optionalBooleanQuery = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()
);

const studentListQuerySchema = paginatedQuerySchema().extend({
  search: optionalQueryText(),
  cityId: optionalIdentifier(),
  parkId: optionalIdentifier(),
  groupId: optionalIdentifier(),
  state: optionalQueryText(32),
  gender: optionalQueryText(32),
  unassigned: optionalBooleanQuery,
  sort: z.enum(["name", "joinedAt", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("students.profile.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { searchParams } = new URL(request.url);
  const query = studentListQuerySchema.safeParse(queryParamsToObject(searchParams));
  if (!query.success) {
    return NextResponse.json(queryValidationError(query.error), { status: 400 });
  }
  const { search, cityId, parkId, groupId, state, gender, unassigned, page, pageSize, sort, order } = query.data;

  const scope = await resolveRequestedHierarchy(auth.user, { cityId, parkId, groupId });
  if (scope instanceof NextResponse) return scope;
  const where: any = {};
  if (search) where.name = { contains: search };

  if (unassigned) {
    // An unassigned participant has no city, park or group, so the listing is
    // central-only and rejects any actor or filter that carries a hierarchy scope.
    if (scope.cityId || scope.parkId || scope.groupId) {
      return NextResponse.json(
        { error: "Unassigned participants are visible to central staff only" },
        { status: 403 }
      );
    }
    where.groupId = null;
  } else {
    // Group-scoped listings keep excluding unassigned participants.
    where.groupId = { not: null };
    where.group = hierarchyGroupWhere(scope);
  }

  if (state && state !== "all") {
    where.state = state;
  }

  if (gender && gender !== "all") {
    where.gender = gender;
  }

  // Build orderBy
  const orderBy: any = { [sort]: order };

  const thirtyDaysAgo = subDays(new Date(), 30);
  const skip = (page - 1) * pageSize;

  const [students, totalItems] = await Promise.all([
    db.participant.findMany({
      where,
      include: {
        group: {
          include: {
            park: { include: { city: { select: { id: true, name: true } } } },
            batch: {
              include: {
                park: {
                  include: {
                    city: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
        attendanceRecords: {
          where: {
            event: { eventDate: { gte: thirtyDaysAgo } },
          },
          select: { id: true, status: true },
        },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    db.participant.count({ where }),
  ]);

  const data = students.flatMap((s): Record<string, unknown>[] => {
    if (!s.group) {
      // Only the central-only unassigned listing reaches this branch.
      if (!unassigned) return [];
      return [{
        id: s.id,
        name: s.name,
        state: s.state,
        group: null,
        attendanceRate: null,
        attendanceTotal: 0,
        attendancePresent: 0,
      }];
    }
    const actualPark = s.group.parkId ? s.group.park! : s.group.batch.park;
    const totalEvents = s.attendanceRecords.length;
    const presentCount = s.attendanceRecords.filter(
      (r) => r.status === "present"
    ).length;
    const attendanceRate =
      totalEvents > 0 ? Math.round((presentCount / totalEvents) * 100) : null;

    return [{
      id: s.id,
      name: s.name,
      state: s.state,
      group: {
        id: s.group.id,
        name: s.group.name,
        batch: {
          id: s.group.batch.id,
          name: s.group.batch.name,
          park: {
            id: actualPark.id,
            name: actualPark.name,
            city: actualPark.city,
          },
        },
      },
      attendanceRate,
      attendanceTotal: totalEvents,
      attendancePresent: presentCount,
    }];
  });

  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("students.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, phone, gender, dateOfBirth, groupId, age, gradeClass } = parsed.data;

  if (groupId) {
    // The selected active group supplies park and city; a client value is never trusted.
    const group = await db.group.findFirst({
      where: { id: groupId, isActive: true },
    });
    if (!group) {
      return NextResponse.json(
        { error: { groupId: ["Selected group not found or inactive"] } },
        { status: 400 }
      );
    }
    const scope = await resolveRequestedHierarchy(auth.user, { groupId });
    if (scope instanceof NextResponse) return scope;
  } else if (!isHqRole(auth.user.role)) {
    // Unassigned intake has no hierarchy, so scoped staff must select a group.
    return NextResponse.json(
      { error: "An unassigned participant may only be created by central staff" },
      { status: 403 }
    );
  }

  const data: any = {
    name,
    phone: phone || null,
    gender: gender || null,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    age: age ?? null,
    gradeClass: gradeClass ?? null,
    groupId: groupId ?? null,
  };

  const participant = await db.participant.create({ data });

  await logAudit({
    userId: auth.user.id,
    action: "create",
    entityType: "participant",
    entityId: participant.id,
    newValues: { name, phone, gender, dateOfBirth, age, gradeClass, groupId: groupId ?? null },
  });

  return NextResponse.json({ ...participant, unassigned: !groupId }, { status: 201 });
}
