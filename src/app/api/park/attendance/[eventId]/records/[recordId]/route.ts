import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { requireResolvedGroupScope, groupHierarchyInclude } from "@/lib/auth/hierarchy";
import { createAuditLogData } from "@/lib/audit";
import { db } from "@/lib/db";
import { editAttendanceRecordSchema } from "@/lib/attendance/schemas";
import type { SessionUser } from "@/lib/auth/scope";
const EDIT_ROLES = ["super_admin", "program_admin", "city_head", "park_lead"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ eventId: string; recordId: string }> }) {
  const auth = await requireAuth(); if (auth instanceof NextResponse) return auth;
  const capability = await requireCapability("attendance.correct"); if (capability instanceof NextResponse) return capability;
  const match = req.headers.get("If-Match");
  if (!match) return NextResponse.json({ error: "Reload the record before correcting it" }, { status: 428 });
  const parsed = editAttendanceRecordSchema.extend({ expectedVersion: (await import("zod")).z.string().datetime() }).safeParse({ ...await req.json().catch(() => ({})), expectedVersion: match });
  if (!parsed.success) return NextResponse.json({ error: "Invalid correction or record version" }, { status: 400 });
  const { eventId, recordId } = await params;
  try {
    return await db.$transaction(async tx => {
      const event = await tx.attendanceEvent.findUnique({ where: { id: eventId }, include: { group: { include: groupHierarchyInclude } } });
      if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
      const staff = await tx.staffMeta.findUnique({ where: { userId: auth.user.id } });
      if (!staff?.isActive) return NextResponse.json({ error: "Active staff assignment required" }, { status: 403 });
      const actor = { ...auth.user, role: staff.role as SessionUser["role"], assignedCityId: staff.assignedCityId, assignedParkId: staff.assignedParkId, assignedGroupId: staff.assignedGroupId };
      const denied = requireResolvedGroupScope(actor, { ...event.group, id: event.groupId }, EDIT_ROLES); if (denied) return denied;
      // All record writers serialize against the event, including privileged corrections.
      await tx.attendanceEvent.update({ where: { id: eventId }, data: { updatedAt: new Date() } });
      const record = await tx.attendanceRecord.findUnique({ where: { id: recordId } });
      if (!record || record.eventId !== eventId) return NextResponse.json({ error: "Record not found" }, { status: 404 });
      if (record.markedAt.toISOString() !== match) return NextResponse.json({ error: "A newer mark exists. Reload and review the correction." }, { status: 409 });
      const updated = await tx.attendanceRecord.update({ where: { id: recordId, markedAt: record.markedAt }, data: { status: parsed.data.status, editReason: parsed.data.editReason, markedBy: staff.id, markedAt: new Date(Math.max(Date.now(), record.markedAt.getTime() + 1)) } });
      await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "attendance_edit", entityType: "attendance_records", entityId: recordId, oldValues: { status: record.status }, newValues: { status: updated.status }, reason: parsed.data.editReason }) });
      return NextResponse.json({ success: true, record: { id: updated.id, status: updated.status, editReason: updated.editReason, markedAt: updated.markedAt.toISOString() } });
    });
  } catch (error) {
    return NextResponse.json({ error: (error as { code?: string }).code === "P2025" ? "The record changed. Reload before correcting it." : "Correction was not acknowledged. Reload the record before retrying." }, { status: (error as { code?: string }).code === "P2025" ? 409 : 503 });
  }
}
