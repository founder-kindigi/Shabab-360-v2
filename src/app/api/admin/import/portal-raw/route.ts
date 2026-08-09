import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { analyzePortalRawPipeline, PortalRawRegistrationRow } from "@/lib/import-framework/modules/portal-raw-import";
import { ProcessedRowResult } from "@/lib/import-framework/types";

const pipelineExecuteSchema = z.object({
  dryRun: z.boolean().default(true),
  rows: z.array(
    z.object({
      fullName: z.string(),
      mobileNumber: z.string(),
      whatsappNumber: z.string().optional(),
      email: z.string().optional(),
      cnicNumber: z.string().optional(),
      paymentMethod: z.string().optional(),
      paymentAmount: z.number().optional(),
      paymentOn: z.string().optional(),
      age: z.number().optional(),
      gender: z.string().optional(),
      requestStatus: z.string().optional(),
      requestStatusRemarks: z.string().optional(),
      address: z.string().optional(),
      gradeClass: z.string().optional(),
      fatherName: z.string().optional(),
      fatherOccupation: z.string().optional(),
      medicalIssueDetail: z.string().optional(),
      interests: z.string().optional(),
      campus: z.string().optional(),
      group: z.string().optional(),
      batch: z.string().optional(),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const roleResponse = await requireRole(["super_admin", "program_admin", "city_head"]);
    if (roleResponse) return roleResponse;

    const auth = await requireAuth();
    if (!auth || auth instanceof NextResponse) return auth as NextResponse;

    const body = await req.json();
    const parsed = pipelineExecuteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload format", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { dryRun, rows } = parsed.data;

    // Structure rows for analysis
    const processedRows: ProcessedRowResult<PortalRawRegistrationRow>[] = rows.map((r, idx) => ({
      rowNumber: idx + 2,
      rawInput: r as Record<string, unknown>,
      parsedData: r as unknown as Partial<PortalRawRegistrationRow>,
      status: "valid",
      errors: [],
    }));

    const summary = analyzePortalRawPipeline(processedRows);

    if (dryRun) {
      return NextResponse.json({
        success: true,
        mode: "dry_run",
        summary,
        previewRows: rows.slice(0, 10),
      });
    }

    // Execute real pipeline sync across DB models (Admissions, Calling, Fees)
    let createdAdmissionsCount = 0;

    for (const r of rows) {
      // Find or create AdmissionApplication
      const existing = await db.admissionApplication.findFirst({
        where: {
          guardianPhone: r.mobileNumber,
        },
      });

      if (!existing) {
        await db.admissionApplication.create({
          data: {
            trackingCode: `APP-PORTAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            applicantName: r.fullName,
            guardianName: r.fatherName || r.fullName,
            guardianPhone: r.mobileNumber,
            gender: r.gender || "Male",
            status: r.requestStatus === "Approved" ? "approved" : r.requestStatus === "Rejected" ? "rejected" : "submitted",
            cityId: "city-lahore-01",
            notes: `Portal Export Import: ${r.requestStatusRemarks || "Raw Sync"}`,
            emergencyPhone: r.whatsappNumber || r.mobileNumber,
            previousEducation: r.gradeClass || "N/A",
            reference: r.interests || "Portal Import",
          },
        });
        createdAdmissionsCount++;
      }
    }

    await logAudit({
      userId: auth.user.id,
      action: "portal_raw_pipeline_executed",
      entityType: "admission_application",
      reason: `Executed raw portal pipeline import for ${rows.length} records (${createdAdmissionsCount} new admissions created)`,
    });

    return NextResponse.json({
      success: true,
      mode: "execute",
      createdAdmissionsCount,
      summary,
    });
  } catch (error: any) {
    console.error("Portal Raw Import Error:", error);
    return NextResponse.json({ error: "Failed to process raw portal pipeline import" }, { status: 500 });
  }
}
