"""Publish reconciliation dispositions backed by the authored workflow assessment.

This is a planning ledger, never a test runner or an equivalence detector.
Run c1-verify.py independently after publication. Preserve existing test outputs.
"""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs/delivery/consolidation"
coverage = json.loads((OUT / "C1_COVERAGE.json").read_text())
index = json.loads((OUT / "C1_SOURCE_INDEX.json").read_text())
patches = {p["sha"]: p for p in json.loads((OUT / "C1_PATCH_INDEX.json").read_text())}
workflow = "docs/delivery/consolidation/C1_WORKFLOW_ASSESSMENT.md"
if not (ROOT / workflow).is_file():
    raise SystemExit("Authored workflow decisions are required before dispositions")

DECISIONS = {
    "MP01": "Recover scoped persisted Media Briefs and lifecycle, correcting empty-PATCH authority, link persistence, active membership and paging; preserve v2 presentation.",
    "MP02": "Recover main registration/fee/cancellation/check-in intent through canonical scope, authoritative ledger/consent provenance and v2 durable attendance; repair capacity, retry and lifecycle defects.",
    "MP03": "Preserve batch-local exclusions and v2 city closures/extra classes as distinct scopes; reconcile one PKT date policy and retain stored decisions.",
    "MP04": "Preserve v2 receipt/version/reset/account isolation and main historical roster/summary intent; reconcile mutable snapshots, transfers, nullable placement and explicitly unresolved dropout policy.",
    "MP05": "Preserve both staff-record/event identities; adapt normal-session history into an explicit mapping with park staff events and closed/correction protection.",
    "MP06": "Restore bounded entity search with canonical hierarchy and minimal projections; navigation filtering is not equivalent to server people search.",
    "MP07": "Retain v2 scoped versioned profiles/admissions and current identity; recover link-existing/reset capability and null-safe data while fixing conversion CAS and secret response protection.",
    "MP08": "Preserve v2 active own-assignment/campaign locking; recover context/pickers, template ownership/lifecycle/atomic audit, source aliases and deliberate pagination/privacy.",
    "MP09": "Recover scoped collection, action/update/share/context/notification behavior; retain canonical hierarchy, validate recipients/teams and commit required audit/outbox atomically.",
    "MP10": "Unify overlapping team contracts without widening grants; preserve dedicated capability/ended-membership intent, v2 conditional writes and valid active same-team assignments/content links.",
    "MP11": "Retain v2 planner presentation and scope/version controls; recover permissions, source label/rich-text/link fidelity and consistent off-day/scoped-create behavior.",
    "MP12": "Recover bounded projections, grouped counts and partial-print disclosure with v2 scope/discount rules; require measured large-fixture performance and historical/null-safe correctness.",
    "MP13": "Keep v2 identity/offline/financial foundations; restore main redaction/cache/test isolation and useful provider checks; reconcile capabilities, additive schemas and supported lock/runtime deliberately.",
    "MP14": "Preserve current owner-approved UI/provider/repository workflow and both histories; retain historical docs/tests as evidence, recover safe failure/direct-entry behavior, rebuild current docs only at C5.",
}


def register(path):
    low = path.lower()
    if "/media/" in low or "/admin/media" in low: return "MP01"
    if "calling" in low or "campaignstatusbadge" in low: return "MP08"
    if "mashwara" in low: return "MP09"
    if "content-planner" in low or "cp-import" in low or "content-plan-batch" in low: return "MP11"
    if "teams" in low or "team-activity" in low or "validations/team" in low: return "MP10"
    if "events" in low or "event-import" in low or "validations/event" in low or "eventresponsibility" in low or "eventteamroster" in low: return "MP02"
    if "staff-attendance" in low: return "MP05"
    if "schedule" in low or "timezone" in low: return "MP03"
    if "attendance" in low or "offline" in low or "/dropout/" in low: return "MP04"
    if "/search/" in low or "command-palette" in low: return "MP06"
    if any(x in low for x in ["profile", "admissions", "guardians", "/students", "/invite/", "/users/", "/import/"]): return "MP07"
    if "reports" in low or "dashboard" in low or "chart" in low or "gauge" in low or "heatmap" in low: return "MP12"
    if any(x in low for x in ["prisma/", "/auth", "/security/", "vitest", "tsconfig", "eslint", "next.config", "package", ".github", "/release/", "/governance/", "/audit.ts", "/db.ts", "/fees", ".env.example"]): return "MP13"
    return "MP14"


def trace(facts):
    if facts is None: return "Absent at this path"
    parts = [f"lines 1-{facts.get('lines', 'binary/metadata')}; sha256 {facts['sha256']}"]
    for key in ["methods", "capabilities", "scopes", "dbCalls", "requests", "tests"]:
        items = facts.get(key, [])
        if items:
            # The full index retains every entry, including long inherited tests.
            parts.append(key + ": " + ", ".join(f"{x['value']}@{x['line']}" for x in items))
    return "; ".join(parts)


def disposition(path, reg, is_main_only):
    low = path.lower()
    if low.startswith("docs/") or low == ".agents/memory/current.md":
        return "preserve", "Retain this dated source/evidence in history; current owner blueprint and delivery state govern. Historical UAT/release statements are not fresh verification. " + DECISIONS[reg]
    if low.endswith("migration.sql"):
        return "adapt into v2", "Preserve original applied SQL checksum and identifiers; recover its constraint/data intent through the paired fresh/populated mapping, never rewrite an applied migration. " + DECISIONS[reg]
    if low.startswith("scripts/") or low == "prisma/seed.ts":
        return "intentionally gated", "Retain operator/preview intent but do not execute against inherited URLs. Reconcile/seed helpers can write or delete despite preview names; require a bounded disposable staging/import packet and approved target. " + DECISIONS[reg]
    if ".test." in low or "/__tests__/" in low:
        return "preserve", "Preserve the indexed test-case intent and historical assertions; adapt to the accepted contract. Source/string assertions and boundary mocks do not prove runtime behavior, and this inherited suite was not rerun in C1. " + DECISIONS[reg]
    if low.endswith((".css", ".svg")) or low in ["public/manifest.json", "public/sw.js"]:
        return "preserve", "Retain source asset/style provenance; current mobile styling, branding and privacy-safe service-worker rules remain the target. No visual equality or old asset restoration is implied. " + DECISIONS[reg]
    if low.endswith(".tsx"):
        return "adapt into v2", "Preserve current mobile layout and state ownership; recover this consumer's useful behavior against the accepted method/envelope/capability contract, including true empty/error/denied states. Main-only wrapper absence is not itself feature loss. " + DECISIONS[reg]
    return "adapt into v2", ("Main implementation is absent at this path; recover useful behavior selectively. " if is_main_only else "Both sources differ; reconcile the indexed API/helper contract rather than choosing an entire side. ") + DECISIONS[reg]


path_rows = []
for category in ["mainOnlyPaths", "changedSharedPaths"]:
    for row in coverage[category]:
        path = row["path"]
        reg = row.get("register") or register(path)
        facts = index[path]
        for side, directory in [("main", "integration"), ("v2", "restore-candidate")]:
            file = Path("D:/iBuild/Shabab-360-c0-20260911") / directory / path
            actual = hashlib.sha256(file.read_bytes()).hexdigest() if file.is_file() else None
            if actual != (facts.get(side) or {}).get("sha256"):
                raise SystemExit(f"Source changed: {side}:{path}")
        result, reason = disposition(path, reg, category == "mainOnlyPaths")
        # Retain stronger earlier hand-authored case-specific assessment evidence.
        if row.get("assessed") and not row.get("assessmentLevel"):
            reason = row["reason"] + " " + reason
        row.update(register=reg, assessed=True, disposition=result, reason=reason,
                   evidence=list(dict.fromkeys(row.get("evidence", []) + [workflow, "docs/delivery/consolidation/C1_PATH_REVIEW.md", "docs/delivery/consolidation/C1_SOURCE_INDEX.json"])),
                   assessmentLevel="reconciliation disposition; not fix verification",
                   integrationVerified=False)
        path_rows.append((category, row, facts))

lines = ["# C1 path-by-path reconciliation ledger", "", "341 pinned comparison paths. Read each disposition with C1_WORKFLOW_ASSESSMENT.md and C1_FINDINGS.md. The exact method/capability/request/persistence traces below supplement the authored workflow decisions; they are not generated behavioral proofs. All integrationVerified flags remain false. Inherited tests are preserved as intent, not reported as freshly passing. Source anchors use the pinned main and immutable v2 copies.", ""]
for category, row, facts in path_rows:
    lines += [f"## {row['path']}", "", f"{row['register']} | {category} | **{row['disposition']}**", "", row["reason"], "", "- main: " + trace(facts.get("main")), "- v2: " + trace(facts.get("v2")), "", "Required acceptance: the matching MP section's cases, relevant open C1 findings, actual consumer contract and preserved source identities. No completed integration/equivalence claim.", ""]
(OUT / "C1_PATH_REVIEW.md").write_text("\n".join(lines), encoding="utf-8")

by_path = {r["path"]: r for _, r, _ in path_rows}
lines = ["# C1 patch-unique main commit dispositions", "", "All 171 pinned patch-unique commits are accounted for by actual patch SHA-256, touched paths and final-source workflow decisions. Preserve both histories. These dispositions retain the historical change intent for selective adaptation; they are not instructions to cherry-pick every patch or claims that each historical patch has received exhaustive manual security review. Earlier bugs, fixes and superseded implementations are evaluated against final source and the C1 path ledger. No commit is marked integrated. Private data/seed/lockfile literal contents are excluded from the public patch index; their file identity and preservation remain mandatory.", ""]
for row in coverage["mainUniqueCommits"]:
    patch = patches[row["sha"]]
    if sorted(patch["changedPaths"]) != sorted(row["changedPaths"]): raise SystemExit("Patch paths changed")
    regs = sorted({by_path[p]["register"] if p in by_path else register(p) for p in row["changedPaths"]})
    reason = "Preserve this historical patch and assess its final behavior through " + ", ".join(regs) + ". " + " ".join(DECISIONS[r] for r in regs)
    row.update(assessed=True, disposition="preserve", registers=regs, reason=reason,
               evidence=list(dict.fromkeys(row.get("evidence", []) + [workflow, "docs/delivery/consolidation/C1_COMMIT_REVIEW.md", "docs/delivery/consolidation/C1_PATCH_INDEX.json", "docs/delivery/consolidation/C1_PATH_REVIEW.md"])),
               integrationVerified=False, assessmentLevel="patch identity and final-source reconciliation disposition")
    lines += [f"## {row['sha']}", "", f"**preserve** | {', '.join(regs)} | patch sha256 `{patch['patchSha256']}`", "", reason, "", "Touched paths: " + "; ".join(f"`{p}`" for p in row["changedPaths"]), "", f"Patch evidence: {len(patch['hunks'])} hunks, +{patch['addedLines']}/-{patch['removedLines']} indexed source lines; full hunk anchors in C1_PATCH_INDEX.json. Follow C2 acceptance for every affected family, not a message-only or clean-merge verdict.", ""]
(OUT / "C1_COMMIT_REVIEW.md").write_text("\n".join(lines), encoding="utf-8")

for row in coverage["registers"]:
    row.update(assessed=True, disposition="preserve" if row["id"] == "MP14" else "adapt into v2", reason=DECISIONS[row["id"]], evidence=[workflow, "docs/delivery/consolidation/C1_FINDINGS.md"], integrationVerified=False)

requirement_registers = {
    1:["MP14"], 2:["MP13"], 3:["MP07","MP13"], 4:["MP13","MP14"], 5:["MP10"], 6:["MP06","MP07"], 7:["MP07"], 8:["MP02","MP07"], 9:["MP04","MP07"], 10:["MP03","MP04","MP05"], 11:["MP04","MP13"], 12:["MP11"], 13:["MP05","MP11"], 14:["MP03"], 15:["MP02"], 16:["MP02","MP09","MP10"], 17:["MP14"], 18:["MP02","MP13"], 19:["MP13"], 20:["MP13","MP14"], 21:["MP09","MP13"], 22:["MP09","MP13"], 23:["MP10"], 24:["MP14"], 25:["MP11","MP14"], 26:["MP12","MP14"], 27:["MP12"], 28:["MP04","MP12"], 29:["MP04","MP05","MP11"], 30:["MP07","MP12"], 31:["MP07","MP12"], 32:["MP12"], 33:["MP04","MP12"], 34:["MP13"], 35:["MP13","MP14"],
}
baseline = (ROOT / "docs/delivery/baseline/REQUIREMENTS_MATRIX.md").read_text(encoding="utf-8")
catalogue = {int(m.group(1)): line for line in baseline.splitlines() if (m := re.match(r"\| R(\d{2}) ", line))}
if set(catalogue) != set(range(1,36)): raise SystemExit("Requirement catalogue changed")
lines = ["# C1 catalogue requirement verdicts", "", "All R01–R35 are assessed for consolidation. Existing BASE-01 source/worksheet/screen evidence is tied to the unchanged working candidate; its tests are historical baseline evidence, not a new C1 run. This is not a module-completion list. Original acceptance and dependencies remain mandatory. General messaging, community, safeguarding and training remain unfinished; their gates do not block unrelated local corrections.", ""]
for row in coverage["requirements"]:
    number = int(row["id"][1:]); regs = requirement_registers[number]
    result = "intentionally gated" if number in [8,13,23,24] else "preserve" if number in [1,17,19,25,35] else "adapt into v2"
    reason = "Consolidation verdict, not product completion. " + " ".join(DECISIONS[r] for r in regs)
    if number in [8,13,23,24]: reason += " Owner must approve lifecycle/actors/privacy criteria before enablement; missing behavior remains explicitly unfinished."
    if number in [21,22]: reason += " Existing notification audience/read/cache/outbox defects remain open in ASTRA_DEEPSEEK_REVIEW.md; no provider delivery verified."
    if number in [4,20]: reason += " Existing Gemini/Astra parks and inventory sample/failed-save findings remain open; preserve layout while binding truthful persistence."
    row.update(assessed=True, disposition=result, registers=regs, reason=reason, evidence=[workflow, "docs/delivery/consolidation/C1_REQUIREMENT_REVIEW.md", "docs/delivery/baseline/REQUIREMENTS_MATRIX.md"], integrationVerified=False)
    cells = catalogue[number].split("|")[1:-1]
    lines += [f"## {cells[0].strip()}", "", f"**{result}** | {', '.join(regs)}", "", "Authority/actor: " + cells[1].strip(), "", "Verified baseline source and incompleteness: " + cells[2].strip(), "", reason, "", "Required acceptance/dependencies: " + cells[3].strip(), ""]
(OUT / "C1_REQUIREMENT_REVIEW.md").write_text("\n".join(lines), encoding="utf-8")
coverage["assessmentMeaning"] = "Complete reconciliation dispositions at stated source/paired-test evidence levels; no equivalence, fix, full historical manual review, native upgrade or release approval inferred."
coverage["status"] = "dispositions_complete_changes_required"
(OUT / "C1_COVERAGE.json").write_text(json.dumps(coverage, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"paths": len(path_rows), "commits": len(patches), "registers":14,"requirements":35,"integrationVerified":False}))
