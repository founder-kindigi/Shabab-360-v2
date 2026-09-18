/**
 * Local-only CLI for creating one City Head test account in `prisma/dev.db`.
 *
 * Default is a read-only preflight, and `--dry-run` requests that same preflight
 * explicitly. A write requires the full explicit gate:
 *   node scripts/provision-local-city-head.ts --email <email> [--name <name>] \
 *     --execute --confirm-local-city-head --target sqlite \
 *     --sqlite-path prisma/dev.db --backup-dir <dir> --handoff <file>
 *
 * PostgreSQL, URLs and any remote/UNC path are refused. The temporary password is
 * only written through the existing DPAPI protected handoff and is never printed.
 */
import { registerHooks } from "node:module";
import fs from "node:fs";
import path from "node:path";

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

const tool = await import("../src/lib/auth/city-head-provision");

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

const email = option("--email");
const execute = process.argv.includes("--execute");
const dryRun = process.argv.includes("--dry-run");
const acknowledged = process.argv.includes("--confirm-local-city-head");
const target = option("--target");
const sqlitePath = option("--sqlite-path");
const backupDir = option("--backup-dir");
const handoff = option("--handoff");
const name = option("--name");

if (!email) {
  throw new Error(`Usage: node scripts/provision-local-city-head.ts --email <email> [--name <name>] --sqlite-path <file> [--dry-run] [--execute --confirm-local-city-head --target sqlite --backup-dir <dir> --handoff <file>]`);
}
if (!sqlitePath) throw new Error("Refusing to run without an explicit --sqlite-path");
if (dryRun && execute) throw new Error("--dry-run and --execute are mutually exclusive");
if (execute && target !== "sqlite") throw new Error("Refusing execution without --target sqlite");
if (!execute && (target || backupDir || handoff || acknowledged)) throw new Error("Dry run accepts no target, backup directory, handoff path or confirmation flag");

tool.assertLocalCityHeadTarget(path.resolve(sqlitePath));

const displayName = (name ?? email.split("@")[0]).trim();
if (!displayName) throw new Error("A display name is required");

const result = await tool.provisionLocalCityHead({
  dbPath: path.resolve(sqlitePath),
  email,
  name: displayName,
  backupDir: backupDir ? path.resolve(backupDir) : "",
  handoffPath: handoff ? path.resolve(handoff) : "",
  execute,
  acknowledged,
});

// Aggregate-only output: never a password, hash or credential.
const { preflight, ...summary } = result;
console.log(JSON.stringify({
  ...summary,
  preflight: {
    status: preflight.status,
    conflict: preflight.conflict,
    cityId: preflight.cityId,
    cityName: preflight.cityName,
    userCount: preflight.userCount,
    staffCount: preflight.staffCount,
    cityHeadCount: preflight.cityHeadCount,
  },
  backupExists: result.backupPath ? fs.existsSync(result.backupPath) : false,
  handoffExists: result.handoffPath ? fs.existsSync(result.handoffPath) : false,
}, null, 2));
