/**
 * Guarded local SQLite compatibility gate for ATT01 Muawin assistance links.
 *
 *   node scripts/team-access-schema-compatibility.ts [--database prisma/dev.db]
 *   node scripts/team-access-schema-compatibility.ts --execute --backup-dir <dir>
 *
 * Read-only by default: it prints a schema-only status and opens no write handle.
 * `--execute` requires a local SQLite path and a backup directory, takes a
 * verified backup, applies only the approved additive statements in one
 * transaction, and restores that backup if the write or the post-check fails.
 *
 * Node 24 requires explicit extensions for relative TypeScript imports while this
 * project imports extensionless, so the resolver hook mirrors
 * scripts/att01-database-compatibility.ts.
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

const { runTeamAccessSchemaCompatibilityCli } = await import("./team-access-schema-compatibility-impl");

runTeamAccessSchemaCompatibilityCli(process.argv.slice(2)).catch((error: unknown) => {
  console.error(`Team Access schema compatibility aborted: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
});
