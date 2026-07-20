import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const VALID_INTERVIEW_STATUSES = ["scheduled", "completed", "cancelled"];

const createSchema = z.object({
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  conductedBy: z.string().optional(),
  // Score fields for updating an existing interview
  score1: z.number().min(0).max(100).optional(),
  score2: z.number().min(0).max(100).optional(),
  score3: z.number().min(0).max(100).optional(),
  totalScore: z.number().min(0).max(300).optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("admissions.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { id } = await params;

  // Verify application exists
  const application = await db.admissionApplication.findUnique({
    where: { id },
  });
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // If updating scores, we expect to update the latest interview
  // If scheduling, we create a new interview
  const hasScores = data.score1 !== undefined || data.score2 !== undefined || data.score3 !== undefined;

  if (hasScores) {
    // Find the latest scheduled interview for this application
    const latestInterview = await db.admissionInterview.findFirst({
      where: { applicationId: id, status: "scheduled" },
      orderBy: { createdAt: "desc" },
    });

    if (!latestInterview) {
      return NextResponse.json(
        { error: { interview: ["No scheduled interview found to update scores"] } },
        { status: 400 }
      );
    }

    const score1 = data.score1 ?? latestInterview.score1;
    const score2 = data.score2 ?? latestInterview.score2;
    const score3 = data.score3 ?? latestInterview.score3;
    const totalScore = data.totalScore ?? [score1, score2, score3].filter((s): s is number => s !== null).reduce((a, b) => a + b, 0);

    const interview = await db.admissionInterview.update({
      where: { id: latestInterview.id },
      data: {
        score1: score1 ?? null,
        score2: score2 ?? null,
        score3: score3 ?? null,
        totalScore,
        notes: data.notes !== undefined ? data.notes : latestInterview.notes,
        status: data.status || "completed",
        conductedBy: data.conductedBy || latestInterview.conductedBy,
      },
    });

    // If interview completed/passed/failed/conditional, move application to "interviewed" status
    if (interview.status !== "scheduled" && (application.status === "interview_scheduled" || application.status === "reviewing")) {
      await db.admissionApplication.update({
        where: { id },
        data: { status: "interviewed" },
      });
    }

    await logAudit({
      userId: auth.user.id,
      action: "update",
      entityType: "admission_interview",
      entityId: interview.id,
      newValues: { score1, score2, score3, totalScore, status: interview.status },
    });

    return NextResponse.json(interview);
  }

  // Schedule new interview
  const interview = await db.admissionInterview.create({
    data: {
      applicationId: id,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      scheduledTime: data.scheduledTime || null,
      conductedBy: data.conductedBy || null,
      notes: data.notes || null,
      status: "scheduled",
    },
  });

  // If application is submitted or screening, move to interview_scheduled
  if (application.status === "submitted" || application.status === "screening") {
    await db.admissionApplication.update({
      where: { id },
      data: { status: "interview_scheduled" },
    });
  }

  await logAudit({
    userId: auth.user.id,
    action: "create",
    entityType: "admission_interview",
    entityId: interview.id,
    newValues: { applicationId: id, scheduledDate: data.scheduledDate, scheduledTime: data.scheduledTime, conductedBy: data.conductedBy },
  });

  return NextResponse.json(interview, { status: 201 });
}
