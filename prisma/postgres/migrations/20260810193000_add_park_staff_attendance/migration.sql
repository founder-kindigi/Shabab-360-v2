-- Additive park-level staff attendance. Student attendance remains group-scoped.
CREATE TABLE "park_staff_attendance_events" (
    "id" TEXT NOT NULL,
    "parkId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "park_staff_attendance_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "park_staff_attendance_events_parkId_eventDate_key" ON "park_staff_attendance_events"("parkId", "eventDate");
CREATE INDEX "park_staff_attendance_events_parkId_eventDate_idx" ON "park_staff_attendance_events"("parkId", "eventDate");
CREATE INDEX "park_staff_attendance_events_eventDate_idx" ON "park_staff_attendance_events"("eventDate");
ALTER TABLE "park_staff_attendance_events" ADD CONSTRAINT "park_staff_attendance_events_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "parks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "park_staff_attendance_records" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "markedBy" TEXT,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "park_staff_attendance_records_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "park_staff_attendance_records_eventId_staffId_key" ON "park_staff_attendance_records"("eventId", "staffId");
CREATE INDEX "park_staff_attendance_records_eventId_idx" ON "park_staff_attendance_records"("eventId");
CREATE INDEX "park_staff_attendance_records_staffId_idx" ON "park_staff_attendance_records"("staffId");
ALTER TABLE "park_staff_attendance_records" ADD CONSTRAINT "park_staff_attendance_records_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "park_staff_attendance_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "park_staff_attendance_records" ADD CONSTRAINT "park_staff_attendance_records_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_meta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
