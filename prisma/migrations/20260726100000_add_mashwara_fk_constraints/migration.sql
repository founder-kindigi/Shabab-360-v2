-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_mashwara_action_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meetingId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mashwara_action_items_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "mashwara_meetings" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mashwara_action_items_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "collaboration_teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mashwara_action_items_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "staff_meta" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_mashwara_action_items" ("assignedToId", "createdAt", "description", "dueDate", "id", "meetingId", "status", "teamId") SELECT "assignedToId", "createdAt", "description", "dueDate", "id", "meetingId", "status", "teamId" FROM "mashwara_action_items";
DROP TABLE "mashwara_action_items";
ALTER TABLE "new_mashwara_action_items" RENAME TO "mashwara_action_items";
CREATE INDEX "mashwara_action_items_meetingId_status_idx" ON "mashwara_action_items"("meetingId", "status");
CREATE INDEX "mashwara_action_items_assignedToId_status_idx" ON "mashwara_action_items"("assignedToId", "status");
CREATE TABLE "new_mashwara_attendees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meetingId" TEXT NOT NULL,
    "staffMetaId" TEXT NOT NULL,
    "attendanceStatus" TEXT NOT NULL DEFAULT 'present',
    "notes" TEXT,
    "checkedInAt" DATETIME,
    CONSTRAINT "mashwara_attendees_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "mashwara_meetings" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mashwara_attendees_staffMetaId_fkey" FOREIGN KEY ("staffMetaId") REFERENCES "staff_meta" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_mashwara_attendees" ("attendanceStatus", "checkedInAt", "id", "meetingId", "notes", "staffMetaId") SELECT "attendanceStatus", "checkedInAt", "id", "meetingId", "notes", "staffMetaId" FROM "mashwara_attendees";
DROP TABLE "mashwara_attendees";
ALTER TABLE "new_mashwara_attendees" RENAME TO "mashwara_attendees";
CREATE INDEX "mashwara_attendees_meetingId_idx" ON "mashwara_attendees"("meetingId");
CREATE INDEX "mashwara_attendees_staffMetaId_idx" ON "mashwara_attendees"("staffMetaId");
CREATE UNIQUE INDEX "mashwara_attendees_meetingId_staffMetaId_key" ON "mashwara_attendees"("meetingId", "staffMetaId");
CREATE TABLE "new_mashwara_decisions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meetingId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "category" TEXT,
    "targetTeamId" TEXT,
    "assignedToId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mashwara_decisions_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "mashwara_meetings" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mashwara_decisions_targetTeamId_fkey" FOREIGN KEY ("targetTeamId") REFERENCES "collaboration_teams" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "mashwara_decisions_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "staff_meta" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_mashwara_decisions" ("assignedToId", "category", "createdAt", "decision", "id", "meetingId", "status", "targetTeamId") SELECT "assignedToId", "category", "createdAt", "decision", "id", "meetingId", "status", "targetTeamId" FROM "mashwara_decisions";
DROP TABLE "mashwara_decisions";
ALTER TABLE "new_mashwara_decisions" RENAME TO "mashwara_decisions";
CREATE INDEX "mashwara_decisions_meetingId_status_idx" ON "mashwara_decisions"("meetingId", "status");
CREATE TABLE "new_mashwara_meeting_shares" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meetingId" TEXT NOT NULL,
    "staffMetaId" TEXT NOT NULL,
    "grantedById" TEXT NOT NULL,
    "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "mashwara_meeting_shares_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "mashwara_meetings" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mashwara_meeting_shares_staffMetaId_fkey" FOREIGN KEY ("staffMetaId") REFERENCES "staff_meta" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mashwara_meeting_shares_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "staff_meta" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_mashwara_meeting_shares" ("grantedAt", "grantedById", "id", "isRevoked", "meetingId", "revokedAt", "staffMetaId") SELECT "grantedAt", "grantedById", "id", "isRevoked", "meetingId", "revokedAt", "staffMetaId" FROM "mashwara_meeting_shares";
DROP TABLE "mashwara_meeting_shares";
ALTER TABLE "new_mashwara_meeting_shares" RENAME TO "mashwara_meeting_shares";
CREATE INDEX "mashwara_meeting_shares_meetingId_staffMetaId_isRevoked_idx" ON "mashwara_meeting_shares"("meetingId", "staffMetaId", "isRevoked");
CREATE INDEX "mashwara_meeting_shares_staffMetaId_idx" ON "mashwara_meeting_shares"("staffMetaId");
CREATE UNIQUE INDEX "mashwara_meeting_shares_meetingId_staffMetaId_key" ON "mashwara_meeting_shares"("meetingId", "staffMetaId");
CREATE TABLE "new_mashwara_meetings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "minutesSummary" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "mashwara_meetings_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mashwara_meetings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_mashwara_meetings" ("cityId", "createdAt", "createdById", "id", "location", "minutesSummary", "scheduledAt", "status", "title", "updatedAt") SELECT "cityId", "createdAt", "createdById", "id", "location", "minutesSummary", "scheduledAt", "status", "title", "updatedAt" FROM "mashwara_meetings";
DROP TABLE "mashwara_meetings";
ALTER TABLE "new_mashwara_meetings" RENAME TO "mashwara_meetings";
CREATE INDEX "mashwara_meetings_cityId_status_idx" ON "mashwara_meetings"("cityId", "status");
CREATE INDEX "mashwara_meetings_scheduledAt_idx" ON "mashwara_meetings"("scheduledAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
