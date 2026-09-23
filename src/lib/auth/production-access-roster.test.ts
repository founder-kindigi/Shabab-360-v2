import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ROSTER_MAX_ROWS,
  RosterRefusedError,
  assertRosterOutsideRepository,
  isInsideDirectory,
  parseAccessRoster,
  readAccessRoster,
} from "./production-access-roster";

const HEADER = "ref,email,role,city,park,group,assists_ref,name";

const tempDirs: string[] = [];
afterEach(() => {
  while (tempDirs.length > 0) {
    const directory = tempDirs.pop();
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
  }
});

function tempRoster(content: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "att01-roster-"));
  tempDirs.push(directory);
  const file = path.join(directory, "roster.csv");
  fs.writeFileSync(file, content, "utf8");
  return file;
}

describe("private access roster parsing", () => {
  it("maps the approved columns onto the access request rows", () => {
    const entries = parseAccessRoster(
      [
        HEADER,
        "row-1,head@example.invalid,City Head,LHR,,,,",
        "row-2,lead@example.invalid,Park Lead,LHR,Gulberg,,,",
        "row-3,murabbi@example.invalid,Murabbi,LHR,Gulberg,Group 1,,Murabbi One",
        "row-4,muawin@example.invalid,Muawin,LHR,Gulberg,,row-3,",
      ].join("\n")
    );

    expect(entries).toHaveLength(4);
    expect(entries[0]).toMatchObject({ ref: "row-1", role: "City Head", cityCode: "LHR", parkName: null, groupCode: null, assistsRef: null, name: null });
    expect(entries[2]).toMatchObject({ groupCode: "Group 1", name: "Murabbi One" });
    expect(entries[3]).toMatchObject({ groupCode: null, assistsRef: "row-3" });
  });

  it("tolerates a byte-order mark in an exported roster", () => {
    const entries = parseAccessRoster(`\uFEFF${HEADER}\nrow-1,head@example.invalid,City Head,LHR,,,,`);
    expect(entries).toHaveLength(1);
    expect(entries[0].ref).toBe("row-1");
  });

  it("accepts a header with only the required columns", () => {
    const entries = parseAccessRoster("ref,email,role\nrow-1,a@example.invalid,Murabbi");
    expect(entries).toEqual([
      { ref: "row-1", email: "a@example.invalid", role: "Murabbi", cityCode: null, parkName: null, groupCode: null, assistsRef: null, name: null },
    ]);
  });

  it("refuses an empty roster, an unknown column, a duplicate column and a missing required column", () => {
    expect(() => parseAccessRoster("")).toThrow(RosterRefusedError);
    expect(() => parseAccessRoster(HEADER)).toThrow(/roster_empty/);
    expect(() => parseAccessRoster(`${HEADER},salary\nrow-1,a@example.invalid,Murabbi,,,,,,1`)).toThrow(/roster_unknown_column/);
    expect(() => parseAccessRoster("ref,ref,role\nrow-1,row-2,Murabbi")).toThrow(/roster_duplicate_column/);
    expect(() => parseAccessRoster("ref,email\nrow-1,a@example.invalid")).toThrow(/roster_missing_column:role/);
  });

  it("refuses missing and duplicate row references", () => {
    expect(() => parseAccessRoster(`${HEADER}\n,head@example.invalid,City Head,LHR,,,,`)).toThrow(/roster_missing_ref/);
    expect(() =>
      parseAccessRoster(`${HEADER}\nrow-1,a@example.invalid,City Head,LHR,,,, \nrow-1,b@example.invalid,City Head,LHR,,,,`)
    ).toThrow(/roster_duplicate_ref/);
  });

  it("refuses a row whose width does not match the header and an over-long field", () => {
    expect(() => parseAccessRoster(`${HEADER}\nrow-1,a@example.invalid,City Head`)).toThrow(/roster_row_arity_mismatch/);
    expect(() => parseAccessRoster(`${HEADER}\nrow-1,a@example.invalid,City Head,LHR,,,,${"x".repeat(300)}`)).toThrow(
      /roster_field_too_long/
    );
  });

  it("refuses a roster beyond the row cap", () => {
    const rows = Array.from({ length: ROSTER_MAX_ROWS + 1 }, (_, index) => `row-${index + 1},u${index + 1}@example.invalid,Murabbi,LHR,Gulberg,,,`);
    expect(() => parseAccessRoster([HEADER, ...rows].join("\n"))).toThrow(/roster_too_many_rows/);
  });

  it("never echoes a cell value, email or name in a refusal", () => {
    const secret = "very.distinctive.person@example.invalid";
    let message = "";
    try {
      parseAccessRoster(`${HEADER}\nrow-1,${secret},City Head,LHR,,,,${"y".repeat(300)}`);
    } catch (error) {
      message = error instanceof Error ? error.message : "";
    }
    expect(message).toContain("roster_field_too_long");
    expect(message).not.toContain(secret);
    expect(message).not.toContain("very.distinctive");
    expect(message).not.toContain("row-1");
  });
});

describe("private roster file handling", () => {
  it("detects containment against the repository root", () => {
    const root = path.join(path.sep, "repo");
    expect(isInsideDirectory(root, path.join(root, "docs", "roster.csv"))).toBe(true);
    expect(isInsideDirectory(root, root)).toBe(true);
    expect(isInsideDirectory(root, path.join(path.sep, "elsewhere", "roster.csv"))).toBe(false);
  });

  it("refuses a roster inside the repository and a missing file", () => {
    expect(() => assertRosterOutsideRepository(path.join(process.cwd(), "docs", "sheets", "roster.csv"))).toThrow(
      /roster_inside_repository/
    );
    expect(() => readAccessRoster(path.join(process.cwd(), "docs", "sheets", "roster.csv"))).toThrow(
      /roster_inside_repository/
    );
    expect(() => readAccessRoster(path.join(os.tmpdir(), "att01-does-not-exist.csv"))).toThrow(/roster_not_found/);
  });

  it("reads an approved roster from an operator-supplied path outside the checkout", () => {
    const file = tempRoster(`${HEADER}\nrow-1,head@example.invalid,City Head,LHR,,,,`);
    const entries = readAccessRoster(file);
    expect(entries).toHaveLength(1);
    expect(entries[0].email).toBe("head@example.invalid");
  });
});
