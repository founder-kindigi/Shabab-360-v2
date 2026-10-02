// Focused validation of the delivery tooling; does not run application code or touch a DB.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { readState, validateState, repositoryRoot } from "./check-workflow.mjs";

const report = { date: new Date().toISOString(), checks: [], limits: ["Bundled Python skill validator could not run: PyYAML is absent. Restricted plain-scalar frontmatter checks below cover these skills without installing dependencies.", "Manual hook/script invocation does not prove automatic client lifecycle activation.", "No fresh application build, full regression suite or live verification is implied by this tooling check."] };
function check(name, fn) { fn(); report.checks.push({ name, passed: true }); }
try {
  check("one-task coordination state", () => assert.deepEqual(validateState(readState()), []));
  for (const name of ["shabab-module-delivery", "shabab-clean-code", "shabab-build-feature"]) check(`skill ${name}`, () => {
    const text = readFileSync(resolve(repositoryRoot, `.agents/skills/${name}/SKILL.md`), "utf8").replaceAll("\r\n", "\n");
    const match = text.match(/^---\n([\s\S]*?)\n---\n/);assert(match);
    const fields = {};
    for (const line of match[1].split("\n").filter(Boolean)) {
      const pair = line.match(/^(name|description): ([^\n]+)$/);assert(pair, "These checked skills require plain name/description frontmatter");assert(!fields[pair[1]], "Duplicate key");fields[pair[1]] = pair[2];
    }
    assert.equal(fields.name, name);assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name));assert(name.length <= 64);
    assert(fields.description.length > 0 && fields.description.length <= 1024);assert(!/[<>]/.test(fields.description));assert(!text.includes("[TODO:"));
  });
  check("documentation links", () => {
    for (const file of ["docs/README.md", "docs/delivery/README.md", "docs/delivery/PLAN.md", "docs/delivery/REFERENCES.md", "docs/delivery/AUTOMATION.md"]) {
      const full = resolve(repositoryRoot, file), body = readFileSync(full, "utf8");
      for (const match of body.matchAll(/\]\(([^)]+)\)/g)) {
        if (/^https?:\/\//.test(match[1])) continue;
        const target = match[1].split("#")[0];assert(existsSync(resolve(dirname(full), target)), `${file}: missing link ${target}`);
      }
    }
  });
  check("source reference coverage", () => {
    const inventory = JSON.parse(readFileSync(resolve(repositoryRoot, "docs/delivery/REFERENCE_INVENTORY.json"), "utf8"));
    const currentFiles = [...readdirSync(resolve(repositoryRoot, "docs/pwa screens")).filter(f => /\.png$/i.test(f)).map(f => `docs/pwa screens/${f}`), ...readdirSync(resolve(repositoryRoot, "docs/sheets")).filter(f => /\.xlsx?$/i.test(f)).map(f => `docs/sheets/${f}`)].sort();
    const sources = [...inventory.screens, ...inventory.workbooks];
    assert.deepEqual(sources.map(source => source.file).sort(), currentFiles, "Reference files changed; refresh inventory and intake plan");
    for (const source of sources) assert.equal(createHash("sha256").update(readFileSync(resolve(repositoryRoot, source.file))).digest("hex"), source.sha256, `Reference changed: ${source.file}`);
    report.referenceCoverage = { screens: inventory.screens.length, workbooks: inventory.workbooks.length, worksheets: inventory.workbooks.reduce((sum, book) => sum + book.sheets.length, 0) };
  });
  check("workflow behavior tests", () => {
    const result = spawnSync(process.execPath, ["--test", "scripts/delivery/check-workflow.test.mjs"], { cwd: repositoryRoot, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);report.workflowTestOutput = result.stdout.trim();
  });
  if (process.platform === "win32") {
    const hooks = JSON.parse(readFileSync(resolve(repositoryRoot, ".codex/hooks.json"), "utf8"));
    for (const event of ["SessionStart", "Stop"]) check(`configured Windows ${event} command`, () => {
      const command = hooks.hooks[event][0].hooks[0].commandWindows;
      const match = command.match(/^powershell -NoProfile -Command "(.*)"$/);assert(match);
      const result = spawnSync("powershell", ["-NoProfile", "-Command", match[1]], { cwd: resolve(repositoryRoot, "docs"), input: "{}", encoding: "utf8", timeout: 10000, windowsHide: true });
      assert.equal(result.status, 0, result.stderr);
      if (event === "SessionStart") assert.equal(JSON.parse(result.stdout).hookSpecificOutput.hookEventName, "SessionStart");
      else if (result.stdout.trim()) assert.equal(typeof JSON.parse(result.stdout).systemMessage, "string");
    });
  }
  report.passed = true;
} catch (error) { report.passed = false;report.error = error.message;process.exitCode = 1; }
writeFileSync(resolve(repositoryRoot, "docs/delivery/SETUP_VERIFICATION.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, error: report.error, limits: report.limits }));
