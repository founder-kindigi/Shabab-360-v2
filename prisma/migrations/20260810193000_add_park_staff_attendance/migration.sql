-- Additive park-level staff attendance. Student attendance remains group-scoped.
CREATE TABLE "park_staff_attendance_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parkId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventDate" DATETIME NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" DATETIME,
    "closedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "park_staff_attendance_events_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "parks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "park_staff_attendance_events_parkId_eventDate_key" ON "park_staff_attendance_events"("parkId", "eventDate");
CREATE INDEX "park_staff_attendance_events_parkId_eventDate_idx" ON "park_staff_attendance_events"("parkId", "eventDate");
CREATE INDEX "park_staff_attendance_events_eventDate_idx" ON "park_staff_attendance_events"("eventDate");

CREATE TABLE "park_staff_attendance_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "markedBy" TEXT,
    "markedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "park_staff_attendance_records_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "park_staff_attendance_events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "park_staff_attendance_records_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_meta" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "park_staff_attendance_records_eventId_staffId_key" ON "park_staff_attendance_records"("eventId", "staffId");
CREATE INDEX "park_staff_attendance_records_eventId_idx" ON "park_staff_attendance_records"("eventId");
CREATE INDEX "park_staff_attendance_records_staffId_idx" ON "park_staff_attendance_records"("staffId");
