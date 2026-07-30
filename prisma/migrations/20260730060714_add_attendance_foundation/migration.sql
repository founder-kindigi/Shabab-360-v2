-- Additive migration for Attendance Foundation (SQLite)
-- Adds dropout metadata, BatchSettings off-day configuration, StaffAttendanceRecord, and AttendanceRosterSnapshot.

ALTER TABLE "batch_settings" ADD COLUMN "automaticDropoutEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "batch_settings" ADD COLUMN "dropoutConsecutiveWeeks" INTEGER NOT NULL DEFAULT 3;

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_participants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "dateOfBirth" DATETIME,
    "age" INTEGER,
    "gradeClass" TEXT,
    "gender" TEXT,
    "address" TEXT,
    "groupId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'active',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dropoutAt" DATETIME,
    "dropoutReason" TEXT,
    "dropoutSource" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "participants_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_participants" ("id", "userId", "name", "phone", "dateOfBirth", "age", "gradeClass", "gender", "address", "groupId", "state", "joinedAt", "createdAt", "updatedAt")
SELECT "id", "userId", "name", "phone", "dateOfBirth", "age", "gradeClass", "gender", "address", "groupId", "state", "joinedAt", "createdAt", "updatedAt" FROM "participants";

DROP TABLE "participants";
ALTER TABLE "new_participants" RENAME TO "participants";
CREATE UNIQUE INDEX "participants_userId_key" ON "participants"("userId");
CREATE INDEX "participants_groupId_state_idx" ON "participants"("groupId", "state");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

CREATE TABLE "batch_off_weekdays" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchSettingsId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "batch_off_weekdays_batchSettingsId_fkey" FOREIGN KEY ("batchSettingsId") REFERENCES "batch_settings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "batch_off_weekdays_batchSettingsId_weekday_key" ON "batch_off_weekdays"("batchSettingsId", "weekday");

CREATE TABLE "batch_off_dates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchSettingsId" TEXT NOT NULL,
    "offDate" DATETIME NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "batch_off_dates_batchSettingsId_fkey" FOREIGN KEY ("batchSettingsId") REFERENCES "batch_settings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "batch_off_dates_batchSettingsId_offDate_key" ON "batch_off_dates"("batchSettingsId", "offDate");
CREATE INDEX "batch_off_dates_batchSettingsId_offDate_idx" ON "batch_off_dates"("batchSettingsId", "offDate");

CREATE TABLE "staff_attendance_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "markedBy" TEXT,
    "markedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "staff_attendance_records_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "attendance_events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "staff_attendance_records_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_meta" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "staff_attendance_records_eventId_staffId_key" ON "staff_attendance_records"("eventId", "staffId");
CREATE INDEX "staff_attendance_records_eventId_idx" ON "staff_attendance_records"("eventId");
CREATE INDEX "staff_attendance_records_staffId_idx" ON "staff_attendance_records"("staffId");

CREATE TABLE "attendance_roster_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "groupId" TEXT,
    "snapshotState" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_roster_snapshots_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "attendance_events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "attendance_roster_snapshots_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "attendance_roster_snapshots_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "attendance_roster_snapshots_eventId_participantId_key" ON "attendance_roster_snapshots"("eventId", "participantId");
CREATE INDEX "attendance_roster_snapshots_eventId_idx" ON "attendance_roster_snapshots"("eventId");
CREATE INDEX "attendance_roster_snapshots_participantId_idx" ON "attendance_roster_snapshots"("participantId");
