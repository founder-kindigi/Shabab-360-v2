import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { subDays } from "date-fns";

const createSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  groupId: z.string().min(1, "Group is required"),
});

export async function GET(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const cityId = searchParams.get("cityId") || undefined;
  const parkId = searchParams.get("parkId") || undefined;
  const groupId = searchParams.get("groupId") || undefined;
  const state = searchParams.get("state") || undefined;
  const gender = searchParams.get("gender") || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
  const sort = searchParams.get("sort") || "createdAt";
  const order = searchParams.get("order") || "desc";

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
  const allowedSortFields = ["name", "joinedAt", "createdAt"] as const;
  const sortField = allowedSortFields.includes(sort as any) ? sort : "createdAt";
  const sortOrder = order === "asc" ? "asc" : "desc";
  const orderBy: any = { [sortField]: sortOrder };

  const thirtyDaysAgo = subDays(new Date(), 30);
  const skip = (page - 1) * pageSize;

  const [students, totalItems] = await Promise.all([
    db.participant.findMany({
      where,
      include: {
        group: {
          include: {
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
        guardianLinks: {
          include: {
            guardian: {
              select: { id: true, name: true, phone: true },
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

  const data = students.map((s) => {
    const totalEvents = s.attendanceRecords.length;
    const presentCount = s.attendanceRecords.filter(
      (r) => r.status === "present"
    ).length;
    const attendanceRate =
      totalEvents > 0 ? Math.round((presentCount / totalEvents) * 100) : null;

    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      gender: s.gender,
      dateOfBirth: s.dateOfBirth,
      state: s.state,
      joinedAt: s.joinedAt,
      createdAt: s.createdAt,
      group: {
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
      },
      guardians: s.guardianLinks.map((gl) => ({
        id: gl.guardian.id,
        name: gl.guardian.name,
        phone: gl.guardian.phone,
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

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, phone, gender, dateOfBirth, groupId } = parsed.data;

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
      groupId,
    },
  });

  await logAudit({
    userId: auth.user.id,
    action: "create",
    entityType: "participant",
    entityId: participant.id,
    newValues: { name, phone, gender, dateOfBirth, groupId },
  });

  return NextResponse.json(participant, { status: 201 });
}