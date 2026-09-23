/**
 * Runnable entry point for the read-only ATT01 PostgreSQL reconciliation.
 *
 * The connection is supplied at run time through `ATT01_POSTGRES_URL`; nothing
 * here reads `.env`. This tool performs no writes.
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

const { runAtt01PostgresReconcileCli } = await import("./att01-postgres-reconcile-impl");
const { sanitizeDiagnostic } = await import("../src/lib/attendance/lahore-refresh/postgres-port");

runAtt01PostgresReconcileCli(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown error";
  console.error(`ATT01 PostgreSQL reconciliation aborted: ${sanitizeDiagnostic(message)}`);
  process.exitCode = 1;
});
