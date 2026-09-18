import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// The pure hierarchy helpers only need the query client to exist at import time.
vi.mock("@/lib/db", () => ({ db: {} }));

import { groupParkWhere, groupResourceScope } from "@/lib/auth/hierarchy";
import { importSqliteManifest, openRefreshDatabase, resetSqliteData } from "./sqlite-driver";
import { buildSyntheticRefreshManifest, createRefreshFixtureDatabase } from "./test-support";

interface GroupRow {
  readonly id: string;
  readonly name: string;
  readonly parkId: string | null;
  readonly parkName: string;
  readonly batchId: string;
  readonly batchParkId: string;
  readonly cityId: string;
}

let dir: string;
let workingPath: string;

describe("Lahore refresh multi-park attendance scope", () => {
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "lahore-multipark-"));
    const fixturePath = path.join(dir, "fixture.db");
    workingPath = path.join(dir, "working.db");
    createRefreshFixtureDatabase(fixturePath);
    fs.copyFileSync(fixturePath, workingPath);
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("resolves every imported park's groups to that park's own attendance scope under one active batch", async () => {
    const manifest = buildSyntheticRefreshManifest();
    resetSqliteData(workingPath);
    await importSqliteManifest(workingPath, manifest);

    const db = openRefreshDatabase(workingPath, true);
    try {
      const rows = db
        .prepare(
          'SELECT g."id" AS id, g."name" AS name, g."parkId" AS parkId, g."batchId" AS batchId, b."parkId" AS batchParkId, p."name" AS parkName, p."cityId" AS cityId FROM "groups" g JOIN "batches" b ON b."id" = g."batchId" JOIN "parks" p ON p."id" = g."parkId"'
        )
        .all() as unknown as GroupRow[];

      expect(rows).toHaveLength(manifest.counts.groups);
      expect(new Set(rows.map((row) => row.batchId)).size).toBe(1);
      expect(new Set(rows.map((row) => row.parkName)).size).toBe(manifest.counts.parks);
      expect(rows.every((row) => row.parkId !== null)).toBe(true);

      const expectedParkByGroup = new Map(manifest.groups.map((group) => [group.name, group.parkName]));
      for (const row of rows) {
        expect(expectedParkByGroup.get(row.name)).toBe(row.parkName);

        const scope = groupResourceScope({
          id: row.id,
          parkId: row.parkId,
          park: { cityId: row.cityId },
          batch: { parkId: row.batchParkId, park: { cityId: row.cityId } },
        });
        expect(scope).toEqual({ cityId: row.cityId, parkId: row.parkId, groupId: row.id });

        // The prepare route's park filter selects this group from its own park only.
        const where = groupParkWhere(row.parkId as string);
        expect(where).toEqual({ OR: [{ parkId: row.parkId }, { parkId: null, batch: { parkId: row.parkId } }] });
      }

      const groupsPerPark = new Map<string, string[]>();
      for (const row of rows) groupsPerPark.set(row.parkName, [...(groupsPerPark.get(row.parkName) ?? []), row.id]);
      expect([...groupsPerPark.values()].every((ids) => ids.length === 3)).toBe(true);
      expect(new Set(rows.map((row) => row.id)).size).toBe(manifest.counts.groups);
    } finally {
      db.close();
    }
  });
});
