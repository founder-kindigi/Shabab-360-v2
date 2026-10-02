"""Reproducible source/patch index; extraction alone does not assign verdicts."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs/delivery/consolidation"
BASES = {"main": Path("D:/iBuild/Shabab-360-c0-20260911/integration"), "v2": Path("D:/iBuild/Shabab-360-c0-20260911/restore-candidate")}
coverage = json.loads((OUT / "C1_COVERAGE.json").read_text())


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT).decode("utf-8")


def facts(base, name):
    p = base / name
    if not p.is_file():
        return None
    raw = p.read_bytes()
    result = {"sha256": hashlib.sha256(raw).hexdigest()}
    if p.suffix not in {".ts", ".tsx", ".mjs", ".cjs", ".md", ".yml", ".json", ".sql", ".css"} or name.endswith("package-lock.json"):
        return result
    source = raw.decode("utf-8-sig")
    result["lines"] = len(source.splitlines())
    patterns = {
        "methods": r"export\s+(?:async\s+)?function\s+(GET|POST|PATCH|PUT|DELETE|HEAD)\b",
        "capabilities": r'(?:requireCapability|userHasCapability)\([^\n]*?["\']([a-z][\w.]+)["\']',
        "dbCalls": r"\b(?:db|tx|prisma)\.([\w]+\.[\w]+|\$transaction)\s*\(",
        "scopes": r"\b(require\w*Scope|resolve\w*(?:Scope|City)|verify\w*(?:Access|Poc)|get\w*Scope)\s*\(",
        "tests": r'\b(?:it|test)\s*\(\s*["\']([^\n]*?)["\']',
        "requests": r'\bfetch\s*\(\s*[`"\']([^\n]*?)[`"\']',
        "headers": r"^(#{1,3} .*)$",
    }
    for key, pattern in patterns.items():
        items = []
        for match in re.finditer(pattern, source, re.M):
            items.append({"line": source[:match.start()].count("\n") + 1, "value": match.group(1)})
        if items:
            result[key] = items
    return result


names = set(r["path"] for c in ["mainOnlyPaths", "changedSharedPaths"] for r in coverage[c])
names.update(p for row in coverage["mainUniqueCommits"] for p in row["changedPaths"])
index = {name: {label: facts(base, name) for label, base in BASES.items()} for name in sorted(names)}
(OUT / "C1_SOURCE_INDEX.json").write_text(json.dumps(index, indent=2) + "\n", encoding="utf-8")
commits = []
for row in coverage["mainUniqueCommits"]:
    patch = git("show", "--format=", "--no-ext-diff", "--unified=0", row["sha"], "--", ".", ":(exclude)docs/sheets", ":(exclude)prisma/seed.ts", ":(exclude)package-lock.json")
    # Only public source structure is recorded; never copy literal changed data.
    commits.append({"sha": row["sha"], "patchSha256": hashlib.sha256(patch.encode()).hexdigest(), "changedPaths": row["changedPaths"], "hunks": [line for line in patch.splitlines() if line.startswith("@@")], "addedLines": sum(l.startswith("+") and not l.startswith("+++") for l in patch.splitlines()), "removedLines": sum(l.startswith("-") and not l.startswith("---") for l in patch.splitlines()), "excludedContent": ["docs/sheets", "prisma/seed.ts", "package-lock.json"], "assessment": "Patch structure and per-path source comparison; not a claim of manual full patch/security review"})
(OUT / "C1_PATCH_INDEX.json").write_text(json.dumps(commits, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"sourcePaths": len(index), "patches": len(commits)}))
