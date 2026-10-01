import { planBackup, RefreshRefusedError, resolveExecutableTarget, type BackupCapabilities, type RefreshOptions } from "./guards";
import type { RunSummary, RefreshPorts } from "./types";

/** Restore failed after a partial write. The database must be treated as suspect. */
export class RollbackFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RollbackFailedError";
  }
}

export interface RunInput {
  readonly options: RefreshOptions;
  readonly capabilities: BackupCapabilities;
}

/**
 * Guarded orchestration.
 *
 * Without `--execute` this is a read-only dry run: it loads the workbook, builds
 * the manifest and returns aggregate counts only. A write run must pass the
 * explicit target/acknowledgement gate, take and verify a restorable backup, and
 * then reset, import and verify. Any failure after the reset triggers a restore;
 * if the restore also fails the run reports RollbackFailedError instead of
 * claiming success.
 */
export async function runLahoreRefresh(input: RunInput, ports: RefreshPorts): Promise<RunSummary> {
  const manifest = await ports.loadManifest();

  if (!input.options.execute) {
    return { mode: "dry-run", writesPerformed: false, counts: manifest.counts };
  }

  const target = resolveExecutableTarget(input.options);
  if (!target) throw new RefreshRefusedError("Refusing to write without an explicit target");

  // Fail closed before any write when the target does not already satisfy the
  // required attendance schema. This refresh never changes schema itself.
  await ports.verifyTargetSchema?.(target);

  const backup = planBackup(target, input.capabilities);
  if (backup.kind === "refused") throw new RefreshRefusedError(backup.reason);

  const artifact = await ports.createBackup(target);
  // Verification runs before any delete, so an unverifiable backup aborts cleanly.
  await ports.verifyBackup(artifact);

  try {
    await ports.resetData(target, manifest);
    const counts = await ports.importManifest(target, manifest);
    const verification = await ports.verifyRefresh(manifest);
    if (!verification.ok) {
      throw new Error(`Post-import verification failed: ${verification.failures.join(", ")}`);
    }
    return { mode: "execute", writesPerformed: true, counts, verification };
  } catch (error) {
    try {
      await ports.restoreBackup(artifact);
    } catch {
      throw new RollbackFailedError("Import failed and the verified backup could not be restored; treat the target database as partially modified");
    }
    throw error;
  }
}
