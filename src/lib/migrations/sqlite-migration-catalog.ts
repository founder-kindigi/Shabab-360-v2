/**
 * Read-only SQLite migration-history catalog audit.
 *
 * `prisma/dev.db` can end up containing the structural effect of migrations that
 * `_prisma_migrations` never recorded, and vice versa. This module compares what
 * each `migration.sql` declares (tables, columns, indexes, triggers, drops,
 * renames) against what the SQLite schema catalog actually holds, so a recovery
 * plan can be based on catalog evidence instead of assumption.
 *
 * The module is pure: it parses SQL text and reads a caller-supplied catalog
 * snapshot. It opens no connection, performs no write, and every identifier it
 * returns is a schema object name, never a row value.
 */

export interface CatalogColumn {
  readonly name: string;
  readonly notNull: boolean;
  readonly defaultValue: string | null;
}

export interface CatalogTable {
  readonly name: string;
  readonly columns: readonly CatalogColumn[];
}

export interface CatalogIndex {
  readonly name: string;
  readonly table: string;
  readonly unique: boolean;
}

export interface SqliteCatalog {
  readonly tables: ReadonlyMap<string, CatalogTable>;
  readonly indexes: ReadonlyMap<string, CatalogIndex>;
  readonly triggers: ReadonlySet<string>;
}

export interface ExpectedColumn {
  readonly name: string;
  readonly notNull: boolean;
  readonly defaultValue: string | null;
}

export interface ExpectedTable {
  /** Effective table name after any same-migration rebuild rename. */
  readonly name: string;
  readonly columns: readonly ExpectedColumn[];
  readonly rebuilt: boolean;
}

export interface ExpectedIndex {
  readonly name: string;
  readonly table: string;
  readonly unique: boolean;
}

export interface MigrationExpectations {
  readonly migration: string;
  readonly tables: readonly ExpectedTable[];
  readonly columnsAdded: readonly { readonly table: string; readonly column: ExpectedColumn }[];
  readonly indexes: readonly ExpectedIndex[];
  readonly triggers: readonly string[];
  readonly droppedTables: readonly string[];
  /** Statements that change rows; the catalog cannot prove them. */
  readonly dataStatements: readonly string[];
  readonly pragmas: readonly string[];
  /** Statements the parser did not recognise; never silently ignored. */
  readonly unclassified: readonly string[];
}

export type MigrationClassification =
  | "structurally-represented"
  | "partially-represented"
  | "structurally-missing"
  | "no-structural-change";

export interface MigrationAudit {
  readonly migration: string;
  readonly applied: boolean;
  readonly classification: MigrationClassification;
  readonly requiredArtifacts: number;
  readonly representedArtifacts: number;
  readonly missing: readonly string[];
  readonly nullabilityNotes: readonly string[];
  readonly defaultNotes: readonly string[];
  readonly extraColumns: Readonly<Record<string, number>>;
  readonly droppedButStillPresent: readonly string[];
  readonly unprovable: readonly string[];
  readonly unclassified: readonly string[];
}

export interface ReplayConflict {
  readonly kind: "table" | "column" | "index" | "trigger";
  readonly artifact: string;
  readonly migrations: readonly string[];
}

const CREATE_TABLE = /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"([^"]+)"/i;
const ALTER_ADD_COLUMN = /^ALTER\s+TABLE\s+"([^"]+)"\s+ADD\s+COLUMN\s+"([^"]+)"\s+([\s\S]*)$/i;
const ALTER_RENAME = /^ALTER\s+TABLE\s+"([^"]+)"\s+RENAME\s+TO\s+"([^"]+)"/i;
const DROP_TABLE = /^DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?"([^"]+)"/i;
const CREATE_INDEX = /^CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?"([^"]+)"\s+ON\s+"([^"]+)"/i;
const CREATE_TRIGGER = /^CREATE\s+TRIGGER\s+(?:IF\s+NOT\s+EXISTS\s+)?"([^"]+)"/i;
const DATA_STATEMENT = /^(INSERT\s+INTO|UPDATE|DELETE\s+FROM|REPLACE\s+INTO)/i;
const PRAGMA_STATEMENT = /^PRAGMA\b/i;

function stripCommentLines(sql: string): string[] {
  return sql
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("--"));
}

/**
 * Splits migration SQL into statements. Trigger bodies contain their own
 * `BEGIN ... END;` block, so a naive `;` split would corrupt them.
 */
export function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current: string[] = [];
  let inTriggerBody = false;

  for (const line of stripCommentLines(sql)) {
    if (inTriggerBody) {
      current.push(line);
      if (/END;\s*$/i.test(line)) {
        inTriggerBody = false;
        statements.push(stripTerminator(current.join("\n")));
        current = [];
      }
      continue;
    }

    if (CREATE_TRIGGER.test(line) && !/;\s*$/.test(line)) {
      inTriggerBody = true;
      current.push(line);
      continue;
    }

    current.push(line);
    if (/;\s*$/.test(line)) {
      statements.push(stripTerminator(current.join("\n")));
      current = [];
    }
  }

  if (current.length > 0) statements.push(stripTerminator(current.join("\n")));
  return statements;
}

/** Drops the statement terminator so parsed defaults never capture it. */
function stripTerminator(statement: string): string {
  return statement.trim().replace(/;\s*$/, "").trim();
}

function parseDefault(definition: string): string | null {
  const match = /\bDEFAULT\s+('(?:[^']|'')*'|\([^)]*\)|[^\s,)]+)/i.exec(definition);
  return match ? match[1].trim() : null;
}

function parseCreateTableBody(statement: string): ExpectedColumn[] {
  const open = statement.indexOf("(");
  const close = statement.lastIndexOf(")");
  if (open < 0 || close <= open) return [];
  const body = statement.slice(open + 1, close);

  const columns: ExpectedColumn[] = [];
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/,$/, "");
    if (line.length === 0 || /^CONSTRAINT\b/i.test(line) || /^PRIMARY\s+KEY\b/i.test(line)) continue;
    const match = /^"([^"]+)"\s+([\s\S]+)$/.exec(line);
    if (!match) continue;
    columns.push({
      name: match[1],
      notNull: /\bNOT\s+NULL\b/i.test(match[2]),
      defaultValue: parseDefault(match[2]),
    });
  }
  return columns;
}

export function parseMigrationSql(migration: string, sql: string): MigrationExpectations {
  const statements = splitStatements(sql);

  const rawTables: { name: string; columns: ExpectedColumn[] }[] = [];
  const renames = new Map<string, string>();
  const columnsAdded: { table: string; column: ExpectedColumn }[] = [];
  const indexes: ExpectedIndex[] = [];
  const triggers: string[] = [];
  const droppedTables: string[] = [];
  const dataStatements: string[] = [];
  const pragmas: string[] = [];
  const unclassified: string[] = [];

  for (const statement of statements) {
    const createTable = CREATE_TABLE.exec(statement);
    if (createTable) {
      rawTables.push({ name: createTable[1], columns: parseCreateTableBody(statement) });
      continue;
    }

    const addColumn = ALTER_ADD_COLUMN.exec(statement);
    if (addColumn) {
      columnsAdded.push({
        table: addColumn[1],
        column: { name: addColumn[2], notNull: /\bNOT\s+NULL\b/i.test(addColumn[3]), defaultValue: parseDefault(addColumn[3]) },
      });
      continue;
    }

    const rename = ALTER_RENAME.exec(statement);
    if (rename) {
      renames.set(rename[1], rename[2]);
      continue;
    }

    const dropTable = DROP_TABLE.exec(statement);
    if (dropTable) {
      droppedTables.push(dropTable[1]);
      continue;
    }

    const createIndex = CREATE_INDEX.exec(statement);
    if (createIndex) {
      indexes.push({ name: createIndex[2], table: createIndex[3], unique: Boolean(createIndex[1]) });
      continue;
    }

    const createTrigger = CREATE_TRIGGER.exec(statement);
    if (createTrigger) {
      triggers.push(createTrigger[1]);
      continue;
    }

    if (DATA_STATEMENT.test(statement)) {
      dataStatements.push(statement.slice(0, 80));
      continue;
    }

    if (PRAGMA_STATEMENT.test(statement)) {
      pragmas.push(statement.replace(/;$/, ""));
      continue;
    }

    if (/^(BEGIN\s+TRANSACTION|COMMIT|ROLLBACK|CREATE\s+UNIQUE\s+INDEX|CREATE\s+INDEX|CREATE\s+TRIGGER)/i.test(statement)) continue;
    unclassified.push(statement.slice(0, 80));
  }

  const droppedSet = new Set(droppedTables);
  // A table created and dropped inside the same migration is a transient guard.
  const transientNames = new Set(rawTables.filter((table) => droppedSet.has(table.name)).map((table) => table.name));

  const tables: ExpectedTable[] = rawTables
    .filter((table) => !transientNames.has(table.name))
    .map((table) => {
      const target = renames.get(table.name);
      return { name: target ?? table.name, columns: table.columns, rebuilt: Boolean(target) };
    });

  const rebuiltNames = new Set(tables.filter((table) => table.rebuilt).map((table) => table.name));
  return {
    migration,
    tables,
    columnsAdded,
    indexes,
    triggers,
    droppedTables: droppedTables.filter((name) => !rebuiltNames.has(name) && !transientNames.has(name)),
    dataStatements,
    pragmas,
    unclassified,
  };
}

function normalizeDefault(value: string | null): string | null {
  if (value === null) return null;
  return value.trim().replace(/^'(.*)'$/, "$1").replace(/\s+/g, " ").toUpperCase();
}

function artifact(kind: string, name: string): string {
  return `${kind}:${name}`;
}

export function auditMigration(expectations: MigrationExpectations, catalog: SqliteCatalog, applied: boolean): MigrationAudit {
  const missing: string[] = [];
  const nullabilityNotes: string[] = [];
  const defaultNotes: string[] = [];
  const extraColumns: Record<string, number> = {};
  let requiredArtifacts = 0;
  let representedArtifacts = 0;

  const checkColumn = (table: string, expected: ExpectedColumn): void => {
    const catalogTable = catalog.tables.get(table);
    if (!catalogTable) {
      missing.push(artifact("column", `${table}.${expected.name}`));
      return;
    }
    const actual = catalogTable.columns.find((column) => column.name === expected.name);
    if (!actual) {
      missing.push(artifact("column", `${table}.${expected.name}`));
      return;
    }
    representedArtifacts += 1;
    if (actual.notNull !== expected.notNull) {
      nullabilityNotes.push(`${table}.${expected.name}: expected ${expected.notNull ? "NOT NULL" : "nullable"}, catalog has ${actual.notNull ? "NOT NULL" : "nullable"}`);
    }
    if (expected.defaultValue !== null && normalizeDefault(actual.defaultValue) !== normalizeDefault(expected.defaultValue)) {
      defaultNotes.push(`${table}.${expected.name}: expected default ${expected.defaultValue}, catalog has ${actual.defaultValue ?? "none"}`);
    }
  };

  for (const table of expectations.tables) {
    requiredArtifacts += 1;
    const catalogTable = catalog.tables.get(table.name);
    if (!catalogTable) {
      missing.push(artifact("table", table.name));
    } else {
      representedArtifacts += 1;
      const expectedNames = new Set(table.columns.map((column) => column.name));
      const actualNames = new Set(catalogTable.columns.map((column) => column.name));
      extraColumns[table.name] = [...actualNames].filter((name) => !expectedNames.has(name)).length;
    }
    for (const column of table.columns) {
      requiredArtifacts += 1;
      checkColumn(table.name, column);
    }
  }

  for (const added of expectations.columnsAdded) {
    requiredArtifacts += 1;
    checkColumn(added.table, added.column);
  }

  for (const index of expectations.indexes) {
    requiredArtifacts += 1;
    if (catalog.indexes.has(index.name)) {
      representedArtifacts += 1;
    } else {
      missing.push(artifact("index", index.name));
    }
  }

  for (const trigger of expectations.triggers) {
    requiredArtifacts += 1;
    if (catalog.triggers.has(trigger)) {
      representedArtifacts += 1;
    } else {
      missing.push(artifact("trigger", trigger));
    }
  }

  const droppedButStillPresent = expectations.droppedTables.filter((name) => catalog.tables.has(name));
  const unprovable = [
    ...expectations.dataStatements.map((statement) => `data: ${statement}`),
    ...expectations.pragmas.map((statement) => `session: ${statement}`),
  ];

  const classification: MigrationClassification =
    requiredArtifacts === 0
      ? "no-structural-change"
      : missing.length === 0
        ? "structurally-represented"
        : missing.length === requiredArtifacts
          ? "structurally-missing"
          : "partially-represented";

  return {
    migration: expectations.migration,
    applied,
    classification,
    requiredArtifacts,
    representedArtifacts,
    missing,
    nullabilityNotes,
    defaultNotes,
    extraColumns,
    droppedButStillPresent,
    unprovable,
    unclassified: expectations.unclassified,
  };
}

/**
 * Artifacts declared twice across the pending chain. Replaying such a chain
 * fails on the second declaration, so it can never be applied blindly.
 */
export function detectReplayConflicts(expectations: readonly MigrationExpectations[]): ReplayConflict[] {
  const seen = new Map<string, { kind: ReplayConflict["kind"]; migrations: string[] }>();

  const record = (kind: ReplayConflict["kind"], name: string, migration: string): void => {
    const key = artifact(kind, name);
    const entry = seen.get(key);
    if (entry) {
      if (!entry.migrations.includes(migration)) entry.migrations.push(migration);
      return;
    }
    seen.set(key, { kind, migrations: [migration] });
  };

  for (const migration of expectations) {
    for (const table of migration.tables) record("table", table.name, migration.migration);
    for (const added of migration.columnsAdded) record("column", `${added.table}.${added.column.name}`, migration.migration);
    for (const index of migration.indexes) record("index", index.name, migration.migration);
    for (const trigger of migration.triggers) record("trigger", trigger, migration.migration);
  }

  return [...seen.entries()]
    .filter(([, entry]) => entry.migrations.length > 1)
    .map(([key, entry]) => ({ kind: entry.kind, artifact: key.split(":").slice(1).join(":"), migrations: entry.migrations }));
}

export function summarizeAudits(audits: readonly MigrationAudit[]): Record<MigrationClassification, number> {
  const summary: Record<MigrationClassification, number> = {
    "structurally-represented": 0,
    "partially-represented": 0,
    "structurally-missing": 0,
    "no-structural-change": 0,
  };
  for (const audit of audits) summary[audit.classification] += 1;
  return summary;
}
