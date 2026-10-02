"""Read-only reference inventory. Emits structure and recognized labels, never person rows."""
import hashlib
import json
from pathlib import Path
import re
import struct
import sys
from zipfile import ZipFile
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
LABELS = re.compile(r"^(student name|murabbi name|park name|batch|school.*|guardian contact.*|address.*|name|phone.*|email.*|city|park|group|status|timestamp|date|day|week.*|topic.*|title|type|link|content.*|activity.*|lesson.*|session.*|attendance.*|present|absent|contact.*|father.*|age|gender|qualification|occupation|remarks|notes|caller|call status|response|registration.*|applicant.*|cnic|whatsapp.*|sr\.?\s*no\.?|s\.?\s*no\.?|serial.*|number|mobile.*)$", re.I)

def inventory():
    result = {"scope": "Metadata and recognized header labels only; no import or data-quality approval", "screens": [], "workbooks": []}
    for file in sorted((ROOT / "docs/pwa screens").glob("*.png")):
        raw = file.read_bytes()
        width, height = struct.unpack(">II", raw[16:24])
        result["screens"].append({"file": file.relative_to(ROOT).as_posix(), "sha256": hashlib.sha256(raw).hexdigest(), "width": width, "height": height})
    for file in sorted((ROOT / "docs/sheets").iterdir()):
        if file.suffix.lower() not in {".xlsx", ".xls"}:
            continue
        raw = file.read_bytes()
        book = {"file": file.relative_to(ROOT).as_posix(), "sha256": hashlib.sha256(raw).hexdigest(), "format": "unknown", "sheets": []}
        if raw.startswith(b"PK"):
            book["format"] = "OOXML (xlsx content)"
            with ZipFile(file) as archive:
                strings = []
                if "xl/sharedStrings.xml" in archive.namelist():
                    strings = ["".join(si.itertext()) for si in ET.fromstring(archive.read("xl/sharedStrings.xml"))]
                rels = {r.attrib["Id"]: r.attrib["Target"].lstrip("/") for r in ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))}
                sheets = ET.fromstring(archive.read("xl/workbook.xml")).find("s:sheets", NS)
                for index, sheet in enumerate(sheets, 1):
                    target = rels[sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]]
                    if not target.startswith("xl/"): target = "xl/" + target
                    tree = ET.fromstring(archive.read(target))
                    rows = tree.findall("s:sheetData/s:row", NS)
                    headers = []
                    for row in rows[:8]:
                        found = []
                        for cell in row.findall("s:c", NS):
                            value = cell.find("s:v", NS)
                            text = value.text if value is not None else "".join(cell.find("s:is", NS).itertext()) if cell.find("s:is", NS) is not None else ""
                            if cell.attrib.get("t") == "s" and text: text = strings[int(text)]
                            text = (text or "").strip()
                            if len(text) <= 64 and LABELS.fullmatch(text): found.append({"cell": cell.attrib.get("r"), "label": text})
                        if len(found) >= 2:
                            headers.extend(found)
                            break
                    dimension = tree.find("s:dimension", NS)
                    # Index avoids publishing private names used as worksheet titles.
                    book["sheets"].append({"index": index, "dimension": dimension.attrib.get("ref") if dimension is not None else None, "storedRows": len(rows), "recognizedHeaders": headers})
        result["workbooks"].append(book)
    return result

if __name__ == "__main__":
    result = inventory()
    if "--write" in sys.argv:
        destination = ROOT / "docs/delivery/REFERENCE_INVENTORY.json"
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"screens": len(result["screens"]), "workbooks": [{"file": b["file"], "format": b["format"], "sheets": len(b["sheets"]), "recognizedLabels": sorted(set(h["label"] for s in b["sheets"] for h in s["recognizedHeaders"]))} for b in result["workbooks"]]}, ensure_ascii=False))
