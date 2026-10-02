"""Inventory pinned C1 subjects. Inventoried never means behaviorally assessed."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs/delivery/consolidation"
PRIVATE = Path("D:/iBuild/Shabab-360-c0-20260911")
BASES = {"main": PRIVATE / "integration", "v2": PRIVATE / "restore-candidate"}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT).decode("utf-8")


def write(name, data):
    (OUT / name).write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def blocks(path):
    source = path.read_text(encoding="utf-8")
    result = {}
    for match in re.finditer(r"^(model|enum)\s+(\w+)\s*\{(.*?)^\}", source, re.M | re.S):
        fields = {}
        for line in match.group(3).splitlines():
            value = line.split("//")[0].strip()
            if value:
                key = value.split()[0]
                # Preserve every model-level constraint instead of collapsing @@index entries.
                if key.startswith("@@"):
                    key = value
                fields[key] = re.sub(r"\s+", " ", value)
        result[match.group(2)] = {"kind": match.group(1), "line": source[:match.start()].count("\n") + 1, "fields": fields}
    return result


def main():
    inventory = json.loads((ROOT / "docs/delivery/baseline/BRANCH_REFRESH.json").read_text())
    routing = {row["path"]: row["register"] for row in json.loads((ROOT / "docs/delivery/baseline/MAIN_PATH_DISPOSITIONS.json").read_text())}
    previous_path = OUT / "C1_COVERAGE.json"
    previous = json.loads(previous_path.read_text()) if previous_path.exists() else {}
    path_rows = []
    for category in ["mainOnlyPaths", "changedSharedPaths"]:
        prior = {row["path"]: row for row in previous.get(category, [])}
        for name in inventory[category]:
            observations = {}
            for label, root in BASES.items():
                path = root / name
                if not path.is_file():
                    observations[label] = None
                    continue
                raw = path.read_bytes()
                observations[label] = {"sha256": sha(raw)}
                if name.endswith((".ts", ".tsx", ".mjs", ".cjs")):
                    source = raw.decode("utf-8")
                    observations[label]["lines"] = len(source.splitlines())
                    observations[label]["routeMethods"] = re.findall(r"export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b", source)
            row = prior.get(name, {"path": name, "register": routing.get(name), "assessed": False, "disposition": None, "evidence": [], "reason": "Pending source/behavior assessment; inventory is not parity evidence"})
            if row.get("assessed") and row.get("sources") != observations:
                raise ValueError("Assessed source changed; invalidate/review explicitly: " + name)
            row["category"] = category
            row["sources"] = observations
            path_rows.append(row)
    commits = []
    prior = {row["sha"]: row for row in previous.get("mainUniqueCommits", [])}
    for commit in inventory["mainUniqueCommits"]:
        if not re.fullmatch(r"[0-9a-f]{40}", commit):
            raise ValueError("Invalid pinned SHA")
        row = prior.get(commit, {"sha": commit, "assessed": False, "disposition": None, "evidence": [], "reason": "Patch requires semantic disposition; touched paths are routing only"})
        row["changedPaths"] = git("diff-tree", "--root", "--no-commit-id", "--name-only", "-r", commit).splitlines()
        row["subject"] = git("show", "-s", "--format=%s", commit).strip()
        commits.append(row)
    coverage = {"date": "2026-09-11", "identity": inventory["refs"], "status": "in_progress", "mainOnlyPaths": [r for r in path_rows if r["category"] == "mainOnlyPaths"], "changedSharedPaths": [r for r in path_rows if r["category"] == "changedSharedPaths"], "mainUniqueCommits": commits, "registers": previous.get("registers", [{"id": f"MP{i:02}", "assessed": False} for i in range(1, 15)]), "requirements": previous.get("requirements", [{"id": f"R{i:02}", "assessed": False} for i in range(1, 36)])}
    write("C1_COVERAGE.json", coverage)
    schema_result = {}
    for provider, schema in [("sqlite", "prisma/schema.prisma"), ("postgres", "prisma/postgres/schema.prisma")]:
        schemas = {label: blocks(root / schema) for label, root in BASES.items()}
        main_models, v2_models = schemas["main"], schemas["v2"]
        changes = []
        for name in sorted(set(main_models) | set(v2_models)):
            left, right = main_models.get(name), v2_models.get(name)
            if left and right and left["fields"] == right["fields"]:
                continue
            changes.append({"name": name, "main": left, "v2": right, "mappingVerified": False})
        migration_dir = Path(schema).parent / "migrations"
        migrations = {label: {str(p.relative_to(root / migration_dir)).replace("\\", "/"): sha(p.read_bytes()) for p in sorted((root / migration_dir).glob("*/migration.sql"))} for label, root in BASES.items()}
        shared = set(migrations["main"]) & set(migrations["v2"])
        schema_result[provider] = {"schema": schema, "modelCounts": {label: sum(b["kind"] == "model" for b in data.values()) for label, data in schemas.items()}, "changedBlocks": changes, "migrations": migrations, "sharedMigrationHashConflicts": [name for name in sorted(shared) if migrations["main"][name] != migrations["v2"][name]]}
    write("C1_SCHEMA_DIFF.json", schema_result)
    summary = {"inventoryComplete": True, "behaviorAssessmentComplete": False, "counts": {key: len(coverage[key]) for key in ["mainOnlyPaths", "changedSharedPaths", "mainUniqueCommits", "registers", "requirements"]}, "assessed": {key: sum(row["assessed"] for row in coverage[key]) for key in ["mainOnlyPaths", "changedSharedPaths", "mainUniqueCommits", "registers", "requirements"]}, "modelCounts": {provider: value["modelCounts"] for provider, value in schema_result.items()}, "schemaChangedBlocks": {provider: len(value["changedBlocks"]) for provider, value in schema_result.items()}, "migrationConflicts": {provider: value["sharedMigrationHashConflicts"] for provider, value in schema_result.items()}}
    write("C1_INVENTORY_CHECK.json", summary)
    print(json.dumps(summary))


if __name__ == "__main__":
    main()
