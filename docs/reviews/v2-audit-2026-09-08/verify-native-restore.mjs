import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const environment = JSON.parse(fs.readFileSync("docs/reviews/v2-audit-2026-09-08/astra-corrections-native-postgres-environment.json"));
const { PrismaClient } = await import(pathToFileURL(path.join(environment.disposableDirectory, "client/index.js")));
const restored = fs.readFileSync(".next/astra-native-postgres/restored-database.txt", "utf8").trim();
if (!/^astra_synthetic_restore_\d+$/.test(restored)) throw Error("Invalid disposable restore target");
const connect = name => new PrismaClient({ datasourceUrl: `postgresql://astra_verify:synthetic@127.0.0.1:54391/${name}` });
const source = connect("astra_synthetic_review"), target = connect(restored);
const inventory = async db => {
  const tables = await db.$queryRawUnsafe("SELECT schemaname,tablename FROM pg_tables WHERE schemaname LIKE 'astra_%' ORDER BY schemaname,tablename");
  const result = [];
  for (const { schemaname, tablename } of tables) {
    if (![schemaname, tablename].every(s => /^[A-Za-z0-9_]+$/.test(s))) throw Error("Unexpected fixture identifier");
    const rows = await db.$queryRawUnsafe(`SELECT count(*)::int AS count, md5(COALESCE(string_agg(row_to_json(t)::text, '' ORDER BY row_to_json(t)::text), '')) AS digest FROM "${schemaname}"."${tablename}" t`);
    result.push({ schema: schemaname, table: tablename, ...rows[0] });
  }
  return result;
};
const report = { checkedAt: new Date().toISOString(), source: "astra_synthetic_review", restored, passed: false, limits: "Native pg_dump/pg_restore rehearsal of synthetic databases only. No operational backup was inspected or restored." };
try {
  const before = await inventory(source), after = await inventory(target); assert.deepEqual(after, before);
  const catalog = async db => db.$queryRawUnsafe("SELECT table_schema,table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema LIKE 'astra_%' ORDER BY table_schema,table_name,ordinal_position");
  assert.deepEqual(await catalog(target), await catalog(source));
  report.tablesCompared = before.length; report.rowsCompared = before.reduce((sum, row) => sum + row.count, 0);
  report.inventorySha256 = createHash("sha256").update(JSON.stringify(before)).digest("hex");
  report.backupSha256 = createHash("sha256").update(fs.readFileSync(".next/astra-native-postgres/synthetic-backup.dump")).digest("hex"); report.passed = true;
} catch (error) { report.error = error.message; }
finally { await source.$disconnect(); await target.$disconnect(); fs.writeFileSync("docs/reviews/v2-audit-2026-09-08/astra-native-restore-results.json", JSON.stringify(report, null, 2)); }
console.log(JSON.stringify(report)); process.exitCode = report.passed ? 0 : 1;
