/**
 * Narrow Team Access SQLite schema contract and additive-reconciliation planner.
 *
 * The Muawin assistance feature stores `StaffMeta.assistsMurabbiId`, declared in
 * `prisma/schema.prisma` as a nullable self-relation
 * (`@relation("MuawinAssistance", fields: [assistsMurabbiId], references: [id], onDelete: SetNull)`)
 * and added locally by migration `20260916080000_add_muawin_assistance`.
 *
 * This module is pure. It never opens a connection and never writes. It plans
 * exactly two additive statements at most — a nullable column and its index — and
 * fails closed for anything that would need a table rebuild, a rename, a copy, a
 * drop, a data rewrite or a constraint replacement.
 *
 * Output carries schema object names and counts only: never staff names, emails,
 * passwords or workbook rows.
 */

export const STAFF_META_TABLE = "staff_meta";
export const ASSISTS_MURABBI_COLUMN = "assistsMurabbiId";
export const ASSISTS_MURABBI_INDEX = "staff_meta_assistsMurabbiId_idx";

/** How the self-reference stands for this database. */
export type SelfReferenceState = "present" | "absent-non-blocking" | "planned";

export interface TeamAccessSchemaCatalog {
  readonly staffMetaPresent: boolean;
  readonly column: { readonly present: boolean; readonly notNull: boolean } | null;
  readonly index: { readonly present: boolean; readonly table: string; readonly columns: readonly string[] } | null;
  readonly selfReferencePresent: boolean;
  /**
   * True when this SQLite build accepted an additive self-referencing foreign key
   * in a disposable probe. Probed at run time rather than assumed.
   */
  readonly selfReferenceAdditiveSupported: boolean;
}

export interface TeamAccessSchemaPlan {
  readonly selfReference: SelfReferenceState;
  readonly createStatements: readonly string[];
  readonly blockers: readonly string[];
  readonly upToDate: boolean;
}

/**
 * Exactly the statements this package may ever emit. The check is an allowlist
 * rather than a keyword blocklist so no legitimate clause (for example
 * `ON UPDATE CASCADE`) can be mistaken for a destructive verb.
 */
const ALLOWED_STATEMENTS: readonly RegExp[] = [
  new RegExp(
    `^ALTER TABLE "${STAFF_META_TABLE}" ADD COLUMN "${ASSISTS_MURABBI_COLUMN}" TEXT(?: REFERENCES "${STAFF_META_TABLE}"\\("id"\\) ON DELETE SET NULL ON UPDATE CASCADE)?$`
  ),
  new RegExp(`^CREATE INDEX "${ASSISTS_MURABBI_INDEX}" ON "${STAFF_META_TABLE}"\\("${ASSISTS_MURABBI_COLUMN}"\\)$`),
];

/**
 * The only column addition this package allows. When the engine supports the
 * additive self-reference, the column is created with it so the local schema
 * matches `prisma/schema.prisma`; otherwise it falls back to the plain column the
 * committed migration uses.
 */
export function additiveAssistsMurabbiStatement(selfReferenceAdditiveSupported: boolean): string {
  const reference = selfReferenceAdditiveSupported
    ? ` REFERENCES "${STAFF_META_TABLE}"("id") ON DELETE SET NULL ON UPDATE CASCADE`
    : "";
  return `ALTER TABLE "${STAFF_META_TABLE}" ADD COLUMN "${ASSISTS_MURABBI_COLUMN}" TEXT${reference}`;
}

export function assistsMurabbiIndexStatement(): string {
  return `CREATE INDEX "${ASSISTS_MURABBI_INDEX}" ON "${STAFF_META_TABLE}"("${ASSISTS_MURABBI_COLUMN}")`;
}

export function planTeamAccessSchema(catalog: TeamAccessSchemaCatalog): TeamAccessSchemaPlan {
  const blockers: string[] = [];
  const createStatements: string[] = [];

  if (!catalog.staffMetaPresent) {
    return {
      selfReference: "absent-non-blocking",
      createStatements: [],
      blockers: [`required table ${STAFF_META_TABLE} is absent; this helper only adds columns to an existing table`],
      upToDate: false,
    };
  }

  let selfReference: SelfReferenceState;
  if (!catalog.column || !catalog.column.present) {
    createStatements.push(additiveAssistsMurabbiStatement(catalog.selfReferenceAdditiveSupported));
    createStatements.push(assistsMurabbiIndexStatement());
    selfReference = catalog.selfReferenceAdditiveSupported ? "planned" : "absent-non-blocking";
  } else {
    if (catalog.column.notNull) {
      blockers.push(
        `existing column ${STAFF_META_TABLE}.${ASSISTS_MURABBI_COLUMN} is NOT NULL; the contract requires it to be nullable (table rebuild required)`
      );
    }
    // An existing column cannot gain a foreign key without a table rebuild, which this
    // helper never performs. This matches the state the committed migration produces,
    // so it is reported rather than treated as a blocker.
    selfReference = catalog.selfReferencePresent ? "present" : "absent-non-blocking";

    if (!catalog.index || !catalog.index.present) {
      createStatements.push(assistsMurabbiIndexStatement());
    } else if (catalog.index.table !== STAFF_META_TABLE || !catalog.index.columns.includes(ASSISTS_MURABBI_COLUMN)) {
      blockers.push(`existing index ${ASSISTS_MURABBI_INDEX} does not match the contract (wrong table or indexed column)`);
    }
  }

  for (const statement of createStatements) {
    if (!ALLOWED_STATEMENTS.some((pattern) => pattern.test(statement))) {
      throw new Error("Team Access plan produced a statement outside the approved additive set");
    }
  }

  return {
    selfReference,
    createStatements,
    blockers,
    upToDate: blockers.length === 0 && createStatements.length === 0,
  };
}

export interface TeamAccessSchemaPreflight {
  readonly mode: "read-only";
  readonly staffMetaPresent: boolean;
  readonly assistsMurabbiColumnPresent: boolean;
  readonly assistsMurabbiColumnNullable: boolean;
  readonly assistsMurabbiIndexPresent: boolean;
  readonly selfReference: SelfReferenceState;
  readonly selfReferenceAdditiveSupported: boolean;
  readonly blocked: boolean;
  readonly blockers: readonly string[];
  readonly upToDate: boolean;
  readonly plannedStatements: number;
}

/** Aggregate/schema-only summary for the CLI and the provisioning gate. */
export function summarizeTeamAccessSchema(
  catalog: TeamAccessSchemaCatalog,
  plan: TeamAccessSchemaPlan
): TeamAccessSchemaPreflight {
  return {
    mode: "read-only",
    staffMetaPresent: catalog.staffMetaPresent,
    assistsMurabbiColumnPresent: catalog.column?.present === true,
    assistsMurabbiColumnNullable: catalog.column?.present === true && !catalog.column.notNull,
    assistsMurabbiIndexPresent: catalog.index?.present === true,
    selfReference: plan.selfReference,
    selfReferenceAdditiveSupported: catalog.selfReferenceAdditiveSupported,
    blocked: plan.blockers.length > 0,
    blockers: plan.blockers,
    upToDate: plan.upToDate,
    plannedStatements: plan.createStatements.length,
  };
}
