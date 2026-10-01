import { describe, expect, it } from "vitest";
import { LAHORE_REFRESH } from "./constants";
import { planBackup, parseRefreshArgs, RefreshRefusedError, resolveExecutableTarget } from "./guards";

const workbook = ["--input", "docs/sheets/Shabab_Batch_4_Attendance.xlsx"];
const writeFlags = ["--execute", "--confirm-lahore-refresh", "--backup-dir", "backups"];

function parse(extra: readonly string[]) {
  return parseRefreshArgs([...workbook, ...extra]);
}

describe("Lahore refresh argument guard", () => {
  it("defaults to a dry run with the approved completed-through date", () => {
    const options = parse([]);
    expect(options.execute).toBe(false);
    expect(options.confirmLahoreRefresh).toBe(false);
    expect(options.target).toBeNull();
    expect(options.attendanceThrough).toBe(LAHORE_REFRESH.attendanceThrough);
    expect(resolveExecutableTarget(options)).toBeNull();
  });

  it("rejects unknown, repeated and value-less arguments", () => {
    expect(() => parseRefreshArgs([...workbook, "--nope"])).toThrow(RefreshRefusedError);
    expect(() => parseRefreshArgs([...workbook, "--target"])).toThrow(RefreshRefusedError);
    expect(() => parseRefreshArgs([...workbook, "--target", "sqlite", "--target", "postgres"])).toThrow(RefreshRefusedError);
    expect(() => parseRefreshArgs([...workbook, "--target", "mysql"])).toThrow(RefreshRefusedError);
  });

  it("refuses an acknowledgement flag without --execute", () => {
    expect(() => parseRefreshArgs([...workbook, "--confirm-lahore-refresh"])).toThrow(RefreshRefusedError);
  });

  it("refuses writes without confirmation, an explicit target or a backup directory", () => {
    expect(() => resolveExecutableTarget(parse(["--execute"]))).toThrow(/confirm-lahore-refresh/);
    expect(() => resolveExecutableTarget(parse(["--execute", "--confirm-lahore-refresh"]))).toThrow(/explicit --target/);
    expect(() => resolveExecutableTarget(parse(["--execute", "--confirm-lahore-refresh", "--target", "sqlite", "--sqlite-path", "local.db"]))).toThrow(/backup-dir/);
  });

  it("resolves an explicit local SQLite target and rejects a remote-looking path", () => {
    const target = resolveExecutableTarget(parse([...writeFlags, "--target", "sqlite", "--sqlite-path", "prisma/dev.db"]));
    expect(target).toEqual({ kind: "sqlite", path: "prisma/dev.db", backupDir: "backups" });
    expect(() => resolveExecutableTarget(parse([...writeFlags, "--target", "sqlite", "--sqlite-path", "postgres://user:secret@host/db"]))).toThrow(/local file path/);
    expect(() => resolveExecutableTarget(parse([...writeFlags, "--target", "sqlite"]))).toThrow(/sqlite-path/);
  });

  it("rejects a UNC or protocol-relative network path as a SQLite target", () => {
    expect(() => resolveExecutableTarget(parse([...writeFlags, "--target", "sqlite", "--sqlite-path", "\\\\fileserver\\share\\dev.db"]))).toThrow(/local file path/);
    expect(() => resolveExecutableTarget(parse([...writeFlags, "--target", "sqlite", "--sqlite-path", "//fileserver/share/dev.db"]))).toThrow(/local file path/);
    // A normal absolute or relative local path is still accepted.
    expect(resolveExecutableTarget(parse([...writeFlags, "--target", "sqlite", "--sqlite-path", "prisma/dev.db"]))).toEqual({ kind: "sqlite", path: "prisma/dev.db", backupDir: "backups" });
  });

  it("requires an explicit PostgreSQL URL and never echoes it in a refusal", () => {
    const target = resolveExecutableTarget(parse([...writeFlags, "--target", "postgres", "--postgres-url", "postgres://user:secret@host/db"]));
    expect(target).toEqual({ kind: "postgres", url: "postgres://user:secret@host/db", backupDir: "backups" });

    try {
      resolveExecutableTarget(parse([...writeFlags, "--target", "sqlite", "--sqlite-path", "local.db", "--postgres-url", "postgres://user:secret@host/db"]));
      throw new Error("expected a refusal");
    } catch (error) {
      expect(error).toBeInstanceOf(RefreshRefusedError);
      expect((error as Error).message).not.toContain("secret");
    }

    expect(() => resolveExecutableTarget(parse([...writeFlags, "--target", "postgres"]))).toThrow(/postgres-url/);
    expect(() => resolveExecutableTarget(parse([...writeFlags, "--target", "postgres", "--postgres-url", "mysql://host/db"]))).toThrow(/postgres connection string/);
  });

  it("fails closed when no verified backup mechanism is available", () => {
    const sqlite = resolveExecutableTarget(parse([...writeFlags, "--target", "sqlite", "--sqlite-path", "local.db"]))!;
    expect(planBackup(sqlite, { sqliteBackup: false, postgresFullDump: false })).toEqual({ kind: "refused", reason: "No verified full SQLite backup mechanism is available" });
    expect(planBackup(sqlite, { sqliteBackup: true, postgresFullDump: false })).toEqual({ kind: "sqlite-file-copy", backupDir: "backups" });

    const postgres = resolveExecutableTarget(parse([...writeFlags, "--target", "postgres", "--postgres-url", "postgres://host/db"]))!;
    expect(planBackup(postgres, { sqliteBackup: true, postgresFullDump: false })).toEqual({ kind: "refused", reason: "PostgreSQL writes require a verified full backup mechanism; refusing a partial backup" });
    expect(planBackup(postgres, { sqliteBackup: true, postgresFullDump: true })).toEqual({ kind: "postgres-full-dump", backupDir: "backups" });
  });
});
