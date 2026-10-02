"""Validate BASE-01 coverage/identity using metadata and independent OOXML traversal."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
from xml.etree import ElementTree as ET
from zipfile import ZipFile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def read(name):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


checks = []


def check(name, passed, **detail):
    checks.append({"name": name, "passed": bool(passed), **detail})


books = read("WORKSHEET_EVIDENCE.json")
xml_results = []
for b in books:
    file = ROOT / "docs/sheets" / b["file"]
    check("Workbook unchanged: " + b["file"], sha(file) == b["sha256"])
    with ZipFile(file) as archive:
        rels = {r.attrib["Id"]: r.attrib["Target"].lstrip("/") for r in ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))}
        sheets = ET.fromstring(archive.read("xl/workbook.xml")).find("s:sheets", NS)
        for i, sheet in enumerate(sheets, 1):
            target = rels[sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]]
            if not target.startswith("xl/"):
                target = "xl/" + target
            tree = ET.fromstring(archive.read(target))
            cells = []
            for c in tree.findall("s:sheetData/s:row/s:c", NS):
                if c.find("s:v", NS) is not None or c.find("s:f", NS) is not None or any(t.text is not None for t in c.findall("s:is//s:t", NS)):
                    cells.append(c.attrib["r"])
            rows = {re.search(r"\d+$", c).group() for c in cells}
            expected = b["sheets"][i - 1]
            xml_results.append({"workbook": b["file"], "index": i, "xmlCells": len(cells), "xmlNonemptyRows": len(rows), "passed": len(cells) == sum(expected["cellTypes"].values()) and len(rows) == expected["nonemptyRows"]})
check("Independent XML/openpyxl coverage", len(xml_results) == 57 and all(r["passed"] for r in xml_results), worksheets=len(xml_results), mismatches=[r for r in xml_results if not r["passed"]])
(HERE / "XML_RECONCILIATION.json").write_text(json.dumps(xml_results, indent=2) + "\n", encoding="utf-8")

sheet_map = (HERE / "WORKSHEET_MAP.md").read_text(encoding="utf-8")
expected_ids = {f"W{b}.{s['index']:02d}" for b, book in enumerate(books, 1) for s in book["sheets"]}
actual_ids = re.findall(r"^\| (W\d+\.\d+) \|", sheet_map, re.M)
check("57 unique sheet dispositions", len(actual_ids) == 57 and set(actual_ids) == expected_ids)
matrix = (HERE / "REQUIREMENTS_MATRIX.md").read_text(encoding="utf-8")
ids = re.findall(r"^\| R(\d+) ", matrix, re.M)
check("35 catalogue capabilities", len(ids) == 35 and set(ids) == {f"{i:02d}" for i in range(1, 36)})

gemini = (ROOT / "docs/delivery/reports/GEMINI_FRONTEND_REFERENCE_MAP.md").read_text(encoding="utf-8")
image_names = re.findall(r"^\| (Screenshot [^|]+?\.png) \|", gemini, re.M)
expected_names = {p.name for p in (ROOT / "docs/pwa screens").glob("*.png")}
check("Exact image coverage", len(image_names) == 34 and set(image_names) == expected_names)

branches = read("BRANCH_REFRESH.json")
check("Fetched refs still match", all(subprocess.check_output(["git", "rev-parse", ref], cwd=ROOT, text=True).strip() == value for ref, value in branches["refs"].items()))


def register_for(path):
    # Work routing, not a claim of equivalent replacement or feature acceptance.
    for pattern, reg in [(r"media", "MP01"), (r"events|event-import", "MP02"), (r"batch-off-days|scheduled-sessions", "MP03"), (r"policy-engine|summaries|class-stats|murabbi-summary|student-summary|attendance-foundation", "MP04"), (r"/attendance/\[eventId\]/staff", "MP05"), (r"/search/", "MP06"), (r"/account/|profile|guardians/invite", "MP07"), (r"calling", "MP08"), (r"mashwara", "MP09"), (r"teams", "MP10"), (r"content-planner|cp-import|content-plan", "MP11"), (r"PERF-", "MP12"), (r"prisma/|test-isolation|sensitive-response|src/proxy", "MP13")]:
        if re.search(pattern, path, re.I):
            return reg
    return "MP14"


dispositions = [{"path": p, "register": register_for(p), "disposition": "Preserve as comparison evidence; assess/adapt in this register before omission", "finalEquivalence": "unverified"} for p in branches["mainOnlyPaths"]]
(HERE / "MAIN_PATH_DISPOSITIONS.json").write_text(json.dumps(dispositions, indent=2) + "\n", encoding="utf-8")
check("All main-only paths routed", len(dispositions) == 108 and len({x["path"] for x in dispositions}) == 108, count=len(dispositions))

build = json.loads((ROOT / "docs/reviews/ui-restoration-2026-09-10/astra-build-sqlite-results.json").read_text(encoding="utf-8"))
bad = [f["path"] for f in build["files"] if not (ROOT / f["path"]).is_file() or sha(ROOT / f["path"]) != f["sha256"]]
check("Previous SQLite build manifest identity", not bad, matchedFiles=len(build["files"]) - len(bad), mismatches=bad, limit="Reuses recorded 2026-09-10 build; no fresh browser/provider build execution")
tests = read("TEST_RESULTS.json")
check("Fresh application tests", tests["success"] and tests["numFailedTests"] == 0, passedTests=tests["numPassedTests"], testFiles=len(tests["testResults"]))

broken = []
for path in [*HERE.glob("*.md"), ROOT / "docs/delivery/tasks/C0-01.md"]:
    for link in re.findall(r"\]\(([^)]+)\)", path.read_text(encoding="utf-8")):
        target = link.split("#")[0]
        if target and not target.startswith(("http:", "https:")) and not (path.parent / target).exists():
            broken.append({"file": path.name, "link": link})
check("Baseline local links", not broken, broken=broken)
result = {"passed": all(c["passed"] for c in checks), "checks": checks}
(HERE / "STRUCTURAL_VERIFICATION.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result))
raise SystemExit(0 if result["passed"] else 1)
