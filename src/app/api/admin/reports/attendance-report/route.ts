import { NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { formatPKT } from "@/lib/timezone";
import { parseISO, subDays } from "date-fns";
import {
  optionalDateOnly,
  optionalIdentifier,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { z } from "zod";

const attendanceReportQuerySchema = z
  .object({
    cityId: optionalIdentifier(),
    parkId: optionalIdentifier(),
    groupId: optionalIdentifier(),
    from: optionalDateOnly(),
    to: optionalDateOnly(),
  })
  .refine(
    ({ from, to }) => !from || !to || from <= to,
    { message: "from must be on or before to", path: ["to"] }
  )
  .refine(
    ({ from, to }) => !from || !to || Date.parse(to) - Date.parse(from) <= 366 * 24 * 60 * 60 * 1000,
    { message: "Date range must not exceed 366 days", path: ["to"] }
  );

type SessionUser = {
  id?: string;
  role?: string;
  assignedCityId?: string | null;
  assignedParkId?: string | null;
  assignedGroupId?: string | null;
};

const ALLOWED_ROLES = [
  "super_admin",
  "program_admin",
  "city_head",
  "park_admin",
  "park_lead",
];

export async function GET(req: Request) {
  /* ---- Auth ---- */
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("reports.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  if (!user.role || !ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const query = attendanceReportQuerySchema.safeParse(queryParamsToObject(new URL(req.url).searchParams));
    if (!query.success) {
      return NextResponse.json(queryValidationError(query.error), { status: 400 });
    }
    const { cityId, parkId, groupId, from, to } = query.data;

    /* ---- Scope filtering ---- */
    const parkWhere: Record<string, unknown> = {};
    if (user.role === "city_head") {
      parkWhere.cityId = user.assignedCityId;
    } else if (user.role === "park_admin" || user.role === "park_lead") {
      parkWhere.id = user.assignedParkId;
    } else if (cityId) {
      parkWhere.cityId = cityId;
    } else if (parkId) {
      parkWhere.id = parkId;
    }

    const batchWhere: Record<string, unknown> = {};
    if (Object.keys(parkWhere).length > 0) {
      batchWhere.park = parkWhere;
    }

    const groupWhere: Record<string, unknown> = {};
    if (Object.keys(batchWhere).length > 0) {
      groupWhere.batch = batchWhere;
    }
    if (groupId) {
      groupWhere.id = groupId;
    }

    /* ---- Date range ---- */
    const eventWhere: Record<string, unknown> = {};
    if (Object.keys(groupWhere).length > 0) {
      eventWhere.group = groupWhere;
    }

    if (from) {
      eventWhere.eventDate = {
        ...(eventWhere.eventDate as Record<string, unknown> || {}),
        gte: parseISO(from),
      };
    }

    if (to) {
      eventWhere.eventDate = {
        ...(eventWhere.eventDate as Record<string, unknown> || {}),
        lte: parseISO(to),
      };
    }

    /* ---- Fetch attendance records with full joins ---- */
    const records = await db.attendanceRecord.findMany({
      where: {
        event: eventWhere,
      },
      include: {
        event: {
          include: {
            group: {
              include: {
                batch: {
                  include: {
                    park: {
                      include: {
                        city: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        participant: true,
      },
      orderBy: [{ event: { eventDate: "desc" } }, { participant: { name: "asc" } }],
    });

    /* ---- Resolve marker names ---- */
    const markerIds = [
      ...new Set(records.map((r) => r.markedBy).filter(Boolean)),
    ] as string[];
    const markers =
      markerIds.length > 0
        ? await db.staffMeta.findMany({
            where: { id: { in: markerIds } },
            include: { user: { select: { name: true } } },
          })
        : [];
    const markerMap = new Map(markers.map((m) => [m.id, m.user.name]));

    /* ---- Build flat rows ---- */
    const rows = records.map((r) => ({
      eventDate: formatPKT(r.event.eventDate, "dd MMM yyyy"),
      eventTitle: r.event.title,
      participantName: r.participant.name,
      groupName: r.event.group.name,
      batchName: r.event.group.batch.name,
      parkName: r.event.group.batch.park.name,
      cityName: r.event.group.batch.park.city?.name || "Unknown",
      status: r.status,
      markedByName: r.markedBy ? markerMap.get(r.markedBy) || null : null,
      markedAt: formatPKT(r.markedAt, "dd MMM yyyy hh:mm a"),
    }));

    /* ---- Summary stats ---- */
    const uniqueEventIds = new Set(records.map((r) => r.eventId));
    const totalEvents = uniqueEventIds.size;
    const totalRecords = records.length;

    const statusCounts = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const r of records) {
      if (r.status in statusCounts) {
        (statusCounts as Record<string, number>)[r.status]++;
      }
    }

    const presentRate =
      totalRecords > 0
        ? Math.round(
            ((statusCounts.present + statusCounts.late) / totalRecords) * 100
          )
        : 0;
    const absentRate =
      totalRecords > 0
        ? Math.round((statusCounts.absent / totalRecords) * 100)
        : 0;

    /* ---- Scope labels ---- */
    let scopeLabel = "All";
    if (parkId) {
      const park = await db.park.findUnique({
        where: { id: parkId },
        include: { city: true },
      });
      scopeLabel = park ? `${park.name}, ${park.city.name}` : scopeLabel;
    } else if (cityId) {
      const city = await db.city.findUnique({ where: { id: cityId } });
      scopeLabel = city?.name || scopeLabel;
    } else if (groupId) {
      const group = await db.group.findUnique({
        where: { id: groupId },
        include: { batch: { include: { park: { include: { city: true } } } } },
      });
      scopeLabel = group
        ? `${group.name} — ${group.batch.park.name}, ${group.batch.park.city.name}`
        : scopeLabel;
    }

    return NextResponse.json({
      data: rows,
      summary: {
        totalEvents,
        totalRecords,
        presentRate,
        absentRate,
        statusCounts,
        scopeLabel,
        dateRange: {
          from: from ? formatPKT(parseISO(from), "dd MMM yyyy") : null,
          to: to ? formatPKT(parseISO(to), "dd MMM yyyy") : null,
        },
      },
    });
  } catch (error) {
    console.error("Attendance report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
