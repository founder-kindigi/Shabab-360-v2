// Match private source identifiers in emitted public assets; report counts/hashes only.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const provider = process.argv[2] || "sqlite";
const candidate = JSON.parse(fs.readFileSync(`docs/reviews/v2-audit-2026-09-08/astra-build-${provider}-results.json`));
if (candidate.build?.exitCode !== 0) throw Error("A successful isolated build is required");
const raw = fs.readFileSync("src/lib/import-framework/portal-raw-dataset.json");
const dataset = JSON.parse(raw);
const fields = ["email", "cnic", "mobile", "whatsapp", "studentPhone", "studentWhatsapp", "parentPhone", "parentWhatsapp", "mehramPhone", "mehramWhatsapp"];
const needles = [...new Set(dataset.flatMap(row => fields.map(key => String(row[key] ?? "").trim())).filter(value => value.length >= 8 && new Set(value).size > 3 && (value.includes("@") || value.replace(/\D/g, "").length >= 10)))];
const assets = [];
function visit(directory) { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { const file = path.join(directory, entry.name); if (entry.isDirectory()) visit(file); else if (/\.(js|map)$/.test(entry.name)) assets.push(file); } }
visit(path.join(candidate.directory, ".next/static"));
const matches = []; const manifest = [];
for (const file of assets) {
  const bytes = fs.readFileSync(file), text = bytes.toString("utf8");
  const count = needles.filter(value => text.includes(value) || text.includes(JSON.stringify(value).slice(1, -1))).length;
  const name = path.relative(candidate.directory, file).replaceAll("\\", "/");
  manifest.push({ path: name, sha256: createHash("sha256").update(bytes).digest("hex") });
  if (count || text.includes("portal-raw-dataset")) matches.push({ path: name, identifierMatches: count, datasetFilenamePresent: text.includes("portal-raw-dataset") });
}
const report = { provider, checkedAt: new Date().toISOString(), buildDirectory: candidate.directory, sourceCopiedAt: candidate.sourceCopiedAt, datasetSha256: createHash("sha256").update(raw).digest("hex"), privateIdentifiersChecked: needles.length, javascriptAssets: assets.filter(p => p.endsWith(".js")).length, sourceMaps: assets.filter(p => p.endsWith(".map")).length, matches, manifest, passed: matches.length === 0, limits: "Scans this build's public JavaScript and emitted source maps against dataset filename and distinct email/CNIC/phone values. Does not inspect historical deployed/CDN/service-worker caches or prove absence of every possible personal field." };
fs.writeFileSync(`docs/reviews/v2-audit-2026-09-08/astra-client-bundle-${provider}-results.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ provider, passed: report.passed, javascriptAssets: report.javascriptAssets, sourceMaps: report.sourceMaps, privateIdentifiersChecked: needles.length, matchingAssets: matches.length }));
process.exitCode = report.passed ? 0 : 1;
