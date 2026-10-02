/**
 * Implementation of the read-only SQLite migration-history catalog audit.
 *
 * Loaded by scripts/sqlite-migration-catalog-audit.ts. Read-only by
 * construction: the database is opened with `readOnly: true` and only
 * `sqlite_master` / `PRAGMA table_info` catalog reads are issued.
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  auditMigration,
  detectReplayConflicts,
  parseMigrationSql,
  summarizeAudits,
  type SqliteCatalog,
} from "../src/lib/migrations/sqlite-migration-catalog";

const DEFAULT_DATABASE = path.join("prisma", "dev.db");
const DEFAULT_MIGRATIONS = path.join("prisma", "migrations");

interface AuditOptions {
  readonly database: string;
  readonly migrationsDir: string;
}

function parseArgs(argv: readonly string[]): AuditOptions {
  let database = DEFAULT_DATABASE;
  let migrationsDir = DEFAULT_MIGRATIONS;
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--database") {
      const value = argv[index + 1];
      if (!value) throw new Error("--database requires a path");
      database = value;
      index += 1;
    } else if (flag === "--migrations") {
      const value = argv[index + 1];
      if (!value) throw new Error("--migrations requires a directory");
      migrationsDir = value;
      index += 1;
    } else if (flag === "--help") {
      console.log("Usage: node scripts/sqlite-migration-catalog-audit.ts [--database prisma/dev.db] [--migrations prisma/migrations]");
      process.exit(0);
    } else {
      throw new Error(`Unsupported argument: ${flag}`);
    }
  }
  return { database: path.resolve(database), migrationsDir: path.resolve(migrationsDir) };
}

function readCatalog(databasePath: string): SqliteCatalog {
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const tables = new Map<string, { name: string; columns: { name: string; notNull: boolean; defaultValue: string | null }[] }>();
    const tableRows = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all() as { name: string }[];
    for (const row of tableRows) {
      const info = db.prepare(`PRAGMA table_info(${JSON.stringify(row.name)})`).all() as {
        name: string;
        notnull: number;
        dflt_value: string | null;
      }[];
      tables.set(row.name, {
        name: row.name,
        columns: info.map((column) => ({ name: column.name, notNull: column.notnull === 1, defaultValue: column.dflt_value ?? null })),
      });
    }

    const indexes = new Map<string, { name: string; table: string; unique: boolean }>();
    const indexRows = db
      .prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all() as { name: string; tbl_name: string; sql: string | null }[];
    for (const row of indexRows) {
      indexes.set(row.name, { name: row.name, table: row.tbl_name, unique: /CREATE\s+UNIQUE\s+INDEX/i.test(row.sql ?? "") });
    }

    const triggers = new Set(
      (db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name").all() as { name: string }[]).map((row) => row.name)
    );

    return { tables, indexes, triggers };
  } finally {
    db.close();
  }
}

function readHistory(databasePath: string): { applied: string[]; unfinished: string[]; rolledBack: string[] } {
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const exists = db
      .prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'")
      .get() as { count: number };
    if (exists.count === 0) return { applied: [], unfinished: [], rolledBack: [] };

    const rows = db
      .prepare("SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at")
      .all() as { migration_name: string; finished_at: string | null; rolled_back_at: string | null }[];

    const applied: string[] = [];
    const unfinished: string[] = [];
    const rolledBack: string[] = [];
    for (const row of rows) {
      if (row.rolled_back_at) rolledBack.push(row.migration_name);
      else if (row.finished_at) applied.push(row.migration_name);
      else unfinished.push(row.migration_name);
    }
    return { applied, unfinished, rolledBack };
  } finally {
    db.close();
  }
}

function readMigrationFiles(migrationsDir: string): { name: string; sql: string }[] {
  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  const migrations: { name: string; sql: string }[] = [];
  for (const entry of entries.map((item) => item.name).sort()) {
    const file = path.join(migrationsDir, entry, "migration.sql");
    if (fs.existsSync(file)) migrations.push({ name: entry, sql: fs.readFileSync(file, "utf8") });
  }
  return migrations;
}

export async function runCatalogAuditCli(argv: readonly string[]): Promise<void> {
  const options = parseArgs(argv);
  if (!fs.existsSync(options.database)) throw new Error(`Database not found: ${options.database}`);
  if (!fs.existsSync(options.migrationsDir)) throw new Error(`Migrations directory not found: ${options.migrationsDir}`);

  const catalog = readCatalog(options.database);
  const history = readHistory(options.database);
  const files = readMigrationFiles(options.migrationsDir);

  const appliedNames = new Set(history.applied);
  const expectations = files.map((file) => parseMigrationSql(file.name, file.sql));
  const audits = expectations.map((expectation) => auditMigration(expectation, catalog, appliedNames.has(expectation.migration)));
  const pendingAudits = audits.filter((audit) => !audit.applied);
  const pendingExpectations = expectations.filter((expectation) => !appliedNames.has(expectation.migration));

  console.log(
    JSON.stringify(
      {
        mode: "read-only",
        database: path.relative(process.cwd(), options.database),
        catalog: {
          tables: catalog.tables.size,
          indexes: catalog.indexes.size,
          triggers: catalog.triggers.size,
        },
        history: {
          recorded: history.applied.length + history.unfinished.length + history.rolledBack.length,
          applied: history.applied,
          unfinished: history.unfinished,
          rolledBack: history.rolledBack,
        },
        pendingSummary: summarizeAudits(pendingAudits),
        replayConflicts: detectReplayConflicts(pendingExpectations),
        migrations: pendingAudits.map((audit) => ({
          migration: audit.migration,
          classification: audit.classification,
          requiredArtifacts: audit.requiredArtifacts,
          representedArtifacts: audit.representedArtifacts,
          missing: audit.missing,
          nullabilityNotes: audit.nullabilityNotes,
          defaultNotes: audit.defaultNotes,
          extraColumns: audit.extraColumns,
          droppedButStillPresent: audit.droppedButStillPresent,
          unprovable: audit.unprovable,
          unclassified: audit.unclassified,
        })),
      },
      null,
      2
    )
  );
}
