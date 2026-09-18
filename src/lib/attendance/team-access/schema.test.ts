import { describe, expect, it } from "vitest";
import {
  ASSISTS_MURABBI_COLUMN,
  ASSISTS_MURABBI_INDEX,
  STAFF_META_TABLE,
  additiveAssistsMurabbiStatement,
  assistsMurabbiIndexStatement,
  planTeamAccessSchema,
  summarizeTeamAccessSchema,
  type TeamAccessSchemaCatalog,
} from "./schema";

function catalogOf(input: {
  staffMetaPresent?: boolean;
  column?: { present: boolean; notNull: boolean } | null;
  index?: { present: boolean; table: string; columns: readonly string[] } | null;
  selfReferencePresent?: boolean;
  supported?: boolean;
}): TeamAccessSchemaCatalog {
  return {
    staffMetaPresent: input.staffMetaPresent ?? true,
    column: input.column ?? null,
    index: input.index ?? null,
    selfReferencePresent: input.selfReferencePresent ?? false,
    selfReferenceAdditiveSupported: input.supported ?? true,
  };
}

const COMPLETE_INDEX = { present: true, table: STAFF_META_TABLE, columns: [ASSISTS_MURABBI_COLUMN] };

describe("Team Access schema planning", () => {
  it("plans the nullable column and its index when both are missing", () => {
    const plan = planTeamAccessSchema(catalogOf({ column: { present: false, notNull: false }, index: { present: false, table: "", columns: [] } }));
    expect(plan.blockers).toEqual([]);
    expect(plan.selfReference).toBe("planned");
    expect(plan.createStatements).toEqual([
      `ALTER TABLE "${STAFF_META_TABLE}" ADD COLUMN "${ASSISTS_MURABBI_COLUMN}" TEXT REFERENCES "${STAFF_META_TABLE}"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `CREATE INDEX "${ASSISTS_MURABBI_INDEX}" ON "${STAFF_META_TABLE}"("${ASSISTS_MURABBI_COLUMN}")`,
    ]);
    expect(plan.upToDate).toBe(false);
  });

  it("falls back to the plain column when the engine cannot add the self-reference", () => {
    const plan = planTeamAccessSchema(
      catalogOf({ column: { present: false, notNull: false }, index: { present: false, table: "", columns: [] }, supported: false })
    );
    expect(plan.createStatements[0]).toBe(`ALTER TABLE "${STAFF_META_TABLE}" ADD COLUMN "${ASSISTS_MURABBI_COLUMN}" TEXT`);
    expect(plan.createStatements[0]).not.toContain("REFERENCES");
    expect(plan.selfReference).toBe("absent-non-blocking");
    expect(plan.blockers).toEqual([]);
  });

  it("plans only the index when the column is already present and nullable", () => {
    const plan = planTeamAccessSchema(
      catalogOf({ column: { present: true, notNull: false }, index: { present: false, table: "", columns: [] }, selfReferencePresent: true })
    );
    expect(plan.createStatements).toEqual([assistsMurabbiIndexStatement()]);
    expect(plan.selfReference).toBe("present");
    expect(plan.upToDate).toBe(false);
  });

  it("accepts a present column whose self-reference is absent without blocking", () => {
    const plan = planTeamAccessSchema(
      catalogOf({ column: { present: true, notNull: false }, index: COMPLETE_INDEX, selfReferencePresent: false })
    );
    expect(plan.blockers).toEqual([]);
    expect(plan.createStatements).toEqual([]);
    expect(plan.selfReference).toBe("absent-non-blocking");
    expect(plan.upToDate).toBe(true);
  });

  it("is up to date when column, index and self-reference are all present", () => {
    const catalog = catalogOf({ column: { present: true, notNull: false }, index: COMPLETE_INDEX, selfReferencePresent: true });
    const plan = planTeamAccessSchema(catalog);
    expect(plan).toMatchObject({ selfReference: "present", createStatements: [], blockers: [], upToDate: true });
    expect(summarizeTeamAccessSchema(catalog, plan)).toMatchObject({
      assistsMurabbiColumnPresent: true,
      assistsMurabbiColumnNullable: true,
      assistsMurabbiIndexPresent: true,
      blocked: false,
      upToDate: true,
      plannedStatements: 0,
    });
  });

  it("fails closed when the column is NOT NULL", () => {
    const plan = planTeamAccessSchema(catalogOf({ column: { present: true, notNull: true }, index: COMPLETE_INDEX }));
    expect(plan.blockers).toEqual([
      `existing column ${STAFF_META_TABLE}.${ASSISTS_MURABBI_COLUMN} is NOT NULL; the contract requires it to be nullable (table rebuild required)`,
    ]);
    expect(plan.createStatements).toEqual([]);
  });

  it("fails closed when the index exists on the wrong table or column", () => {
    const wrongTable = planTeamAccessSchema(
      catalogOf({ column: { present: true, notNull: false }, index: { present: true, table: "users", columns: [ASSISTS_MURABBI_COLUMN] } })
    );
    expect(wrongTable.blockers).toEqual([`existing index ${ASSISTS_MURABBI_INDEX} does not match the contract (wrong table or indexed column)`]);

    const wrongColumn = planTeamAccessSchema(
      catalogOf({ column: { present: true, notNull: false }, index: { present: true, table: STAFF_META_TABLE, columns: ["role"] } })
    );
    expect(wrongColumn.blockers).toHaveLength(1);
  });

  it("fails closed when staff_meta is absent", () => {
    const plan = planTeamAccessSchema(catalogOf({ staffMetaPresent: false }));
    expect(plan.blockers).toEqual([
      `required table ${STAFF_META_TABLE} is absent; this helper only adds columns to an existing table`,
    ]);
    expect(plan.createStatements).toEqual([]);
  });

  it("only ever emits guarded additive statements", () => {
    const statements = [
      additiveAssistsMurabbiStatement(true),
      additiveAssistsMurabbiStatement(false),
      assistsMurabbiIndexStatement(),
    ];
    for (const statement of statements) {
      expect(statement).toMatch(/^(ALTER TABLE|CREATE INDEX)\b/);
      expect(statement).not.toMatch(/\b(DROP|RENAME|VACUUM)\b/i);
      expect(statement).not.toMatch(/;/);
    }
  });
});
