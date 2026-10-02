import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import {
  auditMigration,
  detectReplayConflicts,
  parseMigrationSql,
  summarizeAudits,
  type SqliteCatalog,
} from "./sqlite-migration-catalog";

const WIDGETS_TABLE_SQL = [
  'CREATE TABLE "widgets" (',
  '  "id" TEXT NOT NULL PRIMARY KEY,',
  '  "name" TEXT NOT NULL,',
  '  "kind" TEXT NOT NULL DEFAULT \'plain\',',
  '  "note" TEXT,',
  '  CONSTRAINT "widgets_fkey" FOREIGN KEY ("id") REFERENCES "parents" ("id") ON DELETE CASCADE',
  ');',
  'CREATE UNIQUE INDEX "widgets_name_key" ON "widgets"("name");',
].join("\n");

const WIDGETS_SQL = `${WIDGETS_TABLE_SQL}\nALTER TABLE "widgets" ADD COLUMN "extra" INTEGER NOT NULL DEFAULT 3;`;

function catalogOf(
  tables: Record<string, { name: string; notNull?: boolean; defaultValue?: string | null }[]>,
  indexes: string[] = [],
  triggers: string[] = []
): SqliteCatalog {
  return {
    tables: new Map(
      Object.entries(tables).map(([name, columns]) => [
        name,
        {
          name,
          columns: columns.map((column) => ({
            name: column.name,
            notNull: column.notNull ?? false,
            defaultValue: column.defaultValue ?? null,
          })),
        },
      ])
    ),
    indexes: new Map(indexes.map((name) => [name, { name, table: "widgets", unique: false }])),
    triggers: new Set(triggers),
  };
}

const FULL_WIDGETS_CATALOG = catalogOf(
  {
    widgets: [
      { name: "id", notNull: true },
      { name: "name", notNull: true },
      { name: "kind", notNull: true, defaultValue: "'plain'" },
      { name: "note", notNull: false },
    ],
  },
  ["widgets_name_key"]
);

describe("SQLite migration SQL parsing", () => {
  it("keeps multi-line table bodies and reads columns, defaults and indexes", () => {
    const parsed = parseMigrationSql("20260101000000_widgets", WIDGETS_SQL);
    expect(parsed.unclassified).toEqual([]);
    expect(parsed.tables).toHaveLength(1);
    const table = parsed.tables[0];
    expect(table.name).toBe("widgets");
    expect(table.rebuilt).toBe(false);
    expect(table.columns.map((column) => column.name)).toEqual(["id", "name", "kind", "note"]);
    expect(table.columns.find((column) => column.name === "id")?.notNull).toBe(true);
    expect(table.columns.find((column) => column.name === "note")?.notNull).toBe(false);
    expect(table.columns.find((column) => column.name === "kind")?.defaultValue).toBe("'plain'");
    expect(parsed.indexes).toEqual([{ name: "widgets_name_key", table: "widgets", unique: true }]);
    expect(parsed.columnsAdded).toEqual([
      { table: "widgets", column: { name: "extra", notNull: true, defaultValue: "3" } },
    ]);
  });

  it("captures every trigger even when BEGIN and END share a line", () => {
    const parsed = parseMigrationSql(
      "20260101000001_triggers",
      [
        'CREATE TRIGGER "t1" BEFORE INSERT ON "widgets"',
        'WHEN NEW."id" IS NULL',
        "BEGIN SELECT RAISE(ABORT, 'nope'); END;",
        'CREATE TRIGGER "t2" BEFORE UPDATE ON "widgets"',
        'BEGIN UPDATE "widgets" SET "name" = \'x\' WHERE "id" = NEW."id"; END;',
        'CREATE INDEX "widgets_kind_idx" ON "widgets"("kind");',
      ].join("\n")
    );
    expect(parsed.triggers).toEqual(["t1", "t2"]);
    expect(parsed.indexes.map((index) => index.name)).toEqual(["widgets_kind_idx"]);
    expect(parsed.unclassified).toEqual([]);
  });

  it("treats a table created and dropped in the same migration as a transient guard", () => {
    const parsed = parseMigrationSql(
      "20260101000002_guard",
      [
        'CREATE TABLE "_preflight" ("valid" INTEGER NOT NULL CHECK ("valid" = 1));',
        'INSERT INTO "_preflight" ("valid") VALUES (1);',
        'DROP TABLE "_preflight";',
        'CREATE UNIQUE INDEX "widgets_one_active" ON "widgets"("id") WHERE "note" IS NULL;',
      ].join("\n")
    );
    expect(parsed.tables).toEqual([]);
    expect(parsed.droppedTables).toEqual([]);
    expect(parsed.indexes.map((index) => index.name)).toEqual(["widgets_one_active"]);
    expect(parsed.dataStatements).toHaveLength(1);
  });

  it("maps a rebuild rename onto the surviving table name", () => {
    const parsed = parseMigrationSql(
      "20260101000003_rebuild",
      [
        'CREATE TABLE "new_widgets" ("id" TEXT NOT NULL PRIMARY KEY, "note" TEXT, "flag" BOOLEAN);',
        'INSERT INTO "new_widgets" ("id", "note") SELECT "id", "note" FROM "widgets";',
        'DROP TABLE "widgets";',
        'ALTER TABLE "new_widgets" RENAME TO "widgets";',
      ].join("\n")
    );
    expect(parsed.tables.map((table) => table.name)).toEqual(["widgets"]);
    expect(parsed.tables[0].rebuilt).toBe(true);
    expect(parsed.droppedTables).toEqual([]);
    expect(parsed.dataStatements).toHaveLength(1);
  });

  it("never silently drops an unrecognised statement", () => {
    const parsed = parseMigrationSql("20260101000004_odd", "VACUUM widgets;");
    expect(parsed.unclassified).toHaveLength(1);
  });
});

describe("SQLite migration catalog classification", () => {
  it("classifies fully satisfied, partially satisfied and missing migrations", () => {
    const represented = auditMigration(
      parseMigrationSql("m1", 'CREATE UNIQUE INDEX "widgets_name_key" ON "widgets"("name");'),
      FULL_WIDGETS_CATALOG,
      false
    );
    const partially = auditMigration(
      parseMigrationSql(
        "m2",
        'CREATE UNIQUE INDEX "widgets_name_key" ON "widgets"("name");\nALTER TABLE "widgets" ADD COLUMN "extra" INTEGER NOT NULL DEFAULT 3;'
      ),
      FULL_WIDGETS_CATALOG,
      false
    );
    const missing = auditMigration(
      parseMigrationSql("m3", 'CREATE TABLE "gadgets" ("id" TEXT NOT NULL PRIMARY KEY);'),
      FULL_WIDGETS_CATALOG,
      false
    );

    expect(represented.classification).toBe("structurally-represented");
    expect(represented.missing).toEqual([]);
    expect(partially.classification).toBe("partially-represented");
    expect(partially.missing).toEqual(["column:widgets.extra"]);
    expect(missing.classification).toBe("structurally-missing");

    expect(summarizeAudits([represented, partially, missing])).toEqual({
      "structurally-represented": 1,
      "partially-represented": 1,
      "structurally-missing": 1,
      "no-structural-change": 0,
    });
  });

  it("reports nullability and extra-column drift without failing the artifact", () => {
    const catalog = catalogOf(
      {
        widgets: [
          { name: "id", notNull: true },
          { name: "name", notNull: false },
          { name: "kind", notNull: true, defaultValue: "'plain'" },
          { name: "note", notNull: false },
          { name: "legacy", notNull: false },
        ],
      },
      ["widgets_name_key"]
    );
    const audit = auditMigration(parseMigrationSql("m1", WIDGETS_TABLE_SQL), catalog, false);
    expect(audit.classification).toBe("structurally-represented");
    expect(audit.missing).toEqual([]);
    expect(audit.nullabilityNotes).toEqual(["widgets.name: expected NOT NULL, catalog has nullable"]);
    expect(audit.defaultNotes).toEqual([]);
    expect(audit.extraColumns).toEqual({ widgets: 1 });
  });

  it("reports a default that differs from the migration", () => {
    const catalog = catalogOf(
      {
        widgets: [
          { name: "id", notNull: true },
          { name: "name", notNull: true },
          { name: "kind", notNull: true, defaultValue: "'other'" },
          { name: "note", notNull: false },
        ],
      },
      ["widgets_name_key"]
    );
    const audit = auditMigration(parseMigrationSql("m1", WIDGETS_TABLE_SQL), catalog, false);
    expect(audit.defaultNotes).toEqual(["widgets.kind: expected default 'plain', catalog has 'other'"]);
  });

  it("flags a dropped table that is still present", () => {
    const catalog = catalogOf({ widgets: [{ name: "id" }] });
    const audit = auditMigration(parseMigrationSql("m1", 'DROP TABLE "widgets";'), catalog, false);
    expect(audit.classification).toBe("no-structural-change");
    expect(audit.droppedButStillPresent).toEqual(["widgets"]);
  });
});

describe("SQLite migration replay conflicts", () => {
  it("detects an artifact declared by more than one migration", () => {
    const first = parseMigrationSql("20260101000000_a", 'ALTER TABLE "widgets" ADD COLUMN "flag" BOOLEAN NOT NULL DEFAULT false;');
    const second = parseMigrationSql("20260101000001_b", 'ALTER TABLE "widgets" ADD COLUMN "flag" BOOLEAN NOT NULL DEFAULT true;');
    expect(detectReplayConflicts([first, second])).toEqual([
      { kind: "column", artifact: "widgets.flag", migrations: ["20260101000000_a", "20260101000001_b"] },
    ]);
  });

  it("confirms SQLite rejects the second identical ADD COLUMN", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec('CREATE TABLE "widgets" ("id" TEXT PRIMARY KEY)');
      db.exec('ALTER TABLE "widgets" ADD COLUMN "flag" BOOLEAN NOT NULL DEFAULT false');
      expect(() => db.exec('ALTER TABLE "widgets" ADD COLUMN "flag" BOOLEAN NOT NULL DEFAULT true')).toThrow(/duplicate column name/i);
    } finally {
      db.close();
    }
  });
});

describe("repository migration SQL", () => {
  const migrationsDir = path.resolve(process.cwd(), "prisma", "migrations");
  const files = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  it("parses every migration with no unrecognised statement and no leftover rebuild name", () => {
    expect(files.length).toBeGreaterThan(0);
    for (const name of files) {
      const file = path.join(migrationsDir, name, "migration.sql");
      if (!fs.existsSync(file)) continue;
      const parsed = parseMigrationSql(name, fs.readFileSync(file, "utf8"));
      expect(parsed.unclassified, `${name} has unrecognised statements`).toEqual([]);
      expect(parsed.tables.filter((table) => table.name.startsWith("new_")), `${name} leaks a rebuild name`).toEqual([]);
    }
  });
});
