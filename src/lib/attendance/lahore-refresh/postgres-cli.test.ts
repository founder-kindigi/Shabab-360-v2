import { describe, expect, it } from "vitest";
import { planPostgresImport } from "./postgres-import";
import {
  assertPostgresImportAuthorized,
  parsePostgresImportArgs,
  parsePostgresReconcileArgs,
  readExpectedPostgresMigrations,
  resolveOptionalPostgresUrl,
} from "./postgres-cli";
import { POSTGRES_URL_ENV, PostgresRefusedError, resolvePostgresConnectionUrl, sanitizeDiagnostic } from "./postgres-port";
import { buildSyntheticRefreshManifest } from "./test-support";

const workbook = ["--input", "docs/sheets/Shabab_Batch_4_Attendance.xlsx"];
const writeFlags = [
  "--target",
  "postgres",
  "--execute",
  "--confirm-att01-postgres-import",
  "--confirm-fresh-empty-database",
];

function parse(extra: readonly string[]) {
  return parsePostgresImportArgs([...workbook, ...extra]);
}

describe("ATT01 PostgreSQL import argument guard", () => {
  it("defaults to a dry run that accepts no target and no confirmation", () => {
    const options = parse([]);
    expect(options.execute).toBe(false);
    expect(options.target).toBeNull();
    expect(options.confirmedImport).toBe(false);
    expect(options.confirmedFresh).toBe(false);
    expect(() => assertPostgresImportAuthorized(options)).not.toThrow();
  });

  it("rejects unknown, repeated and value-less arguments", () => {
    expect(() => parse(["extra"])).toThrow(PostgresRefusedError);
    expect(() => parsePostgresImportArgs([...workbook, "--target"])).toThrow(PostgresRefusedError);
    expect(() => parse(["--target", "postgres", "--target", "postgres"])).toThrow(PostgresRefusedError);
    expect(() => parsePostgresImportArgs([...workbook, "--completed-through", "13-09-2026"])).toThrow(/YYYY-MM-DD/);
  });

  it("refuses a target or confirmation flag outside --execute", () => {
    expect(() => parse(["--target", "postgres"])).toThrow(/dry run/);
    expect(() => parse(["--confirm-att01-postgres-import"])).toThrow(/dry run/);
    expect(() => parse(["--confirm-fresh-empty-database"])).toThrow(/dry run/);
  });

  it("requires an explicit postgres target, not a different provider", () => {
    expect(() => parse(["--target", "sqlite"])).toThrow(/exactly 'postgres'/);
    expect(() => assertPostgresImportAuthorized({ ...parse([]), execute: true, target: null })).toThrow(/--target postgres/);
  });

  it("refuses to write without both acknowledgements", () => {
    expect(() => assertPostgresImportAuthorized(parse(["--target", "postgres", "--execute"]))).toThrow(
      /--confirm-att01-postgres-import/
    );
    expect(() =>
      assertPostgresImportAuthorized(parse(["--target", "postgres", "--execute", "--confirm-att01-postgres-import"]))
    ).toThrow(/--confirm-fresh-empty-database/);
    expect(() => assertPostgresImportAuthorized(parse(writeFlags))).not.toThrow();
  });

  it("parses the read-only reconciliation arguments", () => {
    const options = parsePostgresReconcileArgs([...workbook, "--json"]);
    expect(options.input).toBe(workbook[1]);
    expect(options.json).toBe(true);
    expect(() => parsePostgresReconcileArgs([])).toThrow(/Usage/);
  });
});

describe("ATT01 PostgreSQL connection contract", () => {
  it("accepts only a direct postgres connection from the documented variable", () => {
    expect(resolvePostgresConnectionUrl("postgresql://user@127.0.0.1:55432/db")).toContain("127.0.0.1");
    expect(resolvePostgresConnectionUrl("postgres://user@127.0.0.1:5432/db")).toContain("127.0.0.1");
    expect(() => resolvePostgresConnectionUrl(undefined)).toThrow(new RegExp(POSTGRES_URL_ENV));
    expect(() => resolvePostgresConnectionUrl("   ")).toThrow(new RegExp(POSTGRES_URL_ENV));
    expect(() => resolvePostgresConnectionUrl("mysql://user@host/db")).toThrow(/postgres:\/\//);
    expect(() => resolvePostgresConnectionUrl("postgresql://u:p@aws-0-eu.pooler.supabase.com:5432/postgres")).toThrow(
      /pooled connection/
    );
  });

  it("treats an unset or blank runtime variable as no connection", () => {
    expect(resolveOptionalPostgresUrl({})).toBeNull();
    expect(resolveOptionalPostgresUrl({ [POSTGRES_URL_ENV]: "  " })).toBeNull();
    expect(resolveOptionalPostgresUrl({ [POSTGRES_URL_ENV]: "postgresql://u@127.0.0.1:1/db" })).not.toBeNull();
  });

  it("strips a connection string and password from any diagnostic", () => {
    const message = sanitizeDiagnostic(
      "connect failed postgresql://user:secret@127.0.0.1:5432/db?password=hunter2 while opening"
    );
    expect(message).not.toContain("secret");
    expect(message).not.toContain("hunter2");
    expect(message).toContain("postgresql://***");
  });
});

describe("ATT01 PostgreSQL migration expectations", () => {
  it("reads the committed, sorted migration set with the ATT01 folders", () => {
    const migrations = readExpectedPostgresMigrations();
    expect(migrations.length).toBe(35);
    expect(new Set(migrations).size).toBe(35);
    expect(migrations).toContain("20260909020000_operation_receipts");
    expect(migrations).toContain("20260916080000_add_muawin_assistance");
    expect([...migrations].sort()).toEqual(migrations);
  });
});

describe("ATT01 PostgreSQL import plan", () => {
  it("creates only the approved business tables and no user or staff row", () => {
    const plan = planPostgresImport(buildSyntheticRefreshManifest());
    const tables = plan.tables.map((entry) => entry.table);
    expect(tables).toEqual([
      "cities",
      "parks",
      "batches",
      "batch_settings",
      "groups",
      "participants",
      "attendance_events",
      "attendance_records",
      "batch_class_dates",
    ]);
    expect(tables).not.toContain("users");
    expect(tables).not.toContain("staff_meta");
    expect(plan.counts.staffPlaceholders).toBe(0);
  });

  it("derives row counts from the manifest and never carries an identity", () => {
    const manifest = buildSyntheticRefreshManifest();
    const plan = planPostgresImport(manifest);
    const rowsFor = (table: string) => plan.tables.find((entry) => entry.table === table)?.rows.length;
    expect(rowsFor("parks")).toBe(manifest.counts.parks);
    expect(rowsFor("groups")).toBe(manifest.counts.groups);
    expect(rowsFor("participants")).toBe(manifest.counts.participants);
    expect(rowsFor("attendance_records")).toBe(manifest.counts.attendanceRecords);
    expect(rowsFor("batch_class_dates")).toBe(manifest.counts.calendarDates);
  });
});
