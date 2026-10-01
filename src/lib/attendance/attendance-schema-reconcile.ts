/**
 * Guarded local ATT01 attendance-schema preflight and additive reconciliation.
 *
 * Read-only unless `execute` is set. With `execute` it refuses to run while any
 * blocker exists, takes and verifies a file-level backup, applies the additive
 * statements inside one transaction, re-checks the preflight and
 * `PRAGMA foreign_key_check`, and restores the backup automatically if anything
 * fails. It never rebuilds, renames, drops, copies or rewrites a populated table,
 * and it never touches the preserved legacy `staff_attendance_*` tables.
 *
 * This is the entry point the Lahore refresh consults before it imports.
 */
import { DatabaseSync } from "node:sqlite";
import {
  DECLARED_UNREFERENCED_TABLES,
  PRESERVED_LEGACY_TABLES,
  REQUIRED_SUPPORT_TABLES,
  REQUIRED_TABLES,
  assertPlanPreservesLegacyTables,
  planAttendanceSchema,
  summarizeAttendanceSchemaPreflight,
  type AttendanceSchemaCatalog,
  type AttendanceSchemaPlan,
  type AttendanceSchemaPreflight,
} from "./attendance-schema-contract";
import {
  countForeignKeyViolations,
  createSqliteFileBackup,
  openSqliteDatabase,
  restoreSqliteFileBackup,
  verifySqliteBackupFile,
  type SqliteFileArtifact,
} from "./sqlite-support";

const WATCHED_TABLES: readonly string[] = [
  ...REQUIRED_TABLES.map((table) => table.name),
  ...REQUIRED_SUPPORT_TABLES,
  ...PRESERVED_LEGACY_TABLES,
  ...DECLARED_UNREFERENCED_TABLES,
];

function tableExists(db: DatabaseSync, table: string): boolean {
  const row = db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name = ?").get(table) as { count: number };
  return row.count > 0;
}

/** Reads only the watched tables, all named indexes, and canonical foreign keys. */
export function readAttendanceSchemaCatalog(db: DatabaseSync): AttendanceSchemaCatalog {
  const tables = new Map<string, { columns: { name: string; notNull: boolean }[] }>();
  for (const table of WATCHED_TABLES) {
    if (!tableExists(db, table)) continue;
    const info = db.prepare(`PRAGMA table_info(${JSON.stringify(table)})`).all() as { name: string; notnull: number }[];
    tables.set(table, { columns: info.map((column) => ({ name: column.name, notNull: column.notnull === 1 })) });
  }

  const indexes = new Map<string, { table: string; unique: boolean }>();
  for (const row of db
    .prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string; tbl_name: string; sql: string | null }[]) {
    indexes.set(row.name, { table: row.tbl_name, unique: /CREATE\s+UNIQUE\s+INDEX/i.test(row.sql ?? "") });
  }

  const foreignKeys = new Map<string, { column: string; referencesTable: string }[]>();
  for (const table of REQUIRED_TABLES) {
    if (!tables.has(table.name)) continue;
    foreignKeys.set(
      table.name,
      (db.prepare(`PRAGMA foreign_key_list(${JSON.stringify(table.name)})`).all() as { from: string; table: string }[]).map((foreignKey) => ({
        column: foreignKey.from,
        referencesTable: foreignKey.table,
      }))
    );
  }

  return { tables, indexes, foreignKeys };
}

function readPlan(databasePath: string): { plan: AttendanceSchemaPlan; preflight: AttendanceSchemaPreflight } {
  const db = openSqliteDatabase(databasePath, true);
  try {
    const catalog = readAttendanceSchemaCatalog(db);
    const plan = planAttendanceSchema(catalog);
    assertPlanPreservesLegacyTables(plan);
    return { plan, preflight: summarizeAttendanceSchemaPreflight(catalog, plan) };
  } finally {
    db.close();
  }
}

/** Read-only, aggregate/schema-only status. Opens no write handle. */
export function readAttendanceSchemaPreflight(databasePath: string): AttendanceSchemaPreflight {
  return readPlan(databasePath).preflight;
}

/** Applies statements in one transaction; a failure rolls the whole batch back. */
export function applyAttendanceSchemaStatements(databasePath: string, statements: readonly string[]): number {
  const db = openSqliteDatabase(databasePath);
  try {
    db.exec("PRAGMA foreign_keys = ON");
    db.exec("BEGIN");
    try {
      for (const statement of statements) db.exec(statement);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    return statements.length;
  } finally {
    db.close();
  }
}

export interface AttendanceReconcileOptions {
  readonly database: string;
  readonly backupDir: string;
  readonly execute: boolean;
}

export interface AttendanceReconcileResult {
  readonly mode: "read-only" | "execute";
  readonly database: string;
  readonly before: AttendanceSchemaPreflight;
  readonly after: AttendanceSchemaPreflight;
  readonly backup: SqliteFileArtifact | null;
  readonly appliedStatements: number;
  readonly foreignKeyViolations: number;
}

export function restoreAttendanceSchemaBackup(artifact: SqliteFileArtifact, databasePath: string): void {
  restoreSqliteFileBackup(artifact, { path: databasePath });
}

export async function reconcileAttendanceSchema(options: AttendanceReconcileOptions): Promise<AttendanceReconcileResult> {
  const { plan, preflight } = readPlan(options.database);
  if (preflight.blocked) {
    throw new Error(`Refusing reconciliation: ${preflight.blockers.join("; ")}`);
  }

  if (!options.execute || plan.createStatements.length === 0) {
    return {
      mode: options.execute ? "execute" : "read-only",
      database: options.database,
      before: preflight,
      after: preflight,
      backup: null,
      appliedStatements: 0,
      foreignKeyViolations: countForeignKeyViolations(options.database),
    };
  }

  const backup = await createSqliteFileBackup({ path: options.database, backupDir: options.backupDir }, "att01-schema");
  await verifySqliteBackupFile(backup);

  try {
    const appliedStatements = applyAttendanceSchemaStatements(options.database, plan.createStatements);
    const after = readAttendanceSchemaPreflight(options.database);
    const foreignKeyViolations = countForeignKeyViolations(options.database);
    if (!after.upToDate || foreignKeyViolations > 0) {
      throw new Error(`Post-apply verification failed (upToDate=${after.upToDate}, foreignKeyViolations=${foreignKeyViolations})`);
    }
    return { mode: "execute", database: options.database, before: preflight, after, backup, appliedStatements, foreignKeyViolations };
  } catch (error) {
    restoreSqliteFileBackup(backup, { path: options.database });
    throw error;
  }
}

/**
 * Read-only gate for other tools: throws with an actionable message when the
 * target cannot support the ATT01 attendance schema.
 */
export function assertAttendanceSchemaReady(databasePath: string, hint: string): void {
  const preflight = readAttendanceSchemaPreflight(databasePath);
  if (preflight.blocked) {
    throw new Error(`ATT01 attendance schema is not compatible with ${databasePath}: ${preflight.blockers.join("; ")}`);
  }
  if (!preflight.upToDate) {
    const missing = [...preflight.missingColumns, ...preflight.missingIndexes];
    throw new Error(
      `ATT01 attendance schema is incomplete for ${databasePath}: missing ${missing.join(", ")}. Run the local reconciliation first: ${hint}`
    );
  }
}
