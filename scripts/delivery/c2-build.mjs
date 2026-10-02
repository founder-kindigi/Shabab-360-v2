// Build the C2 source with a provider-local generated client; never opens a DB.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const provider = process.argv[2];
if (!["sqlite", "postgres"].includes(provider)) throw Error("Expected sqlite or postgres");
const root = process.cwd();
const source = "D:/iBuild/Shabab-360-c0-20260911/c2-foundation-20260912";
const directory = fs.mkdtempSync(`D:/iBuild/Shabab-360-c0-20260911/c2-build-${provider}-20260912-`);
const files = {};
function copy(from, to, relative) {
  if (fs.statSync(from).isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from)) copy(path.join(from, entry), path.join(to, entry), `${relative}/${entry}`);
  } else {
    const data = fs.readFileSync(from);
    fs.writeFileSync(to, data);
    files[relative] = createHash("sha256").update(data).digest("hex");
  }
}
for (const name of ["src", "public", "scripts", "prisma", "package.json", "package-lock.json", "tsconfig.json", "next.config.ts", "postcss.config.mjs", "vitest.config.ts", "vitest.setup.ts"])
  copy(path.join(source, name), path.join(directory, name), name);
const dependencies = path.join(directory, "node_modules");
fs.mkdirSync(dependencies);
for (const entry of fs.readdirSync(path.join(source, "node_modules"), { withFileTypes: true })) {
  if (!entry.isDirectory() || ["@prisma", ".prisma", ".bin", ".cache", ".vite", ".vite-temp"].includes(entry.name)) continue;
  fs.symlinkSync(path.join(source, "node_modules", entry.name), path.join(dependencies, entry.name), "junction");
}
fs.mkdirSync(path.join(dependencies, "@prisma"));
for (const entry of fs.readdirSync(path.join(source, "node_modules/@prisma"), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const from = path.join(source, "node_modules/@prisma", entry.name), to = path.join(dependencies, "@prisma", entry.name);
  if (entry.name === "client") fs.cpSync(from, to, { recursive: true });
  else fs.symlinkSync(from, to, "junction");
}
// Clear inherited connection/provider settings without logging their values.
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  !/(?:DATABASE|DIRECT_URL|POSTGRES|^PG|^PRISMA_|^NEXTAUTH_|^AUTH_|^SMTP_|^RESEND_|^SENDGRID_|^IMPORT_HMAC_SECRET$)/i.test(key)));
Object.assign(env, {
  DATABASE_URL: provider === "sqlite" ? "file::memory:" : "postgresql://test:test@127.0.0.1:1/shabab360_test",
  DIRECT_URL: "postgresql://test:test@127.0.0.1:1/shabab360_test",
  NEXTAUTH_URL: "http://127.0.0.1:3000",
  NEXTAUTH_SECRET: "synthetic-isolated-build-secret-no-real-accounts",
  IMPORT_HMAC_SECRET: "synthetic-build-import-secret-not-for-deployment",
  NEXT_TELEMETRY_DISABLED: "1",
});
const output = path.join(root, `docs/delivery/consolidation/C2_01_BUILD_${provider.toUpperCase()}.json`);
const logPath = path.join(root, `docs/delivery/consolidation/C2_01_BUILD_${provider.toUpperCase()}.log`);
const log = fs.openSync(logPath, "w");
const report = { provider, directory, files, checks: [], meaning: "Isolated provider build; not a migration or operational database check" };
const schema = provider === "sqlite" ? "prisma/schema.prisma" : "prisma/postgres/schema.prisma";
try {
  for (const [script, args] of [
    ["prisma/build/index.js", ["validate", "--schema", schema]],
    ["prisma/build/index.js", ["generate", "--schema", schema]],
    ["next/dist/bin/next", ["build", "--webpack"]],
  ]) {
    const result = spawnSync(process.execPath, [path.join(directory, "node_modules", script), ...args], {
      cwd: directory, env, stdio: ["ignore", log, log], timeout: 1200000, windowsHide: true,
    });
    report.checks.push({ command: `${script} ${args.join(" ")}`, exitCode: result.status, signal: result.signal, error: result.error?.message ?? null });
    fs.writeFileSync(output, JSON.stringify(report, null, 2));
    if (result.status !== 0) break;
  }
} finally { fs.closeSync(log); }
report.passed = report.checks.length === 3 && report.checks.every(check => check.exitCode === 0);
fs.writeFileSync(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ provider, passed: report.passed, checks: report.checks }));
process.exitCode = report.passed ? 0 : 1;
