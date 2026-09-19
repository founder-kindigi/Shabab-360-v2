-- The application validates role, activity and same-park rules before writes.
-- SQLite cannot add a self-referential foreign key without rebuilding staff_meta,
-- so this additive migration retains the established local migration pattern.
ALTER TABLE "staff_meta" ADD COLUMN "assistsMurabbiId" TEXT;
CREATE INDEX "staff_meta_assistsMurabbiId_idx" ON "staff_meta"("assistsMurabbiId");
