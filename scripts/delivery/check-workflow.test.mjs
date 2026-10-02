import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { validateState, readState, repositoryRoot } from "./check-workflow.mjs";

const fixture = mkdtempSync(join(tmpdir(), "shabab-delivery-test-"));
writeFileSync(join(fixture, "packet.md"), "Synthetic assignment");
writeFileSync(join(fixture, "evidence.json"), "{}");
after(() => rmSync(fixture, { recursive: true }));
const task = (id = "M01-API") => ({ id, module: "synthetic", owner: "Astra", status: "ready", packet: "packet.md", evidence: [] });
const state = () => ({ version: 1, activeTask: null, nextTask: "M01-API", tasks: [task()] });

test("ready task and accepted completion have valid coordination metadata", () => {
  const value = state(); assert.deepEqual(validateState(value, fixture), []);
  Object.assign(value.tasks[0], { status: "done", reviewOutcome: "accepted", evidence: ["evidence.json"] }); value.nextTask = null;
  assert.deepEqual(validateState(value, fixture), []);
});
test("two agents cannot hold simultaneous active/review tasks", () => {
  const value = state();value.tasks.push({ ...task("M01-UI"), owner: "Gemini", status: "review" });value.tasks[0].status = "active";value.activeTask = "M01-API";value.nextTask = null;
  assert(validateState(value, fixture).some(e => e.includes("Only one")));
});
test("incomplete dependency prevents activation", () => {
  const value = state();value.tasks.push({ ...task("M01-UI"), status: "active", dependsOn: ["M01-API"] });value.activeTask = "M01-UI";
  assert(validateState(value, fixture).some(e => e.includes("unfinished")));
});
test("completion cannot omit evidence or accepted review", () => {
  const value = state();value.tasks[0].status = "done";value.nextTask = null;
  assert(validateState(value, fixture).some(e => e.includes("completion requires")));
});
test("missing, directory and external packet paths are rejected", () => {
  for (const packet of ["missing.md", ".", "../outside.md"]) { const value = state();value.tasks[0].packet = packet;assert(validateState(value, fixture).some(e => e.includes("packet missing"))); }
});
test("unknown owner and inconsistent active pointer are rejected", () => {
  const value = state();value.tasks[0].owner = "Unassigned model";value.activeTask = "M01-API";
  assert(validateState(value, fixture).length >= 2);
});
test("repository state and hook output are valid without forcing continuation", () => {
  const current = readState();assert.deepEqual(validateState(current), []);
  const start = spawnSync(process.execPath, [".codex/hooks/session-context.mjs"], { cwd: repositoryRoot, encoding: "utf8", input: "{}" });
  assert.equal(start.status, 0);const output = JSON.parse(start.stdout);assert.equal(output.hookSpecificOutput.hookEventName, "SessionStart");assert(output.hookSpecificOutput.additionalContext.includes(current.activeTask ?? current.nextTask ?? "none"));
  const stop = spawnSync(process.execPath, [".codex/hooks/delivery-reminder.mjs"], { cwd: repositoryRoot, encoding: "utf8", input: "{}" });
  assert.equal(stop.status, 0);if (current.activeTask) assert(JSON.parse(stop.stdout).systemMessage.includes(current.activeTask));else assert.equal(stop.stdout, "");
});
