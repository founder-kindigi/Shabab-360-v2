-- Align the migrated catalog with the current model without deleting historical rows.
-- Existing unassigned participants or orphaned foreign keys abort this migration.
-- Resolve those rows through a reviewed mapping before retrying; never invent a group.
BEGIN;
ALTER TABLE "participants" ALTER COLUMN "groupId" SET NOT NULL;
ALTER TABLE "participants" DROP CONSTRAINT "participants_groupId_fkey";
ALTER TABLE "participants" ADD CONSTRAINT "participants_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admission_applications" DROP CONSTRAINT "admission_applications_convertedParticipantId_fkey";
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_convertedParticipantId_fkey" FOREIGN KEY ("convertedParticipantId") REFERENCES "participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "park_lessons" ADD CONSTRAINT "park_lessons_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "parks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "park_routine_slots" ADD CONSTRAINT "park_routine_slots_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "parks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Defaults apply only to future writes; preserve current explicit settings and fee statuses.
ALTER TABLE "batch_settings" ALTER COLUMN "automaticDropoutEnabled" SET DEFAULT true;
ALTER TABLE "event_registrations" ALTER COLUMN "feeStatus" SET DEFAULT 'unpaid';
ALTER TABLE "event_registrations" ADD COLUMN "feeAmount" DECIMAL(65,30) DEFAULT 0;
-- False never asserts that consent or medical information has been received.
ALTER TABLE "event_registrations" ADD COLUMN "hasConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_registrations" ADD COLUMN "hasMedical" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_registrations" ADD COLUMN "checkedInAt" TIMESTAMP(3);
COMMIT;
