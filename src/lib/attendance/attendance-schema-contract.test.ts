import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseMigrationSql } from "../migrations/sqlite-migration-catalog";
import {
  DECLARED_UNREFERENCED_TABLES,
  PRESERVED_LEGACY_TABLES,
  REQUIRED_TABLES,
  additiveColumnStatement,
  assertPlanPreservesLegacyTables,
  planAttendanceSchema,
  summarizeAttendanceSchemaPreflight,
  type AttendanceSchemaCatalog,
} from "./attendance-schema-contract";

const SCALAR_TYPES = new Set(["String", "Int", "Boolean", "DateTime", "Float", "Json", "Decimal", "BigInt", "Bytes"]);

/** Model name per required table, used to compare the contract with schema.prisma. */
const PRISMA_MODEL: Readonly<Record<string, string>> = {
  attendance_events: "AttendanceEvent",
  attendance_records: "AttendanceRecord",
  batch_settings: "BatchSettings",
  batch_class_dates: "BatchClassDate",
  operational_off_dates: "OperationalOffDate",
  participants: "Participant",
  park_staff_attendance_events: "StaffAttendanceEvent",
  park_staff_attendance_records: "StaffAttendanceRecord",
};

const SUPPORT_TABLES: readonly string[] = ["groups", "batches", "cities", "parks", "staff_meta"];

function readSchema(): string {
  return fs.readFileSync(path.resolve(process.cwd(), "prisma", "schema.prisma"), "utf8");
}

/** Scalar fields of one Prisma model, with their real column name and optionality. */
function prismaScalarColumns(schema: string, model: string): { column: string; optional: boolean }[] {
  const start = new RegExp(`^model ${model} \\{`, "m").exec(schema);
  if (!start) throw new Error(`model ${model} not found`);
  const body = schema.slice(start.index + start[0].length).split("\n");
  const columns: { column: string; optional: boolean }[] = [];
  for (const line of body) {
    if (line.startsWith("}")) break;
    const match = /^\s{2}([A-Za-z][A-Za-z0-9_]*)\s+([A-Za-z][A-Za-z0-9_]*)(\?|\[\])?\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, field, type, modifier, rest] = match;
    if (!SCALAR_TYPES.has(type)) continue;
    const mapped = /@map\("([^"]+)"\)/.exec(rest);
    columns.push({ column: mapped ? mapped[1] : field, optional: modifier === "?" });
  }
  return columns;
}

interface CatalogTable {
  readonly columns: readonly { readonly name: string; readonly notNull: boolean }[];
  readonly foreignKeys?: readonly { readonly column: string; readonly referencesTable: string }[];
  readonly indexes?: readonly { readonly name: string; readonly table: string; readonly unique: boolean }[];
}

function catalogOf(present: Record<string, CatalogTable>): AttendanceSchemaCatalog {
  const tables = new Map<string, { columns: { name: string; notNull: boolean }[] }>();
  const indexes = new Map<string, { table: string; unique: boolean }>();
  const foreignKeys = new Map<string, { column: string; referencesTable: string }[]>();
  for (const [name, table] of Object.entries(present)) {
    tables.set(name, { columns: table.columns.map((column) => ({ name: column.name, notNull: column.notNull })) });
    foreignKeys.set(name, (table.foreignKeys ?? []).map((foreignKey) => ({ ...foreignKey })));
    for (const index of table.indexes ?? []) indexes.set(index.name, { table: index.table, unique: index.unique });
  }
  return { tables, indexes, foreignKeys };
}

/** The complete, already-satisfied catalog, derived from the contract itself. */
function satisfiedCatalog(): AttendanceSchemaCatalog {
  const present: Record<string, CatalogTable> = {};
  for (const table of REQUIRED_TABLES) {
    present[table.name] = {
      columns: table.columns.map((column) => ({ name: column.name, notNull: column.notNull })),
      foreignKeys: table.foreignKeys.map((foreignKey) => ({ ...foreignKey })),
      indexes: table.indexes.map((index) => ({ name: index.name, table: table.name, unique: index.unique })),
    };
  }
  for (const support of SUPPORT_TABLES) present[support] = present[support] ?? { columns: [{ name: "id", notNull: true }] };
  return catalogOf(present);
}

function withoutColumns(catalog: AttendanceSchemaCatalog, table: string, dropped: readonly string[]): AttendanceSchemaCatalog {
  const existing = catalog.tables.get(table);
  const tables = new Map(catalog.tables);
  tables.set(table, { columns: (existing?.columns ?? []).filter((column) => !dropped.includes(column.name)) });
  return { ...catalog, tables };
}

describe("ATT01 attendance contract", () => {
  it("matches the scalar columns of the current Prisma SQLite models", () => {
    const schema = readSchema();
    for (const table of REQUIRED_TABLES) {
      const model = PRISMA_MODEL[table.name];
      expect(model, `${table.name} has no mapped model`).toBeDefined();
      const prismaColumns = new Set(prismaScalarColumns(schema, model).map((column) => column.column));
      for (const column of table.columns) {
        expect(prismaColumns.has(column.name), `${table.name}.${column.name} is not in ${model}`).toBe(true);
      }
      if (table.fullColumnContract) {
        expect([...prismaColumns].sort()).toEqual(table.columns.map((column) => column.name).sort());
      }
    }
  });

  it("keeps the lifecycle, reset and weekly-settings columns safe to add", () => {
    const events = REQUIRED_TABLES.find((table) => table.name === "attendance_events");
    expect(events?.columns.find((column) => column.name === "resetVersion")).toMatchObject({ notNull: true, defaultSql: "0" });

    const participants = REQUIRED_TABLES.find((table) => table.name === "participants");
    expect(participants?.fullColumnContract).toBe(false);
    expect(participants?.columns.map((column) => column.name)).toEqual(["dropoutAt", "dropoutReason", "dropoutSource", "reactivatedAt"]);
    expect(participants?.columns.every((column) => !column.notNull)).toBe(true);

    const settings = REQUIRED_TABLES.find((table) => table.name === "batch_settings");
    for (const name of ["automaticDropoutEnabled", "warningConsecutiveWeeks", "dropoutConsecutiveWeeks"]) {
      expect(settings?.columns.find((column) => column.name === name)?.defaultSql).not.toBeNull();
    }
  });

  it("reuses the retained migration as the staff pair definition", () => {
    const file = path.resolve(process.cwd(), "prisma", "migrations", "20260810193000_add_park_staff_attendance", "migration.sql");
    const parsed = parseMigrationSql("20260810193000_add_park_staff_attendance", fs.readFileSync(file, "utf8"));
    for (const name of ["park_staff_attendance_events", "park_staff_attendance_records"]) {
      const table = REQUIRED_TABLES.find((candidate) => candidate.name === name);
      const migrated = parsed.tables.find((candidate) => candidate.name === name);
      expect(table?.createTableDdl).toContain(`CREATE TABLE "${name}"`);
      expect(table?.columns.map((column) => column.name).sort()).toEqual(migrated?.columns.map((column) => column.name).sort());
    }
  });

  it("only proposes safe additive column statements", () => {
    expect(additiveColumnStatement("t", { name: "b", type: "TEXT", notNull: false, defaultSql: null })).toBe('ALTER TABLE "t" ADD COLUMN "b" TEXT');
    expect(additiveColumnStatement("t", { name: "n", type: "INTEGER", notNull: true, defaultSql: "0" })).toBe(
      'ALTER TABLE "t" ADD COLUMN "n" INTEGER NOT NULL DEFAULT 0'
    );
    expect(additiveColumnStatement("t", { name: "n", type: "TEXT", notNull: true, defaultSql: null })).toBeNull();
  });
});

describe("ATT01 attendance planning", () => {
  it("plans nothing when every requirement is already satisfied", () => {
    const plan = planAttendanceSchema(satisfiedCatalog());
    expect(plan.blockers).toEqual([]);
    expect(plan.createStatements).toEqual([]);
    expect(plan.upToDate).toBe(true);
  });

  it("creates the canonical staff tables when they are absent", () => {
    const catalog = satisfiedCatalog();
    const tables = new Map(catalog.tables);
    tables.delete("park_staff_attendance_events");
    tables.delete("park_staff_attendance_records");
    const plan = planAttendanceSchema({ ...catalog, tables });

    const statements = plan.createStatements.filter((statement) => statement.includes("park_staff_attendance"));
    expect(statements.filter((statement) => statement.startsWith("CREATE TABLE"))).toHaveLength(2);
    expect(statements.filter((statement) => statement.startsWith("CREATE UNIQUE"))).toHaveLength(2);
    expect(plan.blockers).toEqual([]);
  });

  it("plans an additive column for each missing ATT01 column", () => {
    const plan = planAttendanceSchema(withoutColumns(satisfiedCatalog(), "attendance_events", ["resetVersion"]));
    expect(plan.blockers).toEqual([]);
    expect(plan.createStatements).toEqual(['ALTER TABLE "attendance_events" ADD COLUMN "resetVersion" INTEGER NOT NULL DEFAULT 0']);
  });

  it("fails closed when a required NOT NULL column has no safe default", () => {
    const plan = planAttendanceSchema(withoutColumns(satisfiedCatalog(), "attendance_events", ["groupId"]));
    expect(plan.blockers.some((blocker) => blocker.includes("attendance_events is missing column groupId"))).toBe(true);
    expect(plan.createStatements).toEqual([]);
  });

  it("fails closed when a required column is nullable in the database", () => {
    const catalog = satisfiedCatalog();
    const events = catalog.tables.get("attendance_events");
    const tables = new Map(catalog.tables);
    tables.set("attendance_events", {
      columns: (events?.columns ?? []).map((column) => (column.name === "title" ? { ...column, notNull: false } : column)),
    });
    const plan = planAttendanceSchema({ ...catalog, tables });
    expect(plan.blockers).toEqual(['existing column attendance_events.title is nullable where the contract requires NOT NULL (table rebuild required)']);
  });

  it("fails closed when a foreign key cannot be added additively", () => {
    const catalog = satisfiedCatalog();
    const foreignKeys = new Map(catalog.foreignKeys);
    foreignKeys.set("attendance_events", []);
    const plan = planAttendanceSchema({ ...catalog, foreignKeys });
    expect(plan.blockers.some((blocker) => blocker.includes("missing the foreign key on groupId"))).toBe(true);
  });

  it("fails closed when a required table is absent without an authoritative definition", () => {
    const plan = planAttendanceSchema(catalogOf({ participants: { columns: [{ name: "dropoutAt", notNull: false }] } }));
    expect(plan.blockers).toContain("required table attendance_events is absent and no authoritative definition is available in this package");
    expect(plan.blockers).toContain("missing support table: groups");
  });

  it("fails closed when an index exists with the wrong shape", () => {
    const catalog = satisfiedCatalog();
    const indexes = new Map(catalog.indexes);
    indexes.set("attendance_records_eventId_idx", { table: "attendance_events", unique: true });
    const plan = planAttendanceSchema({ ...catalog, indexes });
    expect(plan.blockers).toContain("existing index attendance_records_eventId_idx does not match the contract (wrong table or uniqueness)");
  });

  it("never plans to touch the preserved legacy family", () => {
    const plan = planAttendanceSchema(satisfiedCatalog());
    expect(() => assertPlanPreservesLegacyTables(plan)).not.toThrow();
    for (const legacy of PRESERVED_LEGACY_TABLES) {
      expect(plan.createStatements.some((statement) => statement.includes(`"${legacy}"`))).toBe(false);
    }
    expect(() =>
      assertPlanPreservesLegacyTables({ statuses: [], createStatements: ['DROP TABLE "staff_attendance_events"'], blockers: [], upToDate: false })
    ).toThrow(/preserved table/);
  });

  it("summarizes the preflight with schema identifiers and counts only", () => {
    const catalog = withoutColumns(satisfiedCatalog(), "attendance_events", ["resetVersion"]);
    const preflight = summarizeAttendanceSchemaPreflight(catalog, planAttendanceSchema(catalog));
    expect(preflight).toMatchObject({
      mode: "read-only",
      requiredTables: REQUIRED_TABLES.length,
      presentTables: REQUIRED_TABLES.length,
      blocked: false,
      upToDate: false,
      missingColumns: ["attendance_events.resetVersion"],
      missingIndexes: [],
      missingSupportTables: [],
      plannedStatements: 1,
    });
    expect(preflight.preservedLegacyTables.map((entry) => entry.table)).toEqual([...PRESERVED_LEGACY_TABLES]);
    expect(preflight.declaredUnreferencedTables.map((entry) => entry.table)).toEqual([...DECLARED_UNREFERENCED_TABLES]);
  });

  it("reports the declared but unreferenced attendance tables without planning them", () => {
    const plan = planAttendanceSchema(satisfiedCatalog());
    for (const name of DECLARED_UNREFERENCED_TABLES) {
      expect(plan.createStatements.some((statement) => statement.includes(`"${name}"`))).toBe(false);
    }
  });
});
