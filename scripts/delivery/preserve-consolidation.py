"""Create and verify a private working-file snapshot; never stages or deletes files."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import subprocess
import sys
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[2]
LOCAL = ROOT / "local-consolidation-20260911"
EVIDENCE = ROOT / "docs/delivery/consolidation"


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT).decode("utf-8")


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def safe(name, destination):
    parts = PurePosixPath(name)
    if parts.is_absolute() or ".." in parts.parts or ":" in name or "\\" in name:
        raise ValueError("Unsafe archive path")
    path = destination.joinpath(*parts.parts)
    if not path.resolve().is_relative_to(destination.resolve()):
        raise ValueError("Path escapes destination")
    return path


def candidates():
    files, excluded = {}, []
    for name in sorted(set(git("ls-files", "--cached", "--others", "--exclude-standard", "-z").split("\0")) - {""}):
        path = ROOT / name
        if path.name.startswith(".env") and path.name != ".env.example" or path.suffix.lower() in {".db", ".sqlite", ".sqlite3", ".pem", ".key"}:
            excluded.append({"path": name, "reason": "environment/database/key excluded"})
        elif path.is_symlink():
            excluded.append({"path": name, "reason": "symlink excluded; preserve original"})
        elif not path.is_file():
            excluded.append({"path": name, "reason": "absent or Git link/directory; preserved by history/deletion register"})
        else:
            files[name] = sha(path.read_bytes())
    return files, excluded


if __name__ == "__main__":
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    if "--create" in sys.argv:
        if LOCAL.exists():
            raise SystemExit("Private preservation destination already exists; inspect before reuse.")
        ignored = subprocess.run(["git", "check-ignore", "--quiet", str(LOCAL / "candidate.zip")], cwd=ROOT)
        if ignored.returncode != 0:
            raise SystemExit("Preservation destination must already be ignored.")
        files, excluded = candidates()
        baseline = json.loads((ROOT / "docs/delivery/baseline/SOURCE_BASELINE.json").read_text(encoding="utf-8"))
        changed = [p for p, h in baseline["files"].items() if files.get(p) != h]
        if changed:
            raise SystemExit("BASE-01 source changed; inspect before preserving: " + ", ".join(changed))
        LOCAL.mkdir()
        archive_path = LOCAL / "candidate.zip"
        with ZipFile(archive_path, "x", ZIP_DEFLATED) as archive:
            for name, expected in files.items():
                raw = (ROOT / name).read_bytes()
                if sha(raw) != expected:
                    raise SystemExit("Source changed during archive: " + name)
                archive.writestr(name, raw)
        restore = LOCAL / "restore-candidate"
        restore.mkdir()
        with ZipFile(archive_path) as archive:
            if set(archive.namelist()) != set(files):
                raise SystemExit("Archive membership mismatch")
            for entry in archive.infolist():
                target = safe(entry.filename, restore)
                target.parent.mkdir(parents=True, exist_ok=True)
                with target.open("xb") as out:
                    out.write(archive.read(entry))
        mismatch = [p for p, h in files.items() if sha((restore / p).read_bytes()) != h]
        drift = [p for p, h in files.items() if not (ROOT / p).is_file() or sha((ROOT / p).read_bytes()) != h]
        manifest = {"sourceRoot": str(ROOT), "privateRoot": str(LOCAL), "head": git("rev-parse", "HEAD").strip(), "branch": git("branch", "--show-current").strip(), "refs": {r: git("rev-parse", r).strip() for r in ["main", "origin/main", "origin/v2"]}, "archive": str(archive_path), "archiveSha256": sha(archive_path.read_bytes()), "restoreDirectory": str(restore), "files": files, "excluded": excluded, "deletedTracked": git("ls-files", "--deleted", "-z").split("\0")[:-1], "indexStateSha256": sha(git("ls-files", "--stage", "-z").encode()), "restoreMismatches": mismatch, "sourceDrift": drift, "passed": not mismatch and not drift}
        (LOCAL / "snapshot-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        (EVIDENCE / "C0_SNAPSHOT.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"passed": manifest["passed"], "files": len(files), "excluded": len(excluded), "privateRoot": str(LOCAL), "restoreMismatches": mismatch, "sourceDrift": drift}))
        sys.exit(0 if manifest["passed"] else 1)
    elif "--verify-original" in sys.argv:
        manifest = json.loads((LOCAL / "snapshot-manifest.json").read_text(encoding="utf-8"))
        allowed = {".agents/memory/current.md", "docs/delivery/state.json", "docs/delivery/tasks/C0-01.md", "docs/delivery/README.md"}
        mismatch = [p for p, h in manifest["files"].items() if p not in allowed and (not (ROOT / p).is_file() or sha((ROOT / p).read_bytes()) != h)]
        restored = [p for p, h in manifest["files"].items() if sha((Path(manifest["restoreDirectory"]) / p).read_bytes()) != h]
        index_same = sha(git("ls-files", "--stage", "-z").encode()) == manifest["indexStateSha256"]
        deleted_same = git("ls-files", "--deleted", "-z").split("\0")[:-1] == manifest["deletedTracked"]
        same_head = git("rev-parse", "HEAD").strip() == manifest["head"]
        result = {"passed": not mismatch and not restored and index_same and deleted_same and same_head, "originalUnexpectedChanges": mismatch, "restoredMismatches": restored, "indexUnchanged": index_same, "deletionsUnchanged": deleted_same, "headUnchanged": same_head, "allowedCoordinationEdits": sorted(allowed)}
        (EVIDENCE / "C0_PRESERVATION_CHECK.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(result))
        sys.exit(0 if result["passed"] else 1)
