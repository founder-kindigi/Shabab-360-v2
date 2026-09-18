/**
 * Guarded local SQLite reconciliation for the canonical staff-attendance tables.
 *
 *   node scripts/reconcile-park-staff-attendance.ts [--database prisma/dev.db]
 *   node scripts/reconcile-park-staff-attendance.ts --execute --backup-dir <dir>
 *
 * Read-only by default: it prints an aggregate, schema-only preflight and never
 * opens a write handle. `--execute` additionally requires `--backup-dir`, takes a
 * verified file-level backup, applies the missing objects in one transaction and
 * restores that backup if the post-apply checks fail.
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

const { runStaffAttendanceReconcileCli } = await import("./reconcile-park-staff-attendance-impl");

runStaffAttendanceReconcileCli(process.argv.slice(2)).catch((error: unknown) => {
  console.error(`Staff-attendance reconciliation aborted: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
});
