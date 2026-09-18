/**
 * Guarded local ATT01 attendance-database compatibility preflight and reconciliation.
 *
 *   node scripts/att01-database-compatibility.ts [--database prisma/dev.db]
 *   node scripts/att01-database-compatibility.ts --execute --backup-dir <dir>
 *
 * Read-only by default: it prints an aggregate, schema-only preflight and opens no
 * write handle. `--execute` requires `--backup-dir`, takes a verified backup,
 * applies only additive statements in one transaction, and restores that backup
 * if the post-apply checks fail.
 *
 * Node 24 requires explicit extensions for relative TypeScript imports while this
 * project imports extensionless, so the resolver hook mirrors
 * scripts/lahore-batch-4-refresh.ts.
 */
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        // Fall through and let Node report the original specifier.
      }
    }
    return nextResolve(specifier, context);
  },
});

const { runAttendanceCompatibilityCli } = await import("./att01-database-compatibility-impl");

runAttendanceCompatibilityCli(process.argv.slice(2)).catch((error: unknown) => {
  console.error(`ATT01 database compatibility aborted: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
});
