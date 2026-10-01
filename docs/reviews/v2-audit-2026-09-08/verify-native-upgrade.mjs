import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const base = JSON.parse(fs.readFileSync("docs/reviews/v2-audit-2026-09-08/astra-corrections-native-postgres-environment.json"));
const { PrismaClient } = await import(pathToFileURL(path.join(base.disposableDirectory, "client/index.js")));
const directory = fs.mkdtempSync(path.resolve(".next/astra-native-upgrade-"));
const schemaName = path.basename(directory).replaceAll("-", "_");
const url = `postgresql://astra_verify:synthetic@127.0.0.1:54391/astra_synthetic_review?schema=${schemaName}`;
const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };
const db = new PrismaClient({ datasourceUrl: url });
const source = "prisma/postgres/migrations";
const migrations = fs.readdirSync(source).filter(name => fs.existsSync(path.join(source, name, "migration.sql"))).sort();
const baseline = migrations.filter(name => name < "20260909010000_login_throttle");
fs.writeFileSync(path.join(directory, "schema.prisma"), fs.readFileSync("prisma/postgres/schema.prisma"));
fs.mkdirSync(path.join(directory, "migrations"));
fs.copyFileSync(path.join(source, "migration_lock.toml"), path.join(directory, "migrations/migration_lock.toml"));
const deploy = name => fs.writeFileSync(path.join(directory, name + ".log"), execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy", "--schema", path.join(directory, "schema.prisma")], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
const report = { directory, schemaName, baselineMigrations: baseline.length, finalMigrations: migrations.length, checks: [], passed: false };
try {
  for (const name of baseline) fs.cpSync(path.join(source, name), path.join(directory, "migrations", name), { recursive: true }); deploy("baseline");
  const inserts = [
    `INSERT INTO users (id,email,"passwordHash","updatedAt") VALUES ('u','upgrade@example.invalid','synthetic-unused',now())`,
    `INSERT INTO cities (id,name,code,"updatedAt") VALUES ('c','Synthetic city','UPG',now())`,
    `INSERT INTO parks (id,name,"cityId","updatedAt") VALUES ('p','Synthetic park','c',now())`,
    `INSERT INTO batches (id,name,"parkId","cityId","startDate","updatedAt") VALUES ('b','Synthetic legacy batch','p',NULL,now(),now())`,
    `INSERT INTO groups (id,name,"batchId","parkId","updatedAt") VALUES ('g','Synthetic group','b','p',now())`,
    `INSERT INTO participants (id,name,"groupId","updatedAt") VALUES ('student','Synthetic participant','g',now())`,
    `INSERT INTO attendance_events (id,"groupId",title,"eventDate","updatedAt") VALUES ('event','g','Synthetic event',now(),now())`,
    `INSERT INTO attendance_records (id,"eventId","participantId",status,"updatedAt") VALUES ('mark','event','student','present',now())`,
    `INSERT INTO fee_events (id,"batchId",title,"feeType",amount,"updatedAt") VALUES ('fee','b','Synthetic fee','tuition',100.25,now())`,
    `INSERT INTO payments (id,"feeEventId","participantId",amount,method,"receiptNo","updatedAt") VALUES ('payment','fee','student',40.25,'cash','SYN-UPGRADE-1',now())`,
  ];
  for (const sql of inserts) await db.$executeRawUnsafe(sql);
  const snapshot = async () => ({ participants: await db.$queryRawUnsafe('SELECT id,name,"groupId",state::text FROM participants ORDER BY id'), records: await db.$queryRawUnsafe('SELECT id,"participantId",status::text,"markedAt" FROM attendance_records ORDER BY id'), payments: await db.$queryRawUnsafe('SELECT id,amount::text,"receiptNo" FROM payments ORDER BY id'), batch: await db.$queryRawUnsafe('SELECT id,name,"parkId","isActive" FROM batches ORDER BY id') });
  const before = await snapshot();
  for (const name of migrations.filter(name => !baseline.includes(name))) fs.cpSync(path.join(source, name), path.join(directory, "migrations", name), { recursive: true }); deploy("upgrade");
  const after = await snapshot(); assert.deepEqual(after, before);
  report.checks.push({ name: "Synthetic participant, attendance, exact-money payment and batch values survive forward upgrade", passed: true, snapshotSha256: createHash("sha256").update(JSON.stringify(after)).digest("hex") });
  assert.equal((await db.batch.findUnique({ where: { id: "b" } })).cityId, "c");
  assert.equal((await db.attendanceEvent.findUnique({ where: { id: "event" } })).resetVersion, 0);
  report.checks.push({ name: "Legacy batch city backfills correctly and existing event receives reset generation zero", passed: true });
  const applied = await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL'); assert.equal(applied[0].count, 31);
  report.checks.push({ name: "All 31 native PostgreSQL migrations applied", passed: true }); report.passed = true;
} catch (error) { report.error = error.message; }
finally { await db.$disconnect(); fs.writeFileSync("docs/reviews/v2-audit-2026-09-08/astra-native-upgrade-results.json", JSON.stringify(report, null, 2)); }
console.log(JSON.stringify(report)); process.exitCode = report.passed ? 0 : 1;
