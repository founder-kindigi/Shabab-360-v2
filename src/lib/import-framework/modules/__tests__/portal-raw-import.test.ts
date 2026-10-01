import { describe, it, expect } from "vitest";
import { analyzePortalRawPipeline, PORTAL_RAW_IMPORT_TEMPLATE, PortalRawRegistrationRow } from "../portal-raw-import";
import { ProcessedRowResult } from "../../types";

describe("Portal Raw Registration Import Pipeline Suite", () => {
  it("defines the portal raw registration template with moduleCode portal_raw_registration", () => {
    expect(PORTAL_RAW_IMPORT_TEMPLATE.moduleCode).toBe("portal_raw_registration");
    expect(PORTAL_RAW_IMPORT_TEMPLATE.columns.length).toBeGreaterThan(20);
  });

  it("analyzes processed raw portal rows and summarizes allocations across 5 modules", () => {
    const mockRows: ProcessedRowResult<PortalRawRegistrationRow>[] = [
      {
        rowNumber: 2,
        rawInput: {},
        parsedData: {
          fullName: "Muhammad Abdul Rafay",
          mobileNumber: "+923144685997",
          whatsappNumber: "+923144685997",
          paymentMethod: "Cash",
          paymentAmount: 1000,
          requestStatus: "Approved",
          requestStatusRemarks: "Token # 155",
          campus: "Gulberg Park",
          group: "Group 1",
          batch: "Lahore Batch 4",
        },
        status: "valid",
        errors: [],
      },
      {
        rowNumber: 3,
        rawInput: {},
        parsedData: {
          fullName: "Haider",
          mobileNumber: "+923084204681",
          requestStatus: "Pending",
          campus: "Johar Town",
        },
        status: "valid",
        errors: [],
      },
    ];

    const summary = analyzePortalRawPipeline(mockRows);

    expect(summary.totalRowsParsed).toBe(2);
    expect(summary.admissionsReady).toBe(2);
    expect(summary.callingWorkloadsReady).toBe(2);
    expect(summary.interviewsReady).toBe(2);
    expect(summary.feePaymentsLogged).toBe(1);
    expect(summary.parkPlacementsReady).toBe(2);
    expect(summary.allocatedParks["Gulberg Park"]).toBe(1);
    expect(summary.allocatedParks["Johar Town"]).toBe(1);
  });
});
