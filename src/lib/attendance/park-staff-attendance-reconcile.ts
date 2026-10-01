/**
 * Guarded local SQLite reconciliation for the canonical staff-attendance tables.
 *
 * Creates only the missing `park_staff_attendance_*` tables and indexes that the
 * current application and `prisma/schema.prisma` require. It is read-only unless
 * `execute` is set, it never alters an existing table, it never touches the
 * legacy `staff_attendance_*` family, and every write is gated behind a verified
 * file-level backup that is restored automatically if the post-apply checks fail.
 *
 * `openSqliteDatabase(path, true)` is used for all inspection, so a dry run
 * cannot modify the database file.
 */
import { DatabaseSync } from "node:sqlite";
import {
  CANONICAL_INDEXES,
  CANONICAL_TABLES,
  LEGACY_STAFF_ATTENDANCE_TABLES,
  REQUIRED_EXISTING_TABLES,
  assertPlanPreservesLegacyTables,
  planStaffAttendanceReconciliation,
  summarizeStaffAttendancePreflight,
  type ReconciliationPlan,
  type StaffAttendanceCatalog,
  type StaffAttendancePreflight,
} from "./park-staff-attendance-schema";
import {
  createSqliteFileBackup,
  openSqliteDatabase,
  restoreSqliteFileBackup,
  sqliteForeignKeyViolations,
  verifySqliteBackupFile,
  type SqliteFileArtifact,
} from "./sqlite-support";

/** Only these schema objects are read; the rest of the catalog stays unexamined. */
const WATCHED_TABLES: readonly string[] = [
  ...CANONICAL_TABLES.map((table) => table.name),
  ...LEGACY_STAFF_ATTENDANCE_TABLES,
  ...REQUIRED_EXISTING_TABLES,
];

function tableExists(db: DatabaseSync, table: string): boolean {
  const row = db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name = ?").get(table) as { count: number };
  return row.count > 0;
}

/** Reads only the watched tables, their columns, indexes and canonical foreign keys. */
export function readStaffAttendanceCatalog(db: DatabaseSync): StaffAttendanceCatalog {
  const tables = new Map<string, { columns: { name: string; notNull: boolean; defaultValue: string | null }[] }>();
  for (const table of WATCHED_TABLES) {
    if (!tableExists(db, table)) continue;
    const info = db.prepare(`PRAGMA table_info(${JSON.stringify(table)})`).all() as { name: string; notnull: number; dflt_value: string | null }[];
    tables.set(table, {
      columns: info.map((column) => ({ name: column.name, notNull: column.notnull === 1, defaultValue: column.dflt_value ?? null })),
    });
  }

  const indexes = new Map<string, { table: string; unique: boolean }>();
  const indexRows = db
    .prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string; tbl_name: string; sql: string | null }[];
  for (const row of indexRows) {
    indexes.set(row.name, { table: row.tbl_name, unique: /CREATE\s+UNIQUE\s+INDEX/i.test(row.sql ?? "") });
  }

  const foreignKeys = new Map<string, { column: string; referencesTable: string; onDelete: string }[]>();
  for (const table of CANONICAL_TABLES) {
    if (!tables.has(table.name)) continue;
    foreignKeys.set(
      table.name,
      (db.prepare(`PRAGMA foreign_key_list(${JSON.stringify(table.name)})`).all() as { from: string; table: string; on_delete: string }[]).map(
        (foreignKey) => ({ column: foreignKey.from, referencesTable: foreignKey.table, onDelete: foreignKey.on_delete })
      )
    );
  }

  return { tables, indexes, foreignKeys };
}

function readPlan(databasePath: string): { plan: ReconciliationPlan; preflight: StaffAttendancePreflight } {
  const db = openSqliteDatabase(databasePath, true);
  try {
    const catalog = readStaffAttendanceCatalog(db);
    const plan = planStaffAttendanceReconciliation(catalog);
    assertPlanPreservesLegacyTables(plan);
    return { plan, preflight: summarizeStaffAttendancePreflight(catalog, plan) };
  } finally {
    db.close();
  }
}

/** Read-only, aggregate/schema-only status. A dry run can never open a write handle. */
export function readStaffAttendancePreflight(databasePath: string): StaffAttendancePreflight {
  return readPlan(databasePath).preflight;
}

/** Applies statements inside one transaction; a failure rolls the whole batch back. */
export function applyReconciliationStatements(databasePath: string, statements: readonly string[]): number {
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

export function countForeignKeyViolations(databasePath: string): number {
  const db = openSqliteDatabase(databasePath, true);
  try {
    return sqliteForeignKeyViolations(db);
  } finally {
    db.close();
  }
}

export interface ReconcileOptions {
  readonly database: string;
  readonly backupDir: string;
  readonly execute: boolean;
}

export interface ReconcileResult {
  readonly mode: "read-only" | "execute";
  readonly database: string;
  readonly before: StaffAttendancePreflight;
  readonly after: StaffAttendancePreflight;
  readonly backup: SqliteFileArtifact | null;
  readonly appliedStatements: number;
  readonly foreignKeyViolations: number;
}

/** Restores a pre-apply backup over the database, e.g. to undo the reconciliation. */
export function restoreReconciliationBackup(artifact: SqliteFileArtifact, databasePath: string): void {
  restoreSqliteFileBackup(artifact, { path: databasePath });
}

export async function reconcileStaffAttendanceSchema(options: ReconcileOptions): Promise<ReconcileResult> {
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

  const backup = await createSqliteFileBackup({ path: options.database, backupDir: options.backupDir }, "attendance-schema");
  await verifySqliteBackupFile(backup);

  try {
    const appliedStatements = applyReconciliationStatements(options.database, plan.createStatements);
    const after = readStaffAttendancePreflight(options.database);
    const foreignKeyViolations = countForeignKeyViolations(options.database);
    if (!after.upToDate || foreignKeyViolations > 0) {
      throw new Error(`Post-apply verification failed (upToDate=${after.upToDate}, foreignKeyViolations=${foreignKeyViolations})`);
    }
    return {
      mode: "execute",
      database: options.database,
      before: preflight,
      after,
      backup,
      appliedStatements,
      foreignKeyViolations,
    };
  } catch (error) {
    restoreSqliteFileBackup(backup, { path: options.database });
    throw error;
  }
}

/** Index names the contract expects, exposed for tooling output. */
export const CANONICAL_INDEX_NAMES: readonly string[] = CANONICAL_INDEXES.map((index) => index.name);
