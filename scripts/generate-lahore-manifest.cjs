const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const parser = require("./lahore-batch-4-dry-run.cjs");
const importer = require("./import-lahore-batch-4-staging.cjs");

async function main() {
  const workbookPath = path.resolve("docs/sheets/Shabab_Batch_4_Attendance (1).xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);

  const parks = parser.PARK_SHEETS.map(([sheetName, parkName]) => {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) throw new Error(`Required sheet is missing: ${sheetName}`);
    return parser.readParkSheet(sheet, sheetName, parkName, 2026);
  });

  const manifest = importer.toImportManifest(parks, "2026-09-07");

  const outPath = path.resolve("tool-results/lahore-manifest.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), "utf8");

  console.log(JSON.stringify({
    participants: manifest.participants.length,
    staff: manifest.staff.length,
    events: manifest.events.length,
    totalRecords: manifest.events.reduce((sum, e) => sum + e.records.length, 0),
    outPath,
  }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
