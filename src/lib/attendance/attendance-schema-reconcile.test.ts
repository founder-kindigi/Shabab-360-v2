import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DECLARED_UNREFERENCED_TABLES, PRESERVED_LEGACY_TABLES } from "./attendance-schema-contract";
import {
  applyAttendanceSchemaStatements,
  assertAttendanceSchemaReady,
  readAttendanceSchemaPreflight,
  reconcileAttendanceSchema,
  restoreAttendanceSchemaBackup,
} from "./attendance-schema-reconcile";
import { countForeignKeyViolations, verifySqliteBackupFile } from "./sqlite-support";

const REPO_ROOT = process.cwd();
const DEV_DB = path.join(REPO_ROOT, "prisma", "dev.db");

/** Tests may only ever touch a throwaway copy. */
function assertDisposableTarget(target: string): void {
  const resolved = path.resolve(target);
  if (resolved === path.resolve(DEV_DB)) throw new Error("Refusing to target the real development database");
  if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep)) throw new Error("Reconciliation tests must use an OS temp copy");
}

const MISSING_ATT01_COLUMNS: readonly string[] = [
  "attendance_events.resetVersion",
  "batch_settings.automaticDropoutEnabled",
  "batch_settings.warningConsecutiveWeeks",
  "batch_settings.dropoutConsecutiveWeeks",
  "participants.dropoutAt",
  "participants.dropoutReason",
  "participants.dropoutSource",
  "participants.reactivatedAt",
];

const STAFF_INDEXES: readonly string[] = [
  "park_staff_attendance_events_parkId_eventDate_key",
  "park_staff_attendance_events_parkId_eventDate_idx",
  "park_staff_attendance_events_eventDate_idx",
  "park_staff_attendance_records_eventId_staffId_key",
  "park_staff_attendance_records_eventId_idx",
  "park_staff_attendance_records_staffId_idx",
];

/** Base-schema fixture in the shape the local database had before reconciliation. */
const FIXTURE_DDL: readonly string[] = [
  `CREATE TABLE "cities" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL)`,
  `CREATE TABLE "parks" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "cityId" TEXT NOT NULL REFERENCES "cities"("id") ON DELETE CASCADE)`,
  `CREATE TABLE "users" ("id" TEXT NOT NULL PRIMARY KEY, "email" TEXT NOT NULL)`,
  `CREATE TABLE "staff_meta" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "role" TEXT NOT NULL)`,
  `CREATE TABLE "batches" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "parkId" TEXT NOT NULL REFERENCES "parks"("id") ON DELETE CASCADE)`,
  `CREATE TABLE "groups" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "batchId" TEXT NOT NULL REFERENCES "batches"("id") ON DELETE CASCADE, "parkId" TEXT REFERENCES "parks"("id") ON DELETE CASCADE)`,
  `CREATE TABLE "participants" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "state" TEXT NOT NULL DEFAULT 'active', "joinedAt" INTEGER NOT NULL, "groupId" TEXT REFERENCES "groups"("id") ON DELETE SET NULL)`,
  `CREATE TABLE "attendance_events" ("id" TEXT NOT NULL PRIMARY KEY, "groupId" TEXT NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE, "title" TEXT NOT NULL, "eventDate" INTEGER NOT NULL, "isClosed" INTEGER NOT NULL DEFAULT false, "closedAt" INTEGER, "closedBy" TEXT, "createdAt" INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" INTEGER NOT NULL)`,
  `CREATE TABLE "attendance_records" ("id" TEXT NOT NULL PRIMARY KEY, "eventId" TEXT NOT NULL REFERENCES "attendance_events"("id") ON DELETE CASCADE, "participantId" TEXT NOT NULL REFERENCES "participants"("id") ON DELETE CASCADE, "status" TEXT NOT NULL, "markedBy" TEXT, "markedAt" INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP, "editReason" TEXT, "createdAt" INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" INTEGER NOT NULL)`,
  `CREATE TABLE "batch_settings" ("id" TEXT NOT NULL PRIMARY KEY, "batchId" TEXT NOT NULL REFERENCES "batches"("id") ON DELETE CASCADE, "warningAbsents" INTEGER NOT NULL DEFAULT 3, "dropoutAbsents" INTEGER NOT NULL DEFAULT 6, "classWeekdays" TEXT NOT NULL DEFAULT '[0,6]', "createdAt" INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" INTEGER NOT NULL)`,
  `CREATE TABLE "batch_class_dates" ("id" TEXT NOT NULL PRIMARY KEY, "batchId" TEXT NOT NULL REFERENCES "batches"("id") ON DELETE CASCADE, "classDate" INTEGER NOT NULL, "createdAt" INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE "operational_off_dates" ("id" TEXT NOT NULL PRIMARY KEY, "cityId" TEXT NOT NULL REFERENCES "cities"("id") ON DELETE CASCADE, "offDate" INTEGER NOT NULL, "label" TEXT NOT NULL, "createdAt" INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" INTEGER NOT NULL)`,
  `CREATE TABLE "staff_attendance_events" ("id" TEXT NOT NULL PRIMARY KEY, "parkId" TEXT NOT NULL REFERENCES "parks"("id") ON DELETE CASCADE, "title" TEXT, "eventDate" INTEGER, "isClosed" INTEGER, "closedAt" INTEGER, "closedBy" TEXT)`,
  `CREATE TABLE "staff_attendance_records" ("id" TEXT NOT NULL PRIMARY KEY, "eventId" TEXT NOT NULL REFERENCES "staff_attendance_events"("id") ON DELETE CASCADE, "staffMetaId" TEXT NOT NULL REFERENCES "staff_meta"("id") ON DELETE CASCADE, "status" TEXT, "markedAt" INTEGER)`,
  `CREATE UNIQUE INDEX "attendance_events_groupId_eventDate_key" ON "attendance_events"("groupId", "eventDate")`,
  `CREATE INDEX "attendance_events_eventDate_idx" ON "attendance_events"("eventDate")`,
  `CREATE UNIQUE INDEX "attendance_records_eventId_participantId_key" ON "attendance_records"("eventId", "participantId")`,
  `CREATE INDEX "attendance_records_eventId_idx" ON "attendance_records"("eventId")`,
  `CREATE INDEX "attendance_records_participantId_idx" ON "attendance_records"("participantId")`,
  `CREATE UNIQUE INDEX "batch_settings_batchId_key" ON "batch_settings"("batchId")`,
  `CREATE UNIQUE INDEX "batch_class_dates_batchId_classDate_key" ON "batch_class_dates"("batchId", "classDate")`,
  `CREATE INDEX "batch_class_dates_classDate_idx" ON "batch_class_dates"("classDate")`,
  `CREATE UNIQUE INDEX "operational_off_dates_cityId_offDate_key" ON "operational_off_dates"("cityId", "offDate")`,
  `CREATE INDEX "operational_off_dates_offDate_idx" ON "operational_off_dates"("offDate")`,
  `CREATE INDEX "participants_groupId_state_idx" ON "participants"("groupId", "state")`,
];

const SEED = `
  INSERT INTO "cities" ("id","name") VALUES ('fixture-city','Fixture City');
  INSERT INTO "parks" ("id","name","cityId") VALUES ('fixture-park','Fixture Park','fixture-city');
  INSERT INTO "users" ("id","email") VALUES ('fixture-user','fixture@example.invalid');
  INSERT INTO "staff_meta" ("id","userId","role") VALUES ('fixture-staff','fixture-user','murabbi');
  INSERT INTO "batches" ("id","name","parkId") VALUES ('fixture-batch','Fixture Batch','fixture-park');
  INSERT INTO "groups" ("id","name","batchId","parkId") VALUES ('fixture-group','Fixture Group','fixture-batch','fixture-park');
  INSERT INTO "participants" ("id","name","joinedAt","groupId") VALUES ('fixture-participant','Fixture Participant',1,'fixture-group');
  INSERT INTO "attendance_events" ("id","groupId","title","eventDate","updatedAt") VALUES ('fixture-event','fixture-group','Fixture Session',1,1);
  INSERT INTO "attendance_records" ("id","eventId","participantId","status","markedAt","updatedAt") VALUES ('fixture-record','fixture-event','fixture-participant','present',1,1);
  INSERT INTO "batch_settings" ("id","batchId","updatedAt") VALUES ('fixture-settings','fixture-batch',1);
  INSERT INTO "staff_attendance_events" ("id","parkId","eventDate") VALUES ('legacy-event','fixture-park',1);
  INSERT INTO "staff_attendance_records" ("id","eventId","staffMetaId","markedAt") VALUES ('legacy-record','legacy-event','fixture-staff',1);
`;

function createFixture(filePath: string, ddl: readonly string[] = FIXTURE_DDL, seed = SEED): void {
  const db = new DatabaseSync(filePath);
  try {
    db.exec("PRAGMA foreign_keys = ON");
    for (const statement of ddl) db.exec(statement);
    db.exec(seed);
  } finally {
    db.close();
  }
}

/** The same fixture with a required NOT NULL column missing, which needs a rebuild. */
function createDriftedFixture(filePath: string): void {
  const drifted = FIXTURE_DDL.map((statement) =>
    statement.startsWith('CREATE TABLE "attendance_events"')
      ? `CREATE TABLE "attendance_events" ("id" TEXT NOT NULL PRIMARY KEY, "title" TEXT NOT NULL, "eventDate" INTEGER NOT NULL, "isClosed" INTEGER NOT NULL DEFAULT false, "updatedAt" INTEGER NOT NULL)`
      : statement
  ).filter((statement) => !statement.startsWith('CREATE INDEX "attendance_events') && !statement.startsWith('CREATE UNIQUE INDEX "attendance_events'));
  createFixture(filePath, drifted, `INSERT INTO "cities" ("id","name") VALUES ('fixture-city','Fixture City');`);
}

function withReadOnly<T>(filePath: string, read: (db: DatabaseSync) => T): T {
  const db = new DatabaseSync(filePath, { readOnly: true });
  try {
    return read(db);
  } finally {
    db.close();
  }
}

function schemaFingerprint(filePath: string): string {
  return withReadOnly(filePath, (db) => JSON.stringify(db.prepare("SELECT type, name, sql FROM sqlite_master ORDER BY type, name").all()));
}

function tableRows(filePath: string, table: string): string {
  return withReadOnly(filePath, (db) => JSON.stringify(db.prepare(`SELECT * FROM "${table}" ORDER BY "id"`).all()));
}

function tableSql(filePath: string, table: string): string {
  return withReadOnly(filePath, (db) => {
    const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?").get(table) as { sql?: string } | undefined;
    return row?.sql ?? "";
  });
}

function columnInfo(filePath: string, table: string, column: string): { notNull: boolean; defaultValue: string | null } | null {
  return withReadOnly(filePath, (db) => {
    const info = db.prepare(`PRAGMA table_info(${JSON.stringify(table)})`).all() as { name: string; notnull: number; dflt_value: string | null }[];
    const found = info.find((entry) => entry.name === column);
    return found ? { notNull: found.notnull === 1, defaultValue: found.dflt_value ?? null } : null;
  });
}

function fileHash(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

describe("ATT01 attendance-schema reconciliation on disposable copies", () => {
  let tmp: string;
  let database: string;
  let backupDir: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "att01-schema-"));
    database = path.join(tmp, "copy.db");
    backupDir = path.join(tmp, "backups");
    assertDisposableTarget(database);
    createFixture(database);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("refuses a target that is not a disposable copy", () => {
    expect(() => assertDisposableTarget(DEV_DB)).toThrow(/real development database/);
    expect(() => assertDisposableTarget(path.join(REPO_ROOT, "prisma", "another.db"))).toThrow(/temp copy/);
  });

  it("detects every required ATT01 schema requirement in the read-only preflight", () => {
    const hash = fileHash(database);
    const preflight = readAttendanceSchemaPreflight(database);

    expect(preflight.mode).toBe("read-only");
    expect(preflight.requiredTables).toBe(8);
    expect(preflight.presentTables).toBe(6);
    expect(preflight.missingColumns).toEqual(MISSING_ATT01_COLUMNS);
    expect(preflight.missingIndexes).toEqual(STAFF_INDEXES);
    expect(preflight.missingForeignKeys).toEqual([]);
    expect(preflight.missingSupportTables).toEqual([]);
    expect(preflight.blocked).toBe(false);
    expect(preflight.upToDate).toBe(false);
    expect(preflight.plannedStatements).toBe(16);
    expect(preflight.preservedLegacyTables).toEqual(PRESERVED_LEGACY_TABLES.map((table) => ({ table, present: true })));
    expect(preflight.declaredUnreferencedTables).toEqual(DECLARED_UNREFERENCED_TABLES.map((table) => ({ table, present: false })));
    expect(fileHash(database)).toBe(hash);
  });

  it("creates the missing additive objects and preserves existing rows", async () => {
    const result = await reconcileAttendanceSchema({ database, backupDir, execute: true });

    expect(result.mode).toBe("execute");
    expect(result.appliedStatements).toBe(16);
    expect(result.foreignKeyViolations).toBe(0);
    expect(result.after).toMatchObject({ upToDate: true, blocked: false, plannedStatements: 0, missingColumns: [] });

    expect(columnInfo(database, "attendance_events", "resetVersion")).toEqual({ notNull: true, defaultValue: "0" });
    expect(columnInfo(database, "batch_settings", "automaticDropoutEnabled")).toEqual({ notNull: true, defaultValue: "true" });
    expect(columnInfo(database, "batch_settings", "warningConsecutiveWeeks")).toEqual({ notNull: true, defaultValue: "2" });
    expect(columnInfo(database, "batch_settings", "dropoutConsecutiveWeeks")).toEqual({ notNull: true, defaultValue: "3" });
    for (const column of ["dropoutAt", "dropoutReason", "dropoutSource", "reactivatedAt"]) {
      expect(columnInfo(database, "participants", column)).toEqual({ notNull: false, defaultValue: null });
    }

    withReadOnly(database, (db) => {
      expect((db.prepare('SELECT "resetVersion" AS v FROM "attendance_events" WHERE "id" = ?').get("fixture-event") as { v: number }).v).toBe(0);
      expect((db.prepare('SELECT COUNT(*) AS c FROM "attendance_records"').get() as { c: number }).c).toBe(1);
      expect((db.prepare('SELECT COUNT(*) AS c FROM "participants"').get() as { c: number }).c).toBe(1);
      const staffTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'park_staff%' ORDER BY name").all() as {
        name: string;
      }[];
      expect(staffTables.map((row) => row.name)).toEqual(["park_staff_attendance_events", "park_staff_attendance_records"]);
      const staffIndexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'park_staff%'").all() as { name: string }[];
      expect(staffIndexes.map((row) => row.name).sort()).toEqual([...STAFF_INDEXES].sort());
    });
  });

  it("is idempotent on a second run", async () => {
    await reconcileAttendanceSchema({ database, backupDir, execute: true });
    const fingerprint = schemaFingerprint(database);
    const hash = fileHash(database);

    const second = await reconcileAttendanceSchema({ database, backupDir, execute: true });
    expect(second.appliedStatements).toBe(0);
    expect(second.backup).toBeNull();
    expect(second.before.upToDate).toBe(true);
    expect(schemaFingerprint(database)).toBe(fingerprint);
    expect(fileHash(database)).toBe(hash);
  });

  it("blocks an incompatible existing shape before any write", async () => {
    const drifted = path.join(tmp, "drifted.db");
    createDriftedFixture(drifted);

    const preflight = readAttendanceSchemaPreflight(drifted);
    expect(preflight.blocked).toBe(true);
    expect(preflight.blockers).toContain(
      "existing table attendance_events is missing column groupId, which cannot be added without a table rebuild or an unambiguous default"
    );

    const before = schemaFingerprint(drifted);
    await expect(reconcileAttendanceSchema({ database: drifted, backupDir, execute: true })).rejects.toThrow(/Refusing reconciliation/);
    expect(schemaFingerprint(drifted)).toBe(before);
    expect(fs.existsSync(backupDir)).toBe(false);
  });

  it("leaves the preserved legacy tables present and unchanged", async () => {
    const rowsBefore = PRESERVED_LEGACY_TABLES.map((table) => tableRows(database, table));
    const sqlBefore = PRESERVED_LEGACY_TABLES.map((table) => tableSql(database, table));

    await reconcileAttendanceSchema({ database, backupDir, execute: true });

    PRESERVED_LEGACY_TABLES.forEach((table, index) => {
      expect(tableRows(database, table)).toBe(rowsBefore[index]);
      expect(tableSql(database, table)).toBe(sqlBefore[index]);
    });
    expect(readAttendanceSchemaPreflight(database).preservedLegacyTables.every((entry) => entry.present)).toBe(true);
  });

  it("verifies the backup, keeps foreign keys clean and can restore the previous state", async () => {
    const before = schemaFingerprint(database);
    const result = await reconcileAttendanceSchema({ database, backupDir, execute: true });
    const backup = result.backup;
    expect(backup).not.toBeNull();
    if (!backup) throw new Error("expected a backup artifact");

    await expect(verifySqliteBackupFile(backup)).resolves.toBeUndefined();
    expect(countForeignKeyViolations(database)).toBe(0);
    expect(schemaFingerprint(database)).not.toBe(before);

    restoreAttendanceSchemaBackup(backup, database);
    expect(schemaFingerprint(database)).toBe(before);
    expect(readAttendanceSchemaPreflight(database).missingColumns).toEqual(MISSING_ATT01_COLUMNS);

    const reapplied = await reconcileAttendanceSchema({ database, backupDir, execute: true });
    expect(reapplied.after.upToDate).toBe(true);
  });

  it("rolls the whole batch back when a statement fails", () => {
    const before = schemaFingerprint(database);
    expect(() =>
      applyAttendanceSchemaStatements(database, ['ALTER TABLE "attendance_events" ADD COLUMN "probe" TEXT', "CREATE TABLE broken ("])
    ).toThrow();

    expect(columnInfo(database, "attendance_events", "probe")).toBeNull();
    expect(schemaFingerprint(database)).toBe(before);
  });

  it("gates other tools until the schema is reconciled", async () => {
    expect(() => assertAttendanceSchemaReady(database, "run-the-tool")).toThrow(/attendance schema is incomplete/);
    expect(() => assertAttendanceSchemaReady(database, "run-the-tool")).toThrow(/run-the-tool/);

    await reconcileAttendanceSchema({ database, backupDir, execute: true });
    expect(() => assertAttendanceSchemaReady(database, "run-the-tool")).not.toThrow();
  });
});

describe.skipIf(!fs.existsSync(DEV_DB))("real-schema disposable copy", () => {
  it(
    "reconciles a copy of prisma/dev.db and leaves the original untouched",
    async () => {
      const sourceBefore = fs.statSync(DEV_DB);
      const sourceHash = fileHash(DEV_DB);

      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "att01-dev-copy-"));
      const copy = path.join(tmp, "dev-copy.db");
      try {
        assertDisposableTarget(copy);
        fs.copyFileSync(DEV_DB, copy);

        const preflight = readAttendanceSchemaPreflight(copy);
        expect(preflight.blocked).toBe(false);
        expect(preflight.preservedLegacyTables.every((entry) => entry.present)).toBe(true);

        const legacyRows = PRESERVED_LEGACY_TABLES.map((table) => tableRows(copy, table));
        const legacySql = PRESERVED_LEGACY_TABLES.map((table) => tableSql(copy, table));

        const result = await reconcileAttendanceSchema({ database: copy, backupDir: path.join(tmp, "backups"), execute: true });
        expect(result.after.upToDate).toBe(true);
        expect(result.after.missingColumns).toEqual([]);
        expect(result.foreignKeyViolations).toBe(0);
        // Applies exactly the plan for whatever the current baseline is missing.
        expect(result.appliedStatements).toBe(preflight.plannedStatements);

        PRESERVED_LEGACY_TABLES.forEach((table, index) => {
          expect(tableRows(copy, table)).toBe(legacyRows[index]);
          expect(tableSql(copy, table)).toBe(legacySql[index]);
        });

        const sourceAfter = fs.statSync(DEV_DB);
        expect(sourceAfter.size).toBe(sourceBefore.size);
        expect(sourceAfter.mtimeMs).toBe(sourceBefore.mtimeMs);
        expect(fileHash(DEV_DB)).toBe(sourceHash);
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    },
    300_000
  );
});
