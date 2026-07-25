import { NextResponse } from "next/server";

export const MAX_CSV_SIZE_BYTES = 2 * 1024 * 1024; // 2 MiB

export function validateCsvFile(file: File | null): NextResponse | null {
  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json(
      { error: "Only CSV files are supported" },
      { status: 400 }
    );
  }

  if (file.size > MAX_CSV_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File size exceeds maximum limit of 2 MiB" },
      { status: 413 }
    );
  }

  return null;
}
