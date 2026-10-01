/**
 * Runnable entry point for the read-only ATT01 workbook-to-SQLite reconciliation.
 *
 * Node 24 requires explicit extensions for relative TypeScript imports while this
 * project imports extensionless, so the resolver hook mirrors
 * `scripts/lahore-batch-4-refresh.ts`.
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

const { runWorkbookReconciliationCli } = await import("./att01-workbook-reconciliation-impl");

runWorkbookReconciliationCli(process.argv.slice(2)).catch((error: unknown) => {
  console.error(`ATT01 workbook reconciliation aborted: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
});
