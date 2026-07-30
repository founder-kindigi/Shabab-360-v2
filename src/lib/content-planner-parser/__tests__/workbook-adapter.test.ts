import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { readWorkbook, dryRun } from "../workbook-adapter";
import type { WorkbookContext } from "../types";

const ctx: WorkbookContext = { cityName: "Lahore", batchName: "Batch 4", parkName: null };

/** Create an in-memory .xlsx buffer. */
async function makeWorkbook(
  sheets: { name: string; header: string[]; rows: (string | null | undefined)[][] }[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name);
    ws.addRow(s.header);
    for (const row of s.rows) {
      ws.addRow(row.map((v) => (v === undefined ? null : v)));
    }
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

const header = ["Week", "Day", "Date", "Exercises", "Sports", "Skills", "Tadreeb", "Areas to Focus"];

describe("readWorkbook", () => {
  it("reads a known sheet and returns its rows", async () => {
    const buf = await makeWorkbook([{
      name: "All Parks",
      header,
      rows: [["1", "1", "2026-05-23", "Jogging", null, null, null, null]],
    }]);
    const result = await readWorkbook(buf, ctx);
    expect(result.errors).toHaveLength(0);
    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0].rawRows).toEqual([{ Week: "1", Day: "1", Date: "2026-05-23", Exercises: "Jogging", Sports: null, Skills: null, Tadreeb: null, "Areas to Focus": null }]);
  });

  it("rejects an unsupported sheet name", async () => {
    const buf = await makeWorkbook([{
      name: "Hidden Notes", header,
      rows: [["1", "1", "2026-05-23", "Jogging", null, null, null, null]],
    }]);
    const result = await readWorkbook(buf, ctx);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("Unsupported sheet");
    expect(result.sheets).toHaveLength(0);
  });

  it("rejects sheets with only a header row (no data)", async () => {
    const buf = await makeWorkbook([{ name: "All Parks", header, rows: [] }]);
    const result = await readWorkbook(buf, ctx);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("no data rows");
  });

  it("rejects invalid context via embedded Zod validation", async () => {
    const buf = await makeWorkbook([{ name: "All Parks", header, rows: [["1", "1", "2026-05-23", "Jogging"]] }]);
    const result = await readWorkbook(buf, { cityName: 123 } as unknown as WorkbookContext);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("Invalid workbook context");
  });

  it("rejects a corrupted buffer", async () => {
    const result = await readWorkbook(Buffer.from("not-an-xlsx"), ctx);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("Failed to read .xlsx");
  });

  it("preserves rich-text cell content instead of serializing it as an object", async () => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("All Parks");
    ws.addRow(header);
    ws.addRow(["Week 1", "Day 1", "2026-05-23", null, null, null, null, null]);
    ws.getCell("D2").value = { richText: [{ text: "Warmup\n" }, { text: "Time: 40 minutes" }] };
    const result = await readWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()), ctx);

    expect(result.errors).toHaveLength(0);
    expect(result.sheets[0].rawRows[0].Exercises).toBe("Warmup\nTime: 40 minutes");
  });

  it("preserves visible hyperlink text and its URL for fail-closed link review", async () => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("All Parks");
    ws.addRow(header);
    ws.addRow(["Week 1", "Day 1", "2026-05-23", null, null, null, null, null]);
    ws.getCell("D2").value = { text: "Video guide", hyperlink: "https://example.com/guide" };
    const result = await readWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()), ctx);

    expect(result.sheets[0].rawRows[0].Exercises).toBe("Video guide\nhttps://example.com/guide");
  });
});

describe("dryRun (end-to-end)", () => {
  it("reads, parses, and summarises a synthetic workbook without writing", async () => {
    const buf = await makeWorkbook([{
      name: "All Parks",
      header,
      rows: [
        ["1", "1", "2026-05-23", "Warm-up", null, null, null, "Fitness"],
        ["2", "3", "2026-05-30", "Running", "Cricket", "Teamwork", "Values", null],
        ["3", "3", "2026-06-01", "Off Day", null, null, null, null],
      ],
    }, {
      name: "State Life School",
      header,
      rows: [["1", "1", "2026-06-28", "Park-specific drill", null, null, null, null]],
    }]);

    const result = await dryRun(buf, ctx);

    expect(result.errors, `Errors: ${JSON.stringify(result.errors)}`).toHaveLength(0);
    expect(result.summary).not.toBeNull();
    expect(result.summary!.sheetsParsed).toBe(2);
    expect(result.summary!.sessionsWithContent).toBe(4);
    expect(result.summary!.offDays).toBe(1);
    expect(result.summary!.totalBlocks).toBe(6);
    expect(result.summary!.blocksPerTeam.sports).toBe(4);
    expect(result.summary!.blocksPerTeam.skills).toBe(1);
    expect(result.summary!.blocksPerTeam.tadreeb).toBe(1);
  });

  it("returns errors for unsupported sheets without crashing", async () => {
    const buf = await makeWorkbook([{ name: "Extra Notes", header, rows: [["1", "1", "2026-05-23", "Jogging"]] }]);
    const result = await dryRun(buf, ctx);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("Unsupported sheet");
    expect(result.summary).toBeNull();
  });

  it("returns null summary when no valid sheets", async () => {
    const buf = await makeWorkbook([]);
    const result = await dryRun(buf, ctx);
    expect(result.summary).toBeNull();
  });
});
