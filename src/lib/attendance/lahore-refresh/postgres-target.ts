/**
 * Read-only fresh-target guard for the ATT01 PostgreSQL import.
 *
 * Before any write, the import verifies that the target really is PostgreSQL,
 * that it carries the committed migration ledger, that every required ATT01
 * table/constraint/index exists, and that no Shabab business row is present yet.
 * A target that is not fresh and compatible is refused, never reset or merged.
 *
 * Every read is an aggregate or a catalog lookup. No personal data, row value or
 * connection detail is returned, and nothing here writes.
 */
import { PostgresRefusedError, type PostgresQueryPort, type PostgresRow } from "./postgres-port";

/** Tables the committed PostgreSQL chain must have created before an import. */
export const ATT01_REQUIRED_TABLES: readonly string[] = [
  "cities",
  "parks",
  "batches",
  "batch_settings",
  "groups",
  "participants",
  "attendance_events",
  "attendance_records",
  "batch_class_dates",
  "users",
  "staff_meta",
  "operation_receipts",
  "audit_log",
];

/** Critical foreign keys the import and its verification depend on. */
export const ATT01_REQUIRED_CONSTRAINTS: readonly string[] = [
  "parks_cityId_fkey",
  "groups_batchId_fkey",
  "participants_groupId_fkey",
  "attendance_events_groupId_fkey",
  "attendance_records_eventId_fkey",
  "attendance_records_participantId_fkey",
  "staff_meta_assistsMurabbiId_fkey",
];

/**
 * Critical unique indexes. Prisma models `@@unique` as a unique index in
 * PostgreSQL rather than a named constraint, so the reviewed business keys
 * (`attendance_events(groupId, eventDate)` and `attendance_records(eventId,
 * participantId)`) are indexes. Batch lookup uses the normal city/status index;
 * each park in a city may have its own active batch.
 */
export const ATT01_REQUIRED_INDEXES: readonly string[] = [
  "batches_cityId_isActive_idx",
  "batch_class_dates_batchId_classDate_key",
  "attendance_events_groupId_eventDate_key",
  "attendance_records_eventId_participantId_key",
];

/** Tables that must hold zero rows on a fresh target. */
export const ATT01_BUSINESS_TABLES: readonly string[] = [
  "cities",
  "parks",
  "batches",
  "batch_settings",
  "groups",
  "participants",
  "attendance_events",
  "attendance_records",
  "batch_class_dates",
  "users",
  "staff_meta",
  "operation_receipts",
  "audit_log",
];

export interface MigrationLedgerDiagnostics {
  readonly present: boolean;
  readonly applied: number;
  readonly missing: readonly string[];
  readonly unexpected: readonly string[];
  readonly duplicated: readonly string[];
  readonly unfinished: readonly string[];
  readonly rolledBack: readonly string[];
}

export interface PostgresTargetDiagnostics {
  readonly mode: "preflight";
  readonly writesPerformed: false;
  readonly provider: "postgresql";
  readonly serverMajor: number | null;
  readonly ledger: MigrationLedgerDiagnostics;
  readonly tablesMissing: readonly string[];
  readonly constraintsMissing: readonly string[];
  readonly indexesMissing: readonly string[];
  readonly nonEmptyTables: readonly string[];
  readonly fresh: boolean;
  readonly compatible: boolean;
  readonly blockers: readonly string[];
}

function countBy(values: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

async function readServerMajor(port: PostgresQueryPort): Promise<{ major: number | null; isPostgres: boolean }> {
  const rows = await port.query<PostgresRow & { version: string; version_num: string }>(
    "SELECT version() AS version, current_setting('server_version_num') AS version_num"
  );
  const row = rows[0];
  const version = typeof row?.version === "string" ? row.version : "";
  const numeric = Number.parseInt(String(row?.version_num ?? ""), 10);
  return {
    major: Number.isFinite(numeric) ? Math.trunc(numeric / 10000) : null,
    isPostgres: /postgresql/i.test(version),
  };
}

async function readLedger(
  port: PostgresQueryPort,
  expectedMigrations: readonly string[]
): Promise<MigrationLedgerDiagnostics> {
  let rows: PostgresRow[];
  try {
    rows = await port.query<PostgresRow>(
      'SELECT "migration_name", "finished_at", "rolled_back_at" FROM "_prisma_migrations" ORDER BY "started_at"'
    );
  } catch {
    return { present: false, applied: 0, missing: [], unexpected: [], duplicated: [], unfinished: [], rolledBack: [] };
  }

  const names = rows.map((row) => String(row.migration_name ?? ""));
  const counts = countBy(names);
  const expected = new Set(expectedMigrations);
  return {
    present: true,
    applied: rows.length,
    missing: expectedMigrations.filter((name) => !counts.has(name)),
    unexpected: [...new Set(names.filter((name) => !expected.has(name)))],
    duplicated: [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name),
    unfinished: rows.filter((row) => row.finished_at === null || row.finished_at === undefined).map((row) => String(row.migration_name)),
    rolledBack: rows.filter((row) => row.rolled_back_at !== null && row.rolled_back_at !== undefined).map((row) => String(row.migration_name)),
  };
}

async function readCatalogNames(port: PostgresQueryPort, sql: string, column: string): Promise<Set<string>> {
  const rows = await port.query<PostgresRow>(sql);
  return new Set(rows.map((row) => String(row[column] ?? "")));
}

/**
 * Reads the target's provider, ledger, required objects and emptiness. It issues
 * only parameter-free catalog and aggregate queries, and returns diagnostics.
 */
export async function inspectPostgresTarget(
  port: PostgresQueryPort,
  expectedMigrations: readonly string[]
): Promise<PostgresTargetDiagnostics> {
  const { major, isPostgres } = await readServerMajor(port);
  const ledger = await readLedger(port, expectedMigrations);

  const tables = await readCatalogNames(
    port,
    "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()",
    "table_name"
  );
  const constraints = await readCatalogNames(
    port,
    "SELECT conname FROM pg_constraint WHERE connamespace = current_schema()::regnamespace",
    "conname"
  );
  const indexes = await readCatalogNames(
    port,
    "SELECT indexname FROM pg_indexes WHERE schemaname = current_schema()",
    "indexname"
  );

  const tablesMissing = ATT01_REQUIRED_TABLES.filter((table) => !tables.has(table));
  const constraintsMissing = ATT01_REQUIRED_CONSTRAINTS.filter((name) => !constraints.has(name));
  const indexesMissing = ATT01_REQUIRED_INDEXES.filter((name) => !indexes.has(name));

  const nonEmptyTables: string[] = [];
  for (const table of ATT01_BUSINESS_TABLES) {
    if (!tables.has(table)) continue;
    const rows = await port.query<PostgresRow & { count: number }>(`SELECT COUNT(*)::int AS "count" FROM "${table}"`);
    if (Number(rows[0]?.count ?? 0) > 0) nonEmptyTables.push(table);
  }

  const blockers: string[] = [];
  if (!isPostgres) blockers.push("target_not_postgresql");
  if (!ledger.present) blockers.push("missing_migration_ledger");
  else if (
    ledger.missing.length > 0 ||
    ledger.unexpected.length > 0 ||
    ledger.duplicated.length > 0 ||
    ledger.unfinished.length > 0 ||
    ledger.rolledBack.length > 0
  ) {
    blockers.push("migration_ledger_mismatch");
  }
  for (const table of tablesMissing) blockers.push(`missing_table:${table}`);
  for (const name of constraintsMissing) blockers.push(`missing_constraint:${name}`);
  for (const name of indexesMissing) blockers.push(`missing_index:${name}`);
  for (const table of nonEmptyTables) blockers.push(`target_not_empty:${table}`);

  const compatible =
    isPostgres &&
    ledger.present &&
    ledger.missing.length === 0 &&
    ledger.unexpected.length === 0 &&
    ledger.duplicated.length === 0 &&
    ledger.unfinished.length === 0 &&
    ledger.rolledBack.length === 0 &&
    tablesMissing.length === 0 &&
    constraintsMissing.length === 0 &&
    indexesMissing.length === 0;

  return {
    mode: "preflight",
    writesPerformed: false,
    provider: "postgresql",
    serverMajor: major,
    ledger,
    tablesMissing,
    constraintsMissing,
    indexesMissing,
    nonEmptyTables,
    fresh: nonEmptyTables.length === 0,
    compatible,
    blockers,
  };
}

/** Throws with the blocker codes when the target is not a fresh compatible target. */
export function assertPostgresTargetReady(diagnostics: PostgresTargetDiagnostics): void {
  if (diagnostics.blockers.length > 0) {
    throw new PostgresRefusedError(`Refusing the ATT01 PostgreSQL import: ${diagnostics.blockers.join(", ")}`);
  }
}
