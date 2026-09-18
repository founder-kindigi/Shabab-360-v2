/**
 * Read-only workbook-to-SQLite reconciliation CLI.
 *
 *   node scripts/att01-workbook-reconciliation.ts --input docs/sheets/Shabab_Batch_4_Attendance.xlsx [--database prisma/dev.db] [--output <dir>]
 *
 * It parses the approved workbook in memory, reads the local SQLite file through
 * a read-only handle, and prints aggregate counts, deterministic key hashes and
 * mismatch categories only. It never writes, never resets and never reads `.env`.
 */
import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { openSqliteDatabase } from "../src/lib/attendance/sqlite-support";
import { PARK_SHEETS, readParkSheet } from "../src/lib/attendance/lahore-refresh/workbook";
import { buildRefreshManifest } from "../src/lib/attendance/lahore-refresh/manifest";
import { buildReconciliationReport, manifestSnapshot } from "../src/lib/attendance/lahore-refresh/reconcile";
import { readSqlitePostImportEvidence, readSqliteReconciliationSnapshot } from "../src/lib/attendance/lahore-refresh/reconcile-sqlite";
import type { SheetLike } from "../src/lib/attendance/lahore-refresh/types";

const DEFAULT_WORKBOOK = path.join("docs", "sheets", "Shabab_Batch_4_Attendance.xlsx");
const DEFAULT_DATABASE = path.join("prisma", "dev.db");
const REMOTE_URL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
const NETWORK_PATH_PATTERN = /^(\\\\|\/\/)/;

interface CliOptions {
  readonly input: string;
  readonly database: string;
  readonly outputDir: string | null;
}

function parseArgs(argv: readonly string[]): CliOptions {
  let input = DEFAULT_WORKBOOK;
  let database = DEFAULT_DATABASE;
  let outputDir: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--input" || flag === "--database" || flag === "--output") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
      if (flag === "--input") input = value;
      else if (flag === "--database") database = value;
      else outputDir = value;
      index += 1;
      continue;
    }
    if (flag === "--help") {
      console.log(
        "Usage: node scripts/att01-workbook-reconciliation.ts [--input docs/sheets/Shabab_Batch_4_Attendance.xlsx] [--database prisma/dev.db] [--output <dir>]"
      );
      process.exit(0);
    }
    throw new Error(`Unsupported argument: ${flag}`);
  }

  for (const candidate of [input, database]) {
    if (REMOTE_URL_PATTERN.test(candidate)) throw new Error("--input/--database must be local file paths, not connection URLs");
    if (NETWORK_PATH_PATTERN.test(candidate)) throw new Error("--input/--database must be local file paths, not network or UNC paths");
  }

  return { input: path.resolve(input), database: path.resolve(database), outputDir: outputDir ? path.resolve(outputDir) : null };
}

async function loadManifest(input: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(input);
  const parks = PARK_SHEETS.map(([sheetName, parkName]) => {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) throw new Error(`Required sheet is missing: ${sheetName}`);
    return readParkSheet(sheet as unknown as SheetLike, sheetName, parkName, 2026);
  });
  return buildRefreshManifest(parks);
}

/** File-level fingerprint used to prove the read-only run changed nothing. */
function databaseFingerprint(file: string) {
  const stat = fs.statSync(file);
  const sidecars = fs.readdirSync(path.dirname(file)).filter((name) => /\.db-(wal|shm|journal)$/.test(name)).length;
  return { bytes: stat.size, lastWriteTimeUtc: stat.mtime.toISOString(), sidecars };
}

export async function runWorkbookReconciliationCli(argv: readonly string[]): Promise<void> {
  const options = parseArgs(argv);
  if (!fs.existsSync(options.input)) throw new Error(`Workbook not found: ${options.input}`);
  if (!fs.existsSync(options.database)) throw new Error(`Database not found: ${options.database}`);

  const before = databaseFingerprint(options.database);
  const manifest = await loadManifest(options.input);
  const workbook = manifestSnapshot(manifest);

  const db = openSqliteDatabase(options.database, true);
  let database: ReturnType<typeof readSqliteReconciliationSnapshot>;
  let evidence: ReturnType<typeof readSqlitePostImportEvidence>;
  try {
    database = readSqliteReconciliationSnapshot(db);
    evidence = readSqlitePostImportEvidence(db);
  } finally {
    db.close();
  }

  const after = databaseFingerprint(options.database);
  const report = buildReconciliationReport(workbook, database, evidence);

  const payload = {
    mode: "read-only",
    writesPerformed: false,
    input: path.relative(process.cwd(), options.input),
    databasePath: path.relative(process.cwd(), options.database),
    databaseFingerprintBefore: before,
    databaseFingerprintAfter: after,
    databaseUnchanged: JSON.stringify(before) === JSON.stringify(after),
    requiredTotals: report.requiredTotals,
    workbook: workbook.aggregates,
    database: database.aggregates,
    aggregatesEqual: report.aggregates.equal,
    keys: report.keys,
    statusTotals: report.statusTotals,
    lifecycle: report.lifecycle,
    staff: report.staff,
    postImport: report.postImport,
    mismatches: report.mismatches,
    ok: report.ok,
  };

  if (options.outputDir) {
    fs.mkdirSync(options.outputDir, { recursive: true });
    fs.writeFileSync(path.join(options.outputDir, "att01-workbook-reconciliation.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }

  console.log(JSON.stringify(payload, null, 2));
}
