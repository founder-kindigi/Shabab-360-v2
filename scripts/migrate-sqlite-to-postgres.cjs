/* eslint-disable @typescript-eslint/no-require-imports -- This CJS runner loads the SQLite and isolated Postgres clients. */
/*
 * This script only moves a SQLite snapshot into an empty Postgres database.
 * It never truncates a database and requires --execute before writing anything.
 */
const { PrismaClient: SourcePrismaClient } = require("@prisma/client");
const {
  ALL_MODELS,
  EXCLUDED_MODELS,
  IMPORT_MODELS,
  MONEY_FIELDS,
  chunk,
  moneyToCents,
  nonEmptyModels,
} = require("./lib/migration-manifest.cjs");

function loadTargetPrismaClient() {
  try {
    return require("../prisma/generated/postgres-client").PrismaClient;
  } catch {
    throw new Error("Generate the staged Postgres client first with npm run db:postgres:generate");
  }
}

function requireSqliteUrl() {
  const url = process.env.SQLITE_DATABASE_URL;
  if (!url?.startsWith("file:")) {
    throw new Error("SQLITE_DATABASE_URL must be a file: URL for the frozen SQLite snapshot");
  }
  return url;
}

function requireDirectUrl() {
  const url = process.env.DIRECT_URL;
  if (!url?.startsWith("postgres")) {
    throw new Error("DIRECT_URL must be the direct PostgreSQL URL; never use a pooled runtime URL for migration");
  }
  return url;
}

async function getCounts(client, models) {
  const pairs = await Promise.all(models.map(async (model) => [model, await client[model].count()]));
  return Object.fromEntries(pairs);
}

async function assertMoneyPrecision(source) {
  for (const [model, field] of MONEY_FIELDS) {
    const rows = await source[model].findMany({ select: { [field]: true } });
    for (const row of rows) {
      try {
        moneyToCents(row[field]);
      } catch {
        throw new Error(`${model}.${field} contains a value that cannot be represented as two-decimal PKR`);
      }
    }
  }
}

async function readSourceRows(source) {
  const entries = await Promise.all(
    IMPORT_MODELS.map(async (model) => [model, await source[model].findMany()]),
  );
  return Object.fromEntries(entries);
}

async function writeRows(target, rowsByModel) {
  await target.$transaction(
    async (tx) => {
      for (const model of IMPORT_MODELS) {
        for (const batch of chunk(rowsByModel[model])) {
          if (batch.length > 0) {
            await tx[model].createMany({ data: batch });
          }
        }
      }
    },
    { timeout: 60000 },
  );
}

async function main() {
  const execute = process.argv.slice(2).includes("--execute");
  if (process.argv.slice(2).some((argument) => argument !== "--execute" && argument !== "--dry-run")) {
    throw new Error("Only --dry-run (default) and --execute are supported");
  }

  const source = new SourcePrismaClient({ datasources: { db: { url: requireSqliteUrl() } } });
  let target;

  try {
    const sourceCounts = await getCounts(source, ALL_MODELS);
    await assertMoneyPrecision(source);
    const rowsByModel = await readSourceRows(source);

    console.log(JSON.stringify({
      mode: execute ? "execute" : "dry-run",
      importCounts: Object.fromEntries(IMPORT_MODELS.map((model) => [model, sourceCounts[model]])),
      excluded: Object.fromEntries(EXCLUDED_MODELS.map((model) => [model, sourceCounts[model]])),
    }, null, 2));

    if (!execute) return;

    const TargetPrismaClient = loadTargetPrismaClient();
    target = new TargetPrismaClient({ datasources: { db: { url: requireDirectUrl() } } });
    const targetCounts = await getCounts(target, ALL_MODELS);
    const occupiedModels = nonEmptyModels(targetCounts);
    if (occupiedModels.length > 0) {
      throw new Error(`Target database is not empty (${occupiedModels.join(", ")}); refusing to write`);
    }

    await writeRows(target, rowsByModel);
    console.log("SQLite snapshot import completed. Run npm run db:reconcile:sqlite-to-postgres before approving cutover.");
  } finally {
    await Promise.all([source.$disconnect(), target?.$disconnect()]);
  }
}

main().catch((error) => {
  console.error(`Migration aborted: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
});
