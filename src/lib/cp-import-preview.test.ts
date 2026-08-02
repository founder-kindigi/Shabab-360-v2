import { describe, expect, it } from "vitest";

const parser = await import("../../scripts/cp-import-preview.cjs");

describe("CP-IMPORT-001 Content Planner Zero-Write Import Preview", () => {
  it("requires explicit operator context (cityId and targetPlanId)", () => {
    expect(() =>
      parser.buildPreviewReport({ blocks: [], blockedUrls: [], errors: [] }, {
        cityId: "",
        targetPlanId: "plan-1",
      })
    ).toThrow("Operator must explicitly provide cityId and targetPlanId");

    expect(() =>
      parser.buildPreviewReport({ blocks: [], blockedUrls: [], errors: [] }, {
        cityId: "city-lhr",
        targetPlanId: "",
      })
    ).toThrow("Operator must explicitly provide cityId and targetPlanId");
  });

  it("detects embedded URLs and flags them as blocked_proposed_resources (fails closed)", () => {
    const urls = parser.detectUrls("Check lesson video at https://youtube.com/watch?v=123 and docs at http://example.com/pdf");
    expect(urls).toEqual([
      "https://youtube.com/watch?v=123",
      "http://example.com/pdf",
    ]);
  });

  it("preserves week/session labels, block types, focus areas, and State Life overrides", () => {
    const mockSheet = {
      rowCount: 3,
      getRow: (rowNum: number) => {
        if (rowNum === 2) {
          return {
            getCell: (col: number) => {
              const vals: Record<number, any> = {
                1: "Week 1",
                2: "Session 1",
                3: "Sports",
                4: "Physical Agility",
                5: "Football Drills",
                6: "Drill instructions here",
                7: "https://resource.link/video",
              };
              return { value: vals[col] };
            },
          };
        }
        return { getCell: () => ({ value: "" }) };
      },
    };

    const parsed = parser.parseContentSheet(mockSheet, "State_Life", {
      cityId: "city-lhr",
      targetPlanId: "plan-b4",
      isStateLifeOverride: true,
    });

    expect(parsed.blocks).toHaveLength(1);
    expect(parsed.blocks[0]).toMatchObject({
      sourceSheet: "State_Life",
      sourceRow: 2,
      weekLabel: "Week 1",
      sessionLabel: "Session 1",
      blockType: "sports",
      focusArea: "Physical Agility",
      isStateLifeOverride: true,
      hasBlockedUrls: true,
    });
    expect(parsed.blockedUrls).toHaveLength(1);
    expect(parsed.blockedUrls[0].status).toBe("blocked_proposed_resource");
  });

  it("builds zero-write preview report with zero database writes", () => {
    const report = parser.buildPreviewReport(
      {
        blocks: [
          {
            sourceSheet: "Gulberg",
            sourceRow: 2,
            weekLabel: "Week 1",
            sessionLabel: "Session 1",
            blockType: "tadreeb",
            isOffDay: false,
            isStateLifeOverride: false,
          },
        ],
        blockedUrls: [],
        errors: [],
      },
      {
        cityId: "city-lhr",
        targetPlanId: "plan-b4",
        parkId: "park-gulberg",
      }
    );

    expect(report.mode).toBe("zero_write_preview");
    expect(report.writesPerformed).toBe(false);
    expect(report.operatorContext).toEqual({
      cityId: "city-lhr",
      targetPlanId: "plan-b4",
      parkId: "park-gulberg",
      batchId: null,
    });
    expect(report.metrics.proposedBlocks).toBe(1);
  });

  it("parses the approved dated Batch 4 layout with an off-day and rich-text URL", () => {
    const rows: Record<number, Record<number, any>> = {
      2: { 1: "Week 1", 2: "Day 1", 3: new Date("2026-05-23T00:00:00Z"), 4: { richText: [{ text: "Warmup\nhttps://example.test/video" }] }, 5: "Frisbee", 8: "Discipline" },
      3: { 1: "Week 2", 2: "Day 2", 3: new Date("2026-05-30T00:00:00Z"), 4: "OFF DAY (EID)", 5: "OFF DAY (EID)" },
    };
    const sheet = { rowCount: 3, getRow: (row: number) => ({ getCell: (column: number) => ({ value: rows[row]?.[column] ?? null }) }) };
    const parsed = parser.parseBatch4Sheet(sheet, "All Parks", {});
    expect(parsed.sessions).toHaveLength(2);
    expect(parsed.sessions[1].isOffDay).toBe(true);
    expect(parsed.blocks).toHaveLength(2);
    expect(parsed.blocks[0]).toMatchObject({ category: "exercises", sessionDate: "2026-05-23", hasBlockedUrls: true });
  });
});
