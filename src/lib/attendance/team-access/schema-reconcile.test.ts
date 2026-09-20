import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ASSISTS_MURABBI_COLUMN, ASSISTS_MURABBI_INDEX, STAFF_META_TABLE } from "./schema";
import {
  applyTeamAccessSchemaStatements,
  assertLocalSqliteTarget,
  assertTeamAccessSchemaReady,
  probeSelfReferenceAdditiveSupport,
  readTeamAccessSchemaPreflight,
  reconcileTeamAccessSchema,
  runGuardedTeamAccessWrite,
} from "./schema-reconcile";
import { countForeignKeyViolations } from "../sqlite-support";

const REPO_ROOT = process.cwd();
const DEV_DB = path.join(REPO_ROOT, "prisma", "dev.db");

/** Tests may only ever touch a throwaway copy. */
function assertDisposableTarget(target: string): void {
  const resolved = path.resolve(target);
  if (resolved === path.resolve(DEV_DB)) throw new Error("Refusing to target the real development database");
  if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep)) throw new Error("Reconciliation tests must use an OS temp copy");
}

const FIXTURE_DDL: readonly string[] = [
  `CREATE TABLE "users" ("id" TEXT NOT NULL PRIMARY KEY, "email" TEXT NOT NULL)`,
  `CREATE TABLE "parks" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL)`,
  `CREATE TABLE "${STAFF_META_TABLE}" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "role" TEXT NOT NULL, "assignedParkId" TEXT REFERENCES "parks"("id") ON DELETE SET NULL, "isActive" INTEGER NOT NULL DEFAULT 1)`,
];

/** The incompatible variant: the column exists but is NOT NULL. */
const NOT_NULL_FIXTURE_DDL: readonly string[] = [
  ...FIXTURE_DDL.slice(0, 2),
  `CREATE TABLE "${STAFF_META_TABLE}" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "role" TEXT NOT NULL, "assignedParkId" TEXT REFERENCES "parks"("id") ON DELETE SET NULL, "isActive" INTEGER NOT NULL DEFAULT 1, "${ASSISTS_MURABBI_COLUMN}" TEXT NOT NULL DEFAULT '')`,
];

const STAFF_META_WITH_ASSISTS_COLUMN = `CREATE TABLE "${STAFF_META_TABLE}" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "role" TEXT NOT NULL, "assignedParkId" TEXT REFERENCES "parks"("id") ON DELETE SET NULL, "isActive" INTEGER NOT NULL DEFAULT 1, "${ASSISTS_MURABBI_COLUMN}" TEXT)`;

/** Already at the contract: the nullable column and its index are both present. */
const CONFORMANT_FIXTURE_DDL: readonly string[] = [
  ...FIXTURE_DDL.slice(0, 2),
  STAFF_META_WITH_ASSISTS_COLUMN,
  `CREATE INDEX "${ASSISTS_MURABBI_INDEX}" ON "${STAFF_META_TABLE}"("${ASSISTS_MURABBI_COLUMN}")`,
];

/** The column exists without its index, so exactly one statement is still needed. */
const COLUMN_ONLY_FIXTURE_DDL: readonly string[] = [...FIXTURE_DDL.slice(0, 2), STAFF_META_WITH_ASSISTS_COLUMN];

/** The index name exists but points at the wrong column: never silently accepted. */
const WRONG_INDEX_FIXTURE_DDL: readonly string[] = [
  ...FIXTURE_DDL.slice(0, 2),
  STAFF_META_WITH_ASSISTS_COLUMN,
  `CREATE INDEX "${ASSISTS_MURABBI_INDEX}" ON "${STAFF_META_TABLE}"("role")`,
];

const SEED = `
  INSERT INTO "users" ("id","email") VALUES ('fixture-user','fixture@example.invalid');
  INSERT INTO "parks" ("id","name") VALUES ('fixture-park','Fixture Park');
  INSERT INTO "${STAFF_META_TABLE}" ("id","userId","role","assignedParkId") VALUES ('fixture-murabbi','fixture-user','murabbi','fixture-park');
  INSERT INTO "${STAFF_META_TABLE}" ("id","userId","role","assignedParkId") VALUES ('fixture-muawin','fixture-user','muawin','fixture-park');
`;

function createFixture(filePath: string, ddl: readonly string[] = FIXTURE_DDL): void {
  const db = new DatabaseSync(filePath);
  try {
    db.exec("PRAGMA foreign_keys = ON");
    for (const statement of ddl) db.exec(statement);
    db.exec(SEED);
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

function schemaFingerprint(filePath: string): string {
  return withReadOnly(filePath, (db) => JSON.stringify(db.prepare("SELECT type, name, sql FROM sqlite_master ORDER BY type, name").all()));
}

/** Compares only the columns that existed before reconciliation, so an added column cannot mask drift. */
const STABLE_STAFF_COLUMNS = '"id","userId","role","assignedParkId","isActive"';
function staffRows(filePath: string): string {
  return withReadOnly(filePath, (db) =>
    JSON.stringify(db.prepare(`SELECT ${STABLE_STAFF_COLUMNS} FROM "${STAFF_META_TABLE}" ORDER BY "id"`).all())
  );
}

function columnState(filePath: string, column: string): { notNull: boolean; defaultValue: string | null } | null {
  return withReadOnly(filePath, (db) => {
    const info = db.prepare(`PRAGMA table_info("${STAFF_META_TABLE}")`).all() as { name: string; notnull: number; dflt_value: string | null }[];
    const found = info.find((entry) => entry.name === column);
    return found ? { notNull: found.notnull === 1, defaultValue: found.dflt_value ?? null } : null;
  });
}

function selfReference(filePath: string): { table: string; onDelete: string } | null {
  return withReadOnly(filePath, (db) => {
    const found = (db.prepare(`PRAGMA foreign_key_list("${STAFF_META_TABLE}")`).all() as { from: string; table: string; on_delete: string }[]).find(
      (foreignKey) => foreignKey.from === ASSISTS_MURABBI_COLUMN
    );
    return found ? { table: found.table, onDelete: found.on_delete } : null;
  });
}

function fileHash(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

describe("Team Access schema probe and target guard", () => {
  it("proves this SQLite build supports the additive self-reference", () => {
    expect(probeSelfReferenceAdditiveSupport()).toBe(true);
  });

  it("refuses URLs and PostgreSQL targets", () => {
    expect(() => assertLocalSqliteTarget("postgres://user@host/db")).toThrow(/PostgreSQL/);
    expect(() => assertLocalSqliteTarget("postgresql://user@host/db")).toThrow(/PostgreSQL/);
    expect(() => assertLocalSqliteTarget("http://example.invalid/db")).toThrow(/URL or networked/);
    expect(() => assertLocalSqliteTarget("")).toThrow(/local SQLite file path is required/);
    expect(assertLocalSqliteTarget("  prisma/dev.db  ")).toBe("prisma/dev.db");
  });
});

describe("Team Access schema reconciliation on disposable copies", () => {
  let tmp: string;
  let database: string;
  let backupDir: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "team-access-schema-"));
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
    // The same file reached through a relative path is still refused.
    expect(() => assertDisposableTarget(path.join("prisma", "dev.db"))).toThrow(/real development database/);
    expect(() => assertDisposableTarget(path.join(REPO_ROOT, "prisma", "another.db"))).toThrow(/temp copy/);
  });

  it("detects the missing field and index without modifying the database", () => {
    const hash = fileHash(database);
    const preflight = readTeamAccessSchemaPreflight(database);

    expect(preflight).toMatchObject({
      mode: "read-only",
      staffMetaPresent: true,
      assistsMurabbiColumnPresent: false,
      assistsMurabbiColumnNullable: false,
      assistsMurabbiIndexPresent: false,
      selfReference: "planned",
      blocked: false,
      upToDate: false,
      plannedStatements: 2,
    });
    expect(fileHash(database)).toBe(hash);
    expect(fs.existsSync(backupDir)).toBe(false);
  });

  it("adds only the approved additive objects and keeps existing rows", async () => {
    const rowsBefore = staffRows(database);
    const result = await reconcileTeamAccessSchema({ database, backupDir, execute: true });

    expect(result.mode).toBe("execute");
    expect(result.appliedStatements).toBe(2);
    expect(result.foreignKeyViolations).toBe(0);
    expect(result.after).toMatchObject({ assistsMurabbiColumnPresent: true, assistsMurabbiIndexPresent: true, upToDate: true, blocked: false });

    expect(columnState(database, ASSISTS_MURABBI_COLUMN)).toEqual({ notNull: false, defaultValue: null });
    expect(selfReference(database)).toEqual({ table: STAFF_META_TABLE, onDelete: "SET NULL" });
    expect(staffRows(database)).toBe(rowsBefore);

    withReadOnly(database, (db) => {
      const index = db.prepare("SELECT tbl_name FROM sqlite_master WHERE type='index' AND name = ?").get(ASSISTS_MURABBI_INDEX) as
        | { tbl_name: string }
        | undefined;
      expect(index?.tbl_name).toBe(STAFF_META_TABLE);
      const columns = (db.prepare(`PRAGMA index_info("${ASSISTS_MURABBI_INDEX}")`).all() as { name: string }[]).map((column) => column.name);
      expect(columns).toEqual([ASSISTS_MURABBI_COLUMN]);
      // The new link column is NULL for every existing row.
      const nulls = db.prepare(`SELECT COUNT(*) AS c FROM "${STAFF_META_TABLE}" WHERE "${ASSISTS_MURABBI_COLUMN}" IS NULL`).get() as { c: number };
      expect(nulls.c).toBe(2);
    });
  });

  it("is idempotent on a second run", async () => {
    await reconcileTeamAccessSchema({ database, backupDir, execute: true });
    const fingerprint = schemaFingerprint(database);
    const hash = fileHash(database);

    const second = await reconcileTeamAccessSchema({ database, backupDir, execute: true });
    expect(second.appliedStatements).toBe(0);
    expect(second.backup).toBeNull();
    expect(second.before.upToDate).toBe(true);
    expect(schemaFingerprint(database)).toBe(fingerprint);
    expect(fileHash(database)).toBe(hash);
  });

  it("fails on an incompatible shape before any backup or write", async () => {
    const incompatible = path.join(tmp, "incompatible.db");
    createFixture(incompatible, NOT_NULL_FIXTURE_DDL);

    const preflight = readTeamAccessSchemaPreflight(incompatible);
    expect(preflight.blocked).toBe(true);
    expect(preflight.blockers[0]).toMatch(/is NOT NULL/);

    const before = schemaFingerprint(incompatible);
    await expect(reconcileTeamAccessSchema({ database: incompatible, backupDir, execute: true })).rejects.toThrow(/Refusing reconciliation/);
    expect(schemaFingerprint(incompatible)).toBe(before);
    expect(fs.existsSync(backupDir)).toBe(false);
  });

  it("restores the original database when a post-check fails", async () => {
    const fingerprintBefore = schemaFingerprint(database);
    const rowsBefore = staffRows(database);
    const plan = readTeamAccessSchemaPreflight(database);
    expect(plan.plannedStatements).toBe(2);

    await expect(
      runGuardedTeamAccessWrite({
        database,
        backupDir,
        statements: [
          `ALTER TABLE "${STAFF_META_TABLE}" ADD COLUMN "${ASSISTS_MURABBI_COLUMN}" TEXT REFERENCES "${STAFF_META_TABLE}"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
          `CREATE INDEX "${ASSISTS_MURABBI_INDEX}" ON "${STAFF_META_TABLE}"("${ASSISTS_MURABBI_COLUMN}")`,
        ],
        postCheck: () => {
          throw new Error("forced post-check failure");
        },
      })
    ).rejects.toThrow(/forced post-check failure/);

    expect(schemaFingerprint(database)).toBe(fingerprintBefore);
    expect(staffRows(database)).toBe(rowsBefore);
    expect(columnState(database, ASSISTS_MURABBI_COLUMN)).toBeNull();
    expect(fs.readdirSync(backupDir).filter((name) => name.endsWith(".db"))).toHaveLength(1);
  });

  it("rolls the whole batch back when a statement fails", () => {
    const before = schemaFingerprint(database);
    expect(() => applyTeamAccessSchemaStatements(database, ['ALTER TABLE "no_such_table" ADD COLUMN "x" TEXT'])).toThrow();
    expect(schemaFingerprint(database)).toBe(before);
  });

  it("gates readiness until the requirement is satisfied", async () => {
    expect(() => assertTeamAccessSchemaReady(database, "run-the-tool")).toThrow(/Team Access schema is incomplete/);
    expect(() => assertTeamAccessSchemaReady(database, "run-the-tool")).toThrow(/run-the-tool/);

    await reconcileTeamAccessSchema({ database, backupDir, execute: true });
    expect(() => assertTeamAccessSchemaReady(database, "run-the-tool")).not.toThrow();
    expect(countForeignKeyViolations(database)).toBe(0);
  });

  /**
   * Baseline-independent coverage: each variant is built from DDL, so the expected
   * outcome never depends on the mutable state of `prisma/dev.db`.
   */
  describe("deterministic baseline variants", () => {
    it("recognises a schema that already carries the Muawin assistance field and index", async () => {
      const conformant = path.join(tmp, "conformant.db");
      createFixture(conformant, CONFORMANT_FIXTURE_DDL);

      const fingerprint = schemaFingerprint(conformant);
      const hash = fileHash(conformant);
      const preflight = readTeamAccessSchemaPreflight(conformant);

      expect(preflight).toMatchObject({
        mode: "read-only",
        staffMetaPresent: true,
        assistsMurabbiColumnPresent: true,
        assistsMurabbiColumnNullable: true,
        assistsMurabbiIndexPresent: true,
        blocked: false,
        upToDate: true,
        plannedStatements: 0,
      });
      expect(() => assertTeamAccessSchemaReady(conformant, "run-the-tool")).not.toThrow();

      const result = await reconcileTeamAccessSchema({ database: conformant, backupDir, execute: true });

      expect(result.appliedStatements).toBe(0);
      expect(result.backup).toBeNull();
      expect(result.after.upToDate).toBe(true);
      expect(schemaFingerprint(conformant)).toBe(fingerprint);
      expect(fileHash(conformant)).toBe(hash);
      // No write path was entered, so no backup was even attempted.
      expect(fs.existsSync(backupDir)).toBe(false);
    });

    it("plans exactly the missing index when only the field is present", async () => {
      const partial = path.join(tmp, "column-only.db");
      createFixture(partial, COLUMN_ONLY_FIXTURE_DDL);

      const preflight = readTeamAccessSchemaPreflight(partial);
      expect(preflight).toMatchObject({
        staffMetaPresent: true,
        assistsMurabbiColumnPresent: true,
        assistsMurabbiColumnNullable: true,
        assistsMurabbiIndexPresent: false,
        blocked: false,
        upToDate: false,
        plannedStatements: 1,
      });

      const rowsBefore = staffRows(partial);
      const result = await reconcileTeamAccessSchema({ database: partial, backupDir, execute: true });

      expect(result.appliedStatements).toBe(1);
      expect(result.after).toMatchObject({
        assistsMurabbiColumnPresent: true,
        assistsMurabbiIndexPresent: true,
        upToDate: true,
        blocked: false,
      });
      expect(result.foreignKeyViolations).toBe(0);
      expect(staffRows(partial)).toBe(rowsBefore);
      expect(columnState(partial, ASSISTS_MURABBI_COLUMN)).toEqual({ notNull: false, defaultValue: null });
    });

    it("rejects an index that exists but does not match the contract", async () => {
      const wrong = path.join(tmp, "wrong-index.db");
      createFixture(wrong, WRONG_INDEX_FIXTURE_DDL);

      const preflight = readTeamAccessSchemaPreflight(wrong);
      expect(preflight.blocked).toBe(true);
      expect(preflight.blockers[0]).toMatch(/does not match the contract/);

      const before = schemaFingerprint(wrong);
      await expect(reconcileTeamAccessSchema({ database: wrong, backupDir, execute: true })).rejects.toThrow(
        /Refusing reconciliation/
      );
      expect(schemaFingerprint(wrong)).toBe(before);
      expect(fs.existsSync(backupDir)).toBe(false);
    });
  });
});

describe.skipIf(!fs.existsSync(DEV_DB))("real-schema disposable copy", () => {
  it(
    "reconciles a copy of the real schema to the contract without touching the original",
    async () => {
      const sourceBefore = fs.statSync(DEV_DB);
      const sourceHash = fileHash(DEV_DB);

      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "team-access-dev-copy-"));
      const copy = path.join(tmp, "dev-copy.db");
      try {
        assertDisposableTarget(copy);
        fs.copyFileSync(DEV_DB, copy);

        // Every expectation below is derived from the copy itself, never from a
        // hard-coded local baseline: the assertions hold before and after the local
        // schema gains the Muawin assistance objects.
        const preflight = readTeamAccessSchemaPreflight(copy);
        expect(preflight).toMatchObject({ mode: "read-only", staffMetaPresent: true, blocked: false });
        expect(preflight.assistsMurabbiColumnNullable).toBe(preflight.assistsMurabbiColumnPresent);
        expect(preflight.upToDate).toBe(preflight.plannedStatements === 0);

        const columnBefore = columnState(copy, ASSISTS_MURABBI_COLUMN);
        const selfReferenceBefore = selfReference(copy);
        const fingerprintBefore = schemaFingerprint(copy);
        const rowsBefore = staffRows(copy);

        const result = await reconcileTeamAccessSchema({
          database: copy,
          backupDir: path.join(tmp, "backups"),
          execute: true,
        });

        expect(result.before).toEqual(preflight);
        expect(result.appliedStatements).toBe(preflight.plannedStatements);
        expect(result.after).toMatchObject({
          assistsMurabbiColumnPresent: true,
          assistsMurabbiColumnNullable: true,
          assistsMurabbiIndexPresent: true,
          blocked: false,
          upToDate: true,
        });
        expect(result.foreignKeyViolations).toBe(0);
        expect(columnState(copy, ASSISTS_MURABBI_COLUMN)).toEqual({ notNull: false, defaultValue: null });
        expect(staffRows(copy)).toBe(rowsBefore);
        expect(() => assertTeamAccessSchemaReady(copy, "run-the-tool")).not.toThrow();

        if (columnBefore === null) {
          // This run added the column, so it carries the approved self-reference.
          expect(selfReference(copy)).toEqual(
            preflight.selfReferenceAdditiveSupported ? { table: STAFF_META_TABLE, onDelete: "SET NULL" } : null
          );
        } else {
          // The column already existed: reconciliation must never rebuild the table,
          // so an existing (absent or present) self-reference is left exactly as it was.
          expect(selfReference(copy)).toEqual(selfReferenceBefore);
        }
        if (preflight.plannedStatements === 0) {
          expect(schemaFingerprint(copy)).toBe(fingerprintBefore);
        } else {
          expect(schemaFingerprint(copy)).not.toBe(fingerprintBefore);
        }

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
