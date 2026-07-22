import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "prisma/postgres/migrations/20260721090000_expand_city_batch_park_group/migration.sql"
  ),
  "utf8"
);

describe("hierarchy Phase A migration", () => {
  it("adds and backfills the transitional city and park relationships", () => {
    expect(migration).toContain('ADD COLUMN "cityId" TEXT');
    expect(migration).toContain('ADD COLUMN "parkId" TEXT');
    expect(migration).toContain('SET "cityId" = "parks"."cityId"');
    expect(migration).toContain('SET "parkId" = "batches"."parkId"');
  });

  it("retains the legacy batch park relation during the additive phase", () => {
    expect(migration).not.toMatch(/DROP COLUMN "parkId"/i);
    expect(migration).not.toMatch(/DROP CONSTRAINT "batches_parkId_fkey"/i);
  });

  it("rejects incomplete and cross-city hierarchy mappings", () => {
    expect(migration).toContain("Cannot backfill batches.cityId");
    expect(migration).toContain("Cannot backfill groups.parkId");
    expect(migration).toContain("group park and batch belong to different cities");
  });
});
