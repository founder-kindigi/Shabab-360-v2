-- Additive nullable fields preserve existing participants and support the
-- owner-approved Lahore age and grade/class import.
ALTER TABLE "participants" ADD COLUMN "age" INTEGER;
ALTER TABLE "participants" ADD COLUMN "gradeClass" TEXT;
