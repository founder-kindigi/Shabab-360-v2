-- Repair Preview schema drift while preserving all existing rows.
ALTER TABLE "participants" ALTER COLUMN "groupId" DROP NOT NULL;

ALTER TABLE "participants" DROP CONSTRAINT IF EXISTS "participants_groupId_fkey";
ALTER TABLE "participants"
  ADD CONSTRAINT "participants_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "groups"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
