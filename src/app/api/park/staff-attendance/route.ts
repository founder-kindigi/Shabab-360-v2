import { NextResponse } from "next/server";
import {
  ATTENDANCE_ROLES,
  requireCapability,
  requireResourceScope,
} from "@/lib/auth/authorize";
import { createAuditLogData } from "@/lib/audit";
import { userHasCapability } from "@/lib/auth/capability-access";
import { db } from "@/lib/db";
import { isScheduledAttendanceSession } from "@/lib/attendance/scheduled-sessions";
import { materializeParkStaffAttendanceSchema } from "@/lib/attendance/schemas";
import { formatPKT, fromPKT, todayPKT } from "@/lib/timezone";
import { isValid, parseISO } from "date-fns";
import { z } from "zod";

const listQuerySchema = z.object({
  parkId: z.string().trim().min(1).max(100),
  date: z.string().trim().optional(),
}).strict();

class ExistingStaffRollCallError extends Error {}

function canManageParkStaffAttendance(role: string | undefined): boolean {
  return role === "park_lead" || role === "park_admin";
}

async function resolveManagedPark(user: { role?: string; assignedParkId?: string | null }, requestedParkId: string) {
  if (!canManageParkStaffAttendance(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const scopeError = requireResourceScope(user, { parkId: requestedParkId }, ATTENDANCE_ROLES);
  if (scopeError) return { error: scopeError };

  const park = await db.park.findUnique({
    where: { id: requestedParkId },
    select: { id: true, name: true, isActive: true },
  });
  if (!park || !park.isActive) {
    return { error: NextResponse.json({ error: "Park not found" }, { status: 404 }) };
  }

  return { park };
}

async function isParkOperatingDate(parkId: string, date: Date): Promise<boolean> {
  const batches = await db.batch.findMany({
    where: { parkId, isActive: true },
    select: {
      startDate: true,
      endDate: true,
      settings: { select: { offWeekdays: { select: { weekday: true } }, offDates: { select: { offDate: true } } } },
    },
  });

  return batches.some((batch) => isScheduledAttendanceSession(date, batch));
}

function parseParkDate(value: string | undefined): Date | null {
  if (!value) return todayPKT();
  const parsed = parseISO(value);
  return isValid(parsed) ? fromPKT(parsed) : null;
}

export async function GET(req: Request) {
  const capabilityAuth = await requireCapability("attendance.mark");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const parsedQuery = listQuerySchema.safeParse({
    parkId: new URL(req.url).searchParams.get("parkId") ?? "",
    date: new URL(req.url).searchParams.get("date") ?? undefined,
  });
  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const eventDate = parseParkDate(parsedQuery.data.date);
  if (!eventDate) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const scope = await resolveManagedPark(capabilityAuth.user, parsedQuery.data.parkId);
  if (scope.error) return scope.error;

  const [event, isScheduled, canFinalize] = await Promise.all([
    db.parkStaffAttendanceEvent.findUnique({
      where: { parkId_eventDate: { parkId: scope.park.id, eventDate } },
      select: { id: true, title: true, isClosed: true, closedAt: true, eventDate: true, _count: { select: { records: true } } },
    }),
    isParkOperatingDate(scope.park.id, eventDate),
    userHasCapability(capabilityAuth.user, "attendance.correct"),
  ]);

  return NextResponse.json({
    park: scope.park,
    date: formatPKT(eventDate, "yyyy-MM-dd"),
    isScheduled,
    canFinalize,
    event: event
      ? { ...event, closedAt: event.closedAt?.toISOString() ?? null, eventDate: event.eventDate.toISOString(), markedCount: event._count.records }
      : null,
  });
}

export async function POST(req: Request) {
  const capabilityAuth = await requireCapability("attendance.mark");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const parsedBody = materializeParkStaffAttendanceSchema.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const scope = await resolveManagedPark(capabilityAuth.user, parsedBody.data.parkId);
  if (scope.error) return scope.error;

  const eventDate = fromPKT(parseISO(parsedBody.data.eventDate));
  if (!(await isParkOperatingDate(scope.park.id, eventDate))) {
    return NextResponse.json({ error: "Staff attendance is available only on a scheduled operating day." }, { status: 400 });
  }

  try {
    const event = await db.$transaction(async (tx) => {
      const existing = await tx.parkStaffAttendanceEvent.findUnique({
        where: { parkId_eventDate: { parkId: scope.park.id, eventDate } },
        select: { id: true },
      });
      if (existing) throw new ExistingStaffRollCallError();

      const created = await tx.parkStaffAttendanceEvent.create({
        data: {
          parkId: scope.park.id,
          eventDate,
          title: `${scope.park.name} staff attendance`,
        },
      });
      await tx.auditLog.create({
        data: createAuditLogData({
          userId: capabilityAuth.user.id,
          action: "park_staff_attendance_create",
          entityType: "park_staff_attendance_events",
          entityId: created.id,
          newValues: { parkId: scope.park.id, eventDate: created.eventDate, source: "scheduled_card" },
        }),
      });
      return created;
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    if (error instanceof ExistingStaffRollCallError) {
      return NextResponse.json({ error: "Staff attendance already exists for this park and date" }, { status: 409 });
    }
    console.error("Park staff attendance create error", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: "Unable to create staff attendance" }, { status: 500 });
  }
}
