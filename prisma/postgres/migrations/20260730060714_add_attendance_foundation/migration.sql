-- Additive migration for Attendance Foundation (PostgreSQL)
-- Adds dropout metadata, BatchSettings off-day configuration, StaffAttendanceRecord, and AttendanceRosterSnapshot.

ALTER TABLE "batch_settings" ADD COLUMN "automaticDropoutEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "dropoutConsecutiveWeeks" INTEGER NOT NULL DEFAULT 3;

ALTER TABLE "participants" ALTER COLUMN "groupId" DROP NOT NULL,
ADD COLUMN "dropoutAt" TIMESTAMP(3),
ADD COLUMN "dropoutReason" TEXT,
ADD COLUMN "dropoutSource" TEXT;

ALTER TABLE "participants" DROP CONSTRAINT IF EXISTS "participants_groupId_fkey";
ALTER TABLE "participants" ADD CONSTRAINT "participants_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "batch_off_weekdays" (
    "id" TEXT NOT NULL,
    "batchSettingsId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_off_weekdays_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "batch_off_weekdays_batchSettingsId_weekday_key" ON "batch_off_weekdays"("batchSettingsId", "weekday");
ALTER TABLE "batch_off_weekdays" ADD CONSTRAINT "batch_off_weekdays_batchSettingsId_fkey" FOREIGN KEY ("batchSettingsId") REFERENCES "batch_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "batch_off_dates" (
    "id" TEXT NOT NULL,
    "batchSettingsId" TEXT NOT NULL,
    "offDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_off_dates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "batch_off_dates_batchSettingsId_offDate_key" ON "batch_off_dates"("batchSettingsId", "offDate");
CREATE INDEX "batch_off_dates_batchSettingsId_offDate_idx" ON "batch_off_dates"("batchSettingsId", "offDate");
ALTER TABLE "batch_off_dates" ADD CONSTRAINT "batch_off_dates_batchSettingsId_fkey" FOREIGN KEY ("batchSettingsId") REFERENCES "batch_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "staff_attendance_records" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "markedBy" TEXT,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_attendance_records_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "staff_attendance_records_eventId_staffId_key" ON "staff_attendance_records"("eventId", "staffId");
CREATE INDEX "staff_attendance_records_eventId_idx" ON "staff_attendance_records"("eventId");
CREATE INDEX "staff_attendance_records_staffId_idx" ON "staff_attendance_records"("staffId");
ALTER TABLE "staff_attendance_records" ADD CONSTRAINT "staff_attendance_records_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "attendance_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff_attendance_records" ADD CONSTRAINT "staff_attendance_records_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_meta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "attendance_roster_snapshots" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "groupId" TEXT,
    "snapshotState" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_roster_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "attendance_roster_snapshots_eventId_participantId_key" ON "attendance_roster_snapshots"("eventId", "participantId");
CREATE INDEX "attendance_roster_snapshots_eventId_idx" ON "attendance_roster_snapshots"("eventId");
CREATE INDEX "attendance_roster_snapshots_participantId_idx" ON "attendance_roster_snapshots"("participantId");
ALTER TABLE "attendance_roster_snapshots" ADD CONSTRAINT "attendance_roster_snapshots_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "attendance_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_roster_snapshots" ADD CONSTRAINT "attendance_roster_snapshots_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_roster_snapshots" ADD CONSTRAINT "attendance_roster_snapshots_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
