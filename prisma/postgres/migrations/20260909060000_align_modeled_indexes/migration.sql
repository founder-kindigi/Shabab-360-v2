-- Restore indexes declared by the staged Prisma schema. No row data changes.
CREATE INDEX "event_registrations_participantId_idx" ON "event_registrations"("participantId");
CREATE INDEX "park_staff_attendance_records_markedAt_idx" ON "park_staff_attendance_records"("markedAt");
