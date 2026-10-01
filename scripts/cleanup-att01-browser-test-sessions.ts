/**
 * Local-only cleanup of the seven verified ATT01 browser-test attendance sessions.
 *
 * Dry run (default):
 *   node scripts/cleanup-att01-browser-test-sessions.ts --sqlite-path prisma/dev.db
 *
 * Execute (creates and verifies a backup first):
 *   node scripts/cleanup-att01-browser-test-sessions.ts --sqlite-path prisma/dev.db \
 *     --execute --confirm-att01-browser-test-cleanup --target sqlite \
 *     --backup-dir tool-results/att01-local-backups
 */
import { registerHooks } from "node:module";
import path from "node:path";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        // Preserve the normal Node resolution error when no TypeScript sibling exists.
      }
    }
    return nextResolve(specifier, context);
  },
});

const tool = await import("../src/lib/attendance/browser-test-cleanup");

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

const sqlitePath = option("--sqlite-path");
const backupDir = option("--backup-dir");
const execute = process.argv.includes("--execute");
const dryRun = process.argv.includes("--dry-run");
const acknowledged = process.argv.includes("--confirm-att01-browser-test-cleanup");
const target = option("--target");

if (!sqlitePath) {
  throw new Error("Usage: node scripts/cleanup-att01-browser-test-sessions.ts --sqlite-path <file> [--dry-run] [--execute --confirm-att01-browser-test-cleanup --target sqlite --backup-dir <dir>]");
}
if (dryRun && execute) throw new Error("--dry-run and --execute are mutually exclusive");
if (execute && target !== "sqlite") throw new Error("Refusing execution without --target sqlite");
if (execute && !acknowledged) throw new Error("Refusing cleanup without --confirm-att01-browser-test-cleanup");
if (execute && !backupDir) throw new Error("Refusing cleanup without --backup-dir");
if (!execute && (target || backupDir || acknowledged)) throw new Error("Dry run accepts no target, backup directory, or confirmation flag");

const result = await tool.cleanupAtt01BrowserTestSessions({
  database: path.resolve(sqlitePath),
  backupDir: backupDir ? path.resolve(backupDir) : "",
  execute,
});

// IDs stay inside the local tool. This output has only the reviewed business keys.
const summarize = (preflight: typeof result.before) => ({
  expectedTargetCount: preflight.expectedTargetCount,
  matchedTargetCount: preflight.matchedTargetCount,
  targets: preflight.targets.map(({ id: _id, ...target }) => target),
  attendanceEvents: preflight.attendanceEvents,
  attendanceRecords: preflight.attendanceRecords,
  excusedRecords: preflight.excusedRecords,
  foreignKeyViolations: preflight.foreignKeyViolations,
});
console.log(JSON.stringify({
  mode: result.mode,
  writesPerformed: result.writesPerformed,
  outcome: result.outcome,
  deletedEvents: result.deletedEvents,
  deletedRecords: result.deletedRecords,
  backupPath: result.backup?.path ?? null,
  before: summarize(result.before),
  after: summarize(result.after),
}, null, 2));
