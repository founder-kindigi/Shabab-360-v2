-- Existing ambiguity aborts migration; resolving it requires a reviewed data correction.
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "batches" b LEFT JOIN "parks" p ON p."id" = b."parkId"
    WHERE p."cityId" IS NULL OR (b."cityId" IS NOT NULL AND b."cityId" <> p."cityId")) THEN
    RAISE EXCEPTION 'Batch city and park city conflict; review existing data';
  END IF;
END $$;
UPDATE "batches" SET "cityId" = p."cityId" FROM "parks" p WHERE p."id" = "batches"."parkId" AND "batches"."cityId" IS NULL;
-- The normal (cityId, isActive) lookup index was created by
-- 20260721090000_expand_city_batch_park_group. Multiple parks in one city may
-- each have an active batch, so this migration must not add a city-wide unique
-- constraint.
CREATE FUNCTION "shabab_normalize_batch_city"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE park_city TEXT;
BEGIN
  SELECT "cityId" INTO park_city FROM "parks" WHERE "id" = NEW."parkId";
  IF park_city IS NULL OR (NEW."cityId" IS NOT NULL AND NEW."cityId" <> park_city) THEN
    RAISE EXCEPTION 'Batch city and park city must match';
  END IF;
  NEW."cityId" := park_city;
  RETURN NEW;
END $$;
CREATE TRIGGER "batches_normalize_city" BEFORE INSERT OR UPDATE OF "cityId", "parkId" ON "batches"
FOR EACH ROW EXECUTE FUNCTION "shabab_normalize_batch_city"();
CREATE FUNCTION "shabab_preserve_batch_city"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "batches" WHERE "parkId" = OLD."id" AND "cityId" <> NEW."cityId") THEN
    RAISE EXCEPTION 'Reassign anchored batches before moving this park';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "parks_preserve_batch_city" BEFORE UPDATE OF "cityId" ON "parks"
FOR EACH ROW EXECUTE FUNCTION "shabab_preserve_batch_city"();
COMMIT;
