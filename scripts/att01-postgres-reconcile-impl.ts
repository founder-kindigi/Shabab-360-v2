/**
 * Read-only ATT01 PostgreSQL reconciliation implementation.
 *
 * Compares the approved workbook against a PostgreSQL target by reviewed business
 * keys: aggregate totals, status totals, lifecycle counts, park/group/participant
 * placement, event/calendar keys and deterministic digests. It performs no writes
 * and prints no name, phone, email, password, workbook row or connection detail.
 */
import { loadRefreshManifest } from "../src/lib/attendance/lahore-refresh/load";
import { parsePostgresReconcileArgs, resolveOptionalPostgresUrl } from "../src/lib/attendance/lahore-refresh/postgres-cli";
import { POSTGRES_URL_ENV, PostgresRefusedError, createPgQueryPort } from "../src/lib/attendance/lahore-refresh/postgres-port";
import {
  buildPostgresReconciliationReport,
  formatReconciliationSummary,
  readPostgresPostImportEvidence,
  readPostgresReconciliationSnapshot,
} from "../src/lib/attendance/lahore-refresh/postgres-reconcile";

const HELP = `ATT01 PostgreSQL reconciliation (read-only)

  --input <workbook.xlsx>      required approved source workbook
  --completed-through <date>   optional override; default 2026-09-13
  --json                       machine-readable JSON instead of the human summary

Connection: set ${POSTGRES_URL_ENV} in the environment at run time. It is never read
from .env, never printed and never written to a file.`;

export async function runAtt01PostgresReconcileCli(argv: readonly string[]): Promise<void> {
  if (argv.includes("--help")) {
    console.log(HELP);
    return;
  }
  const args = parsePostgresReconcileArgs(argv);
  const manifest = await loadRefreshManifest(args.input, args.attendanceThrough ?? undefined);

  const url = resolveOptionalPostgresUrl();
  if (!url) throw new PostgresRefusedError(`Provide the target connection through ${POSTGRES_URL_ENV}`);

  const port = createPgQueryPort(url);
  try {
    const snapshot = await readPostgresReconciliationSnapshot(port);
    const evidence = await readPostgresPostImportEvidence(port);
    const report = buildPostgresReconciliationReport(manifest, snapshot, evidence);
    console.log(args.json ? JSON.stringify(report, null, 2) : formatReconciliationSummary(report));
    if (!report.ok) process.exitCode = 1;
  } finally {
    await port.close();
  }
}
