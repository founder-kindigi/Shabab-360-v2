// Actual compiled PWA + NextAuth routes + disposable SQLite. No configured DB/accounts.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { spawn, execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { chromium } from "../../../.next/astra-browser-runtime/node_modules/playwright-core/index.mjs";
const root = process.cwd();
const candidate = JSON.parse(fs.readFileSync("docs/reviews/v2-audit-2026-09-08/astra-build-sqlite-results.json"));
if (candidate.build?.exitCode !== 0) throw Error("Successful isolated SQLite build required");
const out = fs.mkdtempSync(path.join(root, ".next/astra-pwa-session-"));
const databaseUrl = "file:" + path.join(out, "synthetic.db").replaceAll("\\", "/");
const portProbe = http.createServer(); await new Promise(resolve => portProbe.listen(0, "127.0.0.1", resolve)); const port = portProbe.address().port; await new Promise(resolve => portProbe.close(resolve));
// Next normalizes loopback request URLs to localhost. Use that exact origin so
// this fixture exercises legitimate same-origin writes without relaxing CSRF.
const url = `http://localhost:${port}`;
const env = { ...process.env, DATABASE_URL: databaseUrl, NEXTAUTH_URL: url, NEXTAUTH_SECRET: "synthetic-isolated-pwa-verification-only-secret", NEXT_TELEMETRY_DISABLED: "1" };
const schema = path.join(candidate.directory, "prisma/schema.prisma");
const sql = execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "diff", "--from-empty", "--to-schema-datamodel", schema, "--script"], { cwd: root, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const sqlite = new DatabaseSync(path.join(out, "synthetic.db")); sqlite.exec(sql); sqlite.close();
const { PrismaClient } = await import(pathToFileURL(path.join(candidate.directory, "node_modules/.prisma/client/index.js")));
const db = new PrismaClient({ datasourceUrl: databaseUrl });
const password = "Synthetic-Initial-Password7!", newPassword = "Synthetic-Changed-Password8!";
const passwordHash = await bcrypt.hash(password, 10);
await db.city.create({ data: { id: "city", name: "Synthetic City", code: "synthetic" } });
for (const id of ["reset", "revoked", "inactive", "deleted", "scope", "capability", "fees", "profiles", "attendance"]) {
  await db.user.create({ data: { id, email: id + "@example.invalid", name: "Synthetic " + id, passwordHash, mustResetPwd: id === "reset" } });
  await db.staffMeta.create({ data: { userId: id, role: "city_head", assignedCityId: "city" } });
}
await db.park.create({ data: { id: "park", name: "Synthetic Park", cityId: "city" } });
await db.batch.create({ data: { id: "batch", name: "Synthetic Batch", parkId: "park", cityId: "city", startDate: new Date("2026-01-01") } });
await db.group.create({ data: { id: "group", name: "Synthetic Group", batchId: "batch", parkId: "park" } });
for (let i = 0; i < 22; i++) {
  const id = "participant-" + String(i).padStart(2, "0");
  await db.participant.create({ data: { id, name: "Synthetic " + id, groupId: "group", joinedAt: new Date("2026-01-01") } });
  await db.studentExtendedProfile.create({ data: { participantId: id, school: "Synthetic School " + i } });
}
await db.feeEvent.create({ data: { id: "fee", title: "Synthetic Fee", batchId: "batch", feeType: "tuition", amount: 100 } });
const log = fs.openSync(path.join(out, "server.log"), "w");
const child = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "start", "--port", String(port), "--hostname", "localhost"], { cwd: candidate.directory, env, windowsHide: true, stdio: ["ignore", log, log] });
const report = { startedAt: new Date().toISOString(), directory: out, buildDirectory: candidate.directory, sourceCopiedAt: candidate.sourceCopiedAt, limits: "Actual compiled PWA, NextAuth and API routes against fresh schema-created SQLite and synthetic accounts. This does not test provisioning approval, live accounts or native PostgreSQL.", tests: [] };
let browser;
const test = async (name, fn) => { try { await fn(); report.tests.push({ name, passed: true }); console.log("PASS " + name); } catch (error) { report.tests.push({ name, passed: false, error: error.message }); console.log("FAIL " + name + ": " + error.message); } };
try {
  let ready = false;
  for (let i = 0; i < 60; i++) { try { if ((await fetch(url + "/api/auth/csrf")).ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 500)); }
  if (!ready) throw Error("Synthetic app did not start");
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true }); report.browser = browser.version();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await context.newPage(); page.setDefaultTimeout(15000);
  async function login(id, secret = password) {
    await context.clearCookies(); await page.goto(url); const started = page.getByRole("button", { name: "Get Started / Sign In" });
    await started.or(page.getByLabel("Email Address")).first().waitFor();
    if (await started.isVisible().catch(() => false)) await started.click();
    await page.getByLabel("Email Address").fill(id + "@example.invalid"); await page.getByLabel("Password", { exact: true }).fill(secret);
    await page.getByRole("button", { name: "Sign In to Shabab 360" }).click();
  }
  async function session() { return page.evaluate(() => fetch("/api/auth/session").then(r => r.json())); }
  await test("Invalid password produces a generic mounted login failure", async () => {
    await login("reset", "wrong"); await page.getByRole("alert").filter({ hasText: "Invalid email or password" }).waitFor(); assert(!(await session()).user?.id);
  });
  await test("Forced reset blocks operations, persists a password change and returns to login", async () => {
    await login("reset"); await page.getByLabel("New Password", { exact: true }).waitFor();
    const denial = await page.evaluate(() => fetch("/api/auth/capabilities").then(r => r.status)); assert.equal(denial, 403);
    assert.equal(await page.getByRole("button", { name: "More", exact: true }).count(), 0);
    await page.getByLabel("New Password", { exact: true }).fill(newPassword); await page.getByLabel("Confirm Password", { exact: true }).fill(newPassword);
    const resetResponse = page.waitForResponse(r => r.url().endsWith("/api/auth/reset-password") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Set New Password" }).click();
    const acknowledgement = await resetResponse;
    assert.equal(acknowledgement.status(), 200, "Reset API: " + await acknowledgement.text());
    await page.getByText("Password Updated!", { exact: true }).waitFor();
    await page.waitForFunction(() => location.pathname === "/" && !document.querySelector("#new-password"));
    const row = await db.user.findUnique({ where: { id: "reset" } }); assert.equal(row.mustResetPwd, false); assert(await bcrypt.compare(newPassword, row.passwordHash)); assert(row.tokenVersion > 0);
    assert(!(await session()).user?.id);
  });
  await test("Reauthentication after reset opens the mounted PWA and sign-out clears it", async () => {
    await login("reset", newPassword); await page.getByRole("button", { name: "More", exact: true }).waitFor(); await page.getByRole("button", { name: "More", exact: true }).click();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.waitForFunction(() => !document.body.textContent.includes("Synthetic reset")); assert(!(await session()).user?.id);
  });
  await test("A committed payment with a lost browser acknowledgement recovers its original receipt after reload", async () => {
    await login("fees"); await page.getByRole("button", { name: "More", exact: true }).click(); await page.getByRole("button", { name: "Fees", exact: true }).click();
    await page.getByLabel("Fee event").selectOption("fee"); await page.getByLabel("Participant", { exact: true }).selectOption("participant-00"); await page.getByLabel("Payment amount").fill("100");
    let dropped = false;
    await page.route("**/api/admin/fees/fee/payments", async route => {
      if (route.request().method() === "POST" && !dropped) { dropped = true; const response = await route.fetch(); assert.equal(response.status(), 201); await route.abort(); } else await route.continue();
    });
    await page.getByRole("button", { name: "Record payment", exact: true }).click(); await page.getByRole("button", { name: "Confirm pending payment" }).waitFor();
    await page.waitForFunction(() => !document.body.textContent.includes("Recording…")); assert.equal(await db.payment.count(), 1);
    await page.unroute("**/api/admin/fees/fee/payments"); await page.reload(); await page.getByRole("button", { name: "More", exact: true }).click(); await page.getByRole("button", { name: "Fees", exact: true }).click();
    await page.getByRole("button", { name: "Confirm pending payment" }).click(); await page.getByText("Recorded receipt:", { exact: false }).first().waitFor();
    assert.equal(await db.payment.count(), 1); assert.equal(Number((await db.payment.findFirst()).amount), 100);
    assert.equal(await page.evaluate(() => localStorage.getItem("shabab-payment-attempt:fees")), null);
  });
  await test("The profile directory paginates, saves only the selected profile, and returns to selectable profiles", async () => {
    await login("profiles"); await page.getByRole("button", { name: "More", exact: true }).click(); await page.getByRole("button", { name: "Student profiles", exact: true }).click();
    await page.getByText("Page 1 of 2", { exact: true }).waitFor();
    const pageTwoResponse = page.waitForResponse(r => { const u = new URL(r.url()); return u.pathname === "/api/admin/students" && u.searchParams.get("page") === "2"; });
    await page.getByRole("button", { name: "Next", exact: true }).click();
    const pageTwo = await (await pageTwoResponse).json(); assert.equal(pageTwo.data.length, 2); assert.equal(pageTwo.pagination.totalPages, 2);
    const selected = pageTwo.data[0];
    const original = await db.studentExtendedProfile.findUnique({ where: { participantId: selected.id } });
    const untouched = await db.studentExtendedProfile.findFirst({ where: { participantId: { not: selected.id } } });
    await page.getByRole("button", { name: new RegExp(selected.name) }).click(); await page.getByRole("button", { name: "Extended profile", exact: true }).click();
    await page.getByText(original.school, { exact: true }).waitFor(); await page.getByRole("button", { name: "Edit Profile" }).click();
    await page.locator('input[value="' + original.school + '"]').fill("Synthetic revised school"); await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("button", { name: "Edit Profile" }).waitFor(); assert.equal((await db.studentExtendedProfile.findUnique({ where: { participantId: selected.id } })).school, "Synthetic revised school");
    assert.equal((await db.studentExtendedProfile.findUnique({ where: { participantId: untouched.participantId } })).school, untouched.school);
    await page.getByRole("button", { name: "Back", exact: true }).click(); await page.getByRole("button", { name: "Student profiles", exact: true }).click(); await page.getByLabel("Search profiles").waitFor();
  });
  await test("An authenticated browser attendance write survives reload and replay without duplicate rows", async () => {
    const participantId = "00000000-0000-4000-8000-000000000001", eventId = "00000000-0000-4000-8000-000000000002";
    await db.participant.create({ data: { id: participantId, name: "Synthetic attendance participant", groupId: "group", joinedAt: new Date("2026-01-01") } });
    await db.attendanceEvent.create({ data: { id: eventId, title: "Synthetic valid attendance", groupId: "group", eventDate: new Date("2026-09-09") } });
    const receiptsBefore = await db.operationReceipt.count();
    await login("attendance"); await page.getByRole("button", { name: "More", exact: true }).waitFor();
    const send = async () => {
      const response = await page.evaluate(async ({ participantId, eventId }) => {
        const r = await fetch("/api/park/attendance/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mutations: [{ mutationId: "synthetic-browser-attendance", ownerId: "attendance", eventId, participantId, status: "present", markedAt: "2026-09-09T00:00:00.000Z", expectedVersion: null, expectedResetVersion: 0 }] }) });
        return { status: r.status, body: await r.json() };
      }, { participantId, eventId });
      assert.equal(response.status, 200, JSON.stringify(response.body)); return response.body;
    };
    const first = await send(); assert.equal(first.results[0].status, "processed", JSON.stringify(first)); await page.reload(); const replay = await send(); assert.deepEqual(replay.results, first.results);
    assert.equal(await db.attendanceRecord.count(), 1); assert.equal(await db.operationReceipt.count(), receiptsBefore + 1);
  });
  for (const kind of ["revoked", "inactive", "deleted", "scope"]) await test(`Mounted PWA rejects a ${kind} identity on refreshed session`, async () => {
    await login(kind); await page.getByRole("button", { name: "More", exact: true }).waitFor();
    if (kind === "revoked") await db.user.update({ where: { id: kind }, data: { tokenVersion: { increment: 1 } } });
    if (kind === "inactive") await db.staffMeta.update({ where: { userId: kind }, data: { isActive: false } });
    if (kind === "deleted") { await db.staffMeta.delete({ where: { userId: kind } }); await db.user.delete({ where: { id: kind } }); }
    if (kind === "scope") await db.staffMeta.update({ where: { userId: kind }, data: { assignedCityId: null } });
    assert(!(await session()).user?.id);
    await page.getByRole("button", { name: "Get Started / Sign In" }).or(page.getByLabel("Email Address")).first().waitFor({ timeout: 45000 });
    assert.equal(await page.getByRole("button", { name: "More", exact: true }).count(), 0);
  });
  await test("Revoked capability disappears from the mounted menu and the direct API denies it", async () => {
    await login("capability"); await page.getByRole("button", { name: "More", exact: true }).waitFor(); await page.getByRole("button", { name: "More", exact: true }).click();
    await page.getByRole("button", { name: "Calling", exact: true }).waitFor();
    await db.userCapabilityOverride.create({ data: { userId: "capability", capability: "calling.view", effect: "deny", reason: "Synthetic browser revocation" } });
    assert.equal(await page.evaluate(() => fetch("/api/calling/campaigns").then(r => r.status)), 403);
    await page.getByRole("button", { name: "Calling", exact: true }).waitFor({ state: "detached", timeout: 45000 });
    await page.getByRole("button", { name: "Sign out", exact: true }).waitFor(); assert.equal(await page.getByRole("button", { name: "Calling", exact: true }).count(), 0);
    await page.screenshot({ path: path.join(out, "revoked-capability-menu.png"), fullPage: true });
  });
} finally {
  await browser?.close(); child.kill(); fs.closeSync(log); await db.$disconnect();
  report.finishedAt = new Date().toISOString(); fs.writeFileSync(path.join(out, "results.json"), JSON.stringify(report, null, 2)); fs.writeFileSync(path.join(root, "docs/reviews/v2-audit-2026-09-08/astra-pwa-session-results.json"), JSON.stringify(report, null, 2));
  process.exitCode = report.tests.length === 11 && report.tests.every(t => t.passed) ? 0 : 1;
}
