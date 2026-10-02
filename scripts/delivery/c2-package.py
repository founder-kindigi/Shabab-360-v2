"""Package only C2-01 changes, verifying the immutable baseline and allowed scope."""
import difflib
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs/delivery/consolidation"
baseline = json.loads((OUT / "C2_01_BASELINE.json").read_text())
candidate = Path(baseline["target"])
original = candidate.parent / "restore-candidate"
modified = ["src/lib/audit.ts", "vitest.config.ts", "vitest.setup.ts"] + [
    f"src/app/api/admin/{route}/route.ts" for route in ["invite", "guardians/invite", "import/users", "import/participants"]
]
added = ["src/lib/audit-privacy.test.ts", "src/lib/security/credential-responses.test.ts", "src/lib/security/unit-environment.test.ts", "src/lib/security/sensitive-response.ts", "scripts/testing/unit-environment.mjs"]
unexpected = [name for name, expected in baseline["copied"].items() if name not in modified and (
    not (candidate / name).is_file() or hashlib.sha256((candidate / name).read_bytes()).hexdigest() != expected)]
assert not unexpected, unexpected
assert all(not (candidate / name).exists() for name in baseline["excluded"])
patch, identities = [], {}
for name in sorted(modified + added):
    after = (candidate / name).read_text(encoding="utf-8")
    before = (original / name).read_text(encoding="utf-8") if name in modified else ""
    if name in modified:
        assert hashlib.sha256((original / name).read_bytes()).hexdigest() == baseline["copied"][name]
    else:
        assert not (original / name).exists()
    patch.append(f"diff --git a/{name} b/{name}\n")
    if name in added:
        patch.append("new file mode 100644\n")
    patch.extend(difflib.unified_diff(before.splitlines(keepends=True), after.splitlines(keepends=True),
        fromfile=f"a/{name}" if name in modified else "/dev/null", tofile=f"b/{name}"))
    identities[name] = {"beforeSha256": baseline["copied"].get(name), "afterSha256": hashlib.sha256((candidate / name).read_bytes()).hexdigest()}
data = "".join(patch).encode("utf-8")
(OUT / "C2_01_PATCH.diff").write_bytes(data)
report = {"candidate": str(candidate), "head": baseline["head"], "modified": modified, "added": added,
    "files": identities, "patchSha256": hashlib.sha256(data).hexdigest(), "unexpectedBaselineChanges": unexpected,
    "unchangedBaselineFiles": len(baseline["copied"]) - len(modified), "excludedScratchFilesAbsent": True}
(OUT / "C2_01_PATCH.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"patchFiles": len(identities), "unchangedBaselineFiles": report["unchangedBaselineFiles"], "patchSha256": report["patchSha256"]}))
