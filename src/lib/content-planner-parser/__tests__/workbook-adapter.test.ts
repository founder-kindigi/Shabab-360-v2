import { describe, expect, it } from "vitest";
import { adaptWorkbook, buildContext, type RawWorkbookInput } from "../workbook-adapter";
import type { WorkbookContext } from "../types";

const ctx: WorkbookContext = { cityName: "Lahore", batchName: "Batch 4", parkName: null };
const row = { Week: "1", Day: "1", Date: "2026-05-23", Exercises: "Jogging" };

function makeInput(sheets: { name: string; rows: Record<string, unknown>[] }[]): RawWorkbookInput {
  return { sheets };
}

describe("adaptWorkbook", () => {
  it("accepts a known sheet and returns its rows", () => {
    const result = adaptWorkbook(makeInput([{ name: "All Parks", rows: [row] }]), ctx);
    expect(result.errors).toHaveLength(0);
    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0].sheetName).toBe("All Parks");
    expect(result.sheets[0].rawRows).toEqual([row]);
    expect(result.sheets[0].skipped).toBe(false);
  });

  it("normalises case-insensitive sheet names", () => {
    const result = adaptWorkbook(makeInput([{ name: "all parks", rows: [row] }]), ctx);
    expect(result.errors).toHaveLength(0);
    expect(result.sheets).toHaveLength(1);
  });

  it("accepts 'State Life School' as a known sheet", () => {
    const result = adaptWorkbook(makeInput([{ name: "State Life School", rows: [row] }]), ctx);
    expect(result.errors).toHaveLength(0);
    expect(result.sheets).toHaveLength(1);
  });

  it("rejects an unsupported sheet name", () => {
    const result = adaptWorkbook(makeInput([{ name: "Hidden Sheet", rows: [row] }]), ctx);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("Unsupported sheet");
    expect(result.sheets).toHaveLength(0);
  });

  it("rejects empty sheets", () => {
    const result = adaptWorkbook(makeInput([{ name: "All Parks", rows: [] }]), ctx);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("empty");
    expect(result.sheets).toHaveLength(0);
  });

  it("rejects sheets with no 'rows' array", () => {
    const input = { sheets: [{ name: "All Parks" }] } as unknown as RawWorkbookInput;
    const result = adaptWorkbook(input, ctx);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("no 'rows' array");
  });

  it("rejects sheets with no name", () => {
    const result = adaptWorkbook(makeInput([{ name: "", rows: [row] }]), ctx);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("no name");
  });

  it("rejects duplicate sheet names", () => {
    const result = adaptWorkbook(makeInput([
      { name: "All Parks", rows: [row] },
      { name: "All Parks", rows: [row] },
    ]), ctx);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("Duplicate");
    expect(result.sheets).toHaveLength(1); // first accepted
  });

  it("processes multiple known sheets and rejects unknown ones", () => {
    const result = adaptWorkbook(makeInput([
      { name: "All Parks", rows: [row] },
      { name: "State Life School", rows: [row] },
      { name: "Extra Notes", rows: [row] },
    ]), ctx);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("Extra Notes");
    expect(result.sheets).toHaveLength(2);
  });

  it("rejects a non-array sheets value", () => {
    const input = { sheets: "not-an-array" } as unknown as RawWorkbookInput;
    const result = adaptWorkbook(input, ctx);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("no 'sheets' array");
  });

  it("rejects an empty sheets array", () => {
    const result = adaptWorkbook(makeInput([]), ctx);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("no sheets");
  });

  it("rejects a non-object sheet entry", () => {
    const input = { sheets: [null] } as unknown as RawWorkbookInput;
    const result = adaptWorkbook(input, ctx);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("not an object");
  });

  it("preserves the operator-provided context in the result", () => {
    const result = adaptWorkbook(makeInput([{ name: "All Parks", rows: [row] }]), ctx);
    expect(result.context).toEqual(ctx);
  });
});

describe("buildContext", () => {
  it("accepts a valid context", () => {
    const ctx = buildContext({ cityName: "Lahore", batchName: "Batch 4", parkName: null });
    expect(ctx.cityName).toBe("Lahore");
  });

  it("rejects a context missing cityName", () => {
    expect(() => buildContext({ batchName: "B4" })).toThrow("Invalid workbook context");
  });
});
