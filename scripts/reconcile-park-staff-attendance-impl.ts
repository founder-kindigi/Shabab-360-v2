/**
 * Implementation of the guarded staff-attendance schema reconciliation CLI.
 *
 * Loaded by scripts/reconcile-park-staff-attendance.ts. Prints schema object
 * names and counts only; no row values, personal names, emails or passwords.
 */
import fs from "node:fs";
import path from "node:path";
import { reconcileStaffAttendanceSchema } from "../src/lib/attendance/park-staff-attendance-reconcile";

const DEFAULT_DATABASE = path.join("prisma", "dev.db");
const REMOTE_URL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;

interface CliOptions {
  readonly database: string;
  readonly backupDir: string | null;
  readonly execute: boolean;
}

function parseArgs(argv: readonly string[]): CliOptions {
  let database = DEFAULT_DATABASE;
  let backupDir: string | null = null;
  let execute = false;

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--execute") {
      execute = true;
      continue;
    }
    if (flag === "--database" || flag === "--backup-dir") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
      if (flag === "--database") database = value;
      else backupDir = value;
      index += 1;
      continue;
    }
    if (flag === "--help") {
      console.log(
        "Usage: node scripts/reconcile-park-staff-attendance.ts [--database prisma/dev.db] [--execute --backup-dir <dir>]"
      );
      process.exit(0);
    }
    throw new Error(`Unsupported argument: ${flag}`);
  }

  if (execute && !backupDir) throw new Error("--execute requires --backup-dir for the pre-apply backup");
  if (REMOTE_URL_PATTERN.test(database)) throw new Error("--database must be a local file path, not a connection URL");
  return { database: path.resolve(database), backupDir: backupDir ? path.resolve(backupDir) : null, execute };
}

export async function runStaffAttendanceReconcileCli(argv: readonly string[]): Promise<void> {
  const options = parseArgs(argv);
  if (!fs.existsSync(options.database)) throw new Error(`Database not found: ${options.database}`);

  const result = await reconcileStaffAttendanceSchema({
    database: options.database,
    backupDir: options.backupDir ?? path.join(path.dirname(options.database), "backups"),
    execute: options.execute,
  });

  console.log(
    JSON.stringify(
      {
        mode: result.mode,
        database: path.relative(process.cwd(), result.database),
        before: result.before,
        after: result.after,
        backup: result.backup ? { file: path.basename(result.backup.path), bytes: result.backup.bytes } : null,
        appliedStatements: result.appliedStatements,
        foreignKeyViolations: result.foreignKeyViolations,
      },
      null,
      2
    )
  );
}
