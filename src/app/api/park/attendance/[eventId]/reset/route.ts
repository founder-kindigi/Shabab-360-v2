import { NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { requireResolvedGroupScope, groupHierarchyInclude } from "@/lib/auth/hierarchy";
import { createAuditLogData } from "@/lib/audit";
import { db } from "@/lib/db";
const ROLES = ["super_admin", "program_admin", "city_head", "park_lead"] as const;
export async function DELETE(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const auth = await requireAuth(); if (auth instanceof NextResponse) return auth;
  const capability = await requireCapability("attendance.correct"); if (capability instanceof NextResponse) return capability;
  const version = req.headers.get("If-Match");
  if (version === null) return NextResponse.json({ error: "Reload the roster before resetting it" }, { status: 428 });
  if (!/^[0-9]{1,9}$/.test(version)) return NextResponse.json({ error: "Invalid reset version" }, { status: 400 });
  const { eventId } = await params;
  try {
    const event = await db.attendanceEvent.findUnique({ where: { id: eventId }, include: { group: { include: groupHierarchyInclude } } });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    const denied = requireResolvedGroupScope(auth.user, { ...event.group, id: event.groupId }, ROLES); if (denied) return denied;
    return await db.$transaction(async tx => {
      // Updating the event takes the same lock as every mark/correction/close operation.
      const changed = await tx.attendanceEvent.updateMany({ where: { id: eventId, isClosed: false, resetVersion: Number(version) }, data: { resetVersion: { increment: 1 } } });
      if (changed.count !== 1) return NextResponse.json({ error: "Session closed or reset since it was loaded. Reload before resetting." }, { status: 409 });
      const result = await tx.attendanceRecord.deleteMany({ where: { eventId } });
      await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "attendance_reset", entityType: "attendance_events", entityId: eventId, newValues: { deletedCount: result.count, resetVersion: Number(version) + 1 } }) });
      return NextResponse.json({ deleted: result.count, resetVersion: Number(version) + 1, message: "Attendance reset. Older queued marks require review." });
    });
  } catch { return NextResponse.json({ error: "Reset was not acknowledged. Reload before retrying." }, { status: 503 }); }
}
