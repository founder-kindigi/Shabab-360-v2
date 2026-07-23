import { describe, it, expect, beforeEach } from "vitest";
import {
  normalizePakistanPhone,
  isValidPakistanPhone,
} from "../phone";
import { maskName, maskPhone, computeFingerprint } from "../pii";
import { normalizeCallingRows } from "../normalizer";
import { detectDuplicates } from "../duplicates";
import { MockInterviewLookupService } from "../interview-matcher";
import { processCallingImport } from "../importer";
import type { RawSourceRow, CallingImportOptions } from "../types";

describe("Calling Import Preparation — PKG-03 Test Suite", () => {
  let mockLookup: MockInterviewLookupService;
  const testCityId = "city-lahore-01";
  const testSecret = "test-hmac-secret-12345";

  beforeEach(() => {
    mockLookup = new MockInterviewLookupService();
    mockLookup.addMockPark("park-01", "State Life School", testCityId);
    mockLookup.addMockPark("park-02", "Model Town Park", testCityId);

    mockLookup.addMockInterview({
      cityId: testCityId,
      interviewId: "interview-101",
      applicationId: "app-101",
      applicantName: "Usman Ahmed",
      guardianPhone: "923001234567",
    });
  });

  describe("Pakistan Phone Normalization", () => {
    it("normalizes various valid Pakistani phone formats to canonical 12-digit format", () => {
      expect(normalizePakistanPhone("+92-300-1234567")).toBe("923001234567");
      expect(normalizePakistanPhone("0300 1234567")).toBe("923001234567");
      expect(normalizePakistanPhone("00923001234567")).toBe("923001234567");
      expect(normalizePakistanPhone("923001234567")).toBe("923001234567");
      expect(normalizePakistanPhone("3001234567")).toBe("923001234567");
    });

    it("returns null for malformed or non-Pakistani phone numbers", () => {
      expect(normalizePakistanPhone("12345")).toBeNull();
      expect(normalizePakistanPhone("abcdefg")).toBeNull();
      expect(normalizePakistanPhone("")).toBeNull();
      expect(normalizePakistanPhone(null)).toBeNull();
      expect(isValidPakistanPhone("03001234567")).toBe(true);
      expect(isValidPakistanPhone("123")).toBe(false);
    });
  });

  describe("PII Masking & HMAC Fingerprinting", () => {
    it("masks names and phone numbers correctly without exposing raw PII", () => {
      expect(maskName("Ahmed Khan")).toBe("Ah*** Kh**");
      expect(maskName("Ali")).toBe("Al*");
      expect(maskPhone("923001234567")).toBe("+92300*****67");
      expect(maskPhone("+923001234567")).toBe("+92300*****67");
    });

    it("generates HMAC-SHA-256 fingerprints when secret key is provided", () => {
      const fp1 = computeFingerprint("Ahmed Khan", testSecret);
      const fp2 = computeFingerprint("Ahmed Khan", testSecret);

      expect(fp1).toMatch(/^hmac_sha256_[a-f0-9]{16}$/);
      expect(fp1).toBe(fp2);
    });

    it("throws bounded error when HMAC secret is missing or empty", () => {
      expect(() => computeFingerprint("Ahmed Khan", "")).toThrow(
        "IMPORT_HMAC_SECRET is required"
      );
      expect(() => computeFingerprint("Ahmed Khan", "   ")).toThrow(
        "IMPORT_HMAC_SECRET is required"
      );
    });
  });

  describe("Row Normalization & Operator Scope Validation", () => {
    it("rejects rows with missing prospect name or missing phone numbers", () => {
      const rawRows: RawSourceRow[] = [
        {
          rowNumber: 2,
          sheetName: "Sheet1",
          prospectName: "",
          contactPhone: "03001234567",
        },
        {
          rowNumber: 3,
          sheetName: "Sheet1",
          prospectName: "Applicant Without Phone",
          contactPhone: "invalid",
          guardianPhone: "",
        },
      ];

      const options: CallingImportOptions = { cityId: testCityId, hmacSecret: testSecret };
      const res = normalizeCallingRows(rawRows, options, []);

      expect(res.validRows).toHaveLength(0);
      expect(res.invalidRows).toHaveLength(2);
      expect(res.invalidRows[0].reason).toContain("Prospect Name is empty");
      expect(res.invalidRows[1].reason).toContain("both empty or invalid");
    });

    it("throws error when operator cityId is missing or empty", () => {
      const rawRows: RawSourceRow[] = [
        {
          rowNumber: 2,
          sheetName: "Sheet1",
          prospectName: "Valid Name",
          contactPhone: "03001234567",
        },
      ];

      expect(() =>
        normalizeCallingRows(rawRows, { cityId: "", hmacSecret: testSecret }, [])
      ).toThrow("Operator city context (--cityId) is required");
    });

    it("throws error when hmacSecret is missing or empty during normalization", () => {
      const rawRows: RawSourceRow[] = [
        {
          rowNumber: 2,
          sheetName: "Sheet1",
          prospectName: "Valid Name",
          contactPhone: "03001234567",
        },
      ];

      expect(() =>
        normalizeCallingRows(rawRows, { cityId: testCityId, hmacSecret: "" }, [])
      ).toThrow("IMPORT_HMAC_SECRET is required");
    });

    it("masks and fingerprints unresolved park inputs without exposing raw park names in reports", () => {
      const rawRows: RawSourceRow[] = [
        {
          rowNumber: 2,
          sheetName: "Sheet1",
          prospectName: "Karachi Applicant",
          contactPhone: "03001234567",
          allocatedPark: "Clifton Beach Park",
        },
      ];

      const cityParks = [{ id: "park-01", name: "State Life School" }];
      const res = normalizeCallingRows(
        rawRows,
        { cityId: testCityId, hmacSecret: testSecret },
        cityParks
      );

      expect(res.validRows).toHaveLength(1);
      expect(res.unresolvedParks).toHaveLength(1);
      expect(res.unresolvedParks[0].providedParkNameMasked).toBe("Cl***** Be*** Pa**");
      expect(res.unresolvedParks[0].providedParkNameFingerprint).toMatch(
        /^hmac_sha256_[a-f0-9]{16}$/
      );
      expect(res.unresolvedParks[0].status).toBe("UNRESOLVED_PARK");
      expect(JSON.stringify(res.unresolvedParks[0])).not.toContain("Clifton Beach Park");
    });
  });

  describe("Duplicate Detection & Clustering", () => {
    it("detects duplicate candidates by normalized primary phone across rows and sheets", () => {
      const rawRows: RawSourceRow[] = [
        {
          rowNumber: 2,
          sheetName: "Phase 2",
          prospectName: "Ahmed Khan",
          contactPhone: "+92-300-1234567",
        },
        {
          rowNumber: 15,
          sheetName: "Interview List",
          prospectName: "Ahmed Khan",
          contactPhone: "0300 1234567",
        },
      ];

      const options: CallingImportOptions = { cityId: testCityId, hmacSecret: testSecret };
      const normRes = normalizeCallingRows(rawRows, options, []);
      const dupRes = detectDuplicates(normRes.validRows);

      expect(dupRes.duplicateClusters).toHaveLength(1);
      expect(dupRes.duplicateClusters[0].matchingRows).toHaveLength(2);
      expect(dupRes.duplicateClusters[0].resolution).toBe("MERGE_HISTORIC_TIMELINE");
      expect(dupRes.uniqueRows).toHaveLength(1);
    });
  });

  describe("Read-Only AdmissionInterview Matching & Unmatched Link Reporting", () => {
    it("matches candidate to existing AdmissionInterview in read-only mode", async () => {
      const rawRows: RawSourceRow[] = [
        {
          rowNumber: 2,
          sheetName: "Sheet1",
          prospectName: "Usman Ahmed",
          contactPhone: "03001234567",
        },
      ];

      const options: CallingImportOptions = { cityId: testCityId, hmacSecret: testSecret };
      const report = await processCallingImport(rawRows, options, mockLookup);

      expect(report.summary.validLeadsCount).toBe(1);
      expect(report.summary.unresolvedInterviewLinksCount).toBe(0);
    });

    it("logs unresolvedInterviewLink when no matching AdmissionInterview record exists", async () => {
      const rawRows: RawSourceRow[] = [
        {
          rowNumber: 2,
          sheetName: "Sheet1",
          prospectName: "Unmatched Candidate",
          contactPhone: "03219998877",
        },
      ];

      const options: CallingImportOptions = { cityId: testCityId, hmacSecret: testSecret };
      const report = await processCallingImport(rawRows, options, mockLookup);

      expect(report.summary.validLeadsCount).toBe(1);
      expect(report.summary.unresolvedInterviewLinksCount).toBe(1);
      expect(report.unresolvedInterviewLinks[0].status).toBe("unresolvedInterviewLink");
      expect(report.unresolvedInterviewLinks[0].reason).toContain("No matching AdmissionInterview");
    });
  });

  describe("Zero Database Write & Complete End-to-End Reconciliation Report", () => {
    it("generates deterministic masked JSON reconciliation report with zero writes", async () => {
      const syntheticInput: RawSourceRow[] = [
        {
          rowNumber: 2,
          sheetName: "Sheet1",
          prospectName: "Usman Ahmed",
          contactPhone: "03001234567",
          allocatedPark: "State Life School",
        },
        {
          rowNumber: 3,
          sheetName: "Sheet1",
          prospectName: "Unmatched Candidate",
          contactPhone: "03219998877",
          allocatedPark: "Invalid Park Name",
        },
        {
          rowNumber: 4,
          sheetName: "Sheet1",
          prospectName: "",
          contactPhone: "",
        },
      ];

      const options: CallingImportOptions = {
        cityId: testCityId,
        dryRun: true,
        hmacSecret: testSecret,
      };

      const report = await processCallingImport(syntheticInput, options, mockLookup);

      expect(report.summary.totalRowsProcessed).toBe(3);
      expect(report.summary.validLeadsCount).toBe(2);
      expect(report.summary.invalidLeadsCount).toBe(1);
      expect(report.summary.unresolvedParksCount).toBe(1);
      expect(report.summary.unresolvedInterviewLinksCount).toBe(1);

      // Verify no raw PII or raw park names in output report
      const jsonString = JSON.stringify(report);
      expect(jsonString).not.toContain("03219998877");
      expect(jsonString).not.toContain("Invalid Park Name");
      expect(jsonString).toContain("unresolvedInterviewLink");
      expect(jsonString).toContain("UNRESOLVED_PARK");
    });
  });
});
