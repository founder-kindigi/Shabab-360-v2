// Fresh synthetic database and isolated generated client. No configured database is opened.
import { beforeAll, afterAll, beforeEach, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { NextRequest } from "next/server";
import { pathToFileURL } from "node:url";
const state = vi.hoisted(() => ({ prisma: null as any }));
vi.mock("@/lib/db", () => ({ get db() { return state.prisma; } }));
vi.mock("next-auth", () => ({ getServerSession: async () => ({ user: { id: "actor", role: "super_admin", name: "Synthetic" } }) }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
import { applyAttendanceMutation } from "@/lib/attendance/apply-mutation";
import { POST as transferStock } from "@/app/api/admin/procurement/transfers/route";
import { PATCH as reviewStock } from "@/app/api/admin/procurement/requests/[id]/route";
import { POST as payFee } from "@/app/api/admin/fees/[id]/payments/route";
import { DELETE as resetEvent } from "@/app/api/park/attendance/[eventId]/reset/route";
import { POST as setStock } from "@/app/api/admin/procurement/stock/route";
import { PATCH as correctMark } from "@/app/api/park/attendance/[eventId]/records/[recordId]/route";
import { consumeLoginAttempt } from "@/lib/auth/login-throttle";
const nativePostgres = process.env.ASTRA_DISPOSABLE_POSTGRES === "1";
const actor = { id: "actor", role: "park_lead" as const, assignedParkId: "own" };
const mutation = (id = "first", status = "present" as "present" | "absent", expectedVersion: string | null = null) => ({ mutationId: id, ownerId: "actor", eventId: "event", participantId: "participant", status, markedAt: "2026-09-09T00:00:00.000Z", expectedResetVersion: 0, expectedVersion });
beforeAll(async () => {
  const dir = fs.mkdtempSync(path.resolve(".next/astra-corrections-db-"));
  const schemaPath = path.join(dir, "schema.prisma");
  const sourceSchema = nativePostgres ? "prisma/postgres/schema.prisma" : "prisma/schema.prisma";
  fs.writeFileSync(schemaPath, fs.readFileSync(sourceSchema, "utf8").replace('provider = "prisma-client-js"', 'provider = "prisma-client-js"\n  output = "./client"'));
  const nativeUrl = "postgresql://astra_verify:synthetic@127.0.0.1:54391/astra_synthetic_review?schema=" + path.basename(dir).replaceAll("-", "_") + "&connection_limit=16";
  const targetUrl = nativePostgres ? nativeUrl : `file:${path.join(dir, "synthetic.db").replaceAll("\\", "/")}`;
  const env = { ...process.env, DATABASE_URL: targetUrl, DIRECT_URL: targetUrl };
  const prisma = (...args: string[]) => execFileSync(process.execPath, ["node_modules/prisma/build/index.js", ...args], { env, encoding: "utf8", timeout: 60000, stdio: ["ignore", "pipe", "pipe"] });
  prisma("generate", "--schema", schemaPath);
  const { PrismaClient } = await import(pathToFileURL(path.join(dir, "client/index.js")).href);
  state.prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
  if (nativePostgres) {
    fs.cpSync("prisma/postgres/migrations", path.join(dir, "migrations"), { recursive: true });
    fs.writeFileSync(path.join(dir, "migration-deploy.log"), prisma("migrate", "deploy", "--schema", schemaPath));
  } else {
    const sql = prisma("migrate", "diff", "--from-empty", "--to-schema-datamodel", schemaPath, "--script");
    for (const statement of sql.split(";").map(s => s.trim()).filter(Boolean)) await state.prisma.$executeRawUnsafe(statement);
  }
  await state.prisma.user.create({ data: { id: "actor", email: "synthetic@example.invalid", passwordHash: "unused", mustResetPwd: false } });
  await state.prisma.city.create({ data: { id: "city", name: "Synthetic", code: "SYN" } });
  for (const id of ["anchor", "own", "foreign"]) await state.prisma.park.create({ data: { id, name: id, cityId: "city" } });
  await state.prisma.batch.create({ data: { id: "batch", name: "Synthetic", cityId: "city", parkId: "anchor", startDate: new Date("2026-01-01") } });
  await state.prisma.group.create({ data: { id: "group", name: "Synthetic", batchId: "batch", parkId: "own" } });
  await state.prisma.participant.create({ data: { id: "participant", name: "Synthetic", groupId: "group", joinedAt: new Date("2026-01-01") } });
  await state.prisma.attendanceEvent.create({ data: { id: "event", title: "Synthetic", groupId: "group", eventDate: new Date("2026-09-09") } });
  await state.prisma.staffMeta.create({ data: { id: "staff", userId: "actor", role: "park_lead", assignedParkId: "own" } });
  if (!nativePostgres) {
    const connection = new DatabaseSync(path.join(dir, "synthetic.db"));
    connection.exec(fs.readFileSync("prisma/migrations/20260909040000_active_city_batch/migration.sql", "utf8")); connection.close();
  }
  await state.prisma.procurementItem.create({ data: { id: "item", sku: "SYN", name: "Synthetic item", category: "general", unit: "piece" } });
  await state.prisma.feeEvent.create({ data: { id: "fee", batchId: "batch", title: "Synthetic fee", feeType: "tuition", amount: 100 } });
  fs.writeFileSync(`docs/reviews/v2-audit-2026-09-08/astra-corrections-${nativePostgres ? "native-postgres" : "db"}-environment.json`, JSON.stringify({ provider: nativePostgres ? "native PostgreSQL 18.6" : "sqlite", disposableDirectory: dir, generatedFrom: sourceSchema, source: nativePostgres ? "full 31-migration deploy into a fresh isolated schema; pool allows 16 simultaneous connections" : "schema diff from empty plus active batch migration; full migration-chain replay separate", audit: "real rows, with a failure trigger for rollback verification" }, null, 2));
}, 90000);
beforeEach(async () => {
  await state.prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS "reject_attendance_audit"' + (nativePostgres ? ' ON "audit_log"' : ""));
  await state.prisma.payment.deleteMany(); await state.prisma.stockRequest.deleteMany(); await state.prisma.stockTransfer.deleteMany(); await state.prisma.parkStock.deleteMany();
  await state.prisma.batch.deleteMany({ where: { id: { not: "batch" } } });
  await state.prisma.batch.update({ where: { id: "batch" }, data: { isActive: true } });
  await state.prisma.attendanceRecord.deleteMany(); await state.prisma.operationReceipt.deleteMany(); await state.prisma.auditLog.deleteMany();
  await state.prisma.attendanceEvent.update({ where: { id: "event" }, data: { isClosed: false, resetVersion: 0 } });
  await state.prisma.staffMeta.update({ where: { id: "staff" }, data: { isActive: true, assignedParkId: "own" } });
});
afterAll(async () => { await state.prisma?.$disconnect(); });
async function rejectAudit() {
  if (nativePostgres) {
    await state.prisma.$executeRawUnsafe("CREATE OR REPLACE FUNCTION astra_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic audit failure'; END $$");
    await state.prisma.$executeRawUnsafe('CREATE TRIGGER "reject_attendance_audit" BEFORE INSERT ON "audit_log" FOR EACH ROW EXECUTE FUNCTION astra_reject_audit()');
  } else await state.prisma.$executeRawUnsafe("CREATE TRIGGER reject_attendance_audit BEFORE INSERT ON audit_log BEGIN SELECT RAISE(FAIL, 'synthetic audit failure'); END");
}
it("persists a mark, durable receipt and audit; retries do not write twice", async () => {
  const first = await applyAttendanceMutation(actor, mutation()); expect(first.status).toBe("processed");
  expect(await applyAttendanceMutation(actor, mutation())).toEqual(first);
  expect(await state.prisma.attendanceRecord.count()).toBe(1); expect(await state.prisma.auditLog.count()).toBe(1); expect(await state.prisma.operationReceipt.count()).toBe(1);
});
it("rejects mutation reuse and stale writes without overwriting the accepted mark", async () => {
  await applyAttendanceMutation(actor, mutation());
  expect((await applyAttendanceMutation(actor, mutation("first", "absent"))).code).toBe("MUTATION_REUSED");
  expect((await applyAttendanceMutation(actor, mutation("second", "absent"))).code).toBe("VERSION_CONFLICT");
  expect((await state.prisma.attendanceRecord.findFirst()).status).toBe("present");
});
it("serializes concurrent edits against the same version", async () => {
  const results = await Promise.all([applyAttendanceMutation(actor, mutation()), applyAttendanceMutation(actor, mutation("second", "absent"))]);
  expect(results.filter(r => r.status === "processed")).toHaveLength(1); expect(await state.prisma.auditLog.count()).toBe(1);
});
it("rolls back both mark and receipt when mandatory audit storage fails", async () => {
  await rejectAudit();
  expect((await applyAttendanceMutation(actor, mutation())).status).toBe("failed");
  expect(await state.prisma.attendanceRecord.count()).toBe(0); expect(await state.prisma.operationReceipt.count()).toBe(0);
});
it("denies foreign-account, revoked staff and foreign-park submissions", async () => {
  expect((await applyAttendanceMutation(actor, { ...mutation(), ownerId: "other" })).code).toBe("OWNER_MISMATCH");
  await state.prisma.staffMeta.update({ where: { id: "staff" }, data: { assignedParkId: "foreign" } });
  expect((await applyAttendanceMutation(actor, mutation())).code).toBe("FORBIDDEN");
  await state.prisma.staffMeta.update({ where: { id: "staff" }, data: { isActive: false } });
  expect((await applyAttendanceMutation(actor, mutation())).code).toBe("FORBIDDEN"); expect(await state.prisma.attendanceRecord.count()).toBe(0);
});
it("denies new marks on a closed event but preserves acknowledgement of a committed retry", async () => {
  const first = await applyAttendanceMutation(actor, mutation());
  await state.prisma.attendanceEvent.update({ where: { id: "event" }, data: { isClosed: true } });
  expect(await applyAttendanceMutation(actor, mutation())).toEqual(first);
  expect((await applyAttendanceMutation(actor, mutation("second"))).code).toBe("EVENT_LOCKED");
});
it("uses a shared atomic throttle under simultaneous attempts", async () => {
  const results = await Promise.all(Array.from({ length: 12 }, () => consumeLoginAttempt("load@example.invalid")));
  expect(results.filter(Boolean)).toHaveLength(5);
  const rows = await state.prisma.loginAttemptWindow.findMany(); expect(rows[0].attempts).toBe(12); expect(rows[0].key).not.toContain("@");
});

const transferRequest = (quantity: number, key: string) => new NextRequest("http://localhost/api/admin/procurement/transfers", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify({ fromParkId: "own", toParkId: "foreign", itemId: "item", quantity }) });
it("two stock transfers of four from five cannot both succeed", async () => {
  await state.prisma.parkStock.create({ data: { parkId: "own", itemId: "item", quantity: 5 } });
  const results = await Promise.all([transferStock(transferRequest(4, "transfer_attempt_0001")), transferStock(transferRequest(4, "transfer_attempt_0002"))]);
  expect(results.map(r => r.status).sort()).toEqual([201, 409]);
  expect((await state.prisma.parkStock.findUnique({ where: { parkId_itemId: { parkId: "own", itemId: "item" } } })).quantity).toBe(1);
  expect(await state.prisma.stockTransfer.count()).toBe(1); expect(await state.prisma.auditLog.count()).toBe(1);
});
it("a stock-transfer retry changes inventory once and a reused key with different content conflicts", async () => {
  await state.prisma.parkStock.create({ data: { parkId: "own", itemId: "item", quantity: 10 } });
  const first = await transferStock(transferRequest(2, "transfer_attempt_0001")); const retry = await transferStock(transferRequest(2, "transfer_attempt_0001"));
  expect(first.status).toBe(201); expect(await retry.json()).toEqual(await first.json());
  expect((await transferStock(transferRequest(3, "transfer_attempt_0001"))).status).toBe(409);
  expect(await state.prisma.stockTransfer.count()).toBe(1);
});
it("competing stock-request reviews persist exactly one decision", async () => {
  await state.prisma.stockRequest.create({ data: { id: "request", parkId: "own", itemId: "item", quantity: 1, reason: "Synthetic", requestedBy: "actor" } });
  const results = await Promise.all(["approved", "rejected"].map(status => reviewStock(new NextRequest("http://localhost/api/admin/procurement/requests/request", { method: "PATCH", body: JSON.stringify({ status }) }), { params: Promise.resolve({ id: "request" }) })));
  expect(results.map(r => r.status).sort()).toEqual([200, 409]); expect(await state.prisma.auditLog.count()).toBe(1);
});
const paymentRequest = (amount: number, key: string) => new NextRequest("http://localhost/api/admin/fees/fee/payments", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify({ participantId: "participant", amount, method: "cash" }) });
it("payment retry returns the persisted receipt and does not collect twice", async () => {
  const context = { params: Promise.resolve({ id: "fee" }) };
  const first = await payFee(paymentRequest(40, "payment_attempt_0001"), context); expect(first.status).toBe(201);
  const retry = await payFee(paymentRequest(40, "payment_attempt_0001"), context); expect(retry.status).toBe(201);
  expect((await retry.json()).receiptNo).toBe((await first.json()).receiptNo);
  expect(await state.prisma.payment.count()).toBe(1); expect(Number((await state.prisma.payment.aggregate({ _sum: { amount: true } }))._sum.amount)).toBe(40);
});
it("payment audit failure rolls back payment, receipt sequence and retry receipt", async () => {
  const before = await state.prisma.receiptSequence.findMany();
  await rejectAudit();
  const result = await payFee(paymentRequest(40, "payment_attempt_0001"), { params: Promise.resolve({ id: "fee" }) });
  expect(result.status).toBeGreaterThanOrEqual(500); expect(await state.prisma.payment.count()).toBe(0); expect(await state.prisma.operationReceipt.count()).toBe(0);
  expect(await state.prisma.receiptSequence.findMany()).toEqual(before);
});
it("Database rejects a second active batch including a legacy null city", async () => {
  await expect(state.prisma.batch.create({ data: { id: "duplicate", name: "Synthetic", parkId: "own", startDate: new Date() } })).rejects.toBeDefined();
  expect(await state.prisma.batch.count({ where: { isActive: true } })).toBe(1);
  await state.prisma.batch.create({ data: { id: "inactive", name: "Synthetic", parkId: "own", startDate: new Date(), isActive: false } });
  await expect(state.prisma.batch.update({ where: { id: "inactive" }, data: { isActive: true } })).rejects.toBeDefined();
});

const correction = (recordId: string, version: string | null, status = "late") => correctMark(new NextRequest("http://localhost/api/park/attendance/event/records/" + recordId, { method: "PATCH", headers: { "Content-Type": "application/json", ...(version ? { "If-Match": version } : {}) }, body: JSON.stringify({ status, editReason: "Synthetic correction reason" }) }), { params: Promise.resolve({ eventId: "event", recordId }) });
it("requires a correction precondition and rejects a stale second correction", async () => {
  const first = await applyAttendanceMutation(actor, mutation());
  expect((await correction(first.recordId!, null)).status).toBe(428);
  expect((await correction(first.recordId!, first.version!)).status).toBe(200);
  expect((await correction(first.recordId!, first.version!, "absent")).status).toBe(409);
  expect((await state.prisma.attendanceRecord.findFirst()).status).toBe("late");
  expect(await state.prisma.auditLog.count()).toBe(2);
});
it("rolls back a privileged correction when its required audit fails", async () => {
  const first = await applyAttendanceMutation(actor, mutation());
  await rejectAudit();
  expect((await correction(first.recordId!, first.version!)).status).toBe(503);
  expect((await state.prisma.attendanceRecord.findFirst()).status).toBe("present");
  expect(await state.prisma.auditLog.count()).toBe(1);
});

const stockSet = (version: string, quantity: number) => setStock(new NextRequest("http://localhost/api/admin/procurement/stock", { method: "POST", headers: { "Content-Type": "application/json", "If-Match": version }, body: JSON.stringify({ parkId: "own", itemId: "item", quantity, minThreshold: 5 }) }));
it("prevents a stale absolute stock balance from overwriting a newer balance", async () => {
  const created = await stockSet("new", 10); expect(created.status).toBe(200); const first = await created.json();
  expect((await stockSet(first.updatedAt, 20)).status).toBe(200);
  expect((await stockSet(first.updatedAt, 5)).status).toBe(409);
  expect((await state.prisma.parkStock.findFirst()).quantity).toBe(20);
});
it("rolls back absolute stock creation when audit storage fails", async () => {
  await rejectAudit();
  expect((await stockSet("new", 10)).status).toBe(503);
  expect(await state.prisma.parkStock.count()).toBe(0);
});

const resetSession = () => resetEvent(new Request("http://localhost/api/park/attendance/event/reset", { method: "DELETE", headers: { "If-Match": "0" } }), { params: Promise.resolve({ eventId: "event" }) });
it("rejects pre-reset queued marks even when their record base was empty", async () => {
  expect((await resetSession()).status).toBe(200);
  expect((await applyAttendanceMutation(actor, mutation())).code).toBe("EVENT_RESET");
  expect((await applyAttendanceMutation(actor, { ...mutation(), expectedResetVersion: 1 })).status).toBe("processed");
  expect((await resetSession()).status).toBe(409);
  expect(await state.prisma.attendanceRecord.count()).toBe(1);
});
it("rolls back reset generation and records together when its audit fails", async () => {
  await applyAttendanceMutation(actor, mutation());
  await rejectAudit();
  expect((await resetSession()).status).toBe(503);
  expect(await state.prisma.attendanceRecord.count()).toBe(1);
  expect((await state.prisma.attendanceEvent.findUnique({ where: { id: "event" } })).resetVersion).toBe(0);
});

it("concurrent active batch creates across parks leave exactly one active city batch", async () => {
  await state.prisma.batch.update({ where: { id: "batch" }, data: { isActive: false } });
  const results = await Promise.allSettled(["own", "foreign"].map(parkId => state.prisma.batch.create({ data: { name: "Synthetic concurrent", parkId, cityId: "city", startDate: new Date() } })));
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect(await state.prisma.batch.count({ where: { isActive: true } })).toBe(1);
});

it("concurrent payments cannot exceed the outstanding balance", async () => {
  const results = await Promise.all(["payment_concurrent_01", "payment_concurrent_02"].map(key => payFee(paymentRequest(80, key), { params: Promise.resolve({ id: "fee" }) })));
  expect(results.filter(r => r.status === 201)).toHaveLength(1);
  expect(results.filter(r => r.status >= 400)).toHaveLength(1);
  expect(Number((await state.prisma.payment.aggregate({ _sum: { amount: true } }))._sum.amount)).toBe(80);
  expect(await state.prisma.auditLog.count()).toBe(1);
});
