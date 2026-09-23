/**
 * Guarded Lahore Batch 4 refresh implementation.
 *
 * Loaded by `scripts/lahore-batch-4-refresh.ts`, which registers the Node
 * resolver that lets these extensionless relative imports load under Node 24.
 *
 * Dry run is the default and prints aggregate counts only. A write run requires
 * `--execute --confirm-lahore-refresh`, an explicit `--target`, and a
 * `--backup-dir`; the verified pre-reset backup is created before any delete and
 * a failed import restores it. PostgreSQL writes fail closed because no verified
 * full-dump mechanism is wired here. This file has never run against a database.
 */
import fs from "node:fs";
import path from "node:path";
import { LAHORE_REFRESH } from "../src/lib/attendance/lahore-refresh/constants";
import { RefreshRefusedError, parseRefreshArgs, planBackup, resolveExecutableTarget } from "../src/lib/attendance/lahore-refresh/guards";
import { loadRefreshManifest } from "../src/lib/attendance/lahore-refresh/load";
import { buildDryRunSummary } from "../src/lib/attendance/lahore-refresh/manifest";
import { runLahoreRefresh } from "../src/lib/attendance/lahore-refresh/run";
import { buildSqliteRefreshPorts } from "../src/lib/attendance/lahore-refresh/sqlite-driver";

const WRITE_CAPABILITIES = { sqliteBackup: true, postgresFullDump: false } as const;

const HELP = `Lahore Batch 4 refresh (dry run by default)

  --input <workbook.xlsx>          required source workbook
  --output <dir>                   optional dry-run report directory (aggregates only)
  --completed-through <date>       default ${LAHORE_REFRESH.attendanceThrough}
  --execute                        enable writes (default: dry run)
  --confirm-lahore-refresh         required acknowledgement for writes
  --target <sqlite|postgres>       required explicit write target
  --sqlite-path <file>             required for --target sqlite
  --postgres-url <url>             required for --target postgres
  --backup-dir <dir>               required for writes; verified pre-reset backup`;

export async function runLahoreRefreshCli(argv: readonly string[]): Promise<void> {
  if (argv.includes("--help")) {
    console.log(HELP);
    return;
  }
  const options = parseRefreshArgs(argv);
  const loadManifest = () => loadRefreshManifest(options.input, options.attendanceThrough);

  if (!options.execute) {
    const manifest = await loadManifest();
    const summary = buildDryRunSummary(manifest);
    if (options.outputDir) {
      fs.mkdirSync(path.resolve(options.outputDir), { recursive: true });
      fs.writeFileSync(path.join(path.resolve(options.outputDir), "lahore-refresh-dry-run.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    }
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const target = resolveExecutableTarget(options);
  if (!target) throw new RefreshRefusedError("Refusing to write without an explicit target");
  const backup = planBackup(target, WRITE_CAPABILITIES);
  if (backup.kind === "refused") throw new RefreshRefusedError(backup.reason);
  if (target.kind !== "sqlite") {
    throw new RefreshRefusedError("PostgreSQL execution requires an approved verified full-dump mechanism and is not wired in this pass");
  }

  const ports = buildSqliteRefreshPorts({ path: target.path, backupDir: target.backupDir }, loadManifest);
  const summary = await runLahoreRefresh({ options, capabilities: WRITE_CAPABILITIES }, ports);
  console.log(JSON.stringify(summary, null, 2));
}
