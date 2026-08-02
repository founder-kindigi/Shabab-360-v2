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

const createSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(5, "Phone must be at least 5 characters"),
  cnic: z.string().optional(),
  address: z.string().optional(),
  userId: z.string().optional(),
});

const guardianListQuerySchema = paginatedQuerySchema().extend({
  search: optionalQueryText(),
  cityId: optionalIdentifier(),
  state: z.enum(["active", "inactive"]).optional(),
  sort: z.enum(["name", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export async function GET(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;
  const capabilityAuth = await requireCapability("guardians.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { searchParams } = new URL(request.url);
  const query = guardianListQuerySchema.safeParse(queryParamsToObject(searchParams));
  if (!query.success) {
    return NextResponse.json(queryValidationError(query.error), { status: 400 });
  }
  const { search, cityId, state, page, pageSize, sort, order } = query.data;

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
      { cnic: { contains: search } },
    ];
  }

  if (state) {
    where.isActive = state === "active";
  }

  // Build orderBy
  const orderBy: any = { [sort]: order };

  // If cityId is provided, filter guardians who have children in that city
  let guardianIdsInCity: string[] | undefined;
  if (cityId) {
    const links = await db.guardianChild.findMany({
      where: {
        participant: {
          group: {
            batch: { park: { cityId } },
          },
        },
      },
      select: { guardianId: true },
      distinct: "guardianId",
    });
    guardianIdsInCity = links.map((l) => l.guardianId);
    if (guardianIdsInCity.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { page, pageSize, totalItems: 0, totalPages: 0 },
      });
    }
    where.id = { in: guardianIdsInCity };
  }

  const thirtyDaysAgo = subDays(new Date(), 30);

  const skip = (page - 1) * pageSize;

  const [guardians, totalItems] = await Promise.all([
    db.guardian.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        children: {
          include: {
            participant: {
              include: {
                group: {
                  include: {
                    batch: {
                      include: {
                        park: {
                          include: { city: { select: { id: true, name: true } } },
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
            },
          },
        },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    db.guardian.count({ where }),
  ]);

  const data = guardians.map((g) => {
    const children = g.children.map((c) => {
      const totalEvents = c.participant.attendanceRecords.length;
      const presentCount = c.participant.attendanceRecords.filter(
        (r) => r.status === "present"
      ).length;
      const attendanceRate =
        totalEvents > 0
          ? Math.round((presentCount / totalEvents) * 100)
          : null;

      return {
        id: c.participant.id,
        name: c.participant.name,
        state: c.participant.state,
        relation: c.relation,
        group: c.participant.group
          ? {
              id: c.participant.group.id,
              name: c.participant.group.name,
              batch: {
                id: c.participant.group.batch.id,
                name: c.participant.group.batch.name,
                park: {
                  id: c.participant.group.batch.park.id,
                  name: c.participant.group.batch.park.name,
                  city: c.participant.group.batch.park.city,
                },
              },
            }
          : null,
        attendanceRate,
      };
    });

    return {
      id: g.id,
      name: g.name,
      phone: g.phone,
      cnic: g.cnic,
      address: g.address,
      isActive: g.isActive,
      userId: g.userId,
      user: g.user,
      createdAt: g.createdAt,
      children,
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
  const capabilityAuth = await requireCapability("guardians.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, phone, cnic, address, userId } = parsed.data;

  // Validate userId if provided
  if (userId) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: { userId: ["User not found"] } },
        { status: 400 }
      );
    }
    const existingGuardian = await db.guardian.findUnique({ where: { userId } });
    if (existingGuardian) {
      return NextResponse.json(
        { error: { userId: ["This user is already linked to a guardian"] } },
        { status: 409 }
      );
    }
  }

  const guardian = await db.guardian.create({
    data: {
      name,
      phone,
      cnic: cnic || null,
      address: address || null,
      userId: userId || null,
    },
  });

  await logAudit({
    userId: auth.user.id,
    action: "create",
    entityType: "guardian",
    entityId: guardian.id,
    newValues: { name, phone, cnic, address, userId },
  });

  return NextResponse.json(guardian, { status: 201 });
}
