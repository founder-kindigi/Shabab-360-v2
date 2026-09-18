/**
 * Team Access SQLite schema preflight, guarded additive reconciliation and the
 * read-only readiness gate used by provisioning.
 *
 * Reads are always read-only. A write requires `execute`, takes a verified
 * file-level backup first, applies the statements in one transaction, runs a
 * post-check (preflight plus `PRAGMA foreign_key_check`) and restores the backup
 * automatically if anything fails. It never rebuilds, renames, copies, drops or
 * rewrites a table, and never runs a Prisma command.
 *
 * Reports schema object names and counts only: no staff names, emails, passwords
 * or workbook rows.
 */
import { DatabaseSync } from "node:sqlite";
import {
  ASSISTS_MURABBI_COLUMN,
  ASSISTS_MURABBI_INDEX,
  STAFF_META_TABLE,
  planTeamAccessSchema,
  summarizeTeamAccessSchema,
  type TeamAccessSchemaCatalog,
  type TeamAccessSchemaPlan,
  type TeamAccessSchemaPreflight,
} from "./schema";
import {
  countForeignKeyViolations,
  createSqliteFileBackup,
  openSqliteDatabase,
  restoreSqliteFileBackup,
  verifySqliteBackupFile,
  type SqliteFileArtifact,
} from "../sqlite-support";

const URL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
const POSTGRES_PATTERN = /^postgres(ql)?:/i;

/** Refuses a URL, a networked target or a PostgreSQL connection string. */
export function assertLocalSqliteTarget(value: string): string {
  const candidate = value.trim();
  if (candidate.length === 0) throw new Error("A local SQLite file path is required");
  if (POSTGRES_PATTERN.test(candidate)) throw new Error("Refusing a PostgreSQL target; only a local SQLite file path is accepted");
  if (URL_PATTERN.test(candidate)) throw new Error("Refusing a URL or networked target; only a local SQLite file path is accepted");
  return candidate;
}

/**
 * Probes the engine in an in-memory database: an additive self-referencing
 * foreign key is only valid when the new column's default is NULL, which is the
 * case here. Returns false on any error, so the planner falls back to the plain
 * column the committed migration uses.
 */
export function probeSelfReferenceAdditiveSupport(): boolean {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("PRAGMA foreign_keys = ON");
    db.exec(`CREATE TABLE "${STAFF_META_TABLE}" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL)`);
    db.exec(
      `ALTER TABLE "${STAFF_META_TABLE}" ADD COLUMN "${ASSISTS_MURABBI_COLUMN}" TEXT REFERENCES "${STAFF_META_TABLE}"("id") ON DELETE SET NULL ON UPDATE CASCADE`
    );
    return (db.prepare(`PRAGMA foreign_key_list("${STAFF_META_TABLE}")`).all() as { from: string }[]).some(
      (foreignKey) => foreignKey.from === ASSISTS_MURABBI_COLUMN
    );
  } catch {
    return false;
  } finally {
    db.close();
  }
}

function tableExists(db: DatabaseSync, table: string): boolean {
  const row = db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name = ?").get(table) as { count: number };
  return row.count > 0;
}

function indexColumns(db: DatabaseSync, index: string): string[] {
  return (db.prepare(`PRAGMA index_info(${JSON.stringify(index)})`).all() as { name: string }[]).map((column) => column.name);
}

/** Reads only the staff-attendance-adjacent schema metadata this contract needs. */
export function readTeamAccessSchemaCatalog(db: DatabaseSync, selfReferenceAdditiveSupported: boolean): TeamAccessSchemaCatalog {
  if (!tableExists(db, STAFF_META_TABLE)) {
    return { staffMetaPresent: false, column: null, index: null, selfReferencePresent: false, selfReferenceAdditiveSupported };
  }

  const info = db.prepare(`PRAGMA table_info("${STAFF_META_TABLE}")`).all() as { name: string; notnull: number }[];
  const found = info.find((column) => column.name === ASSISTS_MURABBI_COLUMN);

  const indexRow = db
    .prepare("SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name = ?")
    .get(ASSISTS_MURABBI_INDEX) as { name: string; tbl_name: string } | undefined;

  const selfReferencePresent = (
    db.prepare(`PRAGMA foreign_key_list("${STAFF_META_TABLE}")`).all() as { from: string }[]
  ).some((foreignKey) => foreignKey.from === ASSISTS_MURABBI_COLUMN);

  return {
    staffMetaPresent: true,
    column: { present: found !== undefined, notNull: found?.notnull === 1 },
    index: indexRow
      ? { present: true, table: indexRow.tbl_name, columns: indexColumns(db, ASSISTS_MURABBI_INDEX) }
      : { present: false, table: "", columns: [] },
    selfReferencePresent,
    selfReferenceAdditiveSupported,
  };
}

function readPlan(databasePath: string): { plan: TeamAccessSchemaPlan; preflight: TeamAccessSchemaPreflight } {
  const db = openSqliteDatabase(databasePath, true);
  try {
    const catalog = readTeamAccessSchemaCatalog(db, probeSelfReferenceAdditiveSupport());
    const plan = planTeamAccessSchema(catalog);
    return { plan, preflight: summarizeTeamAccessSchema(catalog, plan) };
  } finally {
    db.close();
  }
}

/** Read-only, schema-only status. Opens no write handle. */
export function readTeamAccessSchemaPreflight(databasePath: string): TeamAccessSchemaPreflight {
  return readPlan(databasePath).preflight;
}

/** Applies statements in one transaction; a failure rolls the whole batch back. */
export function applyTeamAccessSchemaStatements(databasePath: string, statements: readonly string[]): number {
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

export interface GuardedTeamAccessWriteInput {
  readonly database: string;
  readonly backupDir: string;
  readonly statements: readonly string[];
  /** Throws when the applied schema is not acceptable. */
  readonly postCheck: () => void;
}

export interface GuardedTeamAccessWriteResult {
  readonly backup: SqliteFileArtifact;
  readonly appliedStatements: number;
}

/**
 * The only write path: verified backup, one transaction, post-check, and an
 * automatic restore when the write or the post-check fails.
 */
export async function runGuardedTeamAccessWrite(input: GuardedTeamAccessWriteInput): Promise<GuardedTeamAccessWriteResult> {
  if (input.statements.length === 0) throw new Error("Refusing a guarded write with no statements");
  const backup = await createSqliteFileBackup({ path: input.database, backupDir: input.backupDir }, "team-access-schema");
  await verifySqliteBackupFile(backup);
  try {
    const appliedStatements = applyTeamAccessSchemaStatements(input.database, input.statements);
    input.postCheck();
    return { backup, appliedStatements };
  } catch (error) {
    restoreSqliteFileBackup(backup, { path: input.database });
    throw error;
  }
}

export interface TeamAccessReconcileOptions {
  readonly database: string;
  readonly backupDir: string;
  readonly execute: boolean;
}

export interface TeamAccessReconcileResult {
  readonly mode: "read-only" | "execute";
  readonly database: string;
  readonly before: TeamAccessSchemaPreflight;
  readonly after: TeamAccessSchemaPreflight;
  readonly backup: SqliteFileArtifact | null;
  readonly appliedStatements: number;
  readonly foreignKeyViolations: number;
}

export function restoreTeamAccessSchemaBackup(artifact: SqliteFileArtifact, databasePath: string): void {
  restoreSqliteFileBackup(artifact, { path: databasePath });
}

export async function reconcileTeamAccessSchema(options: TeamAccessReconcileOptions): Promise<TeamAccessReconcileResult> {
  const { plan, preflight } = readPlan(options.database);
  if (preflight.blocked) throw new Error(`Refusing reconciliation: ${preflight.blockers.join("; ")}`);

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

  const { backup, appliedStatements } = await runGuardedTeamAccessWrite({
    database: options.database,
    backupDir: options.backupDir,
    statements: plan.createStatements,
    postCheck: () => {
      const after = readTeamAccessSchemaPreflight(options.database);
      const violations = countForeignKeyViolations(options.database);
      if (!after.upToDate || violations > 0) {
        throw new Error(`Post-apply verification failed (upToDate=${after.upToDate}, foreignKeyViolations=${violations})`);
      }
    },
  });

  return {
    mode: "execute",
    database: options.database,
    before: preflight,
    after: readTeamAccessSchemaPreflight(options.database),
    backup,
    appliedStatements,
    foreignKeyViolations: countForeignKeyViolations(options.database),
  };
}

/**
 * Read-only readiness gate. Throws when the database cannot store Muawin
 * assistance links, so provisioning stops before passwords, backups or
 * activation.
 */
export function assertTeamAccessSchemaReady(databasePath: string, hint: string): void {
  const preflight = readTeamAccessSchemaPreflight(databasePath);
  if (preflight.blocked) {
    throw new Error(`Team Access schema is not compatible with ${databasePath}: ${preflight.blockers.join("; ")}`);
  }
  if (!preflight.upToDate) {
    throw new Error(
      `Team Access schema is incomplete for ${databasePath}: ${STAFF_META_TABLE}.${ASSISTS_MURABBI_COLUMN} column=${preflight.assistsMurabbiColumnPresent ? "present" : "absent"}, index=${preflight.assistsMurabbiIndexPresent ? "present" : "absent"}. Run the local reconciliation first: ${hint}`
    );
  }
}
