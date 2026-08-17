ALTER TABLE "batch_settings" ADD COLUMN "classWeekdays" TEXT NOT NULL DEFAULT '[0,6]';

CREATE TABLE "batch_class_dates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "classDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "batch_class_dates_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "operational_off_dates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cityId" TEXT NOT NULL,
    "offDate" DATETIME NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "operational_off_dates_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "staff_attendance_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parkId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventDate" DATETIME NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" DATETIME,
    "closedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "staff_attendance_events_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "parks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "staff_attendance_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "staffMetaId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "markedBy" TEXT,
    "markedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "staff_attendance_records_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "staff_attendance_events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "staff_attendance_records_staffMetaId_fkey" FOREIGN KEY ("staffMetaId") REFERENCES "staff_meta" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "batch_class_dates_batchId_classDate_key" ON "batch_class_dates"("batchId", "classDate");
CREATE INDEX "batch_class_dates_classDate_idx" ON "batch_class_dates"("classDate");
CREATE UNIQUE INDEX "operational_off_dates_cityId_offDate_key" ON "operational_off_dates"("cityId", "offDate");
CREATE INDEX "operational_off_dates_offDate_idx" ON "operational_off_dates"("offDate");
CREATE UNIQUE INDEX "attendance_events_groupId_eventDate_key" ON "attendance_events"("groupId", "eventDate");
CREATE UNIQUE INDEX "staff_attendance_events_parkId_eventDate_key" ON "staff_attendance_events"("parkId", "eventDate");
CREATE INDEX "staff_attendance_events_eventDate_idx" ON "staff_attendance_events"("eventDate");
CREATE UNIQUE INDEX "staff_attendance_records_eventId_staffMetaId_key" ON "staff_attendance_records"("eventId", "staffMetaId");
CREATE INDEX "staff_attendance_records_eventId_idx" ON "staff_attendance_records"("eventId");
CREATE INDEX "staff_attendance_records_staffMetaId_idx" ON "staff_attendance_records"("staffMetaId");
CREATE INDEX "staff_attendance_records_markedAt_idx" ON "staff_attendance_records"("markedAt");
