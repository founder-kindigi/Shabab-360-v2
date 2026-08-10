import { NextResponse } from "next/server";
import {
  ATTENDANCE_ROLES,
  requireCapability,
  requireResourceScope,
} from "@/lib/auth/authorize";
import { createAuditLogData } from "@/lib/audit";
import { markParkStaffAttendanceSchema } from "@/lib/attendance/schemas";
import { db } from "@/lib/db";

class ClosedStaffRollCallError extends Error {}

function canManageParkStaffAttendance(role: string | undefined): boolean {
  return role === "park_lead" || role === "park_admin";
}

function requireStaffRollCallManager(user: { role?: string }, parkId: string) {
  if (!canManageParkStaffAttendance(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return requireResourceScope(user, { parkId }, ATTENDANCE_ROLES);
}

async function getEventInScope(user: { role?: string }, eventId: string) {
  const event = await db.parkStaffAttendanceEvent.findUnique({
    where: { id: eventId },
    select: { id: true, parkId: true, title: true, eventDate: true, isClosed: true, closedAt: true },
  });
  if (!event) return { error: NextResponse.json({ error: "Staff attendance event not found" }, { status: 404 }) };

  const scopeError = requireStaffRollCallManager(user, event.parkId);
  if (scopeError) return { error: scopeError };
  return { event };
}

export async function GET(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const capabilityAuth = await requireCapability("attendance.mark");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;
  const { eventId } = await params;
  const result = await getEventInScope(capabilityAuth.user, eventId);
  if (result.error) return result.error;

  const [staff, records] = await Promise.all([
    db.staffMeta.findMany({
      where: {
        isActive: true,
        OR: [
          { assignedParkId: result.event.parkId },
          { assignedGroup: { batch: { parkId: result.event.parkId } } },
        ],
      },
      select: { id: true, role: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    db.parkStaffAttendanceRecord.findMany({
      where: { eventId: result.event.id },
      select: { id: true, staffId: true, status: true, markedAt: true },
    }),
  ]);
  const recordByStaffId = new Map(records.map((record) => [record.staffId, record]));

  return NextResponse.json({
    event: { ...result.event, eventDate: result.event.eventDate.toISOString(), closedAt: result.event.closedAt?.toISOString() ?? null },
    roster: staff.map((member) => {
      const record = recordByStaffId.get(member.id);
      return {
        staffId: member.id,
        name: member.user.name,
        role: member.role,
        status: record?.status ?? null,
        recordId: record?.id ?? null,
        markedAt: record?.markedAt.toISOString() ?? null,
      };
    }),
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const capabilityAuth = await requireCapability("attendance.mark");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;
  const { eventId } = await params;
  const parsedBody = markParkStaffAttendanceSchema.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const result = await getEventInScope(capabilityAuth.user, eventId);
  if (result.error) return result.error;
  if (result.event.isClosed) return NextResponse.json({ error: "Staff attendance event is closed" }, { status: 409 });

  const targetStaff = await db.staffMeta.findUnique({
    where: { id: parsedBody.data.staffId },
    select: {
      id: true,
      isActive: true,
      assignedParkId: true,
      assignedGroup: { select: { batch: { select: { parkId: true } } } },
    },
  });
  if (!targetStaff) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  if (!targetStaff.isActive || (targetStaff.assignedParkId !== result.event.parkId && targetStaff.assignedGroup?.batch.parkId !== result.event.parkId)) {
    return NextResponse.json({ error: "Staff member is not active in this park" }, { status: 403 });
  }

  try {
    const record = await db.$transaction(async (tx) => {
      const openEvent = await tx.parkStaffAttendanceEvent.findFirst({
        where: { id: result.event.id, isClosed: false },
        select: { id: true },
      });
      if (!openEvent) throw new ClosedStaffRollCallError();

      const previous = await tx.parkStaffAttendanceRecord.findUnique({
        where: { eventId_staffId: { eventId: result.event.id, staffId: targetStaff.id } },
        select: { status: true },
      });
      const updated = await tx.parkStaffAttendanceRecord.upsert({
        where: { eventId_staffId: { eventId: result.event.id, staffId: targetStaff.id } },
        create: {
          eventId: result.event.id,
          staffId: targetStaff.id,
          status: parsedBody.data.status,
          markedBy: capabilityAuth.user.id,
          editReason: parsedBody.data.editReason,
        },
        update: {
          status: parsedBody.data.status,
          markedBy: capabilityAuth.user.id,
          markedAt: new Date(),
          editReason: parsedBody.data.editReason,
        },
      });
      await tx.auditLog.create({
        data: createAuditLogData({
          userId: capabilityAuth.user.id,
          action: "park_staff_attendance_mark",
          entityType: "park_staff_attendance_records",
          entityId: updated.id,
          oldValues: previous ? { status: previous.status } : undefined,
          newValues: { eventId: result.event.id, staffId: targetStaff.id, status: parsedBody.data.status },
          reason: parsedBody.data.editReason,
        }),
      });
      return updated;
    });

    return NextResponse.json({ record });
  } catch (error) {
    if (error instanceof ClosedStaffRollCallError) {
      return NextResponse.json({ error: "Staff attendance event is closed" }, { status: 409 });
    }
    console.error("Park staff attendance mark error", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: "Unable to mark staff attendance" }, { status: 500 });
  }
}
