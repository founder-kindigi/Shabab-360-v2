import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import ExcelJS from "exceljs";
import {
  normalizePakistanPhone,
  isValidPakistanPhone,
} from "../phone";
import { maskName, maskPhone, computeFingerprint } from "../pii";
import { normalizeCallingRows } from "../normalizer";
import { detectDuplicates } from "../duplicates";
import {
  MockInterviewLookupService,
  PrismaInterviewLookupService,
} from "../interview-matcher";
import { processCallingImport } from "../importer";
import { parseCallingWorkbook } from "../parser";
import type { RawSourceRow, CallingImportOptions } from "../types";

describe("Calling Import Preparation — PKG-03 Test Suite", () => {
  let mockLookup: MockInterviewLookupService;
  const testCityId = "city-lahore-01";
  const testCampaignId = "campaign-phase2-01";
  const testSecret = "test-hmac-secret-12345";
  const cliPath = path.resolve("scripts/dry-run-calling-import.ts");
  const tsxCliPath = path.resolve("node_modules", "tsx", "dist", "cli.mjs");

  let createdTempDirs: string[] = [];

  // Execute the declared local runner directly so CLI safety tests never invoke npx.
  function runCli(args: string[], env: NodeJS.ProcessEnv): Buffer {
    return execFileSync(process.execPath, [tsxCliPath, cliPath, ...args], {
      env,
      stdio: "pipe",
    });
  }

  /**
   * Helper to create a valid minimal .xlsx workbook in OS temp directory.
   */
  async function createValidMinimalWorkbook(): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Phase 2 Candidates");
    sheet.addRow([
      "Prospect Name",
      "Contact Phone",
      "Guardian Name",
      "Guardian Phone",
      "Allocated Park",
    ]);
    sheet.addRow([
      "Ahmed Khan",
      "03001234567",
      "Mohammad Khan",
      "03001234567",
      "State Life School",
    ]);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "calling-import-test-"));
    createdTempDirs.push(tmpDir);
    const filePath = path.join(tmpDir, "minimal-test-calling-workbook.xlsx");
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

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

  afterEach(() => {
    for (const dir of createdTempDirs) {
      try {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      } catch {
        // Ignore cleanup errors
      }
    }
    createdTempDirs = [];
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

  describe("Real Lahore Calling Workbook Headers", () => {
    it("maps Full Name, Mobile Number, and comments without misclassifying WhatsApp as guardian data", async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Calls for Phase 2");
      sheet.addRow(["Full Name", "Mobile Number", "Whatsapp Number", "Old Comments", "New Comments"]);
      sheet.addRow(["Test Applicant", "+923001234567", "+923009876543", "Historic note", "Current note"]);
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "calling-real-header-test-"));
      createdTempDirs.push(tmpDir);
      const filePath = path.join(tmpDir, "calling.xlsx");
      await workbook.xlsx.writeFile(filePath);

      const [row] = await parseCallingWorkbook(filePath);
      expect(row).toMatchObject({
        prospectName: "Test Applicant",
        contactPhone: "+923001234567",
        callNotes: "Current note",
      });
      expect(row.guardianPhone).toBeUndefined();
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

      const options: CallingImportOptions = {
        cityId: testCityId,
        campaignId: testCampaignId,
        hmacSecret: testSecret,
      };
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
        normalizeCallingRows(
          rawRows,
          { cityId: "", campaignId: testCampaignId, hmacSecret: testSecret },
          []
        )
      ).toThrow("Operator city context (--cityId) is required");
    });

    it("throws error when operator campaignId is missing or empty", () => {
      const rawRows: RawSourceRow[] = [
        {
          rowNumber: 2,
          sheetName: "Sheet1",
          prospectName: "Valid Name",
          contactPhone: "03001234567",
        },
      ];

      expect(() =>
        normalizeCallingRows(
          rawRows,
          { cityId: testCityId, campaignId: "", hmacSecret: testSecret },
          []
        )
      ).toThrow("Operator campaign context (--campaignId) is required");
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
        normalizeCallingRows(
          rawRows,
          { cityId: testCityId, campaignId: testCampaignId, hmacSecret: "" },
          []
        )
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
        { cityId: testCityId, campaignId: testCampaignId, hmacSecret: testSecret },
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

      const options: CallingImportOptions = {
        cityId: testCityId,
        campaignId: testCampaignId,
        hmacSecret: testSecret,
      };
      const normRes = normalizeCallingRows(rawRows, options, []);
      const dupRes = detectDuplicates(normRes.validRows);

      expect(dupRes.duplicateClusters).toHaveLength(1);
      expect(dupRes.duplicateClusters[0].matchingRows).toHaveLength(2);
      expect(dupRes.duplicateClusters[0].resolution).toBe("MERGE_HISTORIC_TIMELINE");
      expect(dupRes.uniqueRows).toHaveLength(1);
    });
  });

  describe("Read-Only AdmissionInterview Matching & Fail-Closed Lookup Rejection", () => {
    it("matches candidate to existing AdmissionInterview in read-only mode", async () => {
      const rawRows: RawSourceRow[] = [
        {
          rowNumber: 2,
          sheetName: "Sheet1",
          prospectName: "Usman Ahmed",
          contactPhone: "03001234567",
        },
      ];

      const options: CallingImportOptions = {
        cityId: testCityId,
        campaignId: testCampaignId,
        hmacSecret: testSecret,
      };
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

      const options: CallingImportOptions = {
        cityId: testCityId,
        campaignId: testCampaignId,
        hmacSecret: testSecret,
      };
      const report = await processCallingImport(rawRows, options, mockLookup);

      expect(report.summary.validLeadsCount).toBe(1);
      expect(report.summary.unresolvedInterviewLinksCount).toBe(1);
      expect(report.unresolvedInterviewLinks[0].status).toBe("unresolvedInterviewLink");
      expect(report.unresolvedInterviewLinks[0].reason).toContain("No matching AdmissionInterview");
    });

    it("rejects processCallingImport when getCityParks fails or throws", async () => {
      const rawRows: RawSourceRow[] = [
        {
          rowNumber: 2,
          sheetName: "Sheet1",
          prospectName: "Ahmed Khan",
          contactPhone: "03001234567",
        },
      ];

      const failingLookup = {
        getCityParks: async () => {
          throw new Error("Database query failed during park fetch");
        },
        findMatchingInterview: async () => ({ matched: false }),
      };

      const options: CallingImportOptions = {
        cityId: testCityId,
        campaignId: testCampaignId,
        hmacSecret: testSecret,
      };

      await expect(
        processCallingImport(rawRows, options, failingLookup)
      ).rejects.toThrow("Database query failed during park fetch");
    });

    it("rejects processCallingImport when findMatchingInterview fails or throws", async () => {
      const rawRows: RawSourceRow[] = [
        {
          rowNumber: 2,
          sheetName: "Sheet1",
          prospectName: "Ahmed Khan",
          contactPhone: "03001234567",
        },
      ];

      const failingLookup = {
        getCityParks: async () => [],
        findMatchingInterview: async () => {
          throw new Error("Database query failed during interview lookup");
        },
      };

      const options: CallingImportOptions = {
        cityId: testCityId,
        campaignId: testCampaignId,
        hmacSecret: testSecret,
      };

      await expect(
        processCallingImport(rawRows, options, failingLookup)
      ).rejects.toThrow("Database query failed during interview lookup");
    });

    it("throws error when PrismaInterviewLookupService lacks initialized delegates", async () => {
      const emptyPrismaLookup = new PrismaInterviewLookupService({});

      await expect(emptyPrismaLookup.getCityParks("city-1")).rejects.toThrow(
        "Prisma client or park delegate is not initialized."
      );
      await expect(
        emptyPrismaLookup.findMatchingInterview({ cityId: "city-1" })
      ).rejects.toThrow(
        "Prisma client or admissionInterview delegate is not initialized."
      );
    });
  });

  describe("CLI Operational Safety & Fail-Closed Tests", () => {
    it(
      "fails safely when --campaignId is missing",
      () => {
        try {
          runCli(
            ["--cityId", testCityId, "--synthetic", "--dry-run"],
            { ...process.env, IMPORT_HMAC_SECRET: testSecret }
          );
          expect.unreachable("Should have failed due to missing --campaignId");
        } catch (err: unknown) {
          const errorOutput = String((err as { stderr?: Buffer }).stderr || "");
          expect(errorOutput).toContain("Dry-run calling import failed");
        }
      },
      60000
    );

    it(
      "fails safely when --file is missing for operational run (without --synthetic)",
      () => {
        try {
          runCli(
            ["--cityId", testCityId, "--campaignId", testCampaignId, "--dry-run"],
            { ...process.env, IMPORT_HMAC_SECRET: testSecret }
          );
          expect.unreachable("Should have failed due to missing --file without --synthetic");
        } catch (err: unknown) {
          const errorOutput = String((err as { stderr?: Buffer }).stderr || "");
          expect(errorOutput).toContain("Dry-run calling import failed");
        }
      },
      60000
    );

    it(
      "fails safely when operational --file run is missing DATABASE_URL",
      async () => {
        const validWorkbookPath = await createValidMinimalWorkbook();
        try {
          const env = { ...process.env, IMPORT_HMAC_SECRET: testSecret };
          delete (env as { DATABASE_URL?: string }).DATABASE_URL;

          runCli(
            ["--cityId", testCityId, "--campaignId", testCampaignId, "--file", validWorkbookPath, "--dry-run"],
            env
          );
          expect.unreachable("Should have failed due to missing DATABASE_URL for operational run");
        } catch (err: unknown) {
          const errorOutput = String((err as { stderr?: Buffer }).stderr || "");
          expect(errorOutput).toContain("Dry-run calling import failed");
        }
      },
      60000
    );

    it(
      "reaches database lookup with valid minimal .xlsx workbook and fails safely on Prisma connection error",
      async () => {
        const validWorkbookPath = await createValidMinimalWorkbook();
        try {
          runCli(
            ["--cityId", testCityId, "--campaignId", testCampaignId, "--file", validWorkbookPath, "--dry-run"],
            {
              ...process.env,
              IMPORT_HMAC_SECRET: testSecret,
              DATABASE_URL: "invalid-schema-url",
            }
          );
          expect.unreachable("Should have failed due to invalid DATABASE_URL");
        } catch (err: unknown) {
          const errorOutput = String((err as { stderr?: Buffer }).stderr || "");
          expect(errorOutput).toContain("Dry-run calling import failed");
        }
      },
      60000
    );

    it(
      "fails safely when --synthetic is combined with --file",
      async () => {
        const validWorkbookPath = await createValidMinimalWorkbook();
        try {
          runCli(
            ["--cityId", testCityId, "--campaignId", testCampaignId, "--synthetic", "--file", validWorkbookPath, "--dry-run"],
            { ...process.env, IMPORT_HMAC_SECRET: testSecret }
          );
          expect.unreachable("Should have failed due to combining --synthetic and --file");
        } catch (err: unknown) {
          const errorOutput = String((err as { stderr?: Buffer }).stderr || "");
          expect(errorOutput).toContain("Dry-run calling import failed");
        }
      },
      60000
    );

    it(
      "executes successfully with --synthetic and outputs masked report without initializing Prisma",
      () => {
        const result = runCli(
          ["--cityId", testCityId, "--campaignId", testCampaignId, "--synthetic", "--dry-run"],
          {
            ...process.env,
            IMPORT_HMAC_SECRET: testSecret,
            DATABASE_URL: "sqlite://invalid-db-for-test-safety",
          }
        ).toString("utf8");

        const parsed = JSON.parse(result);
        expect(parsed.summary.totalRowsProcessed).toBe(5);
        expect(parsed.summary.validLeadsCount).toBe(3);
        expect(parsed.unresolvedParks[0].providedParkNameMasked).toBe("Un***** Pa** Na**");
      },
      60000
    );
  });
});
