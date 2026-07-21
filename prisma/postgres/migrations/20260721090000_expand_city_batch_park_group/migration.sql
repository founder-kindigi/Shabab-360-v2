-- Phase A only: retain the legacy Batch.parkId relationship while adding the
-- city-owned Batch and park-owned Group hierarchy. Prisma applies PostgreSQL
-- migrations transactionally, so a failed backfill or invariant check rolls
-- back every statement in this migration.

ALTER TABLE "batches" ADD COLUMN "cityId" TEXT;
ALTER TABLE "groups" ADD COLUMN "parkId" TEXT;

UPDATE "batches"
SET "cityId" = "parks"."cityId"
FROM "parks"
WHERE "parks"."id" = "batches"."parkId";

UPDATE "groups"
SET "parkId" = "batches"."parkId"
FROM "batches"
WHERE "batches"."id" = "groups"."batchId";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "batches" WHERE "cityId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot backfill batches.cityId: a batch has no valid legacy park';
  END IF;

  IF EXISTS (SELECT 1 FROM "groups" WHERE "parkId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot backfill groups.parkId: a group has no valid legacy batch';
  END IF;
END $$;

ALTER TABLE "batches" ADD CONSTRAINT "batches_cityId_fkey"
  FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "groups" ADD CONSTRAINT "groups_parkId_fkey"
  FOREIGN KEY ("parkId") REFERENCES "parks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "batches_cityId_isActive_idx" ON "batches"("cityId", "isActive");
CREATE INDEX "groups_parkId_batchId_isActive_idx" ON "groups"("parkId", "batchId", "isActive");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "groups" AS "groups"
    INNER JOIN "parks" AS "parks" ON "parks"."id" = "groups"."parkId"
    INNER JOIN "batches" AS "batches" ON "batches"."id" = "groups"."batchId"
    WHERE "parks"."cityId" <> "batches"."cityId"
  ) THEN
    RAISE EXCEPTION 'Cannot expand hierarchy: a group park and batch belong to different cities';
  END IF;
END $$;
