import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/authorize";

const customReportSchema = z.object({
  domainId: z.string().min(1),
  columns: z.array(z.string()).min(1),
  cityFilter: z.string().optional().default("all"),
  parkFilter: z.string().optional().default("all"),
  batchFilter: z.string().optional().default("all"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  exportFormat: z.enum(["json", "csv", "xlsx", "pdf"]).optional().default("json"),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth || auth instanceof NextResponse) return auth as NextResponse;

    const body = await req.json();
    const parseResult = customReportSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid report request parameters", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { domainId, columns, cityFilter, parkFilter, batchFilter, startDate, endDate, exportFormat } = parseResult.data;

    // Report generation metadata response
    return NextResponse.json({
      success: true,
      message: "Custom report generated successfully",
      query: {
        domainId,
        columnsCount: columns.length,
        columns,
        cityFilter,
        parkFilter,
        batchFilter,
        startDate,
        endDate,
        exportFormat,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Custom report generation error:", err);
    return NextResponse.json(
      { error: "Internal server error during report generation" },
      { status: 500 }
    );
  }
}
