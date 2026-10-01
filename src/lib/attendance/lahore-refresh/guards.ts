import { LAHORE_REFRESH, REFRESH_DATE_PATTERN } from "./constants";
import type { ExecutableTarget } from "./types";

/** A deliberate refusal. The message never echoes credentials or connection strings. */
export class RefreshRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RefreshRefusedError";
  }
}

export interface RefreshOptions {
  readonly input: string;
  readonly execute: boolean;
  readonly confirmLahoreRefresh: boolean;
  readonly target: "sqlite" | "postgres" | null;
  readonly sqlitePath: string | null;
  readonly postgresUrl: string | null;
  readonly backupDir: string | null;
  readonly outputDir: string | null;
  readonly attendanceThrough: string;
}

const VALUE_FLAGS = new Set([
  "--input",
  "--target",
  "--sqlite-path",
  "--postgres-url",
  "--backup-dir",
  "--output",
  "--completed-through",
]);
const BOOLEAN_FLAGS = new Set(["--execute", "--confirm-lahore-refresh"]);

export function parseRefreshArgs(argv: readonly string[]): RefreshOptions {
  const values = new Map<string, string>();
  const flags = new Set<string>();

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (BOOLEAN_FLAGS.has(argument)) {
      flags.add(argument);
      continue;
    }
    if (VALUE_FLAGS.has(argument)) {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) throw new RefreshRefusedError(`Missing value for ${argument}`);
      if (values.has(argument)) throw new RefreshRefusedError(`Repeated argument: ${argument}`);
      values.set(argument, value);
      index += 1;
      continue;
    }
    throw new RefreshRefusedError(`Unexpected argument: ${argument}`);
  }

  const input = values.get("--input");
  if (!input) throw new RefreshRefusedError("Usage: --input <workbook.xlsx> [--execute --confirm-lahore-refresh --target sqlite|postgres ...]");

  const target = values.get("--target") ?? null;
  if (target !== null && target !== "sqlite" && target !== "postgres") {
    throw new RefreshRefusedError("--target must be exactly 'sqlite' or 'postgres'");
  }

  const execute = flags.has("--execute");
  const confirmLahoreRefresh = flags.has("--confirm-lahore-refresh");
  if (confirmLahoreRefresh && !execute) {
    throw new RefreshRefusedError("--confirm-lahore-refresh can only be used with --execute");
  }

  const attendanceThrough = values.get("--completed-through") ?? LAHORE_REFRESH.attendanceThrough;
  if (!REFRESH_DATE_PATTERN.test(attendanceThrough)) {
    throw new RefreshRefusedError("--completed-through must use YYYY-MM-DD");
  }

  return {
    input,
    execute,
    confirmLahoreRefresh,
    target,
    sqlitePath: values.get("--sqlite-path") ?? null,
    postgresUrl: values.get("--postgres-url") ?? null,
    backupDir: values.get("--backup-dir") ?? null,
    outputDir: values.get("--output") ?? null,
    attendanceThrough,
  };
}

const REMOTE_URL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
/** A UNC or protocol-relative path reaches a network share, never a local file. */
const NETWORK_PATH_PATTERN = /^(\\\\|\/\/)/;

/**
 * Resolves the write target only from explicit flags. A remote-looking URL or
 * network path is never accepted as a local SQLite file, and an environment
 * variable is never read. Dry runs need no target at all.
 */
export function resolveExecutableTarget(options: RefreshOptions): ExecutableTarget | null {
  if (!options.execute) return null;
  if (!options.confirmLahoreRefresh) throw new RefreshRefusedError("Refusing to write without --confirm-lahore-refresh");
  if (!options.target) throw new RefreshRefusedError("Refusing to write without an explicit --target sqlite|postgres");
  if (!options.backupDir) throw new RefreshRefusedError("Refusing to write without --backup-dir for the pre-reset backup");

  if (options.target === "sqlite") {
    if (options.postgresUrl) throw new RefreshRefusedError("Refusing to write: both --sqlite-path and --postgres-url were supplied");
    const path = options.sqlitePath;
    if (!path) throw new RefreshRefusedError("Refusing to write: --target sqlite requires --sqlite-path");
    if (REMOTE_URL_PATTERN.test(path)) throw new RefreshRefusedError("Refusing to write: --sqlite-path must be a local file path, not a connection URL");
    if (NETWORK_PATH_PATTERN.test(path)) throw new RefreshRefusedError("Refusing to write: --sqlite-path must be a local file path, not a network or UNC path");
    return { kind: "sqlite", path, backupDir: options.backupDir };
  }

  if (options.sqlitePath) throw new RefreshRefusedError("Refusing to write: both --sqlite-path and --postgres-url were supplied");
  const url = options.postgresUrl;
  if (!url) throw new RefreshRefusedError("Refusing to write: --target postgres requires an explicit --postgres-url");
  if (!/^postgres(ql)?:\/\//.test(url)) throw new RefreshRefusedError("Refusing to write: --postgres-url must be a postgres connection string");
  return { kind: "postgres", url, backupDir: options.backupDir };
}

export interface BackupCapabilities {
  /** A verified full SQLite backup primitive is available. */
  readonly sqliteBackup: boolean;
  /** A verified full logical dump mechanism is available for PostgreSQL. */
  readonly postgresFullDump: boolean;
}

export type BackupPlan =
  | { readonly kind: "sqlite-file-copy"; readonly backupDir: string }
  | { readonly kind: "postgres-full-dump"; readonly backupDir: string }
  | { readonly kind: "refused"; readonly reason: string };

/**
 * A reset never runs without a restorable backup. SQLite uses a full file-level
 * backup; PostgreSQL requires a verified full logical dump, so a missing
 * mechanism fails closed instead of inventing a partial backup.
 */
export function planBackup(target: ExecutableTarget, capabilities: BackupCapabilities): BackupPlan {
  if (target.kind === "sqlite") {
    if (!capabilities.sqliteBackup) return { kind: "refused", reason: "No verified full SQLite backup mechanism is available" };
    return { kind: "sqlite-file-copy", backupDir: target.backupDir };
  }
  if (!capabilities.postgresFullDump) {
    return { kind: "refused", reason: "PostgreSQL writes require a verified full backup mechanism; refusing a partial backup" };
  }
  return { kind: "postgres-full-dump", backupDir: target.backupDir };
}
