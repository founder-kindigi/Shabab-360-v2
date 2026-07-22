/**
 * Shared import validation helpers for CSV import routes.
 */
import { NextResponse } from "next/server";

export const IMPORT_MAX_SIZE = 2 * 1024 * 1024; // 2 MB

/**
 * Validate that a file is present, CSV, and under the size limit.
 * Returns an error response or null if valid.
 */
export function validateImportFile(file: File | null): NextResponse | null {
  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.size > IMPORT_MAX_SIZE) {
    return NextResponse.json(
      { error: "File size exceeds the maximum allowed size of 2 MB." },
      { status: 413 }
    );
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json(
      { error: "Only CSV files are supported" },
      { status: 400 }
    );
  }
  return null;
}

/**
 * Return a safe sanitized error message — never leak internal details.
 */
export function sanitizeImportError(_err: unknown): string {
  return "Import processing failed";
}
