import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const sha256 = value => createHash("sha256").update(value).digest("hex");
const changed = [...new Set([...git("diff", "--name-only", "HEAD").split("\n"), ...git("ls-files", "--others", "--exclude-standard").split("\n")])].filter(p => /^(src\/|prisma\/|public\/|next\.config\.ts$|package(-lock)?\.json$|tsconfig\.json$|postcss\.config\.mjs$)/.test(p)).sort();
const files = changed.map(path => ({ path, sha256: fs.existsSync(path) ? sha256(fs.readFileSync(path)) : null }));
const builds = [];
const normalizeWhitespace = value => value.replaceAll("\r\n", "\n").replace(/[\t ]+$/gm, "");
for (const provider of ["sqlite", "postgres"]) {
  const report = JSON.parse(fs.readFileSync(`docs/reviews/v2-audit-2026-09-08/astra-build-${provider}-results.json`));
  const differences = report.files.filter(file => !fs.existsSync(file.path) || sha256(fs.readFileSync(file.path)) !== file.sha256).map(file => {
    const copied = report.directory + "/" + file.path;
    return { path: file.path, whitespaceOnly: fs.existsSync(file.path) && fs.existsSync(copied) && normalizeWhitespace(fs.readFileSync(file.path, "utf8")) === normalizeWhitespace(fs.readFileSync(copied, "utf8")) };
  });
  builds.push({ provider, directory: report.directory, sourceCopiedAt: report.sourceCopiedAt, exitCode: report.build?.exitCode ?? null, differences });
}
const result = { recordedAt: new Date().toISOString(), branch: git("branch", "--show-current"), base: git("rev-parse", "HEAD"), candidateManifestSha256: sha256(JSON.stringify(files)), files, builds, limitations: "Manifest includes all changed application/schema/config/test files, including pre-existing candidate work; it does not assign authorship. Original Astra review manifest remains separate and unchanged. Build differences list any later source edits explicitly." };
fs.writeFileSync("docs/reviews/v2-audit-2026-09-08/astra-correction-candidate-manifest.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify({ branch: result.branch, base: result.base, candidateManifestSha256: result.candidateManifestSha256, files: files.length, builds }));
