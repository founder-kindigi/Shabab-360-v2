import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  // Get user's scope
  const isHQ = ["super_admin", "program_admin"].includes(user.role || "");

  if (isHQ) {
    const [cities, parks, batches, groups, participants, staff] = await Promise.all([
      db.city.count({ where: { isActive: true } }),
      db.park.count({ where: { isActive: true } }),
      db.batch.count({ where: { isActive: true } }),
      db.group.count({ where: { isActive: true } }),
      db.participant.count(),
      db.staffMeta.count({ where: { isActive: true } }),
    ]);

    const now = new Date();

    const [recentActivity, activeBatches, cityStaff] = await Promise.all([
      db.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      }),
      db.batch.count({
        where: {
          isActive: true,
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
      }),
      db.staffMeta.groupBy({
        by: ["role"],
        where: { isActive: true },
        _count: { role: true },
      }),
    ]);

    const cityBreakdown = await db.city.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { parks: true } },
      },
      orderBy: { name: "asc" },
    });

    // Count staff per city via park assignments
    const allCityStaff = await db.staffMeta.findMany({
      where: { isActive: true, assignedCityId: { not: null } },
      select: { assignedCityId: true, id: true },
    });
    const staffByCity = allCityStaff.reduce<Record<string, number>>((acc, s) => {
      if (s.assignedCityId) acc[s.assignedCityId] = (acc[s.assignedCityId] || 0) + 1;
    return acc;
    }, {});

    const cityBreakdownWithStaff = cityBreakdown.map((city) => ({
      ...city,
      _count: { ...city._count, staff: staffByCity[city.id] || 0 },
    }));

    return NextResponse.json({
      cities,
      parks,
      batches,
      groups,
      participants,
      staff,
      activeBatches,
      cityStaff: cityStaff.map((cs) => ({
        role: cs.role,
        count: cs._count.role,
      })),
      recentActivity,
      cityBreakdown: cityBreakdownWithStaff,
    });
  }

  // City-scoped
  if (user.role === "city_head" && user.assignedCityId) {
    const [parks, batches, groups, participants, attendanceEvents] =
      await Promise.all([
        db.park.count({
          where: { cityId: user.assignedCityId, isActive: true },
        }),
        db.batch.count({
          where: { park: { cityId: user.assignedCityId }, isActive: true },
        }),
        db.group.count({
          where: {
            batch: { park: { cityId: user.assignedCityId } },
            isActive: true,
          },
        }),
        db.participant.count({
          where: {
            group: { batch: { park: { cityId: user.assignedCityId } } },
          },
        }),
        db.attendanceEvent.count({
          where: {
            group: { batch: { park: { cityId: user.assignedCityId } } },
          },
        }),
      ]);

    // Get park IDs for this city to filter activity
    const cityParkIds = (
      await db.park.findMany({
        where: { cityId: user.assignedCityId, isActive: true },
        select: { id: true },
      })
    ).map((p) => p.id);

    const recentActivity = cityParkIds.length
      ? await db.auditLog.findMany({
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            action: true,
            entityType: true,
            entityId: true,
            createdAt: true,
            user: { select: { name: true } },
          },
          where: {
            entityType: { in: ["park", "batch", "group", "participant"] },
            entityId: { in: cityParkIds },
          },
        })
      : [];

    return NextResponse.json({
      parks,
      batches,
      groups,
      participants,
      attendanceEvents,
      recentActivity,
      cityParks: await db.park.findMany({
        where: { cityId: user.assignedCityId, isActive: true },
        include: { _count: { select: { batches: true } } },
        orderBy: { name: "asc" },
      }),
    });
  }

  // Park-scoped
  if (
    ["park_admin", "park_lead", "murabbi"].includes(user.role || "") &&
    user.assignedParkId
  ) {
    const todayStart = new Date(new Date().toISOString().split("T")[0]);

    const [groups, participants, todayEvents, openEvents, totalEvents] =
      await Promise.all([
        db.group.count({
          where: { batch: { parkId: user.assignedParkId }, isActive: true },
        }),
        db.participant.count({
          where: { group: { batch: { parkId: user.assignedParkId } } },
        }),
        db.attendanceEvent.count({
          where: {
            group: { batch: { parkId: user.assignedParkId } },
            eventDate: { gte: todayStart },
          },
        }),
        db.attendanceEvent.count({
          where: {
            group: { batch: { parkId: user.assignedParkId } },
            eventDate: { gte: todayStart },
            isClosed: false,
          },
        }),
        db.attendanceEvent.count({
          where: {
            group: { batch: { parkId: user.assignedParkId } },
          },
        }),
      ]);

    return NextResponse.json({
      groups,
      participants,
      todayEvents,
      openEvents,
      totalEvents,
    });
  }

  // Guardian
  if (user.role === "guardian") {
    const guardian = await db.guardian.findFirst({
      where: { userId: user.id },
      include: {
        children: {
          include: {
            participant: {
              include: {
                group: { include: { batch: { include: { park: true } } } },
              },
            },
          },
        },
      },
    });
    return NextResponse.json({ guardian });
  }

  // Student
  if (user.role === "student") {
    const participant = await db.participant.findFirst({
      where: { userId: user.id },
      include: {
        group: { include: { batch: { include: { park: true } } } },
      },
    });
    return NextResponse.json({ participant });
  }

  return NextResponse.json({});
}