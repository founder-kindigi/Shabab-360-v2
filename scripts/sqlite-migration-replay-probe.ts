/**
 * Disposable SQLite migration replay probe (read-only with respect to the repo).
 *
 *   node scripts/sqlite-migration-replay-probe.ts --mode empty
 *   node scripts/sqlite-migration-replay-probe.ts --mode existing
 *
 * `empty` replays every migration into an in-memory database. `existing` copies
 * prisma/dev.db into an OS temp file and replays only the migrations the history
 * table does not record, which is what an ordered apply would attempt.
 *
 * The probe never opens prisma/dev.db for writing, never runs Prisma, never
 * records migration history, and deletes its temp copy. It prints migration
 * names and error text only.
 *
 * Node 24 requires explicit extensions for relative TypeScript imports while
 * this project imports extensionless, so the resolver hook mirrors
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

const { runReplayProbeCli } = await import("./sqlite-migration-replay-probe-impl");

runReplayProbeCli(process.argv.slice(2)).catch((error: unknown) => {
  console.error(`Replay probe aborted: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
});
