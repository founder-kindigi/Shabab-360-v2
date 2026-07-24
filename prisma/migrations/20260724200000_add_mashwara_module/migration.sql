-- Mashwara module: Weekly meetings, attendees, decisions, action items, and shares

CREATE TABLE "mashwara_meetings" (
  "id" TEXT NOT NULL,
  "cityId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "scheduledAt" DATETIME NOT NULL,
  "location" TEXT,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "minutesSummary" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "mashwara_meetings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mashwara_attendees" (
  "id" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "staffMetaId" TEXT NOT NULL,
  "attendanceStatus" TEXT NOT NULL DEFAULT 'present',
  "notes" TEXT,
  "checkedInAt" DATETIME,
  CONSTRAINT "mashwara_attendees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mashwara_decisions" (
  "id" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "category" TEXT,
  "targetTeamId" TEXT,
  "assignedToId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mashwara_decisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mashwara_action_items" (
  "id" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "assignedToId" TEXT NOT NULL,
  "dueDate" DATETIME,
  "status" TEXT NOT NULL DEFAULT 'open',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mashwara_action_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mashwara_meeting_shares" (
  "id" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "staffMetaId" TEXT NOT NULL,
  "grantedById" TEXT NOT NULL,
  "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" DATETIME,
  "isRevoked" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "mashwara_meeting_shares_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mashwara_attendees_meetingId_staffMetaId_key"
ON "mashwara_attendees"("meetingId", "staffMetaId");

CREATE INDEX "mashwara_attendees_meetingId_idx"
ON "mashwara_attendees"("meetingId");

CREATE INDEX "mashwara_attendees_staffMetaId_idx"
ON "mashwara_attendees"("staffMetaId");

CREATE INDEX "mashwara_meetings_cityId_status_idx"
ON "mashwara_meetings"("cityId", "status");

CREATE INDEX "mashwara_meetings_scheduledAt_idx"
ON "mashwara_meetings"("scheduledAt");

CREATE INDEX "mashwara_decisions_meetingId_status_idx"
ON "mashwara_decisions"("meetingId", "status");

CREATE INDEX "mashwara_action_items_meetingId_status_idx"
ON "mashwara_action_items"("meetingId", "status");

CREATE INDEX "mashwara_action_items_assignedToId_status_idx"
ON "mashwara_action_items"("assignedToId", "status");

CREATE UNIQUE INDEX "mashwara_meeting_shares_meetingId_staffMetaId_key"
ON "mashwara_meeting_shares"("meetingId", "staffMetaId");

CREATE INDEX "mashwara_meeting_shares_meetingId_staffMetaId_isRevoked_idx"
ON "mashwara_meeting_shares"("meetingId", "staffMetaId", "isRevoked");

CREATE INDEX "mashwara_meeting_shares_staffMetaId_idx"
ON "mashwara_meeting_shares"("staffMetaId");
