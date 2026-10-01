/**
 * Shared workbook-to-manifest loading for every guarded Lahore Batch 4 tool.
 *
 * The SQLite refresh CLI and the PostgreSQL import CLI both build their write
 * plan here, so the reviewed sheet list, date parsing and normalization rules
 * exist once. Nothing here opens a database, reads an environment file or writes
 * to a target; it only reads the approved workbook and returns a manifest.
 */
import path from "node:path";
import ExcelJS from "exceljs";
import { LAHORE_REFRESH } from "./constants";
import { RefreshRefusedError } from "./guards";
import { buildRefreshManifest } from "./manifest";
import { PARK_SHEETS, readParkSheet } from "./workbook";
import type { ParsedPark, RefreshManifest, SheetLike } from "./types";

/** Reads the six approved park worksheets through the reviewed parser. */
export async function loadParksFromWorkbook(input: string): Promise<ParsedPark[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.resolve(input));
  return PARK_SHEETS.map(([sheetName, parkName]) => {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) throw new RefreshRefusedError(`Required sheet is missing: ${sheetName}`);
    return readParkSheet(sheet as unknown as SheetLike, sheetName, parkName, 2026);
  });
}

/**
 * Builds the refresh manifest and refuses a workbook whose park/group shape does
 * not match the approved Lahore Batch 4 structure before any target is touched.
 */
export async function loadRefreshManifest(input: string, attendanceThrough?: string): Promise<RefreshManifest> {
  const parks = await loadParksFromWorkbook(input);
  const manifest = buildRefreshManifest(parks, attendanceThrough ? { attendanceThrough } : {});
  if (
    manifest.counts.parks !== LAHORE_REFRESH.expectedParks ||
    manifest.counts.groups !== LAHORE_REFRESH.expectedGroups
  ) {
    throw new RefreshRefusedError(
      `Workbook shape mismatch: expected ${LAHORE_REFRESH.expectedParks} parks / ${LAHORE_REFRESH.expectedGroups} groups, parsed ${manifest.counts.parks} / ${manifest.counts.groups}`
    );
  }
  return manifest;
}
