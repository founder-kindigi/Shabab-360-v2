import { requireCapability } from "@/lib/auth/authorize";
import { resolveRequestedHierarchy } from "@/lib/auth/hierarchy";
import { NextResponse } from "next/server";
import { z } from "zod";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { requireAuth, isHqRole } from "@/lib/auth/authorize";
import { normalizePakistanPhone } from "@/lib/calling-import/phone";
import { logAudit } from "@/lib/audit";

const querySchema = z.object({
  dryRun: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof Response || auth instanceof NextResponse) return auth;
  const { user } = auth;

  const role = (user.role || "").toLowerCase().trim();
  const isHq = isHqRole(role);
  const canManage = isHq || ["city_head", "park_lead", "park_admin"].includes(role);

  if (!canManage) {
    return NextResponse.json(
      { error: "Insufficient permissions to import attendance data" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const queryResult = querySchema.safeParse({
    dryRun: searchParams.get("dryRun") ?? undefined,
  });

  if (!queryResult.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const isDryRun = queryResult.data.dryRun ?? false;
  const cap = await requireCapability("attendance.correct");
  if (cap instanceof NextResponse) return cap;
  const scope = await resolveRequestedHierarchy(user);
  if (scope instanceof NextResponse) return scope;
  if (!isDryRun) return NextResponse.json({ error: "Attendance workbook commit is currently unavailable. Use dryRun=true for a parse-only preview; no records are imported.", code: "WORKFLOW_UNAVAILABLE" }, { status: 503 });

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing file parameter. Provide a valid .xlsx workbook." },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".xlsx")) {
      return NextResponse.json(
        { error: "Invalid file extension. Only .xlsx files are supported." },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Workbook exceeds 5 MB" }, { status: 413 });
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    if (workbook.worksheets.length > 20 || workbook.worksheets.some(sheet => sheet.rowCount > 5000 || sheet.columnCount > 400)) return NextResponse.json({ error: "Workbook dimensions exceed preview limits" }, { status: 400 });
    const parkSheets = ["Gulberg", "Gulshan_Iqbal", "Griffin", "Johar_Town", "Gulshan_Ravi", "State_Life"];

    let totalStudentsProcessed = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;
    const parkSummaries: Array<{ name: string; studentCount: number }> = [];

    const parsedStudents: Array<{
      parkName: string;
      name: string;
      phone: string;
      age: number | null;
      role?: string;
      present: number;
      absent: number;
      leave: number;
      rate: string;
    }> = [];

    // Section header markers to skip
    const SECTION_MARKERS = ["PARK LEAD", "MURABBIS", "Group", "SUMMARY", "TOTAL"];

    for (const sheetName of parkSheets) {
      const sheet = workbook.getWorksheet(sheetName);
      if (!sheet) continue;

      let sheetStudentCount = 0;

      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        // Skip title/header rows (rows 1-4: title, column headers, dates)
        if (rowNumber < 5) return;

        // Verified column layout: C1=#, C2=Name, C3=Phone, C7=Age, C8=Grade/Role, C9+=attendance
        const c1 = row.getCell(1).value;
        const c1Str = String(c1 || "").trim();
        const name = String(row.getCell(2).value || "").trim();

        // Skip section headers (Park Lead, Murabbis, Group headers, summaries)
        if (SECTION_MARKERS.some(m => c1Str.includes(m) || name.includes(m))) return;
        // Skip non-numeric serial rows and empty names
        if (typeof c1 !== "number" || !name) return;

        const phoneRaw = String(row.getCell(3).value || "").trim().replace(/^'/, "");
        const phone = normalizePakistanPhone(phoneRaw) || phoneRaw;
        const ageRaw = row.getCell(7).value;
        const age = typeof ageRaw === "number" ? Math.round(ageRaw) : null;
        const roleText = String(row.getCell(8).value || "").trim();

        // Count attendance from C9 onwards (skip formula cells and OFF values)
        let p = 0;
        let a = 0;
        let l = 0;
        let lv = 0;

        for (let col = 9; col <= row.cellCount; col++) {
          const cell = row.getCell(col);
          // Skip formula cells (OFF weekend formulas)
          if (cell.type === 2 /* FormulaType */) continue;
          const val = String(cell.value || "").trim().toLowerCase();
          if (val === "present") { p++; presentCount++; }
          else if (val === "absent") { a++; absentCount++; }
          else if (val === "late") { l++; lateCount++; }
          else if (val === "leave") { lv++; leaveCount++; }
          // OFF, Sat Off, blanks, Dropout, malformed values are intentionally skipped
        }

        const totalMarked = p + l + a;
        const ratePct = totalMarked > 0 ? `${Math.round(((p + l) / totalMarked) * 100)}%` : "—";

        totalStudentsProcessed++;
        sheetStudentCount++;

        parsedStudents.push({
          parkName: sheetName.replace(/_/g, " "),
          name,
          phone,
          age,
          role: roleText || "Student",
          present: p + l,
          absent: a,
          leave: lv,
          rate: ratePct,
        });
      });

      parkSummaries.push({
        name: sheetName.replace(/_/g, " "),
        studentCount: sheetStudentCount,
      });
    }

    const report = {
      fileName: file.name,
      totalStudentsProcessed,
      presentCount,
      absentCount,
      lateCount,
      leaveCount,
      parkSummaries,
      previewOnly: true,
    };

    return NextResponse.json({ dryRun: true, report });


  } catch (error) {
    console.error("Attendance import error:", error);
    return NextResponse.json(
      { error: "Failed to process attendance workbook import." },
      { status: 500 }
    );
  }
}
