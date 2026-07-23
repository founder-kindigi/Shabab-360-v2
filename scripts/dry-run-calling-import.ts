import fs from "node:fs";
import path from "node:path";
import {
  processCallingImport,
  MockInterviewLookupService,
  PrismaInterviewLookupService,
  type RawSourceRow,
  type CallingImportOptions,
} from "../src/lib/calling-import";

/**
 * CLI parser for command line arguments.
 */
function parseArgs(): {
  filePath?: string;
  cityId?: string;
  campaignId?: string;
  synthetic: boolean;
  dryRun: boolean;
} {
  const args = process.argv.slice(2);
  let filePath: string | undefined = undefined;
  let cityId: string | undefined = undefined;
  let campaignId: string | undefined = undefined;
  let synthetic = false;
  let dryRun = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--file" && i + 1 < args.length) {
      filePath = args[++i];
    } else if (arg === "--cityId" && i + 1 < args.length) {
      cityId = args[++i];
    } else if (arg === "--campaignId" && i + 1 < args.length) {
      campaignId = args[++i];
    } else if (arg === "--synthetic") {
      synthetic = true;
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  return { filePath, cityId, campaignId, synthetic, dryRun };
}

/**
 * Generates synthetic raw source rows for dry-run testing when --synthetic is supplied.
 */
function getSyntheticRows(): RawSourceRow[] {
  return [
    {
      rowNumber: 2,
      sheetName: "Phase 2 Candidates",
      prospectName: "Ahmed Khan",
      contactPhone: "+92-300-1234567",
      guardianName: "Mohammad Khan",
      guardianPhone: "0300 1234567",
      allocatedPark: "State Life School",
      callOutcome: "answered",
      prospectStatus: "coming",
      preferredDate: "2026-07-25",
    },
    {
      rowNumber: 3,
      sheetName: "Phase 2 Candidates",
      prospectName: "Zaid Ali",
      contactPhone: "0321 9876543",
      allocatedPark: "Unknown Park Name",
      callOutcome: "unanswered",
      prospectStatus: "pending",
    },
    {
      rowNumber: 4,
      sheetName: "Interview List",
      prospectName: "Ahmed Khan",
      contactPhone: "03001234567",
      allocatedPark: "State Life School",
      callOutcome: "answered",
      prospectStatus: "coming",
    },
    {
      rowNumber: 5,
      sheetName: "Malformed Rows",
      prospectName: "",
      contactPhone: "",
      guardianPhone: "",
    },
    {
      rowNumber: 6,
      sheetName: "Malformed Rows",
      prospectName: "Invalid Phone Applicant",
      contactPhone: "12345",
      guardianPhone: "abc",
    },
  ];
}

async function main() {
  const { filePath, cityId, campaignId, synthetic, dryRun } = parseArgs();

  if (!cityId || !cityId.trim()) {
    throw new Error("Operator city context (--cityId) is required and cannot be empty.");
  }

  if (!campaignId || !campaignId.trim()) {
    throw new Error("Operator campaign context (--campaignId) is required and cannot be empty.");
  }

  const hmacSecret = process.env.IMPORT_HMAC_SECRET;
  if (!hmacSecret || !hmacSecret.trim()) {
    throw new Error("IMPORT_HMAC_SECRET environment variable is required and cannot be empty.");
  }

  if (!synthetic && (!filePath || !filePath.trim())) {
    throw new Error("Workbook file path (--file) is required for operational runs.");
  }

  const options: CallingImportOptions = {
    cityId: cityId.trim(),
    campaignId: campaignId.trim(),
    dryRun,
    hmacSecret: hmacSecret.trim(),
  };

  let lookupService;
  let input: string | Buffer | RawSourceRow[];

  if (synthetic) {
    // Synthetic runs force MockInterviewLookupService without touching Prisma or DATABASE_URL
    const mock = new MockInterviewLookupService();
    mock.addMockPark("park-01", "State Life School", cityId.trim());
    mock.addMockInterview({
      cityId: cityId.trim(),
      interviewId: "int-101",
      applicationId: "app-101",
      applicantName: "Ahmed Khan",
      guardianPhone: "923001234567",
    });
    lookupService = mock;
    input = getSyntheticRows();
  } else {
    // Operational runs require valid file path
    const resolvedPath = path.resolve(filePath!.trim());
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Workbook file not found at path: ${resolvedPath}`);
    }
    input = resolvedPath;

    if (process.env.DATABASE_URL) {
      try {
        const { PrismaClient } = await import("@prisma/client");
        const prisma = new PrismaClient();
        lookupService = new PrismaInterviewLookupService(prisma);
      } catch {
        lookupService = new MockInterviewLookupService();
      }
    } else {
      lookupService = new MockInterviewLookupService();
    }
  }

  const report = await processCallingImport(input, options, lookupService);

  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) {
  main().catch(() => {
    console.error("Dry-run calling import failed: An error occurred during import execution.");
    process.exit(1);
  });
}
