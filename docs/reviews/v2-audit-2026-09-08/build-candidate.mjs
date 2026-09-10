// Isolated source snapshot, client generation, and production build. Never opens a configured DB.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
const provider = process.argv[2];
if (!["sqlite", "postgres"].includes(provider)) throw Error("Pass sqlite or postgres");
const root = process.cwd();
const directory = fs.mkdtempSync(path.join(root, `.next/astra-build-${provider}-`));
const reportFile = path.join(root, `docs/reviews/v2-audit-2026-09-08/astra-build-${provider}-results.json`);
const files = [];
function copyTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name), destination = path.join(to, entry.name);
    if (entry.isDirectory()) copyTree(source, destination);
    else {
      const content = fs.readFileSync(source);
      fs.writeFileSync(destination, content);
      files.push({ path: path.relative(root, source).replaceAll("\\", "/"), sha256: createHash("sha256").update(content).digest("hex") });
    }
  }
}
for (const name of ["src", "public", "scripts"]) if (fs.existsSync(name)) copyTree(path.join(root, name), path.join(directory, name));
for (const name of ["package.json", "next-env.d.ts", "postcss.config.mjs"]) fs.copyFileSync(path.join(root, name), path.join(directory, name));
// Keep normal package resolution and Next's Prisma externalization. Aliasing a
// custom client through webpack would bundle its dynamic runtime lookups.
const dependencies = path.join(directory, "node_modules");
fs.mkdirSync(dependencies);
for (const entry of fs.readdirSync(path.join(root, "node_modules"), { withFileTypes: true })) {
  if (!entry.isDirectory() || ["@prisma", ".prisma", ".bin"].includes(entry.name)) continue;
  fs.symlinkSync(path.join(root, "node_modules", entry.name), path.join(dependencies, entry.name), "junction");
}
fs.mkdirSync(path.join(dependencies, "@prisma"));
for (const entry of fs.readdirSync(path.join(root, "node_modules/@prisma"), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const from = path.join(root, "node_modules/@prisma", entry.name), to = path.join(dependencies, "@prisma", entry.name);
  if (entry.name === "client") fs.cpSync(from, to, { recursive: true });
  else fs.symlinkSync(from, to, "junction");
}
fs.mkdirSync(path.join(directory, "prisma"));
const schemaPath = provider === "postgres" ? "prisma/postgres/schema.prisma" : "prisma/schema.prisma";
const schema = fs.readFileSync(schemaPath, "utf8");
files.push({ path: schemaPath, sha256: createHash("sha256").update(schema).digest("hex") });
fs.writeFileSync(path.join(directory, "prisma/schema.prisma"), schema.replace('provider = "prisma-client-js"', 'provider = "prisma-client-js"\n  output = "../node_modules/.prisma/client"'));
const tsconfig = JSON.parse(fs.readFileSync("tsconfig.json"));
tsconfig.exclude = ["node_modules"];
fs.writeFileSync(path.join(directory, "tsconfig.json"), JSON.stringify(tsconfig, null, 2));
const config = fs.readFileSync("next.config.ts", "utf8");
files.push({ path: "next.config.ts", sha256: createHash("sha256").update(config).digest("hex") });
fs.writeFileSync(path.join(directory, "next.config.ts"), config);
const env = { ...process.env, DATABASE_URL: provider === "postgres" ? "postgresql://synthetic:synthetic@127.0.0.1:65439/synthetic" : "file:./synthetic-build.db", DIRECT_URL: "postgresql://synthetic:synthetic@127.0.0.1:65439/synthetic", NEXTAUTH_SECRET: "synthetic-isolated-build-secret-no-real-accounts", NEXTAUTH_URL: "http://localhost:4319", NEXT_TELEMETRY_DISABLED: "1" };
const report = { provider, directory, sourceCopiedAt: new Date().toISOString(), files, modifications: "Isolated Prisma output and client package; other dependencies linked; no source/config aliases or environment files copied", generation: null, build: null };
const log = fs.openSync(path.join(directory, "build-output.log"), "w");
const run = (script, args) => {
  const result = spawnSync(process.execPath, [path.join(root, script), ...args], { cwd: directory, env, stdio: ["ignore", log, log], timeout: 1200000 });
  return { exitCode: result.status, signal: result.signal, error: result.error?.message ?? null };
};
try {
  report.generation = run("node_modules/prisma/build/index.js", ["generate", "--schema", "prisma/schema.prisma"]);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  if (report.generation.exitCode === 0) {
    report.routeTypes = run("node_modules/next/dist/bin/next", ["typegen"]);
    report.typecheck = report.routeTypes.exitCode === 0 ? run("node_modules/typescript/bin/tsc", ["--noEmit"]) : null;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    if (report.typecheck?.exitCode === 0) report.build = run("node_modules/next/dist/bin/next", ["build", "--webpack"]);
  }
} finally {
  fs.closeSync(log);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(directory, "build-report.json"), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ provider, directory, generation: report.generation, build: report.build }));
process.exitCode = report.build?.exitCode === 0 ? 0 : 1;
