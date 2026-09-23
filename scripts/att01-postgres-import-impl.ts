/**
 * Guarded ATT01 PostgreSQL import implementation.
 *
 * Dry run is the default and performs no writes. A write run requires
 * `--execute`, both acknowledgements, an explicit `--target postgres` and a
 * runtime connection. Before writing, the target is verified to be a fresh,
 * compatible PostgreSQL database carrying the committed migration ledger; a
 * target that is not fresh is refused, never reset. Only the approved parks,
 * groups, participants, attendance events and attendance records are created —
 * no user, staff or credential row is written.
 */
import { loadRefreshManifest } from "../src/lib/attendance/lahore-refresh/load";
import { buildDryRunSummary } from "../src/lib/attendance/lahore-refresh/manifest";
import {
  assertPostgresImportAuthorized,
  parsePostgresImportArgs,
  readExpectedPostgresMigrations,
  resolveOptionalPostgresUrl,
  summarizeTargetDiagnostics,
} from "../src/lib/attendance/lahore-refresh/postgres-cli";
import { runPostgresImport } from "../src/lib/attendance/lahore-refresh/postgres-import";
import { POSTGRES_URL_ENV, PostgresRefusedError, createPgQueryPort } from "../src/lib/attendance/lahore-refresh/postgres-port";
import { inspectPostgresTarget } from "../src/lib/attendance/lahore-refresh/postgres-target";

const HELP = `ATT01 PostgreSQL import (dry run by default)

  --input <workbook.xlsx>              required approved source workbook
  --completed-through <date>          optional override; default 2026-09-13
  --json                              machine-readable output (always JSON today)
  (dry run)                           loads the workbook and, when a connection is
                                      configured, runs a read-only target preflight

  --execute                           enable writes (default: dry run)
  --target postgres                   required explicit target for writes
  --confirm-att01-postgres-import     required acknowledgement for writes
  --confirm-fresh-empty-database      required proof that the target was verified fresh

Connection: set ${POSTGRES_URL_ENV} in the environment at run time. It is never read
from .env, never printed and never written to a file.`;

export async function runAtt01PostgresImportCli(argv: readonly string[]): Promise<void> {
  if (argv.includes("--help")) {
    console.log(HELP);
    return;
  }
  const args = parsePostgresImportArgs(argv);
  assertPostgresImportAuthorized(args);

  const manifest = await loadRefreshManifest(args.input, args.attendanceThrough ?? undefined);
  const workbookCounts = buildDryRunSummary(manifest).counts;

  if (!args.execute) {
    const url = resolveOptionalPostgresUrl();
    if (!url) {
      console.log(
        JSON.stringify(
          {
            mode: "dry-run",
            writesPerformed: false,
            workbook: workbookCounts,
            target: { checked: false, reason: `set ${POSTGRES_URL_ENV} to run the read-only target preflight` },
          },
          null,
          2
        )
      );
      return;
    }
    const port = createPgQueryPort(url);
    try {
      const target = summarizeTargetDiagnostics(await inspectPostgresTarget(port, readExpectedPostgresMigrations()));
      console.log(JSON.stringify({ mode: "dry-run", writesPerformed: false, workbook: workbookCounts, target }, null, 2));
    } finally {
      await port.close();
    }
    return;
  }

  const url = resolveOptionalPostgresUrl();
  if (!url) throw new PostgresRefusedError(`Provide the target connection through ${POSTGRES_URL_ENV}`);

  const port = createPgQueryPort(url);
  try {
    const diagnostics = await inspectPostgresTarget(port, readExpectedPostgresMigrations());
    const target = summarizeTargetDiagnostics(diagnostics);
    if (diagnostics.blockers.length > 0) {
      console.log(JSON.stringify({ mode: "refused", writesPerformed: false, target }, null, 2));
      throw new PostgresRefusedError(`Refusing the ATT01 PostgreSQL import: ${diagnostics.blockers.join(", ")}`);
    }
    const result = await runPostgresImport(port, manifest);
    console.log(JSON.stringify({ ...result, target }, null, 2));
  } finally {
    await port.close();
  }
}
