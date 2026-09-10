-- Normalize legacy null cities, then enforce the invariant for direct database writes too.
-- Conflicting or duplicate existing rows abort this migration; do not silently deactivate data.
BEGIN TRANSACTION;
CREATE TABLE "_batch_scope_preflight" ("valid" INTEGER NOT NULL CHECK ("valid" = 1));
INSERT INTO "_batch_scope_preflight" ("valid")
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM "batches" b LEFT JOIN "parks" p ON p."id" = b."parkId"
  WHERE p."cityId" IS NULL OR (b."cityId" IS NOT NULL AND b."cityId" <> p."cityId")
) THEN 0 ELSE 1 END;
DROP TABLE "_batch_scope_preflight";
UPDATE "batches" SET "cityId" = (SELECT "cityId" FROM "parks" WHERE "parks"."id" = "batches"."parkId") WHERE "cityId" IS NULL;
CREATE UNIQUE INDEX "batches_one_active_city" ON "batches"("cityId") WHERE "isActive" = 1;
CREATE TRIGGER "batches_validate_city_insert" BEFORE INSERT ON "batches"
WHEN NEW."cityId" IS NOT NULL AND NEW."cityId" <> (SELECT "cityId" FROM "parks" WHERE "id" = NEW."parkId")
BEGIN SELECT RAISE(ABORT, 'Batch city and park city must match'); END;
CREATE TRIGGER "batches_validate_city_update" BEFORE UPDATE OF "cityId", "parkId" ON "batches"
WHEN NEW."cityId" IS NOT NULL AND NEW."cityId" <> (SELECT "cityId" FROM "parks" WHERE "id" = NEW."parkId")
BEGIN SELECT RAISE(ABORT, 'Batch city and park city must match'); END;
CREATE TRIGGER "batches_fill_city_insert" AFTER INSERT ON "batches" WHEN NEW."cityId" IS NULL
BEGIN UPDATE "batches" SET "cityId" = (SELECT "cityId" FROM "parks" WHERE "id" = NEW."parkId") WHERE "id" = NEW."id"; END;
CREATE TRIGGER "batches_fill_city_update" AFTER UPDATE OF "cityId", "parkId" ON "batches" WHEN NEW."cityId" IS NULL
BEGIN UPDATE "batches" SET "cityId" = (SELECT "cityId" FROM "parks" WHERE "id" = NEW."parkId") WHERE "id" = NEW."id"; END;
CREATE TRIGGER "parks_preserve_batch_city" BEFORE UPDATE OF "cityId" ON "parks"
WHEN EXISTS (SELECT 1 FROM "batches" WHERE "parkId" = OLD."id" AND "cityId" <> NEW."cityId")
BEGIN SELECT RAISE(ABORT, 'Reassign anchored batches before moving this park'); END;
COMMIT;
