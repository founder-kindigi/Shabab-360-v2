"""Render the bounded intake table from sanitized evidence; no workbook data read."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
books = json.loads((HERE / "WORKSHEET_EVIDENCE.json").read_text(encoding="utf-8"))
rows = []
for book_no, book in enumerate(books, 1):
    for sheet in book["sheets"]:
        i = sheet["index"]
        if book_no == 1:
            disposition = "Stage content sessions/blocks; reconcile overlapping dates and plan version."
        elif book_no == 2:
            disposition = "Stage profile-grid candidates; exclude formula/summary cells; identity matching required." if i == 1 else "Hold vertical text reference (A1:A71); determine field-dictionary versus record layout before import."
        elif book_no == 3:
            if i == 13:
                disposition = "Stage registration-copy reconciliation against W5; never import both as new people."
            elif i == 36:
                disposition = "Exclude from base imports: call-status formula summary; use only for reconciliation."
            elif i == 37:
                disposition = "Hold single text-cell reference; no operational records inferred."
            elif i in {21, 34}:
                disposition = "Hold headerless/irregular calling snapshot; map columns and predecessor template explicitly."
            elif i in {7, 15, 16, 17, 18, 19, 20}:
                disposition = "Stage shortlist/attendance-status candidate view; deduplicate against calling/registration source."
            else:
                disposition = "Stage calling-view candidates; separate formulas, contact/status fields and copied registrations."
        elif book_no == 4:
            disposition = "Stage day x session curriculum; 16 day columns; no staff completion inferred."
        elif book_no == 5:
            disposition = "Stage registration export with sensitive-field exclusions; payment/consent remain unverified source claims."
        elif i == 2:
            disposition = "Exclude empty worksheet; retain source identity."
        elif i in {1, 3}:
            disposition = "Reconciliation-only formula roster view; resolve base person rows before creating records."
        elif i in {4, 11}:
            disposition = "Stage date/status calendar policy; summary formulas are reconciliation-only."
        elif i in {5, 6, 7, 8, 9, 10}:
            disposition = "Stage park attendance matrix; unpivot date columns, split staff/student grain, exclude summary formulas."
        elif i == 12:
            disposition = "Hold park/staff formula summary; reconcile counts and distinguish input cells from derived values."
        else:
            disposition = "Hold small text reference; resolve legend/configuration meaning, never infer person records."
        rows.append(f"| W{book_no}.{i:02d} | {sheet['dimension']} | {sheet['nonemptyRows']} | {sheet['cellTypes'].get('formula', 0)} | {disposition} |")
path = HERE / "WORKSHEET_MAP.md"
text = path.read_text(encoding="utf-8")
table = "| Worksheet | Observed bounds | Nonempty rows | Formula cells | Disposition |\n| --- | --- | ---: | ---: | --- |\n" + "\n".join(rows)
if "<!-- SHEET_TABLE -->" not in text:
    raise SystemExit("Table already rendered; preserve reviewed document rather than overwrite it.")
path.write_text(text.replace("<!-- SHEET_TABLE -->", table), encoding="utf-8")
print(f"Rendered {len(rows)} explicit worksheet dispositions.")
