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

    return NextResponse.json({
      cities,
      parks,
      batches,
      groups,
      participants,
      staff,
      cityBreakdown: await db.city.findMany({
        where: { isActive: true },
        include: { _count: { select: { parks: true } } },
        orderBy: { name: "asc" },
      }),
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

    return NextResponse.json({
      parks,
      batches,
      groups,
      participants,
      attendanceEvents,
      cityParks: await db.park.findMany({
        where: { cityId: user.assignedCityId, isActive: true },
        include: { _count: { select: { batches: true, groups: true } } },
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