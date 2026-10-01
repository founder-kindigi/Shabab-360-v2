ALTER TABLE "staff_meta" ADD COLUMN IF NOT EXISTS "assistsMurabbiId" TEXT;

CREATE INDEX IF NOT EXISTS "staff_meta_assistsMurabbiId_idx"
  ON "staff_meta"("assistsMurabbiId");

ALTER TABLE "staff_meta"
  ADD CONSTRAINT "staff_meta_assistsMurabbiId_fkey"
  FOREIGN KEY ("assistsMurabbiId") REFERENCES "staff_meta"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
