/**
 * Runnable entry point for the guarded ATT01 PostgreSQL Team Access provisioning.
 *
 * Node 24 requires explicit extensions for relative TypeScript imports while this
 * project imports extensionless, so the resolver hook mirrors the sibling tools.
 * The connection is supplied at run time through `ATT01_POSTGRES_URL`; nothing
 * here reads `.env`.
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

const { runAtt01PostgresAccessCli } = await import("./att01-postgres-access-impl");
const { sanitizeDiagnostic } = await import("../src/lib/attendance/lahore-refresh/postgres-port");

runAtt01PostgresAccessCli(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown error";
  console.error(`ATT01 PostgreSQL access provisioning aborted: ${sanitizeDiagnostic(message)}`);
  process.exitCode = 1;
});
