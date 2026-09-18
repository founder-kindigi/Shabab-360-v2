/**
 * Implementation of the Team Access schema compatibility CLI.
 *
 * Loaded by scripts/team-access-schema-compatibility.ts. It prints schema object
 * names and counts only: never staff names, emails, passwords or workbook rows.
 */
import fs from "node:fs";
import path from "node:path";
import { assertLocalSqliteTarget, reconcileTeamAccessSchema } from "../src/lib/attendance/team-access/schema-reconcile";

const DEFAULT_DATABASE = path.join("prisma", "dev.db");

interface CliOptions {
  readonly database: string;
  readonly backupDir: string | null;
  readonly execute: boolean;
  readonly target: "sqlite";
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
    if (flag === "--database" || flag === "--backup-dir" || flag === "--target") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
      if (flag === "--target") {
        if (value !== "sqlite") throw new Error("Refusing a non-SQLite target: only --target sqlite is supported");
      } else if (flag === "--database") {
        database = value;
      } else {
        backupDir = value;
      }
      index += 1;
      continue;
    }
    if (flag === "--help") {
      console.log(
        "Usage: node scripts/team-access-schema-compatibility.ts [--database prisma/dev.db] [--target sqlite] [--execute --backup-dir <dir>]"
      );
      process.exit(0);
    }
    throw new Error(`Unsupported argument: ${flag}`);
  }

  if (execute && !backupDir) throw new Error("--execute requires --backup-dir for the pre-apply backup");
  const localPath = assertLocalSqliteTarget(database);
  return { database: path.resolve(localPath), backupDir: backupDir ? path.resolve(backupDir) : null, execute, target: "sqlite" };
}

export async function runTeamAccessSchemaCompatibilityCli(argv: readonly string[]): Promise<void> {
  const options = parseArgs(argv);
  if (!fs.existsSync(options.database)) throw new Error(`Database not found: ${options.database}`);

  const result = await reconcileTeamAccessSchema({
    database: options.database,
    backupDir: options.backupDir ?? path.join(path.dirname(options.database), "backups"),
    execute: options.execute,
  });

  console.log(
    JSON.stringify(
      {
        mode: result.mode,
        target: options.target,
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
