import { describe, expect, it } from "vitest";
import { RefreshRefusedError, parseRefreshArgs, type BackupCapabilities } from "./guards";
import { RollbackFailedError, runLahoreRefresh } from "./run";
import type { BackupArtifact, ImportCounts, RefreshManifest, RefreshPorts, VerificationReport } from "./types";

const OK_VERIFICATION: VerificationReport = { ok: true, checks: [], failures: [] };
const BAD_VERIFICATION: VerificationReport = { ok: false, checks: [], failures: ["noRecordsAfterCutoff"] };
const MANIFEST = {
  counts: {
    parks: 6,
    groups: 18,
    participants: 40,
    staffPlaceholders: 2,
    attendanceEvents: 5,
    attendanceRecords: 30,
    calendarDates: 9,
    historicalCalendarDates: 6,
    futureCalendarDates: 3,
    participantsMissingPhone: 1,
    participantsWithDropout: 0,
    statusTotals: { present: 0, absent: 0, late: 0, excused: 0 },
  },
} as unknown as RefreshManifest;
const IMPORT_COUNTS: ImportCounts = { parks: 6, groups: 18, participants: 40, staffPlaceholders: 2, attendanceEvents: 5, attendanceRecords: 30, calendarDates: 9 };
const SQLITE_CAPABILITIES: BackupCapabilities = { sqliteBackup: true, postgresFullDump: false };

type Step = "createBackup" | "verifyBackup" | "restoreBackup" | "resetData" | "importManifest" | "verifyRefresh";

function makePorts(options: { fail?: readonly Step[]; verification?: VerificationReport } = {}) {
  const calls: string[] = [];
  const failing = new Set(options.fail ?? []);
  const guard = (step: Step): void => {
    calls.push(step);
    if (failing.has(step)) throw new Error(`${step} failed`);
  };
  const ports = {
    calls,
    loadManifest: async (): Promise<RefreshManifest> => {
      calls.push("loadManifest");
      return MANIFEST;
    },
    createBackup: async (): Promise<BackupArtifact> => {
      guard("createBackup");
      return { kind: "sqlite-file-copy", path: "backups/lahore-backup.db", bytes: 10 };
    },
    verifyBackup: async (): Promise<void> => guard("verifyBackup"),
    restoreBackup: async (): Promise<void> => guard("restoreBackup"),
    resetData: async (): Promise<void> => guard("resetData"),
    importManifest: async (): Promise<ImportCounts> => {
      guard("importManifest");
      return IMPORT_COUNTS;
    },
    verifyRefresh: async (): Promise<VerificationReport> => {
      guard("verifyRefresh");
      return options.verification ?? OK_VERIFICATION;
    },
  };
  return ports satisfies RefreshPorts & { calls: string[] };
}

const dryRunOptions = parseRefreshArgs(["--input", "wb.xlsx"]);
const executeOptions = parseRefreshArgs(["--input", "wb.xlsx", "--execute", "--confirm-lahore-refresh", "--target", "sqlite", "--sqlite-path", "local.db", "--backup-dir", "backups"]);
const unconfirmedOptions = parseRefreshArgs(["--input", "wb.xlsx", "--execute", "--target", "sqlite", "--sqlite-path", "local.db", "--backup-dir", "backups"]);
const postgresOptions = parseRefreshArgs(["--input", "wb.xlsx", "--execute", "--confirm-lahore-refresh", "--target", "postgres", "--postgres-url", "postgres://host/db", "--backup-dir", "backups"]);

describe("Lahore refresh runner", () => {
  it("is a read-only dry run by default", async () => {
    const ports = makePorts();
    const summary = await runLahoreRefresh({ options: dryRunOptions, capabilities: SQLITE_CAPABILITIES }, ports);

    expect(summary).toEqual({ mode: "dry-run", writesPerformed: false, counts: MANIFEST.counts });
    expect(ports.calls).toEqual(["loadManifest"]);
  });

  it("refuses to write without the acknowledgement flags", async () => {
    const ports = makePorts();
    await expect(runLahoreRefresh({ options: unconfirmedOptions, capabilities: SQLITE_CAPABILITIES }, ports)).rejects.toBeInstanceOf(RefreshRefusedError);
    expect(ports.calls).toEqual(["loadManifest"]);
  });

  it("fails closed for PostgreSQL without a verified full backup", async () => {
    const ports = makePorts();
    await expect(runLahoreRefresh({ options: postgresOptions, capabilities: SQLITE_CAPABILITIES }, ports)).rejects.toThrow(/verified full backup/);
    expect(ports.calls).toEqual(["loadManifest"]);
  });

  it("aborts before the reset when the backup cannot be verified", async () => {
    const ports = makePorts({ fail: ["verifyBackup"] });
    await expect(runLahoreRefresh({ options: executeOptions, capabilities: SQLITE_CAPABILITIES }, ports)).rejects.toThrow(/verifyBackup failed/);
    expect(ports.calls).toContain("createBackup");
    expect(ports.calls).not.toContain("resetData");
  });

  it("restores the verified backup when the import fails", async () => {
    const ports = makePorts({ fail: ["importManifest"] });
    await expect(runLahoreRefresh({ options: executeOptions, capabilities: SQLITE_CAPABILITIES }, ports)).rejects.toThrow(/importManifest failed/);
    expect(ports.calls).toContain("restoreBackup");
  });

  it("restores the verified backup when post-import verification fails", async () => {
    const ports = makePorts({ verification: BAD_VERIFICATION });
    await expect(runLahoreRefresh({ options: executeOptions, capabilities: SQLITE_CAPABILITIES }, ports)).rejects.toThrow(/verification failed: noRecordsAfterCutoff/);
    expect(ports.calls).toContain("restoreBackup");
  });

  it("reports a rollback failure instead of claiming success", async () => {
    const ports = makePorts({ fail: ["importManifest", "restoreBackup"] });
    await expect(runLahoreRefresh({ options: executeOptions, capabilities: SQLITE_CAPABILITIES }, ports)).rejects.toBeInstanceOf(RollbackFailedError);
    expect(ports.calls).toContain("restoreBackup");
  });

  it("returns the imported counts and verification on success", async () => {
    const ports = makePorts();
    const summary = await runLahoreRefresh({ options: executeOptions, capabilities: SQLITE_CAPABILITIES }, ports);

    expect(summary.mode).toBe("execute");
    expect(summary.writesPerformed).toBe(true);
    expect(summary.counts).toEqual(IMPORT_COUNTS);
    expect(summary.verification?.ok).toBe(true);
    expect(ports.calls).toEqual(["loadManifest", "createBackup", "verifyBackup", "resetData", "importManifest", "verifyRefresh"]);
  });
});
