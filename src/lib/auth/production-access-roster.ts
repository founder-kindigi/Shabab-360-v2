/**
 * Private approved roster input for a PostgreSQL Team Access provisioning run.
 *
 * The roster is supplied by the operator at run time and is never committed:
 * `readAccessRoster` refuses a path inside the repository, caps the file size and
 * row count, allow-lists the header, and fails with a code that never echoes a
 * cell value, email, name or row number.
 *
 * Column names follow the approved design shape (`ref, email, role, city, park,
 * group, assists_ref`); `name` is an optional display value that is stored only
 * on the `users` row. `city`, `park`, `group` and `assists_ref` are the scope
 * references the shared access plan resolves.
 */
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import type { AccessRequestRow } from "./production-access";

/** A deliberate refusal. The message never contains roster content. */
export class RosterRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RosterRefusedError";
  }
}

export const ROSTER_COLUMNS = ["ref", "email", "role", "city", "park", "group", "assists_ref", "name"] as const;
export const ROSTER_REQUIRED_COLUMNS = ["ref", "email", "role"] as const;
export const ROSTER_MAX_ROWS = 500;

const ROSTER_MAX_BYTES = 1024 * 1024;
const FIELD_MAX_LENGTH = 200;

export interface RosterEntry extends AccessRequestRow {
  readonly name: string | null;
}

function cell(row: readonly string[], index: number | undefined): string {
  if (index === undefined) return "";
  const value = row[index];
  return typeof value === "string" ? value.trim() : "";
}

/** Parses roster text. Pure: it reads no file, opens no connection and holds no state. */
export function parseAccessRoster(text: string): RosterEntry[] {
  // A BOM is common in spreadsheets exported to CSV and must not corrupt the first header.
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), { header: false, skipEmptyLines: true });
  if (parsed.errors.length > 0) throw new RosterRefusedError("roster_csv_unparsable");

  const rows = parsed.data.filter((row) => Array.isArray(row));
  if (rows.length < 2) throw new RosterRefusedError("roster_empty");

  const header = rows[0].map((value) => String(value ?? "").trim().toLowerCase());
  if (new Set(header).size !== header.length) throw new RosterRefusedError("roster_duplicate_column");
  for (const column of header) {
    if (!(ROSTER_COLUMNS as readonly string[]).includes(column)) throw new RosterRefusedError("roster_unknown_column");
  }
  for (const required of ROSTER_REQUIRED_COLUMNS) {
    if (!header.includes(required)) throw new RosterRefusedError(`roster_missing_column:${required}`);
  }

  const data = rows.slice(1);
  if (data.length === 0) throw new RosterRefusedError("roster_empty");
  if (data.length > ROSTER_MAX_ROWS) throw new RosterRefusedError("roster_too_many_rows");

  const position = new Map(header.map((column, index) => [column, index]));
  const refs = new Set<string>();
  return data.map((row) => {
    if (row.length !== header.length) throw new RosterRefusedError("roster_row_arity_mismatch");
    for (const value of row) {
      if (typeof value !== "string") throw new RosterRefusedError("roster_field_not_text");
      if (value.trim().length > FIELD_MAX_LENGTH) throw new RosterRefusedError("roster_field_too_long");
    }
    const read = (column: string) => cell(row, position.get(column));
    const ref = read("ref");
    if (!ref) throw new RosterRefusedError("roster_missing_ref");
    if (refs.has(ref)) throw new RosterRefusedError("roster_duplicate_ref");
    refs.add(ref);
    return {
      ref,
      email: read("email"),
      role: read("role"),
      cityCode: read("city") || null,
      parkName: read("park") || null,
      groupCode: read("group") || null,
      assistsRef: read("assists_ref") || null,
      name: read("name") || null,
    };
  });
}

/** True when `target` resolves inside `root` (case-insensitive on Windows). */
export function isInsideDirectory(root: string, target: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  if (relative === "") return true;
  if (path.isAbsolute(relative)) return false;
  return !relative.startsWith("..");
}

/**
 * The approved roster must live outside the repository so it can never be
 * committed. This is enforced, not merely documented.
 */
export function assertRosterOutsideRepository(filePath: string, repositoryRoot: string = process.cwd()): void {
  if (isInsideDirectory(repositoryRoot, filePath)) {
    throw new RosterRefusedError("roster_inside_repository: keep the approved roster outside the checkout");
  }
}

/** Reads and validates a roster file. Never logs or returns a path in an error. */
export function readAccessRoster(filePath: string, repositoryRoot: string = process.cwd()): RosterEntry[] {
  assertRosterOutsideRepository(filePath, repositoryRoot);
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) throw new RosterRefusedError("roster_not_found");
  if (fs.statSync(resolved).size > ROSTER_MAX_BYTES) throw new RosterRefusedError("roster_too_large");
  return parseAccessRoster(fs.readFileSync(resolved, "utf8"));
}
