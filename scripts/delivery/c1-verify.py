"""Validate C1 inventory coverage independently; unresolved assessment stays open."""
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs/delivery/consolidation"


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT).decode("utf-8")


def tree(ref):
    entries = {}
    for record in git("ls-tree", "-r", "-z", ref).split("\0"):
        if not record:
            continue
        meta, path = record.split("\t", 1)
        entries[path] = meta.split()[2]
    return entries


coverage = json.loads((OUT / "C1_COVERAGE.json").read_text())
main = tree(coverage["identity"]["origin/main"])
v2 = tree(coverage["identity"]["HEAD"])
expected = {
    "mainOnlyPaths": set(main) - set(v2),
    "changedSharedPaths": {p for p in main.keys() & v2.keys() if main[p] != v2[p]},
    "mainUniqueCommits": set(git("log", "--left-only", "--cherry-pick", "--format=%H", coverage["identity"]["origin/main"] + "..." + coverage["identity"]["HEAD"]).splitlines()),
    "registers": {f"MP{i:02}" for i in range(1, 15)},
    "requirements": {f"R{i:02}" for i in range(1, 36)},
}
errors, unresolved, counts = [], {}, {}
for category, identities in expected.items():
    key = "path" if "Paths" in category else "sha" if category == "mainUniqueCommits" else "id"
    rows = coverage[category]
    actual = [r[key] for r in rows]
    if len(set(actual)) != len(actual) or set(actual) != identities:
        errors.append({"category": category, "missing": sorted(identities - set(actual)), "unexpected": sorted(set(actual) - identities), "duplicates": len(actual) - len(set(actual))})
    counts[category] = len(rows)
    unresolved[category] = sum(not r["assessed"] for r in rows)
    for row in rows:
        if row["assessed"] and not row.get("reason", "").strip():
            errors.append({"category": category, "id": row[key], "error": "Assessment requires a reason"})
        if "Paths" in category and row["assessed"] and row.get("register") not in expected["registers"]:
            errors.append({"category": category, "id": row[key], "error": "Assessment requires a valid MP register"})
        if row["assessed"] and (not row.get("evidence") or row.get("disposition") not in {"preserve", "adapt into v2", "equivalent replacement verified", "intentionally gated", "owner decision required"}):
            errors.append({"category": category, "id": row[key], "error": "Assessment requires disposition and evidence"})
        for evidence in row.get("evidence", []):
            if not (ROOT / evidence).is_file():
                errors.append({"category": category, "id": row[key], "error": "Missing evidence file", "path": evidence})
complete = not errors and not any(unresolved.values())
result = {"inventoryValid": not errors, "dispositionCoverageComplete": complete, "counts": counts, "unassessed": unresolved, "errors": errors, "outcome": "C1 reconciliation dispositions accounted for" if complete else "C1 remains open; no C2 packet ready"}
result["meaning"] = "Checks inventory and recorded reconciliation dispositions; does not establish source-review depth, behavioral equivalence, fix verification, migration safety or release approval."
(OUT / "C1_COVERAGE_CHECK.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result))
sys.exit(1 if errors or ("--require-complete" in sys.argv and not complete) else 0)
