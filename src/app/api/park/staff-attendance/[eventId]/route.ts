import { NextResponse } from "next/server";
import { createAuditLogData } from "@/lib/audit";
import { ATTENDANCE_ROLES, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { markStaffAttendanceSchema } from "@/lib/attendance/schemas";
import { db } from "@/lib/db";

class ClosedStaffAttendanceError extends Error {}

type ScopedStaffEvent =
  | { event: { id: string; parkId: string; title: string; eventDate: Date; isClosed: boolean; closedAt: Date | null }; error: null }
  | { event: null; error: NextResponse };

async function scopedEvent(user: Parameters<typeof requireResourceScope>[0], eventId: string): Promise<ScopedStaffEvent> {
  const event = await db.staffAttendanceEvent.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      parkId: true,
      title: true,
      eventDate: true,
      isClosed: true,
      closedAt: true,
      park: { select: { cityId: true } },
    },
  });
  if (!event) return { error: NextResponse.json({ error: "Staff attendance not found" }, { status: 404 }), event: null };
  const scopeError = requireResourceScope(user, { cityId: event.park.cityId, parkId: event.parkId }, ATTENDANCE_ROLES);
  const { park: _park, ...scoped } = event;
  return scopeError ? { error: scopeError, event: null } : { event: scoped, error: null };
}

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const auth = await requireCapability("attendance.staff.manage");
  if (auth instanceof NextResponse) return auth;
  const result = await scopedEvent(auth.user, (await params).eventId);
  if (result.error) return result.error;
  const [staff, records] = await Promise.all([
    db.staffMeta.findMany({
      where: {
        isActive: true,
        user: { isActive: true },
        OR: [{ assignedParkId: result.event.parkId }, { assignedGroup: { batch: { parkId: result.event.parkId } } }],
      },
      select: { id: true, role: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    db.staffAttendanceRecord.findMany({ where: { eventId: result.event.id }, select: { id: true, staffMetaId: true, status: true, markedAt: true } }),
  ]);
  const byStaff = new Map(records.map((record) => [record.staffMetaId, record]));
  return NextResponse.json({
    event: result.event,
    roster: staff.map((member) => ({
      staffMetaId: member.id,
      name: member.user.name,
      role: member.role,
      recordId: byStaff.get(member.id)?.id ?? null,
      status: byStaff.get(member.id)?.status ?? null,
    })),
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const auth = await requireCapability("attendance.staff.manage");
  if (auth instanceof NextResponse) return auth;
  const parsed = markStaffAttendanceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const result = await scopedEvent(auth.user, (await params).eventId);
  if (result.error) return result.error;
  if (result.event.isClosed) return NextResponse.json({ error: "Staff attendance is locked" }, { status: 409 });
  const target = await db.staffMeta.findUnique({
    where: { id: parsed.data.staffMetaId },
    select: { id: true, isActive: true, user: { select: { isActive: true } }, assignedParkId: true, assignedGroup: { select: { batch: { select: { parkId: true } } } } },
  });
  if (!target) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  if (!target.isActive || !target.user.isActive || (target.assignedParkId !== result.event.parkId && target.assignedGroup?.batch.parkId !== result.event.parkId)) {
    return NextResponse.json({ error: "Staff member is not active in this park" }, { status: 403 });
  }
  try {
    const record = await db.$transaction(async (tx) => {
      const open = await tx.staffAttendanceEvent.findFirst({ where: { id: result.event.id, isClosed: false }, select: { id: true } });
      if (!open) throw new ClosedStaffAttendanceError();
      const previous = await tx.staffAttendanceRecord.findUnique({ where: { eventId_staffMetaId: { eventId: result.event.id, staffMetaId: target.id } }, select: { status: true } });
      const updated = await tx.staffAttendanceRecord.upsert({
        where: { eventId_staffMetaId: { eventId: result.event.id, staffMetaId: target.id } },
        create: { eventId: result.event.id, staffMetaId: target.id, status: parsed.data.status, markedBy: auth.user.id, editReason: parsed.data.editReason },
        update: { status: parsed.data.status, markedBy: auth.user.id, markedAt: new Date(), editReason: parsed.data.editReason },
      });
      await tx.auditLog.create({ data: createAuditLogData({
        userId: auth.user.id,
        action: "staff_attendance_mark",
        entityType: "staff_attendance_records",
        entityId: updated.id,
        oldValues: previous ?? undefined,
        newValues: { eventId: result.event.id, staffMetaId: target.id, status: parsed.data.status },
        reason: parsed.data.editReason,
      }) });
      return updated;
    });
    return NextResponse.json({ record });
  } catch (error) {
    if (error instanceof ClosedStaffAttendanceError) return NextResponse.json({ error: "Staff attendance is locked" }, { status: 409 });
    throw error;
  }
}
