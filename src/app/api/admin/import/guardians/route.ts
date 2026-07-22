import { NextRequest, NextResponse } from "next/server";
import { requireCapability, requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import Papa from "papaparse";
import { validateImportFile, sanitizeImportError } from "@/lib/import-utils";

export async function POST(request: NextRequest) {
  const authError = await requireRole([
    "super_admin",
    "program_admin",
    "city_head",
    "park_admin",
    "park_lead",
    "murabbi",
  ]);
  if (authError) return authError;

  const auth = await requireCapability("guardians.manage");
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    const validatedFile = validateImportFile(file);
    if (validatedFile.response) return validatedFile.response;

    const text = await validatedFile.file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        { error: "Invalid CSV file" },
        { status: 400 }
      );
    }

    const rows = parsed.data.map((row) => {
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        clean[k.trim()] = (v ?? "").trim();
      }
      return clean;
    });

    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV is empty" }, { status: 400 });
    }

    let success = 0;
    const errors: { row: number; message: string }[] = [];

    // Track created guardian phones for dedup within the import
    const importedPhones = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const name = row["name"] || row["Name"] || "";
        const phone = row["phone"] || row["Phone"] || "";

        if (!name) {
          errors.push({ row: rowNum, message: "Name is required" });
          continue;
        }

        if (!phone) {
          errors.push({ row: rowNum, message: "Phone is required" });
          continue;
        }

        // Check for duplicate within the same import
        if (importedPhones.has(phone)) {
          errors.push({
            row: rowNum,
            message: `Duplicate phone number "${phone}" found in this import`,
          });
          continue;
        }

        // Check for existing guardian with this phone
        const existing = await db.guardian.findFirst({ where: { phone } });
        if (existing) {
          errors.push({
            row: rowNum,
            message: `Guardian with phone "${phone}" already exists (ID: ${existing.id})`,
          });
          continue;
        }

        const cnic = row["cnic"] || row["CNIC"] || row["Cnic"] || "";
        const address = row["address"] || row["Address"] || "";

        importedPhones.add(phone);

        await db.guardian.create({
          data: {
            name,
            phone,
            cnic: cnic || null,
            address: address || null,
          },
        });

        success++;
      } catch (err: unknown) {
        errors.push({ row: rowNum, message: sanitizeImportError(err) });
      }
    }

    // Log audit
    await logAudit({
      userId: auth.user.id,
      action: "IMPORT_GUARDIANS",
      entityType: "Guardian",
      newValues: { success, errors: errors.length, total: rows.length },
    });

    return NextResponse.json({
      success,
      errors,
      total: rows.length,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: sanitizeImportError(err) }, { status: 500 });
  }
}
