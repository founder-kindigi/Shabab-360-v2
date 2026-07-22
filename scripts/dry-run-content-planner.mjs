// @ts-check
/**
 * Dry-run CLI for the content-planner workbook adapter.
 *
 * Reads a JSON workbook representation from stdin or a file argument,
 * runs adaptWorkbook + parseSheet for each recognised sheet, and prints
 * a reconciliation report to stdout. Never writes to any database.
 *
 * Usage:
 *   node scripts/dry-run-content-planner.mjs < workbook.json
 *   node scripts/dry-run-content-planner.mjs ./workbook.json
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { adaptWorkbook, buildContext } = require("../src/lib/content-planner-parser/workbook-adapter.js");
const { parseSheet, computeSummary } = require("../src/lib/content-planner-parser/parser.js");

function readInput() {
  const filePath = process.argv[2];
  if (filePath) {
    return require("fs").readFileSync(filePath, "utf-8");
  }
  // Read from stdin
  const chunks = [];
  return new Promise((resolve) => {
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(chunks.join("")));
  });
}

async function main() {
  const raw = await readInput();

  let input;
  try {
    input = JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse input as JSON:", err.message);
    process.exit(1);
  }

  if (!input || typeof input !== "object" || !input.context || !input.sheets) {
    console.error('Input must be a JSON object with "context" and "sheets".');
    process.exit(1);
  }

  let context;
  try {
    context = buildContext(input.context);
  } catch (err) {
    console.error("Context error:", err.message);
    process.exit(1);
  }

  console.error("Context:", JSON.stringify(context));
  console.error("Sheets provided:", input.sheets.length);

  const adapterResult = adaptWorkbook(input, context);

  for (const err of adapterResult.errors) {
    console.error(`  [${err.sheetName}] ${err.message}`);
  }

  if (adapterResult.sheets.length === 0) {
    console.error("No valid sheets to parse. Exiting.");
    process.exit(adapterResult.errors.length > 0 ? 1 : 0);
  }

  const parsedSheets = [];

  for (const sheet of adapterResult.sheets) {
    const result = parseSheet(sheet.sheetName, sheet.rawRows, context);
    parsedSheets.push(result);

    if (result.sheet) {
      console.error(`  Parsed "${sheet.sheetName}": ${result.sheet.sessions.length} sessions, ${result.sheet.skippedPlaceholderRows} placeholder rows skipped.`);
    }
    for (const err of result.errors) {
      console.error(`  Row ${err.row} [${err.column}]: ${err.message}`);
    }
  }

  const validSheets = parsedSheets.map((p) => p.sheet).filter(Boolean);
  const summary = validSheets.length > 0 ? computeSummary(validSheets) : null;

  if (summary) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.error("No valid parsed sheets to summarise.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
