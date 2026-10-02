/**
 * Read-only SQLite migration-history catalog audit CLI.
 *
 *   node scripts/sqlite-migration-catalog-audit.ts [--database prisma/dev.db] [--migrations prisma/migrations]
 *
 * Opens the database in read-only mode, snapshots its schema catalog and
 * compares every migration's declared structure against it. It issues only
 * catalog reads, writes nothing, prints only schema object names and counts, and
 * never reads `.env`, credentials or row values.
 *
 * Node 24 requires explicit extensions for relative TypeScript imports while
 * this project imports extensionless, so the resolver hook below mirrors
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

const { runCatalogAuditCli } = await import("./sqlite-migration-catalog-audit-impl");

runCatalogAuditCli(process.argv.slice(2)).catch((error: unknown) => {
  console.error(`Catalog audit aborted: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
});
