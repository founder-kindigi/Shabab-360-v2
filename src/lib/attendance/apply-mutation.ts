import { checkAttendanceAlerts } from "@/lib/attendance-alerts";
import { eligibleForSession } from "./opportunities";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { groupHierarchyInclude, requireResolvedGroupScope } from "@/lib/auth/hierarchy";
import { ATTENDANCE_ROLES } from "@/lib/auth/authorize";
import type { SessionUser } from "@/lib/auth/scope";
import { syncMutationSchema } from "./schemas";
import type { z } from "zod";

export type AttendanceMutation = z.infer<typeof syncMutationSchema>;
export type AttendanceMutationResult = {
  mutationId: string; status: "processed" | "failed"; recordId: string | null;
  version?: string; alertsPending?: boolean; error: string | null; code: string | null; retryable: boolean;
};
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

/** Every writer takes the event row lock before checking closure and the record version. */
export async function applyAttendanceMutation(user: SessionUser, mutation: AttendanceMutation): Promise<AttendanceMutationResult> {
  const fail = (code: string, error: string, retryable = false): AttendanceMutationResult => ({ mutationId: mutation.mutationId, status: "failed", recordId: null, error, code, retryable });
  if (!user.id || user.mustResetPwd || mutation.ownerId !== user.id) return fail("OWNER_MISMATCH", "This mark belongs to another account");
  const receiptId = hash(JSON.stringify(["attendance", user.id, mutation.mutationId]));
  const requestHash = hash(JSON.stringify([mutation.eventId, mutation.participantId, mutation.status, mutation.expectedVersion, mutation.expectedResetVersion, mutation.markedAt ?? null]));
  try {
    const result = await db.$transaction(async tx => {
      const staff = await tx.staffMeta.findUnique({ where: { userId: user.id } });
      if (!staff?.isActive) return fail("FORBIDDEN", "An active staff assignment is required");
      const event = await tx.attendanceEvent.findUnique({ where: { id: mutation.eventId }, include: { group: { include: groupHierarchyInclude } } });
      if (!event) return fail("EVENT_NOT_FOUND", "Event not found");
      const actor = { ...user, role: staff.role as SessionUser["role"], assignedCityId: staff.assignedCityId, assignedParkId: staff.assignedParkId, assignedGroupId: staff.assignedGroupId };
      if (requireResolvedGroupScope(actor, { ...event.group, id: event.groupId }, ATTENDANCE_ROLES) instanceof NextResponse) return fail("FORBIDDEN", "Forbidden");
      // A no-op update acquires the same row lock used by close/reopen, on both providers.
      const open = await tx.attendanceEvent.updateMany({ where: { id: event.id, isClosed: false }, data: { isClosed: false } });
      const receipts = await tx.$queryRaw<Array<{ requestHash: string; resultJson: string }>>`SELECT "requestHash", "resultJson" FROM "operation_receipts" WHERE "id" = ${receiptId}`;
      if (receipts[0]) return receipts[0].requestHash === requestHash ? JSON.parse(receipts[0].resultJson) : fail("MUTATION_REUSED", "Mutation identifier was already used for different content");
      if (open.count !== 1) return fail("EVENT_LOCKED", "Attendance is locked");
      const currentEvent = await tx.attendanceEvent.findUnique({ where: { id: event.id }, select: { resetVersion: true } });
      if (currentEvent?.resetVersion !== mutation.expectedResetVersion) return fail("EVENT_RESET", "This session was reset. Reload and review the mark before submitting again.");
      const participant = await tx.participant.findFirst({ where: { id: mutation.participantId, groupId: event.groupId } });
      if (!participant) return fail("PARTICIPANT_SCOPE_CHANGED", "Participant is no longer in this group");
      if (!eligibleForSession(participant, event.eventDate)) return fail("ATTENDANCE_DISCONTINUED", "Participant was not eligible for this session");
      const where = { eventId: event.id, participantId: participant.id };
      const existing = await tx.attendanceRecord.findUnique({ where: { eventId_participantId: where } });
      if ((existing?.markedAt.toISOString() ?? null) !== mutation.expectedVersion) return fail("VERSION_CONFLICT", "A newer mark exists. Reload and review both values before correcting it.");
      const markedAt = new Date(Math.max(Date.now(), (existing?.markedAt.getTime() ?? 0) + 1));
      const data = { status: mutation.status, markedBy: staff.id, markedAt };
      const record = existing
        ? await tx.attendanceRecord.update({ where: { id: existing.id, markedAt: existing.markedAt }, data })
        : await tx.attendanceRecord.create({ data: { ...where, ...data } });
      const result: AttendanceMutationResult = { mutationId: mutation.mutationId, status: "processed", recordId: record.id, version: markedAt.toISOString(), error: null, code: null, retryable: false };
      await tx.auditLog.create({ data: createAuditLogData({ userId: user.id, action: "attendance_mark", entityType: "attendance_records", entityId: record.id, oldValues: existing ? { status: existing.status } : undefined, newValues: { status: mutation.status, mutationId: mutation.mutationId } }) });
      const resultJson = JSON.stringify(result);
      await tx.$executeRaw`INSERT INTO "operation_receipts" ("id", "requestHash", "resultJson") VALUES (${receiptId}, ${requestHash}, ${resultJson})`;
      return result;
    });
    // A notification failure must not turn a committed mark into an unacknowledged write.
    // Replayed marks retry this idempotently guarded alert evaluation too.
    if (result.status === "processed") {
      try { await checkAttendanceAlerts(mutation.participantId, mutation.eventId); }
      catch { return { ...result, alertsPending: true }; }
    }
    return result;
  } catch (error) {
    const code = (error as { code?: string }).code;
    return code === "P2025" ? fail("VERSION_CONFLICT", "The record changed during this edit") : fail("PROCESSING_ERROR", "Mark was not acknowledged. Retry with the same mutation identifier.", true);
  }
}
