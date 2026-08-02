import { describe, expect, it } from "vitest";

const parser = await import("../../scripts/calling-import-preview.cjs");

describe("CALL-009 Calling Workbook Import Template & Zero-Write Preview", () => {
  it("validates canonical header schema and detects missing required columns", () => {
    const valid = parser.validateHeaders(parser.CANONICAL_COLUMNS);
    expect(valid.isValid).toBe(true);

    const invalid = parser.validateHeaders(["sourceReference", "campaignCode"]);
    expect(invalid.isValid).toBe(false);
    expect(invalid.missing).toContain("applicantReference");
  });

  it("redacts mobile and WhatsApp phone PII in output reports", () => {
    expect(parser.redactPhone("03001234567")).toBe("0300****567");
    expect(parser.redactPhone("+92 300 9876543")).toBe("+923****543");
  });

  it("blocks foreign campaign and city scope rows", () => {
    const parsed = parser.parseCallingRows(
      [
        {
          sourceReference: "SRC-1",
          campaignCode: "FOREIGN-CAMP",
          cityCode: "LHR",
          applicantReference: "APP-1",
        },
      ],
      { expectedCampaignCode: "CAMP-B4", expectedCityCode: "LHR" }
    );

    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0].code).toBe("foreign_campaign_scope");
  });

  it("flags unmatched applicants and unrecognized assignees without creating admission applications", () => {
    const parsed = parser.parseCallingRows(
      [
        {
          sourceReference: "SRC-101",
          campaignCode: "CAMP-B4",
          cityCode: "LHR",
          applicantReference: "UNMATCHED-APP",
          assigneeReference: "INACTIVE-CALLER",
        },
      ],
      {
        expectedCampaignCode: "CAMP-B4",
        expectedCityCode: "LHR",
        activeCallers: ["CALLER-01"],
        knownApplicantRefs: ["MATCHED-APP"],
      }
    );

    const codes = parsed.errors.map((e: any) => e.code);
    expect(codes).toContain("unmatched_applicant");
    expect(codes).toContain("unrecognized_assignee");
  });

  it("detects duplicate sourceReferences", () => {
    const parsed = parser.parseCallingRows(
      [
        {
          sourceReference: "SRC-DUP",
          campaignCode: "CAMP-B4",
          cityCode: "LHR",
          applicantReference: "APP-1",
        },
        {
          sourceReference: "SRC-DUP",
          campaignCode: "CAMP-B4",
          cityCode: "LHR",
          applicantReference: "APP-1",
        },
      ],
      { expectedCampaignCode: "CAMP-B4", expectedCityCode: "LHR", knownApplicantRefs: ["APP-1"] }
    );

    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0].code).toBe("duplicate_source_reference");
  });

  it("builds zero-write preview report with zero database writes", () => {
    const report = parser.buildCallingPreviewReport(
      {
        records: [
          {
            sourceReference: "SRC-1",
            isApplicantMatched: true,
            isAssigneeActive: true,
          },
        ],
        errors: [],
      },
      { campaignCode: "CAMP-B4", cityCode: "LHR" }
    );

    expect(report.mode).toBe("zero_write_preview");
    expect(report.writesPerformed).toBe(false);
    expect(report.target).toEqual({ campaignCode: "CAMP-B4", cityCode: "LHR" });
  });
});
