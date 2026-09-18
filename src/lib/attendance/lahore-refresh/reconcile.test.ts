import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { REFRESH_FIXTURE_DDL, buildSyntheticRefreshManifest } from "./test-support";
import { importSqliteManifest } from "./sqlite-driver";
import { readSqlitePostImportEvidence, readSqliteReconciliationSnapshot } from "./reconcile-sqlite";
import {
  buildReconciliationReport,
  classifyPostImport,
  compareKeySets,
  compareSnapshots,
  manifestSnapshot,
  type PostImportEvidence,
} from "./reconcile";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
});

function createFixtureDatabase(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "att01-reconcile-"));
  tempDirs.push(dir);
  const file = path.join(dir, "fixture.db");
  const db = new DatabaseSync(file);
  try {
    db.exec("PRAGMA foreign_keys = ON");
    for (const statement of REFRESH_FIXTURE_DDL) db.exec(statement);
  } finally {
    db.close();
  }
  return file;
}

async function importedFixture(): Promise<string> {
  const file = createFixtureDatabase();
  await importSqliteManifest(file, buildSyntheticRefreshManifest());
  return file;
}

function readOnly<T>(file: string, fn: (db: DatabaseSync) => T): T {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

const NO_ACTIVITY: PostImportEvidence = {
  auditActionCounts: {},
  resetEvents: 0,
  maxResetVersion: 0,
  resetVersionTotal: 0,
  openEvents: 0,
  eventsClosedByUser: 0,
  recordsMarkedByUser: 0,
  operationReceipts: 0,
  totalUsers: 0,
  superAdminActiveUsers: 0,
  nonSuperAdminActiveUsers: 0,
  activeStaffRoleCounts: {},
  placeholderUsers: 0,
  activePlaceholders: 0,
};

describe("reconciliation key-set comparison", () => {
  it("reports matched, workbook-only, database-only and duplicate counts", () => {
    const result = compareKeySets("groups", ["a", "b", "c"], ["a", "b", "d", "d"]);
    expect(result.matched).toBe(2);
    expect(result.workbookOnly).toBe(1);
    expect(result.databaseOnly).toBe(2);
    expect(result.databaseDuplicates).toBe(1);
    expect(result.equal).toBe(false);
  });

  it("is equal and hash-stable for the same multiset regardless of order", () => {
    const first = compareKeySets("groups", ["b", "a"], ["a", "b"]);
    const second = compareKeySets("groups", ["a", "b"], ["b", "a"]);
    expect(first.equal).toBe(true);
    expect(first.workbookHash).toBe(second.workbookHash);
    expect(first.databaseHash).toBe(second.databaseHash);
  });
});

describe("workbook reconciliation against an imported database", () => {
  it("matches every aggregate and business key after importing the same manifest", async () => {
    const manifest = buildSyntheticRefreshManifest();
    const file = await importedFixture();
    const workbook = manifestSnapshot(manifest);
    const { database, evidence } = readOnly(file, (db) => ({
      database: readSqliteReconciliationSnapshot(db),
      evidence: readSqlitePostImportEvidence(db),
    }));

    const report = buildReconciliationReport(workbook, database, evidence);

    expect(report.mismatches).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.aggregates.equal).toBe(true);
    expect(report.keys.every((entry) => entry.equal)).toBe(true);
    expect(report.statusTotals.equal).toBe(true);
    expect(report.lifecycle.equal).toBe(true);
    expect(report.staff.equal).toBe(true);
    expect(report.postImport.classification.detected).toBe(false);
    expect(evidence.auditActionCounts.import_lahore_batch_4).toBe(1);
  });

  it("compares event placement as digests, not raw keys", async () => {
    const file = await importedFixture();
    const database = readOnly(file, (db) => readSqliteReconciliationSnapshot(db));
    expect(database.eventKeys.length).toBeGreaterThan(0);
    expect(database.eventKeys.every((key) => /^[0-9a-f]{16}$/.test(key))).toBe(true);
  });

  it("never serializes participant identities, phones or names", async () => {
    const manifest = buildSyntheticRefreshManifest();
    const file = await importedFixture();
    const workbook = manifestSnapshot(manifest);
    const { database, evidence } = readOnly(file, (db) => ({
      database: readSqliteReconciliationSnapshot(db),
      evidence: readSqlitePostImportEvidence(db),
    }));

    const serialized = JSON.stringify(buildReconciliationReport(workbook, database, evidence));
    expect(serialized).not.toContain("Student ");
    expect(serialized).not.toContain("Murabbi ");
    expect(serialized).not.toContain("0300");
    expect(serialized).not.toContain("@example.invalid");
    expect(serialized).not.toContain("Park A|");
  });

  it("attributes a post-import session reset instead of reporting workbook drift", async () => {
    const manifest = buildSyntheticRefreshManifest();
    const file = await importedFixture();

    const db = new DatabaseSync(file);
    const eventId = (db.prepare('SELECT "id" AS id FROM "attendance_events" LIMIT 1').get() as { id: string }).id;
    db.exec("BEGIN");
    db.prepare('DELETE FROM "attendance_records" WHERE "eventId" = ?').run(eventId);
    db.prepare('UPDATE "attendance_events" SET "resetVersion" = "resetVersion" + 1 WHERE "id" = ?').run(eventId);
    db.prepare('INSERT INTO "audit_log" ("id","action","entityType","entityId") VALUES (?,?,?,?)').run(
      "audit-reset",
      "attendance_reset",
      "attendance_events",
      eventId
    );
    db.exec("COMMIT");
    db.close();

    const workbook = manifestSnapshot(manifest);
    const { database, evidence } = readOnly(file, (handle) => ({
      database: readSqliteReconciliationSnapshot(handle),
      evidence: readSqlitePostImportEvidence(handle),
    }));

    const report = buildReconciliationReport(workbook, database, evidence);

    expect(report.ok).toBe(false);
    expect(report.postImport.classification.detected).toBe(true);
    expect(report.postImport.classification.affectsReconciliation).toBe(true);
    expect(report.postImport.classification.categories).toContain("attendance_reset");
    expect(report.mismatches.map((entry) => entry.category)).toContain("aggregate_totals");
    expect(report.statusTotals.equal).toBe(false);
    expect(report.keys.find((entry) => entry.name === "event_record_counts")?.equal).toBe(false);
  });

  it("distinguishes a participant moved to another group from a missing participant", async () => {
    const manifest = buildSyntheticRefreshManifest();
    const file = await importedFixture();

    const db = new DatabaseSync(file);
    const groups = db.prepare('SELECT "id" AS id FROM "groups" ORDER BY "id"').all() as { id: string }[];
    const participant = db.prepare('SELECT "id" AS id FROM "participants" WHERE "groupId" = ? LIMIT 1').get(groups[0].id) as {
      id: string;
    };
    db.prepare('UPDATE "participants" SET "groupId" = ? WHERE "id" = ?').run(groups[1].id, participant.id);
    db.close();

    const workbook = manifestSnapshot(manifest);
    const database = readOnly(file, (handle) => readSqliteReconciliationSnapshot(handle));
    const comparison = compareSnapshots(workbook, database);

    const identity = comparison.keys.find((entry) => entry.name === "participant_identity");
    const placement = comparison.keys.find((entry) => entry.name === "participant_placement");
    expect(identity?.equal).toBe(true);
    expect(placement?.equal).toBe(false);
    expect(placement?.workbookOnly).toBe(1);
    expect(placement?.databaseOnly).toBe(1);
    expect(comparison.mismatches.map((entry) => entry.category)).toContain("participant_placement");
  });
});

describe("post-import classification", () => {
  it("flags operator marks and account activation as reconciliation-affecting", () => {
    const workbook = manifestSnapshot(buildSyntheticRefreshManifest());
    const database = workbook;
    const classification = classifyPostImport(
      { ...NO_ACTIVITY, recordsMarkedByUser: 4, nonSuperAdminActiveUsers: 2 },
      workbook,
      database
    );

    expect(classification.detected).toBe(true);
    expect(classification.affectsReconciliation).toBe(true);
    expect(classification.categories).toEqual(expect.arrayContaining(["operator_marks", "account_activation"]));
  });

  it("stays quiet when nothing happened after the import", () => {
    const workbook = manifestSnapshot(buildSyntheticRefreshManifest());
    const classification = classifyPostImport(NO_ACTIVITY, workbook, workbook);
    expect(classification.detected).toBe(false);
    expect(classification.affectsReconciliation).toBe(false);
    expect(classification.categories).toEqual([]);
  });
});
