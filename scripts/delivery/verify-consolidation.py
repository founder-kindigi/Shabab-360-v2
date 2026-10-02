"""Read-only C0 preservation verification after relocating private recovery assets."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "docs/delivery/consolidation"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def git(cwd, *args):
    return subprocess.check_output(["git", *args], cwd=cwd).decode("utf-8")


def main():
    manifest = json.loads((EVIDENCE / "C0_SNAPSHOT.json").read_text(encoding="utf-8"))
    relocation = json.loads((EVIDENCE / "C0_RELOCATION.json").read_text(encoding="utf-8"))
    private = Path(relocation["privateRoot"])
    if private.resolve().is_relative_to(ROOT.resolve()):
        raise ValueError("Recovery assets must remain outside application source discovery")
    allowed = {".agents/memory/current.md", "docs/delivery/state.json", "docs/delivery/tasks/C0-01.md", "docs/delivery/README.md"}
    files = manifest["files"]
    original = [name for name, expected in files.items() if name not in allowed and (not (ROOT / name).is_file() or digest((ROOT / name).read_bytes()) != expected)]
    restored = [name for name, expected in files.items() if not (private / "restore-candidate" / name).is_file() or digest((private / "restore-candidate" / name).read_bytes()) != expected]
    archive_path = private / "candidate.zip"
    with ZipFile(archive_path) as archive:
        members_match = len(archive.infolist()) == len(files) and set(archive.namelist()) == set(files)
        archive_mismatches = [name for name, expected in files.items() if name not in archive.namelist() or digest(archive.read(name)) != expected]
    refs = {
        "codex/c0-v2-20260911": manifest["head"],
        "codex/c0-main-20260911": manifest["refs"]["origin/main"],
        "codex/c0-local-main-20260911": manifest["refs"]["main"],
    }
    history = private / "restored-histories.git"
    histories_match = all(git(history, "rev-parse", "refs/tags/" + tag).strip() == commit and git(ROOT, "rev-parse", "refs/tags/" + tag).strip() == commit for tag, commit in refs.items())
    bundle = private / "histories.bundle"
    bundle_verify = subprocess.run(["git", "bundle", "verify", str(bundle)], cwd=ROOT, capture_output=True)
    history_fsck = subprocess.run(["git", "fsck", "--full"], cwd=history, capture_output=True)
    integration = private / "integration"
    checks = {
        "originalPreserved": not original,
        "restoredFilesMatch": not restored,
        "archiveMembersMatch": members_match,
        "archiveFilesMatch": not archive_mismatches,
        "archiveHashMatch": digest(archive_path.read_bytes()) == manifest["archiveSha256"],
        "historicalManifestUnchanged": json.loads((private / "snapshot-manifest.json").read_text(encoding="utf-8")) == manifest,
        "indexUnchanged": digest(git(ROOT, "ls-files", "--stage", "-z").encode()) == manifest["indexStateSha256"],
        "deletionsUnchanged": git(ROOT, "ls-files", "--deleted", "-z").split("\0")[:-1] == manifest["deletedTracked"],
        "headUnchanged": git(ROOT, "rev-parse", "HEAD").strip() == manifest["head"],
        "branchUnchanged": git(ROOT, "branch", "--show-current").strip() == manifest["branch"],
        "historyRefsMatch": histories_match,
        "historyFsck": history_fsck.returncode == 0,
        "bundleVerified": bundle_verify.returncode == 0,
        "integrationClean": not git(integration, "status", "--porcelain").strip(),
        "integrationHead": git(integration, "rev-parse", "HEAD").strip() == manifest["refs"]["origin/main"],
        "integrationBranch": git(integration, "branch", "--show-current").strip() == "codex/main-v2-consolidation",
        "oldLocationEmpty": not any(Path(manifest["privateRoot"]).iterdir()) if Path(manifest["privateRoot"]).exists() else True,
    }
    result = {
        "passed": all(checks.values()), "date": "2026-09-11", "checks": checks,
        "filesVerified": len(files), "originalUnexpectedChanges": original,
        "restoredMismatches": restored, "archiveMismatches": archive_mismatches,
        "allowedCoordinationEdits": sorted(allowed),
        "privateRoot": str(private), "refs": refs,
        "archive": {"bytes": archive_path.stat().st_size, "sha256": digest(archive_path.read_bytes())},
        "bundle": {"bytes": bundle.stat().st_size, "sha256": digest(bundle.read_bytes())},
        "bundleVerifyExit": bundle_verify.returncode, "historyFsckExit": history_fsck.returncode,
    }
    (EVIDENCE / "C0_VERIFICATION.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result))
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
