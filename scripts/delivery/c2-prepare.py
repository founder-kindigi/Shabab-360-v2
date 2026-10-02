"""Create C2's mutable candidate from the pinned, verified C0 snapshot."""
import hashlib
import json
from pathlib import Path
import subprocess
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs/delivery/consolidation"
manifest = json.loads((OUT / "C0_SNAPSHOT.json").read_text())
private = Path(json.loads((OUT / "C0_RELOCATION.json").read_text())["privateRoot"])
target = private / "c2-foundation-20260912"
if target.exists():
    raise SystemExit("Refusing to overwrite an existing C2 candidate")
archive = private / "candidate.zip"
assert hashlib.sha256(archive.read_bytes()).hexdigest() == manifest["archiveSha256"]
subprocess.run(["git", "worktree", "add", "-b", "codex/c2-foundation-20260912", str(target), manifest["head"]], cwd=ROOT, check=True)
copied, excluded = {}, []
with ZipFile(archive) as source:
    for name, expected in manifest["files"].items():
        path = target / name
        assert path.resolve().is_relative_to(target.resolve())
        if (path.name.startswith(".env") and path.name != ".env.example") or path.name == ".build-env" or path.suffix in {".db", ".sqlite", ".sqlite3"} or "node_modules" in path.parts or "generated" in path.parts or name.startswith("docs/sheets/"):
            excluded.append(name)
            # A tracked historical workbook may already exist from checkout.
            # Remove it only from this newly created, verified scratch target.
            if path.is_file():
                path.unlink()
            continue
        data = source.read(name)
        assert hashlib.sha256(data).hexdigest() == expected
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        copied[name] = expected
for name in manifest["deletedTracked"]:
    path = target / name
    assert path.resolve().is_relative_to(target.resolve())
    if path.is_file():
        path.unlink()
assert all(hashlib.sha256((target / name).read_bytes()).hexdigest() == expected for name, expected in copied.items())
result = {"date": "2026-09-12", "target": str(target), "head": manifest["head"], "copied": copied, "excluded": excluded, "verified": True}
(OUT / "C2_01_BASELINE.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({"target": str(target), "verifiedFiles": len(copied), "excludedFiles": len(excluded)}))
