import { describe, expect, it } from "vitest";
import { parseSheet, computeSummary } from "../parser";
import type { WorkbookContext } from "../types";

const ctx: WorkbookContext = { cityName: "Lahore", batchName: "Batch 4", parkName: null };
const pctx: WorkbookContext = { cityName: "Lahore", batchName: "Batch 4", parkName: "State Life School" };

const r1 = { Week: "1", Day: "1", Date: "2026-05-23", Exercises: "Jogging", Sports: null, Skills: null, Tadreeb: null, "Areas to Focus": null };
const r2 = { Week: "2", Day: "3", Date: "2026-05-30", Exercises: "Drills", Sports: "Cricket", Skills: "Teamwork", Tadreeb: "Values", "Areas to Focus": "Team building" };
const rd = { Week: "3", Day: "0", Date: "2026-06-01", Exercises: "Off Day", Sports: null, Skills: null, Tadreeb: null, "Areas to Focus": null };
const rc = { Week: "3", Day: "0", Date: "2026-06-02", Exercises: "CANCELLED", Sports: "", Skills: "no session", Tadreeb: null, "Areas to Focus": null };
const rl = { Week: "4", Day: "2", Date: "2026-06-06", Exercises: "See https://example.com/vid", Sports: "Map https://example.com/loc", Skills: null, Tadreeb: null, "Areas to Focus": null };
const rbad = { Week: "5", Day: "1", Date: "bad-date", Exercises: "X", Sports: null, Skills: null, Tadreeb: null, "Areas to Focus": null };
const rimp = { Week: "5", Day: "1", Date: "2026-99-99", Exercises: "X", Sports: null, Skills: null, Tadreeb: null, "Areas to Focus": null };
const rfeb = { Week: "5", Day: "1", Date: "2026-02-30", Exercises: "X", Sports: null, Skills: null, Tadreeb: null, "Areas to Focus": null };
const rneg = { Week: "-1", Day: "1", Date: "2026-07-01", Exercises: "X", Sports: null, Skills: null, Tadreeb: null, "Areas to Focus": null };
const rdec = { Week: "1.5", Day: "1", Date: "2026-07-01", Exercises: "X", Sports: null, Skills: null, Tadreeb: null, "Areas to Focus": null };
const rdaydec = { Week: "1", Day: "2.7", Date: "2026-07-01", Exercises: "X", Sports: null, Skills: null, Tadreeb: null, "Areas to Focus": null };
const rempty = { Week: "10", Day: "1", Date: "2026-08-01", Exercises: null, Sports: "", Skills: null, Tadreeb: "", "Areas to Focus": null };

describe("parseSheet", () => {
  it("single row → one session, one block", () => {
    const { sheet, errors } = parseSheet("AP", [r1], ctx);
    expect(errors).toHaveLength(0);
    expect(sheet!.sessions).toHaveLength(1);
    expect(sheet!.sessions[0].sessionDate).toBe("2026-05-23");
    expect(sheet!.sessions[0].blocks).toHaveLength(1);
    expect(sheet!.sessions[0].blocks[0].teamCode).toBe("sports");
    expect(sheet!.sessions[0].blocks[0].category).toBe("exercises");
  });

  it("full row → 4 blocks, correct team mapping", () => {
    const { sheet } = parseSheet("AP", [r2], ctx);
    const b = sheet!.sessions[0].blocks;
    expect(b).toHaveLength(4);
    expect(b[0].teamCode).toBe("sports"); expect(b[0].category).toBe("exercises");
    expect(b[1].teamCode).toBe("sports"); expect(b[1].category).toBe("sports");
    expect(b[2].teamCode).toBe("skills"); expect(b[2].category).toBe("skills");
    expect(b[3].teamCode).toBe("tadreeb"); expect(b[3].category).toBe("tadreeb");
  });

  it("off day marker → isOffDay true, zero blocks", () => {
    const { sheet } = parseSheet("AP", [rd], ctx);
    const s = sheet!.sessions[0];
    expect(s.isOffDay).toBe(true);
    expect(s.blocks).toHaveLength(0);
  });

  it("cancelled/no session → isOffDay true, zero blocks", () => {
    const { sheet } = parseSheet("AP", [rc], ctx);
    const s = sheet!.sessions[0];
    expect(s.isOffDay).toBe(true);
    expect(s.blocks).toHaveLength(0);
  });

  it("placeholder row skipped", () => {
    const { sheet } = parseSheet("AP", [rempty], ctx);
    expect(sheet!.sessions).toHaveLength(0);
    expect(sheet!.skippedPlaceholderRows).toBe(1);
  });

  it("mix content + placeholder", () => {
    const { sheet } = parseSheet("AP", [r1, rempty, r2], ctx);
    expect(sheet!.sessions).toHaveLength(2);
    expect(sheet!.skippedPlaceholderRows).toBe(1);
  });

  it("park context preserved", () => {
    const { sheet } = parseSheet("SLS", [r1], pctx);
    expect(sheet!.context.parkName).toBe("State Life School");
  });

  it("bad date → row error", () => {
    const { sheet, errors } = parseSheet("AP", [rbad], ctx);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Invalid date format");
    expect(sheet!.sessions).toHaveLength(0);
  });

  it("impossible calendar date (month 99) → row error", () => {
    const { sheet, errors } = parseSheet("AP", [rimp], ctx);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Impossible calendar date");
    expect(sheet!.sessions).toHaveLength(0);
  });

  it("impossible calendar date (Feb 30) → row error", () => {
    const { sheet, errors } = parseSheet("AP", [rfeb], ctx);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Impossible calendar date");
    expect(sheet!.sessions).toHaveLength(0);
  });

  it("negative week → row error", () => {
    const { sheet, errors } = parseSheet("AP", [rneg], ctx);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Invalid week");
    expect(sheet!.sessions).toHaveLength(0);
  });

  it("decimal week → row error", () => {
    const { sheet, errors } = parseSheet("AP", [rdec], ctx);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Invalid week");
    expect(sheet!.sessions).toHaveLength(0);
  });

  it("decimal day → row error", () => {
    const { sheet, errors } = parseSheet("AP", [rdaydec], ctx);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Invalid day");
    expect(sheet!.sessions).toHaveLength(0);
  });

  it("missing columns → early error", () => {
    const { sheet, errors } = parseSheet("AP", [{ x: "1" }], ctx);
    expect(errors[0].message).toContain("Missing required columns");
    expect(sheet).toBeNull();
  });

  it("invalid context → early error", () => {
    const { sheet, errors } = parseSheet("AP", [r1], { cityName: 123 } as unknown as WorkbookContext);
    expect(errors[0].message).toContain("Invalid workbook context");
    expect(sheet).toBeNull();
  });

  it("empty rows array → error", () => {
    const { errors } = parseSheet("AP", [], ctx);
    expect(errors[0].message).toContain("no data rows");
  });

  it("Focus Area alias", () => {
    const row = { week: "1", day: "1", date: "2026-05-23", exercises: "X", sports: null, skills: null, tadreeb: null, "Focus Area": "Leadership" };
    const { sheet } = parseSheet("AP", [row], ctx);
    expect(sheet!.sessions[0].focusArea).toBe("Leadership");
  });
});

describe("computeSummary", () => {
  it("multiple sessions", () => {
    const { sheet } = parseSheet("AP", [r1, rd, r2], ctx);
    const s = computeSummary([sheet!]);
    expect(s.sessionsWithContent).toBe(3);
    expect(s.totalBlocks).toBe(5);
    expect(s.blocksPerTeam.sports).toBe(3);
    expect(s.blocksPerTeam.skills).toBe(1);
    expect(s.blocksPerTeam.tadreeb).toBe(1);
    expect(s.offDays).toBe(1);
  });

  it("external links", () => {
    const { sheet } = parseSheet("AP", [rl], ctx);
    expect(computeSummary([sheet!]).externalLinksFound).toBe(2);
  });
});
