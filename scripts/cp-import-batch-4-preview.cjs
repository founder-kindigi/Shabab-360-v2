/* eslint-disable @typescript-eslint/no-require-imports -- zero-write workbook preview. */
const path = require("node:path");
const ExcelJS = require("exceljs");
const parser = require("./cp-import-preview.cjs");

async function main() {
  const [input] = process.argv.slice(2);
  if (!input) throw new Error("Provide the workbook path");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.resolve(input));
  const allParks = workbook.getWorksheet("All Parks");
  const stateLife = workbook.getWorksheet("State Life School");
  if (!allParks || !stateLife) throw new Error("Workbook must contain All Parks and State Life School sheets");
  const template = parser.parseBatch4Sheet(allParks, "All Parks", {});
  const override = parser.parseBatch4Sheet(stateLife, "State Life School", {});
  const all = {
    sessions: [...template.sessions, ...override.sessions],
    blocks: [...template.blocks, ...override.blocks],
    blockedUrls: [...template.blockedUrls, ...override.blockedUrls],
    errors: [...template.errors, ...override.errors],
  };
  console.log(JSON.stringify({
    mode: "zero_write_preview",
    writesPerformed: false,
    template: { sessions: template.sessions.length, blocks: template.blocks.length, offDays: template.sessions.filter((s) => s.isOffDay).length },
    stateLifeOverride: { sessions: override.sessions.length, blocks: override.blocks.length, offDays: override.sessions.filter((s) => s.isOffDay).length },
    blockedUrls: all.blockedUrls.length,
    validationErrors: all.errors.length,
  }, null, 2));
}

if (require.main === module) main().catch((error) => { console.error(`Content Planner preview aborted: ${error.message}`); process.exitCode = 1; });
