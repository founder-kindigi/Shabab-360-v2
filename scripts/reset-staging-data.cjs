/* eslint-disable @typescript-eslint/no-require-imports -- This CJS runner loads the isolated Postgres client. */
const STAGING_POOLER_USERNAME = "postgres.qbyvrqigbojkrjowfsru";

const RESET_TABLES = Object.freeze([
  "user_capability_overrides",
  "role_capability_overrides",
  "notifications",
  "audit_log",
  "report_presets",
  "announcements",
  "admission_interviews",
  "admission_applications",
  "payments",
  "fee_events",
  "receipt_sequences",
  "attendance_records",
  "attendance_events",
  "guardian_children",
  "guardians",
  "participants",
  "batch_settings",
  "staff_meta",
  "groups",
  "batches",
  "parks",
  "cities",
  "users",
]);

class ResetError extends Error {}

function loadTargetPrismaClient() {
  try {
    return require("../prisma/generated/postgres-client").PrismaClient;
  } catch {
    throw new ResetError("Generate the staged Postgres client first with npm run db:postgres:generate");
  }
}

function requireStagingUrl() {
  const value = process.env.DIRECT_URL;
  if (!value?.startsWith("postgres")) throw new ResetError("DIRECT_URL must be a PostgreSQL connection URL");

  const url = new URL(value);
  if (url.username !== STAGING_POOLER_USERNAME || !url.hostname.endsWith("pooler.supabase.com")) {
    throw new ResetError("Refusing to reset: DIRECT_URL is not the approved shabab360-staging Session Pooler target");
  }
  return value;
}

function parseArgs(args) {
  const options = { execute: false, confirmStagingDataReset: false };
  for (const argument of args) {
    if (argument === "--execute") options.execute = true;
    else if (argument === "--confirm-staging-data-reset") options.confirmStagingDataReset = true;
    else throw new ResetError(`Unexpected argument: ${argument}`);
  }
  if (options.confirmStagingDataReset && !options.execute) {
    throw new ResetError("--confirm-staging-data-reset can only be used with --execute");
  }
  return options;
}

async function getExistingTables(client) {
  const rows = await client.$queryRawUnsafe(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (${RESET_TABLES.map((table) => `'${table}'`).join(", ")})`,
  );
  return rows.map((row) => row.tablename).filter((table) => RESET_TABLES.includes(table));
}

function quoteTable(table) {
  return `"public"."${table}"`;
}

async function getCounts(client, tables) {
  const counts = Object.fromEntries(RESET_TABLES.map((table) => [table, 0]));
  for (const table of tables) {
    const [row] = await client.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM ${quoteTable(table)}`);
    counts[table] = Number(row.count);
  }
  return counts;
}

async function resetData(client) {
  const tables = await getExistingTables(client);
  if (tables.length === 0) throw new ResetError("No allow-listed application tables exist in the staging schema");
  await client.$transaction(async (tx) => {
    // Table names come only from the fixed allow-list above, never user input.
    await tx.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map(quoteTable).join(", ")} RESTART IDENTITY CASCADE`);
  }, { isolationLevel: "Serializable", timeout: 60000 });

  const remaining = await getCounts(client, tables);
  const nonEmpty = Object.entries(remaining).filter(([, count]) => count > 0).map(([model]) => model);
  if (nonEmpty.length > 0) throw new ResetError(`Reset verification failed; remaining data in ${nonEmpty.join(", ")}`);
  return remaining;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.execute) {
    console.log(JSON.stringify({ mode: "dry-run", writesPerformed: false, target: "shabab360-staging", deletedTables: RESET_TABLES, preserved: ["schema", "_prisma_migrations"] }, null, 2));
    return;
  }
  if (!options.confirmStagingDataReset) {
    throw new ResetError("Refusing to erase staging data without --confirm-staging-data-reset");
  }

  const TargetPrismaClient = loadTargetPrismaClient();
  const client = new TargetPrismaClient({ datasources: { db: { url: requireStagingUrl() } } });
  try {
    const tables = await getExistingTables(client);
    const before = await getCounts(client, tables);
    const after = await resetData(client);
    console.log(JSON.stringify({ mode: "execute", target: "shabab360-staging", deletedCounts: before, remainingCounts: after, writesPerformed: true }, null, 2));
  } finally {
    await client.$disconnect();
  }
}

module.exports = { RESET_TABLES, ResetError, parseArgs };

if (require.main === module) {
  main().catch((error) => {
    const message = error instanceof ResetError ? error.message : "database reset failed without a verified completion";
    console.error(`Staging reset aborted: ${message}`);
    process.exitCode = 1;
  });
}
