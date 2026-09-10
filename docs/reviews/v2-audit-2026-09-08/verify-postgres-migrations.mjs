import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
const { PGlite } = await import(pathToFileURL(path.resolve(".next/astra-pg-runtime/node_modules/@electric-sql/pglite/dist/index.js")));
const root = "prisma/postgres/migrations";
const report = { engine: "PostgreSQL WASM / PGlite; not a native multi-connection deployment", migrations: [], checks: [], differences: [], error: null };
const db = new PGlite(); const expected = new PGlite();
const catalog = async database => (await database.query(`SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default, numeric_precision, numeric_scale FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position`)).rows;
try {
  for (const folder of fs.readdirSync(root).sort()) {
    const filename = path.join(root, folder, "migration.sql"); if (!fs.existsSync(filename)) continue;
    try { await db.exec(fs.readFileSync(filename, "utf8")); report.migrations.push({ folder, result: "passed" }); }
    catch (error) { report.migrations.push({ folder, result: "failed", message: error.message }); throw error; }
  }
  const sql = execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "diff", "--from-empty", "--to-schema-datamodel", "prisma/postgres/schema.prisma", "--script"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:65439/synthetic" } });
  await expected.exec(sql);
  const actualColumns = await catalog(db), expectedColumns = await catalog(expected);
  for (const column of expectedColumns) {
    const actual = actualColumns.find(c => c.table_name === column.table_name && c.column_name === column.column_name);
    if (!actual || JSON.stringify(actual) !== JSON.stringify(column)) report.differences.push({ expected: column, actual: actual ?? null });
  }
  report.checks.push({ name: "all modeled columns match schema", passed: report.differences.length === 0, modeledColumns: expectedColumns.length });
  const constraints = async database => (await database.query(`SELECT conrelid::regclass::text AS table_name, contype, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace = 'public'::regnamespace ORDER BY 1, 2, 3`)).rows;
  const actualConstraints = await constraints(db), expectedConstraints = await constraints(expected);
  const missingConstraints = expectedConstraints.filter(c => !actualConstraints.some(a => JSON.stringify(a) === JSON.stringify(c)));
  report.checks.push({ name: "modeled constraints present", passed: missingConstraints.length === 0, missing: missingConstraints });
  const indexes = async database => (await database.query("SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname")).rows;
  const actualIndexes = await indexes(db), expectedIndexes = await indexes(expected);
  const missingIndexes = expectedIndexes.filter(e => !actualIndexes.some(a => a.tablename === e.tablename && a.indexdef.replace(/INDEX \S+ ON/, 'INDEX ON') === e.indexdef.replace(/INDEX \S+ ON/, 'INDEX ON')));
  report.checks.push({ name: "modeled indexes present", passed: missingIndexes.length === 0, modeledIndexes: expectedIndexes.length, missing: missingIndexes });
  const enums = async database => (await database.query("SELECT t.typname, e.enumlabel, e.enumsortorder FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' ORDER BY t.typname, e.enumsortorder")).rows;
  const expectedEnums = await enums(expected), actualEnums = await enums(db);
  report.checks.push({ name: "modeled enums match", passed: expectedEnums.every(e => actualEnums.some(a => JSON.stringify(a) === JSON.stringify(e))), modeledEnumValues: expectedEnums.length });
  await db.exec(`INSERT INTO "cities" ("id", "name", "code", "updatedAt") VALUES ('c', 'Synthetic', 'SYN', now()); INSERT INTO "parks" ("id", "name", "cityId", "updatedAt") VALUES ('p', 'Synthetic', 'c', now()); INSERT INTO "batches" ("id", "name", "parkId", "startDate", "updatedAt") VALUES ('b1', 'Synthetic', 'p', now(), now());`);
  const normalized = (await db.query(`SELECT "cityId" FROM "batches" WHERE "id"='b1'`)).rows[0].cityId === "c";
  let duplicateDenied = false;
  try { await db.exec(`INSERT INTO "batches" ("id", "name", "parkId", "startDate", "updatedAt") VALUES ('b2', 'Synthetic', 'p', now(), now());`); } catch (error) { duplicateDenied = error.code === "23505"; }
  report.checks.push({ name: "legacy null city normalized and duplicate active batch denied", passed: normalized && duplicateDenied });
  report.success = report.checks.every(c => c.passed);
} catch (error) { report.error = { message: error.message, code: error.code }; report.success = false; }
finally {
  fs.writeFileSync("docs/reviews/v2-audit-2026-09-08/astra-postgres-migration-results.json", JSON.stringify(report, null, 2));
  await db.close(); await expected.close();
}
console.log(JSON.stringify({ success: report.success, migrations: report.migrations.length, checks: report.checks, differences: report.differences.length, error: report.error }, null, 2));
process.exitCode = report.success ? 0 : 1;
