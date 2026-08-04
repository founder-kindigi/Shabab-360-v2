import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth, requireCapability } from "@/lib/auth/authorize";
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
  groupId: z.string().min(1, "Group is required"),
}).merge(participantProfileFieldsSchema);

const studentListQuerySchema = paginatedQuerySchema().extend({
  search: optionalQueryText(),
  cityId: optionalIdentifier(),
  parkId: optionalIdentifier(),
  groupId: optionalIdentifier(),
  state: optionalQueryText(32),
  gender: optionalQueryText(32),
  sort: z.enum(["name", "joinedAt", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export async function GET(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;
  const capabilityAuth = await requireCapability("students.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { searchParams } = new URL(request.url);
  const query = studentListQuerySchema.safeParse(queryParamsToObject(searchParams));
  if (!query.success) {
    return NextResponse.json(queryValidationError(query.error), { status: 400 });
  }
  const { search, cityId, parkId, groupId, state, gender, page, pageSize, sort, order } = query.data;

  // Build where clause
  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  if (cityId || parkId || groupId) {
    where.group = {};
    if (groupId) {
      where.group.id = groupId;
    } else if (parkId) {
      where.group.batch = { parkId };
    } else if (cityId) {
      where.group.batch = { park: { cityId } };
    }
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
      select: {
        id: true,
        userId: true,
        name: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        age: true,
        gradeClass: true,
        state: true,
        joinedAt: true,
        createdAt: true,
        group: {
          select: {
            id: true,
            name: true,
            batch: {
              select: {
                id: true,
                name: true,
                park: {
                  select: {
                    id: true,
                    name: true,
                    city: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
        guardianLinks: {
          select: {
            relation: true,
            guardian: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    db.participant.count({ where }),
  ]);

  const studentIds = students.map((student) => student.id);
  const attendanceCounts = studentIds.length
    ? await db.attendanceRecord.groupBy({
        by: ["participantId", "status"],
        where: {
          participantId: { in: studentIds },
          event: { eventDate: { gte: thirtyDaysAgo } },
        },
        _count: { _all: true },
      })
    : [];

  const attendanceByStudent = new Map<string, { total: number; present: number }>();
  for (const count of attendanceCounts) {
    const current = attendanceByStudent.get(count.participantId) ?? { total: 0, present: 0 };
    current.total += count._count._all;
    if (count.status === "present") current.present += count._count._all;
    attendanceByStudent.set(count.participantId, current);
  }

  const data = students.map((s) => {
    const attendance = attendanceByStudent.get(s.id) ?? { total: 0, present: 0 };
    const totalEvents = attendance.total;
    const presentCount = attendance.present;
    const attendanceRate =
      totalEvents > 0 ? Math.round((presentCount / totalEvents) * 100) : null;

    return {
      id: s.id,
      hasLogin: Boolean(s.userId),
      name: s.name,
      phone: s.phone,
      gender: s.gender,
      dateOfBirth: s.dateOfBirth,
      age: s.age,
      gradeClass: s.gradeClass,
      state: s.state,
      joinedAt: s.joinedAt,
      createdAt: s.createdAt,
      group: s.group
        ? {
            id: s.group.id,
            name: s.group.name,
            batch: {
              id: s.group.batch.id,
              name: s.group.batch.name,
              park: {
                id: s.group.batch.park.id,
                name: s.group.batch.park.name,
                city: s.group.batch.park.city,
              },
            },
          }
        : null,
      guardians: s.guardianLinks.map((gl) => ({
        id: gl.guardian.id,
        name: gl.guardian.name,
        relation: gl.relation,
      })),
      attendanceRate,
      attendanceTotal: totalEvents,
      attendancePresent: presentCount,
    };
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
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("students.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, phone, gender, dateOfBirth, groupId, age, gradeClass } = parsed.data;

  // Validate group exists
  const group = await db.group.findUnique({
    where: { id: groupId, isActive: true },
  });
  if (!group) {
    return NextResponse.json(
      { error: { groupId: ["Selected group not found or inactive"] } },
      { status: 400 }
    );
  }

  const participant = await db.participant.create({
    data: {
      name,
      phone: phone || null,
      gender: gender || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      age: age ?? null,
      gradeClass: gradeClass ?? null,
      groupId,
    },
  });

  await logAudit({
    userId: auth.user.id,
    action: "create",
    entityType: "participant",
    entityId: participant.id,
    newValues: { name, phone, gender, dateOfBirth, age, gradeClass, groupId },
  });

  return NextResponse.json(participant, { status: 201 });
}
