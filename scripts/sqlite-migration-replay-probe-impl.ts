/**
 * Implementation of the disposable SQLite migration replay probe.
 *
 * Loaded by scripts/sqlite-migration-replay-probe.ts. The source database is
 * only ever read with `readOnly: true` and copied; every statement executes
 * against an in-memory database or a temp copy held in the OS temp directory.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { splitStatements } from "../src/lib/migrations/sqlite-migration-catalog";

const DEFAULT_DATABASE = path.resolve("prisma", "dev.db");
const DEFAULT_MIGRATIONS = path.resolve("prisma", "migrations");

interface ProbeFailure {
  readonly migration: string;
  readonly statement: string;
  readonly message: string;
}

function readMigrationFiles(migrationsDir: string): { name: string; sql: string }[] {
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((name) => ({ name, sql: fs.readFileSync(path.join(migrationsDir, name, "migration.sql"), "utf8") }))
    .filter((migration) => migration.sql.length > 0);
}

function readRecordedMigrations(databasePath: string): Set<string> {
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const exists = db
      .prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'")
      .get() as { count: number };
    if (exists.count === 0) return new Set();
    const rows = db
      .prepare("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL")
      .all() as { migration_name: string }[];
    return new Set(rows.map((row) => row.migration_name));
  } finally {
    db.close();
  }
}

function replay(
  db: DatabaseSync,
  migrations: readonly { name: string; sql: string }[]
): { succeeded: string[]; failure: ProbeFailure | null; notAttempted: string[] } {
  const succeeded: string[] = [];
  for (let index = 0; index < migrations.length; index += 1) {
    const migration = migrations[index];
    for (const statement of splitStatements(migration.sql)) {
      try {
        db.exec(statement);
      } catch (error) {
        return {
          succeeded,
          failure: {
            migration: migration.name,
            // The failing statement head and the SQLite message name objects, not rows.
            statement: statement.replace(/\s+/g, " ").slice(0, 120),
            message: (error instanceof Error ? error.message : "unknown error").slice(0, 200),
          },
          notAttempted: migrations.slice(index + 1).map((item) => item.name),
        };
      }
    }
    succeeded.push(migration.name);
  }
  return { succeeded, failure: null, notAttempted: [] };
}

export async function runReplayProbeCli(argv: readonly string[]): Promise<void> {
  let mode = "empty";
  let database = DEFAULT_DATABASE;
  let migrationsDir = DEFAULT_MIGRATIONS;

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--mode") {
      const value = argv[index + 1];
      if (value !== "empty" && value !== "existing") throw new Error("--mode must be empty or existing");
      mode = value;
      index += 1;
    } else if (flag === "--database") {
      const value = argv[index + 1];
      if (!value) throw new Error("--database requires a path");
      database = path.resolve(value);
      index += 1;
    } else if (flag === "--migrations") {
      const value = argv[index + 1];
      if (!value) throw new Error("--migrations requires a directory");
      migrationsDir = path.resolve(value);
      index += 1;
    } else if (flag === "--help") {
      console.log("Usage: node scripts/sqlite-migration-replay-probe.ts [--mode empty|existing] [--database prisma/dev.db] [--migrations prisma/migrations]");
      process.exit(0);
    } else {
      throw new Error(`Unsupported argument: ${flag}`);
    }
  }

  if (!fs.existsSync(database)) throw new Error(`Database not found: ${database}`);
  const all = readMigrationFiles(migrationsDir);
  const recorded = readRecordedMigrations(database);
  const target = mode === "existing" ? all.filter((migration) => !recorded.has(migration.name)) : all;

  let tempPath: string | null = null;
  let db: DatabaseSync;
  if (mode === "existing") {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "shabab-migration-probe-"));
    tempPath = path.join(tempDir, "probe-copy.db");
    fs.copyFileSync(database, tempPath);
    db = new DatabaseSync(tempPath);
  } else {
    db = new DatabaseSync(":memory:");
  }

  try {
    const result = replay(db, target);
    console.log(
      JSON.stringify(
        {
          mode,
          source: mode === "existing" ? path.relative(process.cwd(), database) : "(in-memory)",
          recordedMigrations: [...recorded].sort(),
          attempted: target.map((migration) => migration.name),
          succeeded: result.succeeded,
          failure: result.failure,
          notAttempted: result.notAttempted,
          note: mode === "existing" ? "Replayed against a temp copy only; the source database was opened read-only." : "Replayed into an in-memory database.",
        },
        null,
        2
      )
    );
  } finally {
    db.close();
    if (tempPath) {
      fs.rmSync(path.dirname(tempPath), { recursive: true, force: true });
    }
  }
}
