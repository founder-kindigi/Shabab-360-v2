/**
 * CLI contract for the guarded ATT01 PostgreSQL tools.
 *
 * Argument parsing, the execution gates, the connection contract and the safe
 * diagnostics all live here so the thin `scripts/` entry points cannot drift from
 * the rules, and so the rules are testable without a database.
 *
 * The connection string is supplied only through `ATT01_POSTGRES_URL`, never read
 * from `.env`, never printed and never written to a file. Every diagnostics helper
 * returns aggregates and public object names only.
 */
import fs from "node:fs";
import path from "node:path";
import { REFRESH_DATE_PATTERN } from "./constants";
import { PostgresRefusedError, POSTGRES_URL_ENV, resolvePostgresConnectionUrl } from "./postgres-port";
import type { PostgresTargetDiagnostics } from "./postgres-target";

/** The exact acknowledgement required to write. */
export const POSTGRES_IMPORT_CONFIRMATION = "CONFIRM-ATT01-POSTGRES-IMPORT";
/** The exact acknowledgement that the target was verified fresh and empty. */
export const POSTGRES_FRESH_CONFIRMATION = "CONFIRM-FRESH-EMPTY-DATABASE";

const IMPORT_BOOLEAN_FLAGS = new Set([
  "--execute",
  "--confirm-att01-postgres-import",
  "--confirm-fresh-empty-database",
  "--json",
]);
const IMPORT_VALUE_FLAGS = new Set(["--input", "--target", "--completed-through"]);
const RECONCILE_BOOLEAN_FLAGS = new Set(["--json"]);
const RECONCILE_VALUE_FLAGS = new Set(["--input", "--completed-through"]);

export interface PostgresImportArgs {
  readonly input: string;
  readonly target: "postgres" | null;
  readonly attendanceThrough: string | null;
  readonly execute: boolean;
  readonly confirmedImport: boolean;
  readonly confirmedFresh: boolean;
  readonly json: boolean;
}

export interface PostgresReconcileArgs {
  readonly input: string;
  readonly attendanceThrough: string | null;
  readonly json: boolean;
}

function parseFlags(
  argv: readonly string[],
  booleanFlags: ReadonlySet<string>,
  valueFlags: ReadonlySet<string>
): { readonly flags: ReadonlySet<string>; readonly values: ReadonlyMap<string, string> } {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (booleanFlags.has(argument)) {
      flags.add(argument);
      continue;
    }
    if (valueFlags.has(argument)) {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) throw new PostgresRefusedError(`Missing value for ${argument}`);
      if (values.has(argument)) throw new PostgresRefusedError(`Repeated argument: ${argument}`);
      values.set(argument, value);
      index += 1;
      continue;
    }
    throw new PostgresRefusedError(`Unexpected argument: ${argument}`);
  }
  return { flags, values };
}

function parseAttendanceThrough(value: string | undefined): string | null {
  if (value === undefined) return null;
  if (!REFRESH_DATE_PATTERN.test(value)) throw new PostgresRefusedError("--completed-through must use YYYY-MM-DD");
  return value;
}

/** Parses the import arguments. Default is a dry run with no writes. */
export function parsePostgresImportArgs(argv: readonly string[]): PostgresImportArgs {
  const { flags, values } = parseFlags(argv, IMPORT_BOOLEAN_FLAGS, IMPORT_VALUE_FLAGS);
  const input = values.get("--input");
  if (!input) {
    throw new PostgresRefusedError(
      "Usage: --input <workbook.xlsx> --target postgres [--execute --confirm-att01-postgres-import --confirm-fresh-empty-database] [--completed-through <date>] [--json]"
    );
  }
  const target = values.get("--target") ?? null;
  if (target !== null && target !== "postgres") {
    throw new PostgresRefusedError("--target must be exactly 'postgres' for the ATT01 PostgreSQL import");
  }
  const execute = flags.has("--execute");
  const confirmedImport = flags.has("--confirm-att01-postgres-import");
  const confirmedFresh = flags.has("--confirm-fresh-empty-database");
  if (!execute && (confirmedImport || confirmedFresh || target !== null)) {
    throw new PostgresRefusedError("A dry run accepts no --target and no confirmation flag");
  }
  return {
    input,
    target,
    attendanceThrough: parseAttendanceThrough(values.get("--completed-through")),
    execute,
    confirmedImport,
    confirmedFresh,
    json: flags.has("--json"),
  };
}

/** Parses the read-only reconciliation arguments. */
export function parsePostgresReconcileArgs(argv: readonly string[]): PostgresReconcileArgs {
  const { flags, values } = parseFlags(argv, RECONCILE_BOOLEAN_FLAGS, RECONCILE_VALUE_FLAGS);
  const input = values.get("--input");
  if (!input) throw new PostgresRefusedError("Usage: --input <workbook.xlsx> [--completed-through <date>] [--json]");
  return { input, attendanceThrough: parseAttendanceThrough(values.get("--completed-through")), json: flags.has("--json") };
}

/**
 * The write gate. Every condition must hold: an explicit `--execute`, the exact
 * import acknowledgement, the exact fresh-target acknowledgement and an explicit
 * PostgreSQL target.
 */
export function assertPostgresImportAuthorized(args: PostgresImportArgs): void {
  if (!args.execute) return;
  if (args.target !== "postgres") {
    throw new PostgresRefusedError("Refusing to write without an explicit --target postgres");
  }
  if (!args.confirmedImport) {
    throw new PostgresRefusedError("Refusing to write without --confirm-att01-postgres-import");
  }
  if (!args.confirmedFresh) {
    throw new PostgresRefusedError("Refusing to write without --confirm-fresh-empty-database");
  }
}

/** Resolves the runtime connection, or returns null when none was supplied. */
export function resolveOptionalPostgresUrl(env: Readonly<Record<string, string | undefined>> = process.env): string | null {
  const raw = env[POSTGRES_URL_ENV];
  return raw && raw.trim() ? resolvePostgresConnectionUrl(raw) : null;
}

/** The committed PostgreSQL migration folder names, sorted, with their SQL. */
export function readExpectedPostgresMigrations(root: string = process.cwd()): string[] {
  const directory = path.join(root, "prisma", "postgres", "migrations");
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => fs.existsSync(path.join(directory, entry.name, "migration.sql")))
    .map((entry) => entry.name)
    .sort();
}

/** Aggregate-only, non-secret projection of the fresh-target diagnostics. */
export function summarizeTargetDiagnostics(diagnostics: PostgresTargetDiagnostics) {
  return {
    mode: diagnostics.mode,
    writesPerformed: diagnostics.writesPerformed,
    provider: diagnostics.provider,
    serverMajor: diagnostics.serverMajor,
    fresh: diagnostics.fresh,
    compatible: diagnostics.compatible,
    blockers: diagnostics.blockers,
    migrationLedger: {
      present: diagnostics.ledger.present,
      applied: diagnostics.ledger.applied,
      missing: diagnostics.ledger.missing.length,
      unexpected: diagnostics.ledger.unexpected.length,
      duplicated: diagnostics.ledger.duplicated.length,
      unfinished: diagnostics.ledger.unfinished.length,
      rolledBack: diagnostics.ledger.rolledBack.length,
    },
    tablesMissing: diagnostics.tablesMissing,
    constraintsMissing: diagnostics.constraintsMissing,
    indexesMissing: diagnostics.indexesMissing,
    nonEmptyTables: diagnostics.nonEmptyTables,
  };
}
