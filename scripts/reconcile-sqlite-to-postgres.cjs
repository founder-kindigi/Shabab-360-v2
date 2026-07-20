/* eslint-disable @typescript-eslint/no-require-imports -- This CJS runner loads the SQLite and isolated Postgres clients. */
const crypto = require("node:crypto");
const { PrismaClient: SourcePrismaClient } = require("@prisma/client");
const {
  ALL_MODELS,
  EXCLUDED_MODELS,
  FINGERPRINT_CHECKS,
  IMPORT_MODELS,
  MONEY_FIELDS,
  RELATION_CHECKS,
  compareCounts,
  formatCents,
  moneyToCents,
} = require("./lib/migration-manifest.cjs");

function requireUrls() {
  const sourceUrl = process.env.SQLITE_DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;
  if (!sourceUrl?.startsWith("file:")) throw new Error("SQLITE_DATABASE_URL must be a file: URL");
  if (!directUrl?.startsWith("postgres")) throw new Error("DIRECT_URL must be a direct PostgreSQL URL");
  return { sourceUrl, directUrl };
}

function loadTargetPrismaClient() {
  try {
    return require("../prisma/generated/postgres-client").PrismaClient;
  } catch {
    throw new Error("Generate the staged Postgres client first with npm run db:postgres:generate");
  }
}

async function getCounts(client, models) {
  return Object.fromEntries(await Promise.all(models.map(async (model) => [model, await client[model].count()])));
}

async function getMoneyTotals(client) {
  const totals = {};
  for (const [model, field] of MONEY_FIELDS) {
    const rows = await client[model].findMany({ select: { [field]: true } });
    totals[`${model}.${field}`] = rows.reduce((sum, row) => sum + moneyToCents(row[field]), 0n);
  }
  return totals;
}

function stableValue(value) {
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object" && "toString" in value) return value.toString();
  return value;
}

async function fingerprints(client, model, fields) {
  const select = Object.fromEntries(fields.map((field) => [field, true]));
  const rows = await client[model].findMany({ select });
  return new Set(rows.map((row) => crypto.createHash("sha256").update(JSON.stringify(fields.map((field) => stableValue(row[field])))).digest("hex")));
}

async function assertFingerprints(source, target) {
  for (const [model, fields] of FINGERPRINT_CHECKS) {
    const [sourceHashes, targetHashes] = await Promise.all([
      fingerprints(source, model, fields),
      fingerprints(target, model, fields),
    ]);
    if (sourceHashes.size !== targetHashes.size || [...sourceHashes].some((hash) => !targetHashes.has(hash))) {
      throw new Error(`Sensitive field parity failed for ${model}`);
    }
  }
}

async function assertForeignKeys(target) {
  const idSets = new Map();
  const idsFor = async (model) => {
    if (!idSets.has(model)) {
      const rows = await target[model].findMany({ select: { id: true } });
      idSets.set(model, new Set(rows.map((row) => row.id)));
    }
    return idSets.get(model);
  };

  for (const [model, field, referenceModel] of RELATION_CHECKS) {
    const [rows, references] = await Promise.all([
      target[model].findMany({ select: { [field]: true } }),
      idsFor(referenceModel),
    ]);
    if (rows.some((row) => row[field] !== null && row[field] !== undefined && !references.has(row[field]))) {
      throw new Error(`Foreign-key parity failed for ${model}.${field}`);
    }
  }
}

async function main() {
  const { sourceUrl, directUrl } = requireUrls();
  const TargetPrismaClient = loadTargetPrismaClient();
  const source = new SourcePrismaClient({ datasources: { db: { url: sourceUrl } } });
  const target = new TargetPrismaClient({ datasources: { db: { url: directUrl } } });

  try {
    const [sourceCounts, targetCounts, sourceTotals, targetTotals] = await Promise.all([
      getCounts(source, IMPORT_MODELS),
      getCounts(target, IMPORT_MODELS),
      getMoneyTotals(source),
      getMoneyTotals(target),
    ]);
    const countMismatches = compareCounts(sourceCounts, targetCounts);
    if (countMismatches.length > 0) {
      throw new Error(`Row-count parity failed for ${countMismatches.join(", ")}`);
    }

    for (const key of Object.keys(sourceTotals)) {
      if (sourceTotals[key] !== targetTotals[key]) {
        throw new Error(`Financial total parity failed for ${key}`);
      }
    }

    const excludedCounts = await getCounts(target, EXCLUDED_MODELS);
    if (Object.values(excludedCounts).some((count) => count !== 0)) {
      throw new Error("Excluded audit or notification records are present in the target database");
    }

    await Promise.all([assertFingerprints(source, target), assertForeignKeys(target)]);
    console.log(JSON.stringify({
      status: "passed",
      rowCounts: sourceCounts,
      financialTotals: Object.fromEntries(Object.entries(sourceTotals).map(([key, cents]) => [key, formatCents(cents)])),
      excludedModels: EXCLUDED_MODELS,
      checks: ["row-counts", "financial-totals", "password-hashes-and-unicode", "foreign-keys", "excluded-records"],
    }, null, 2));
  } finally {
    await Promise.all([source.$disconnect(), target.$disconnect()]);
  }
}

main().catch((error) => {
  console.error(`Reconciliation failed: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
});
