/**
 * Runnable entry point for the guarded Lahore Batch 4 refresh.
 *
 * Node 24 requires explicit file extensions for relative TypeScript imports, and
 * this project uses extensionless imports. Rather than change build config, this
 * bootstrap registers a resolver that appends `.ts` before loading the tool
 * implementation, so the documented command stays dependency-free:
 *
 *   node scripts/lahore-batch-4-refresh.ts --input <workbook.xlsx> --output <dir>
 *
 * It is a read-only dry run unless `--execute --confirm-lahore-refresh` and an
 * explicit `--target` plus `--backup-dir` are supplied. This file has never run
 * against a database.
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

const { runLahoreRefreshCli } = await import("./lahore-batch-4-refresh-impl");

runLahoreRefreshCli(process.argv.slice(2)).catch((error: unknown) => {
  console.error(`Lahore refresh aborted: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
});
