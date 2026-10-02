"""Rehearse pinned SQLite SQL in memory only; no operational URLs or files."""
import hashlib
import json
from pathlib import Path
import re
import sqlite3

ROOT = Path(__file__).resolve().parents[2]
PRIVATE = Path("D:/iBuild/Shabab-360-c0-20260911")
SCALARS = {"String", "Int", "BigInt", "Float", "Decimal", "Boolean", "DateTime", "Bytes", "Json"}


def modeled_columns(path):
    source = path.read_text(encoding="utf-8")
    models = {}
    for match in re.finditer(r"^model\s+(\w+)\s*\{(.*?)^\}", source, re.M | re.S):
        mapping = re.search(r'@@map\("([^"\n]+)"\)', match.group(2))
        table = mapping.group(1) if mapping else match.group(1)
        columns = []
        for line in match.group(2).splitlines():
            fields = line.strip().split()
            if len(fields) < 2 or fields[1].rstrip("?") not in SCALARS:
                continue
            name = re.search(r'(?<!@)@map\("([^"\n]+)"\)', line)
            columns.append(name.group(1) if name else fields[0])
        models[table] = columns
    return models


def allow(action, arg1, arg2, _database, _trigger):
    if action in {sqlite3.SQLITE_ATTACH, sqlite3.SQLITE_DETACH}:
        return sqlite3.SQLITE_DENY
    if action == sqlite3.SQLITE_FUNCTION and str(arg2).lower() in {"load_extension", "writefile", "readfile"}:
        return sqlite3.SQLITE_DENY
    return sqlite3.SQLITE_OK


results = {}
for variant, folder in [("main", "integration"), ("v2", "restore-candidate")]:
    base = PRIVATE / folder
    connection = sqlite3.connect(":memory:")
    connection.enable_load_extension(False)
    connection.set_authorizer(allow)
    steps = []
    for path in sorted((base / "prisma/migrations").glob("*/migration.sql")):
        raw = path.read_bytes()
        step = {"migration": path.parent.name, "sha256": hashlib.sha256(raw).hexdigest()}
        try:
            connection.executescript(raw.decode("utf-8-sig"))
            step["applied"] = True
        except sqlite3.DatabaseError as error:
            step.update(applied=False, error=str(error))
        steps.append(step)
        if not step["applied"]:
            break
    actual = {row[0]: [column[1] for column in connection.execute('PRAGMA table_info("' + row[0].replace('"', '""') + '")')] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    expected = modeled_columns(base / "prisma/schema.prisma")
    missing_tables = sorted(set(expected) - set(actual))
    missing_columns = {table: sorted(set(columns) - set(actual[table])) for table, columns in expected.items() if table in actual and set(columns) - set(actual[table])}
    results[variant] = {"steps": steps, "allMigrationsApplied": all(s["applied"] for s in steps) and len(steps) == len(list((base / "prisma/migrations").glob("*/migration.sql"))), "expectedModelTables": len(expected), "actualTables": len(actual), "missingModeledTables": missing_tables, "missingModeledColumns": missing_columns, "foreignKeyViolations": len(connection.execute("PRAGMA foreign_key_check").fetchall()), "modeledColumnParity": not missing_tables and not missing_columns}
    connection.close()
output = {"date": "2026-09-11", "sqliteVersion": sqlite3.sqlite_version, "mode": "Fresh in-memory database per pinned baseline; SQLite engine executes original SQL. No files, live DB, Prisma client or operational environment used.", "results": results, "limits": "Models/column existence only; no data upgrade, PostgreSQL runtime, constraint/type parity or live migration compatibility claim. Script success means evidence collected, not migration chains passed."}
(ROOT / "docs/delivery/consolidation/C1_SQLITE_HISTORY.json").write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
print(json.dumps(output))
