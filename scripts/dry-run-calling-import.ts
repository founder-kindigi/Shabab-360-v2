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
  dryRun: boolean;
} {
  const args = process.argv.slice(2);
  let filePath: string | undefined = undefined;
  let cityId: string | undefined = undefined;
  let campaignId: string | undefined = undefined;
  let dryRun = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--file" && i + 1 < args.length) {
      filePath = args[++i];
    } else if (arg === "--cityId" && i + 1 < args.length) {
      cityId = args[++i];
    } else if (arg === "--campaignId" && i + 1 < args.length) {
      campaignId = args[++i];
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  return { filePath, cityId, campaignId, dryRun };
}

/**
 * Generates synthetic raw source rows for dry-run testing when no file is supplied.
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
  const { filePath, cityId, campaignId, dryRun } = parseArgs();

  const effectiveCityId = cityId || "lahore-city-id";
  const hmacSecret = process.env.IMPORT_HMAC_SECRET || undefined;

  const options: CallingImportOptions = {
    cityId: effectiveCityId,
    campaignId,
    dryRun,
    hmacSecret,
  };

  let lookupService;

  // Use Prisma if DATABASE_URL is configured, otherwise fallback to mock lookup service
  if (process.env.DATABASE_URL) {
    try {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      lookupService = new PrismaInterviewLookupService(prisma);
    } catch {
      // Fall back to mock if Prisma fails to initialize
      const mock = new MockInterviewLookupService();
      mock.addMockPark("park-01", "State Life School", effectiveCityId);
      mock.addMockInterview({
        cityId: effectiveCityId,
        interviewId: "int-101",
        applicationId: "app-101",
        applicantName: "Ahmed Khan",
        guardianPhone: "923001234567",
      });
      lookupService = mock;
    }
  } else {
    const mock = new MockInterviewLookupService();
    mock.addMockPark("park-01", "State Life School", effectiveCityId);
    mock.addMockInterview({
      cityId: effectiveCityId,
      interviewId: "int-101",
      applicationId: "app-101",
      applicantName: "Ahmed Khan",
      guardianPhone: "923001234567",
    });
    lookupService = mock;
  }

  let input: string | Buffer | RawSourceRow[];
  if (filePath && fs.existsSync(filePath)) {
    input = path.resolve(filePath);
  } else {
    input = getSyntheticRows();
  }

  const report = await processCallingImport(input, options, lookupService);

  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Dry-run calling import failed:", err.message);
    process.exit(1);
  });
}
