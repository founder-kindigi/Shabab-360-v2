CREATE TABLE "event_registrations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'registered',
    "consentStatus" TEXT NOT NULL DEFAULT 'not_required',
    "feeStatus" TEXT NOT NULL DEFAULT 'not_required',
    "attendanceRecordId" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "event_registrations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_registrations_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_registrations_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "attendance_records"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "event_registrations_eventId_participantId_key" ON "event_registrations"("eventId", "participantId");
CREATE UNIQUE INDEX "event_registrations_attendanceRecordId_key" ON "event_registrations"("attendanceRecordId");
CREATE INDEX "event_registrations_eventId_status_idx" ON "event_registrations"("eventId", "status");
CREATE INDEX "event_registrations_participantId_status_idx" ON "event_registrations"("participantId", "status");
