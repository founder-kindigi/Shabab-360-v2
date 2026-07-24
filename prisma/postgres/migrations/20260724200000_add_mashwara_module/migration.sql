-- Mashwara module: Weekly meetings, attendees, decisions, action items, and shares

CREATE TYPE "MashwaraMeetingStatus" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE "MashwaraAttendanceStatus" AS ENUM ('present', 'absent', 'excused');
CREATE TYPE "MashwaraDecisionStatus" AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE "MashwaraActionItemStatus" AS ENUM ('open', 'in_progress', 'completed');

CREATE TABLE "mashwara_meetings" (
  "id" TEXT NOT NULL,
  "cityId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "location" TEXT,
  "status" "MashwaraMeetingStatus" NOT NULL DEFAULT 'scheduled',
  "minutesSummary" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mashwara_meetings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mashwara_attendees" (
  "id" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "staffMetaId" TEXT NOT NULL,
  "attendanceStatus" "MashwaraAttendanceStatus" NOT NULL DEFAULT 'present',
  "notes" TEXT,
  "checkedInAt" TIMESTAMP(3),
  CONSTRAINT "mashwara_attendees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mashwara_decisions" (
  "id" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "category" TEXT,
  "targetTeamId" TEXT,
  "assignedToId" TEXT,
  "status" "MashwaraDecisionStatus" NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mashwara_decisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mashwara_action_items" (
  "id" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "assignedToId" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3),
  "status" "MashwaraActionItemStatus" NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mashwara_action_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mashwara_meeting_shares" (
  "id" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "staffMetaId" TEXT NOT NULL,
  "grantedById" TEXT NOT NULL,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
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

ALTER TABLE "mashwara_meetings" ADD CONSTRAINT "mashwara_meetings_cityId_fkey"
FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mashwara_meetings" ADD CONSTRAINT "mashwara_meetings_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mashwara_attendees" ADD CONSTRAINT "mashwara_attendees_meetingId_fkey"
FOREIGN KEY ("meetingId") REFERENCES "mashwara_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mashwara_attendees" ADD CONSTRAINT "mashwara_attendees_staffMetaId_fkey"
FOREIGN KEY ("staffMetaId") REFERENCES "staff_meta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mashwara_decisions" ADD CONSTRAINT "mashwara_decisions_meetingId_fkey"
FOREIGN KEY ("meetingId") REFERENCES "mashwara_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mashwara_decisions" ADD CONSTRAINT "mashwara_decisions_targetTeamId_fkey"
FOREIGN KEY ("targetTeamId") REFERENCES "collaboration_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "mashwara_decisions" ADD CONSTRAINT "mashwara_decisions_assignedToId_fkey"
FOREIGN KEY ("assignedToId") REFERENCES "staff_meta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "mashwara_action_items" ADD CONSTRAINT "mashwara_action_items_meetingId_fkey"
FOREIGN KEY ("meetingId") REFERENCES "mashwara_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mashwara_action_items" ADD CONSTRAINT "mashwara_action_items_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "collaboration_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mashwara_action_items" ADD CONSTRAINT "mashwara_action_items_assignedToId_fkey"
FOREIGN KEY ("assignedToId") REFERENCES "staff_meta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mashwara_meeting_shares" ADD CONSTRAINT "mashwara_meeting_shares_meetingId_fkey"
FOREIGN KEY ("meetingId") REFERENCES "mashwara_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mashwara_meeting_shares" ADD CONSTRAINT "mashwara_meeting_shares_staffMetaId_fkey"
FOREIGN KEY ("staffMetaId") REFERENCES "staff_meta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mashwara_meeting_shares" ADD CONSTRAINT "mashwara_meeting_shares_grantedById_fkey"
FOREIGN KEY ("grantedById") REFERENCES "staff_meta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
