/**
 * Read-only baseline parity helpers for the ATT01 migration work.
 *
 * These functions never open a database: they work on migration SQL text and on
 * the migration folder names a caller has already listed, so they can be used for
 * local checks and by an authorised operator's preflight without any connection.
 *
 * They exist because the PostgreSQL readiness model previously recognised only
 * primary-key constraints, so an unguarded foreign key added by a pending
 * migration could reach the database unmodelled. `parseForeignKeyStatements`
 * makes every added foreign key visible, and it distinguishes a genuine
 * "add only" statement from a deliberate drop-then-re-add realignment whose
 * pre-state is a prerequisite rather than a collision.
 */

/** A baseline input that was expected but is absent, unreadable or empty. */
export class BaselineInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BaselineInputError";
  }
}

export interface ForeignKeyStatement {
  readonly table: string;
  readonly constraint: string;
  /** True when the same file drops the constraint before adding it again. */
  readonly realigned: boolean;
}

const ADD_FOREIGN_KEY = /ALTER TABLE "([^"]+)"\s+ADD CONSTRAINT "([^"]+)"\s+FOREIGN KEY/g;

/** Every `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY` declared by a migration file. */
export function parseForeignKeyStatements(sql: string): ForeignKeyStatement[] {
  const statements: ForeignKeyStatement[] = [];
  for (const match of sql.matchAll(ADD_FOREIGN_KEY)) {
    const constraint = match[2];
    const realigned =
      sql.includes(`DROP CONSTRAINT "${constraint}"`) || sql.includes(`DROP CONSTRAINT IF EXISTS "${constraint}"`);
    statements.push({ table: match[1], constraint, realigned });
  }
  return statements;
}

/** ATT01 migrations that must be present in both the SQLite and PostgreSQL chains. */
export const REQUIRED_ATT01_MIGRATIONS: readonly string[] = ["20260916080000_add_muawin_assistance"];

/** Required migration folders that a chain does not contain. */
export function missingRequiredMigrations(
  present: readonly string[],
  required: readonly string[] = REQUIRED_ATT01_MIGRATIONS
): string[] {
  return required.filter((name) => !present.includes(name));
}

/**
 * Reads each required baseline input. A missing, unreadable or empty input raises
 * a named {@link BaselineInputError}, so an absent comparison input can never be
 * mistaken for a passing parity result.
 */
export function requireBaselineTexts(
  paths: readonly string[],
  read: (path: string) => string
): Record<string, string> {
  const texts: Record<string, string> = {};
  for (const path of paths) {
    let text: string;
    try {
      text = read(path);
    } catch {
      throw new BaselineInputError(`Baseline input is missing or unreadable: ${path}`);
    }
    if (text.trim().length === 0) {
      throw new BaselineInputError(`Baseline input is empty: ${path}`);
    }
    texts[path] = text;
  }
  return texts;
}
