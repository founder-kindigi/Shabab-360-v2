import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CANONICAL_INDEXES, CANONICAL_TABLES, LEGACY_STAFF_ATTENDANCE_TABLES } from "./park-staff-attendance-schema";
import {
  applyReconciliationStatements,
  countForeignKeyViolations,
  readStaffAttendancePreflight,
  reconcileStaffAttendanceSchema,
  restoreReconciliationBackup,
} from "./park-staff-attendance-reconcile";
import { verifySqliteBackupFile } from "./sqlite-support";

const REPO_ROOT = process.cwd();
const DEV_DB = path.join(REPO_ROOT, "prisma", "dev.db");

/** The reconciliation may only ever run against a throwaway copy. */
function assertDisposableTarget(target: string): void {
  const resolved = path.resolve(target);
  if (resolved === path.resolve(DEV_DB)) throw new Error("Refusing to target the real development database");
  const tempRoot = path.resolve(os.tmpdir());
  if (!resolved.startsWith(tempRoot + path.sep)) throw new Error("Reconciliation tests must use an OS temp copy");
}

const FIXTURE_DDL: readonly string[] = [
  `CREATE TABLE "cities" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL)`,
  `CREATE TABLE "parks" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "cityId" TEXT NOT NULL REFERENCES "cities"("id") ON DELETE CASCADE)`,
  `CREATE TABLE "users" ("id" TEXT PRIMARY KEY, "email" TEXT NOT NULL)`,
  `CREATE TABLE "staff_meta" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "role" TEXT NOT NULL)`,
  `CREATE TABLE "staff_attendance_events" ("id" TEXT PRIMARY KEY, "parkId" TEXT NOT NULL REFERENCES "parks"("id") ON DELETE CASCADE, "title" TEXT, "eventDate" INTEGER, "isClosed" INTEGER, "closedAt" INTEGER, "closedBy" TEXT, "createdAt" INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" INTEGER NOT NULL)`,
  `CREATE TABLE "staff_attendance_records" ("id" TEXT PRIMARY KEY, "eventId" TEXT NOT NULL REFERENCES "staff_attendance_events"("id") ON DELETE CASCADE, "staffMetaId" TEXT NOT NULL REFERENCES "staff_meta"("id") ON DELETE CASCADE, "status" TEXT, "markedBy" TEXT, "markedAt" INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP, "editReason" TEXT, "createdAt" INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" INTEGER NOT NULL)`,
];

function createFixture(filePath: string): void {
  const db = new DatabaseSync(filePath);
  try {
    db.exec("PRAGMA foreign_keys = ON");
    for (const statement of FIXTURE_DDL) db.exec(statement);
    db.exec(`
      INSERT INTO "cities" ("id","name") VALUES ('fixture-city','Fixture City');
      INSERT INTO "parks" ("id","name","cityId") VALUES ('fixture-park','Fixture Park','fixture-city');
      INSERT INTO "parks" ("id","name","cityId") VALUES ('fixture-park-2','Fixture Park 2','fixture-city');
      INSERT INTO "users" ("id","email") VALUES ('fixture-user','fixture@example.invalid');
      INSERT INTO "staff_meta" ("id","userId","role") VALUES ('fixture-staff','fixture-user','murabbi');
      INSERT INTO "staff_attendance_events" ("id","parkId","eventDate","updatedAt") VALUES ('legacy-event','fixture-park',1,1);
      INSERT INTO "staff_attendance_records" ("id","eventId","staffMetaId","markedAt","updatedAt") VALUES ('legacy-record','legacy-event','fixture-staff',1,1);
    `);
  } finally {
    db.close();
  }
}

/** Schema-level fingerprint: object names and their SQL, never row values. */
function schemaFingerprint(filePath: string): string {
  const db = new DatabaseSync(filePath, { readOnly: true });
  try {
    return JSON.stringify(db.prepare("SELECT type, name, sql FROM sqlite_master ORDER BY type, name").all());
  } finally {
    db.close();
  }
}

function tableRows(filePath: string, table: string): string {
  const db = new DatabaseSync(filePath, { readOnly: true });
  try {
    return JSON.stringify(db.prepare(`SELECT * FROM "${table}" ORDER BY "id"`).all());
  } finally {
    db.close();
  }
}

function tableSql(filePath: string, table: string): string {
  const db = new DatabaseSync(filePath, { readOnly: true });
  try {
    const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?").get(table) as { sql?: string } | undefined;
    return row?.sql ?? "";
  } finally {
    db.close();
  }
}

function withReadOnly<T>(filePath: string, read: (db: DatabaseSync) => T): T {
  const db = new DatabaseSync(filePath, { readOnly: true });
  try {
    return read(db);
  } finally {
    db.close();
  }
}

function fileHash(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

describe("staff-attendance schema reconciliation on disposable copies", () => {
  let tmp: string;
  let database: string;
  let backupDir: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "staff-attendance-reconcile-"));
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

  it("creates the canonical tables, indexes and foreign keys", async () => {
    const before = schemaFingerprint(database);
    const result = await reconcileStaffAttendanceSchema({ database, backupDir, execute: true });

    expect(result.mode).toBe("execute");
    expect(result.appliedStatements).toBe(CANONICAL_TABLES.length + CANONICAL_INDEXES.length);
    expect(result.foreignKeyViolations).toBe(0);
    expect(result.after).toMatchObject({
      canonicalTablesPresent: 2,
      canonicalIndexesPresent: CANONICAL_INDEXES.length,
      blocked: false,
      upToDate: true,
      plannedStatements: 0,
    });

    withReadOnly(database, (db) => {
      for (const table of CANONICAL_TABLES) {
        const info = db.prepare(`PRAGMA table_info(${JSON.stringify(table.name)})`).all() as { name: string; notnull: number }[];
        expect(info.map((column) => column.name)).toEqual(table.columns.map((column) => column.name));
        expect(info.map((column) => column.notnull === 1)).toEqual(table.columns.map((column) => column.notNull));

        const foreignKeys = db.prepare(`PRAGMA foreign_key_list(${JSON.stringify(table.name)})`).all() as {
          from: string;
          table: string;
          on_delete: string;
        }[];
        for (const expected of table.foreignKeys) {
          const actual = foreignKeys.find((foreignKey) => foreignKey.from === expected.column);
          expect(actual?.table).toBe(expected.referencesTable);
          expect(actual?.on_delete).toBe("CASCADE");
        }
      }

      const indexes = db
        .prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND name LIKE 'park_staff%'")
        .all() as { name: string; tbl_name: string; sql: string }[];
      expect(indexes.map((index) => index.name).sort()).toEqual(CANONICAL_INDEXES.map((index) => index.name).sort());
      for (const expected of CANONICAL_INDEXES) {
        const actual = indexes.find((index) => index.name === expected.name);
        expect(actual?.tbl_name).toBe(expected.table);
        expect(/CREATE\s+UNIQUE\s+INDEX/i.test(actual?.sql ?? "")).toBe(expected.unique);
      }
    });

    expect(schemaFingerprint(database)).not.toBe(before);
  });

  it("makes no unsafe change on a second run", async () => {
    await reconcileStaffAttendanceSchema({ database, backupDir, execute: true });
    const fingerprint = schemaFingerprint(database);
    const hash = fileHash(database);

    const second = await reconcileStaffAttendanceSchema({ database, backupDir, execute: true });
    expect(second.appliedStatements).toBe(0);
    expect(second.backup).toBeNull();
    expect(second.before.upToDate).toBe(true);
    expect(schemaFingerprint(database)).toBe(fingerprint);
    expect(fileHash(database)).toBe(hash);
  });

  it("performs no write during a read-only run", async () => {
    const hash = fileHash(database);
    const result = await reconcileStaffAttendanceSchema({ database, backupDir, execute: false });

    expect(result.mode).toBe("read-only");
    expect(result.backup).toBeNull();
    expect(result.appliedStatements).toBe(0);
    expect(result.after.plannedStatements).toBe(CANONICAL_TABLES.length + CANONICAL_INDEXES.length);
    expect(fileHash(database)).toBe(hash);
    expect(fs.existsSync(backupDir)).toBe(false);
  });

  it("leaves the legacy tables present and unchanged", async () => {
    const rowsBefore = LEGACY_STAFF_ATTENDANCE_TABLES.map((table) => tableRows(database, table));
    const sqlBefore = LEGACY_STAFF_ATTENDANCE_TABLES.map((table) => tableSql(database, table));

    await reconcileStaffAttendanceSchema({ database, backupDir, execute: true });

    LEGACY_STAFF_ATTENDANCE_TABLES.forEach((table, index) => {
      expect(tableRows(database, table)).toBe(rowsBefore[index]);
      expect(tableSql(database, table)).toBe(sqlBefore[index]);
    });
    const preflight = readStaffAttendancePreflight(database);
    expect(preflight.legacyTables).toEqual([
      { table: "staff_attendance_events", present: true },
      { table: "staff_attendance_records", present: true },
    ]);
  });

  it("verifies the pre-apply backup and keeps foreign keys clean", async () => {
    const result = await reconcileStaffAttendanceSchema({ database, backupDir, execute: true });
    const backup = result.backup;
    expect(backup).not.toBeNull();
    if (!backup) throw new Error("expected a backup artifact");

    expect(fs.existsSync(backup.path)).toBe(true);
    expect(backup.bytes).toBeGreaterThan(0);
    await expect(verifySqliteBackupFile(backup)).resolves.toBeUndefined();
    expect(countForeignKeyViolations(database)).toBe(0);

    // The backup is the pre-apply state, so it must not contain the canonical tables.
    withReadOnly(backup.path, (db) => {
      const row = db
        .prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='park_staff_attendance_events'")
        .get() as { count: number };
      expect(row.count).toBe(0);
    });
  });

  it("rolls the whole batch back when a statement fails", () => {
    const before = schemaFingerprint(database);
    expect(() =>
      applyReconciliationStatements(database, ['CREATE TABLE "reconcile_probe" ("id" TEXT PRIMARY KEY)', "CREATE TABLE broken ("])
    ).toThrow();

    withReadOnly(database, (db) => {
      const row = db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='reconcile_probe'").get() as { count: number };
      expect(row.count).toBe(0);
    });
    expect(schemaFingerprint(database)).toBe(before);
  });

  it("restores the pre-apply state from the backup and stays re-runnable", async () => {
    const before = schemaFingerprint(database);
    const result = await reconcileStaffAttendanceSchema({ database, backupDir, execute: true });
    const backup = result.backup;
    if (!backup) throw new Error("expected a backup artifact");
    expect(schemaFingerprint(database)).not.toBe(before);

    restoreReconciliationBackup(backup, database);
    expect(schemaFingerprint(database)).toBe(before);
    expect(readStaffAttendancePreflight(database).canonicalTablesPresent).toBe(0);

    const reapplied = await reconcileStaffAttendanceSchema({ database, backupDir, execute: true });
    expect(reapplied.after.upToDate).toBe(true);
    expect(reapplied.foreignKeyViolations).toBe(0);
  });

  it("refuses to reconcile a database without the referenced tables", async () => {
    const empty = path.join(tmp, "empty.db");
    new DatabaseSync(empty).close();

    const preflight = readStaffAttendancePreflight(empty);
    expect(preflight.blocked).toBe(true);
    expect(preflight.blockers).toContain("missing prerequisite table: parks");
    expect(preflight.blockers).toContain("missing prerequisite table: staff_meta");

    await expect(reconcileStaffAttendanceSchema({ database: empty, backupDir, execute: true })).rejects.toThrow(/Refusing reconciliation/);
    expect(readStaffAttendancePreflight(empty).canonicalTablesPresent).toBe(0);
    expect(fs.existsSync(backupDir)).toBe(false);
  });
});

describe.skipIf(!fs.existsSync(DEV_DB))("real-schema disposable copy", () => {
  it(
    "reconciles a copy of prisma/dev.db and leaves the original untouched",
    async () => {
      const sourceBefore = fs.statSync(DEV_DB);
      const sourceHash = fileHash(DEV_DB);
      const sourcePreflight = readStaffAttendancePreflight(DEV_DB);

      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "staff-attendance-dev-copy-"));
      const copy = path.join(tmp, "dev-copy.db");
      try {
        assertDisposableTarget(copy);
        fs.copyFileSync(DEV_DB, copy);

        const preflight = readStaffAttendancePreflight(copy);
        expect(preflight.blocked).toBe(false);
        expect(preflight.canonicalTablesPresent).toBe(sourcePreflight.canonicalTablesPresent);
        expect(preflight.legacyTables).toEqual([
          { table: "staff_attendance_events", present: true },
          { table: "staff_attendance_records", present: true },
        ]);

        const legacyRows = LEGACY_STAFF_ATTENDANCE_TABLES.map((table) => tableRows(copy, table));
        const legacySql = LEGACY_STAFF_ATTENDANCE_TABLES.map((table) => tableSql(copy, table));

        const result = await reconcileStaffAttendanceSchema({ database: copy, backupDir: path.join(tmp, "backups"), execute: true });
        expect(result.after).toMatchObject({ canonicalTablesPresent: 2, upToDate: true, blocked: false });
        expect(result.foreignKeyViolations).toBe(0);
        if (sourcePreflight.upToDate) {
          expect(result.backup).toBeNull();
        } else {
          expect(result.backup?.bytes).toBeGreaterThan(0);
        }

        LEGACY_STAFF_ATTENDANCE_TABLES.forEach((table, index) => {
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
