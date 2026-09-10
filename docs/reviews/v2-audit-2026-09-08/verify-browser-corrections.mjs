// Real Edge/IndexedDB/Web Locks; synthetic HTTP acknowledgements, not server acceptance.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { chromium } from "../../../.next/astra-browser-runtime/node_modules/playwright-core/index.mjs";

const root = process.cwd();
const out = fs.mkdtempSync(path.join(root, ".next/astra-browser-check-"));
const bundle = await build({ stdin: { contents: `import * as queue from './src/lib/offline/db'; import { drainAttendanceQueue } from './src/lib/offline/sync-attendance'; import { generateMashwaraMinutes } from './src/lib/mashwara/export-minutes'; import Dexie from 'dexie'; window.check = { ...queue, drainAttendanceQueue, generateMashwaraMinutes, Dexie };`, resolveDir: root }, bundle: true, platform: "browser", format: "iife", write: false, metafile: true });
fs.writeFileSync(path.join(out, "fixture.js"), bundle.outputFiles[0].contents);
const report = { startedAt: new Date().toISOString(), directory: out, limits: "Real isolated Edge with actual source queue/export modules. HTTP sync acknowledgements are controlled synthetic fixtures. Does not establish authenticated server or PostgreSQL concurrency acceptance.", files: Object.keys(bundle.metafile.inputs).filter(p => p.startsWith("src/")).map(p => ({ path: p, sha256: createHash("sha256").update(fs.readFileSync(p)).digest("hex") })), tests: [] };
let mode = "accept", requests = [];
const server = http.createServer(async (req, res) => {
  if (req.url === "/fixture.js") { res.setHeader("Content-Type", "application/javascript"); return res.end(bundle.outputFiles[0].contents); }
  if (req.url === "/api/park/attendance/sync") {
    let body = ""; for await (const chunk of req) body += chunk;
    const mutations = JSON.parse(body).mutations; requests.push(mutations);
    res.setHeader("Content-Type", "application/json");
    if (mode === "malformed") return res.end(JSON.stringify({ results: [] }));
    if (mode === "delay") await new Promise(resolve => setTimeout(resolve, 150));
    return res.end(JSON.stringify({ results: mutations.map(m => mode === "conflict" && m.participantId === "p0" ? { mutationId: m.mutationId, status: "failed", code: "VERSION_CONFLICT", retryable: false } : { mutationId: m.mutationId, status: "processed", recordId: "r-" + m.participantId, version: "2026-09-09T00:00:00.000Z" }) }));
  }
  res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html><body><h1>Synthetic browser verification</h1><script src="/fixture.js"></script></body></html>');
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}`;
let browser;
async function test(name, fn) {
  try { await fn(); report.tests.push({ name, passed: true }); console.log("PASS " + name); }
  catch (error) { report.tests.push({ name, passed: false, error: error.message }); console.log("FAIL " + name + ": " + error.message); }
}
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  report.browser = browser.version();
  const context = await browser.newContext(); const page = await context.newPage(); await page.goto(url);
  await page.waitForFunction(() => Boolean(window.check));
  const seed = async (n = 225) => {
    requests = []; mode = "accept";
    await page.evaluate(async n => {
      const { offlineDB } = window.check; await offlineDB.queue.clear();
      const rows = Array.from({ length: n }, (_, i) => ({ mutationId: String(n - i).padStart(4, "0"), ownerId: "owner-a", expectedVersion: null, expectedResetVersion: 0, eventId: "event", participantId: "p" + i, status: "present", markedAt: new Date(0).toISOString(), queuedAt: new Date(i * 1000).toISOString(), retryCount: 0, lastError: null, errorCode: null, retryable: null, syncedAt: null, state: "pending" }));
      rows.push({ ...rows[0], mutationId: "other-owner", ownerId: "owner-b" }); await offlineDB.queue.bulkAdd(rows);
    }, n);
  };
  await test("225 IndexedDB marks drain in chronological 50/50/50/50/25 batches without touching another owner", async () => {
    await seed(); const result = await page.evaluate(() => window.check.drainAttendanceQueue("owner-a"));
    assert.equal(result.processed, 225); assert.deepEqual(requests.map(r => r.length), [50, 50, 50, 50, 25]);
    assert.deepEqual(requests.flat().map(r => r.participantId), Array.from({ length: 225 }, (_, i) => "p" + i));
    assert.equal(await page.evaluate(() => window.check.offlineDB.queue.get("other-owner").then(r => r.state)), "pending");
  });
  await test("Malformed acknowledgements retain every mark for retry", async () => {
    await seed(6); mode = "malformed";
    const result = await page.evaluate(() => window.check.drainAttendanceQueue("owner-a")); assert.equal(result.success, false);
    const rows = await page.evaluate(() => window.check.offlineDB.queue.where("ownerId").equals("owner-a").toArray());
    assert.equal(rows.length, 6); assert(rows.every(r => r.state === "pending" && r.errorCode === "SYNC_UNACKNOWLEDGED" && !r.syncedAt));
  });
  await test("Version conflicts remain unresolved while independent marks drain", async () => {
    await seed(); mode = "conflict";
    const result = await page.evaluate(() => window.check.drainAttendanceQueue("owner-a")); assert.deepEqual(result, { success: false, processed: 224, failed: 1 });
    await page.evaluate(() => window.check.retryAllFailed("owner-a"));
    const row = await page.evaluate(() => window.check.offlineDB.queue.where("participantId").equals("p0").filter(r => r.ownerId === "owner-a").first());
    assert.equal(row.state, "failed"); assert.equal(row.retryable, false);
  });
  await test("Two browser tabs share the Web Lock and do not double-send marks", async () => {
    await seed(); mode = "delay"; const second = await context.newPage(); await second.goto(url); await second.waitForFunction(() => Boolean(window.check));
    await Promise.all([page.evaluate(() => window.check.drainAttendanceQueue("owner-a")), second.evaluate(() => window.check.drainAttendanceQueue("owner-a"))]);
    assert.equal(requests.flat().length, 225); assert.equal(new Set(requests.flat().map(m => m.mutationId)).size, 225); await second.close();
  });
  await test("Account change during an in-flight batch stops subsequent sends and preserves the rest", async () => {
    await seed(); mode = "delay";
    const result = await page.evaluate(async () => { let current = true; setTimeout(() => { current = false; }, 50); return window.check.drainAttendanceQueue("owner-a", () => current); });
    assert.equal(result.success, false); assert.equal(requests.length, 1);
    assert.equal((await page.evaluate(() => window.check.getQueueCounts("owner-a"))).pending, 175);
  });
  await test("Legacy version-2 IndexedDB marks survive migration in nonretryable quarantine", async () => {
    await page.evaluate(async () => {
      const { offlineDB, Dexie } = window.check; offlineDB.close(); await Dexie.delete("shabab360-offline");
      const legacy = new Dexie("shabab360-offline"); legacy.version(2).stores({ queue: "mutationId, eventId, participantId, state, queuedAt", conflicts: "id, mutationId, entityType, entityId, status, detectedAt" });
      await legacy.table("queue").add({ mutationId: "legacy-mark", eventId: "e", participantId: "p", status: "present", state: "pending", queuedAt: new Date().toISOString() }); legacy.close(); await offlineDB.open();
    });
    const row = await page.evaluate(() => window.check.offlineDB.queue.get("legacy-mark")); assert.equal(row.state, "failed"); assert.equal(row.retryable, false); assert.equal(row.ownerId, null);
    assert.deepEqual(await page.evaluate(() => window.check.getPendingSyncItems("owner-a")), []);
  });
  await test("Stored minutes payloads render as text without script, image, or event-handler execution", async () => {
    const html = await page.evaluate(() => {
      const payload = '<img src=x onerror="window.ASTRA_XSS=1"><script>window.ASTRA_XSS=2</script>';
      return window.check.generateMashwaraMinutes({ id: "synthetic", title: payload, meetingDate: "2026-09-09", cityName: payload, parkName: payload, notes: payload, status: payload, attendees: [{ name: payload, role: payload, isPresent: true }], decisions: [{ title: payload, details: payload, category: payload }], actionItems: [{ title: payload, assigneeName: payload, teamName: payload, status: payload }] }).content;
    });
    const exportPage = await context.newPage(); await exportPage.setContent(html); await exportPage.waitForTimeout(150);
    assert.equal(await exportPage.evaluate(() => window.ASTRA_XSS), undefined); assert.equal(await exportPage.locator("script,img,[onerror]").count(), 0);
    assert((await exportPage.locator("body").innerText()).includes("<img src=x"));
    await exportPage.screenshot({ path: path.join(out, "escaped-minutes.png"), fullPage: true }); await exportPage.close();
  });
} finally {
  await browser?.close(); await new Promise(resolve => server.close(resolve));
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(out, "results.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(root, "docs/reviews/v2-audit-2026-09-08/astra-browser-corrections-results.json"), JSON.stringify(report, null, 2));
  process.exitCode = report.tests.length === 7 && report.tests.every(t => t.passed) ? 0 : 1;
}
