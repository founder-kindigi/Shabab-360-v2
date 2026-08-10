import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/authorize";

const leaveRequestSchema = z.object({
  participantId: z.string().min(1, "Child selection is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.enum(["sick", "out_of_town", "academic_exam", "family_event", "other"]),
  notes: z.string().optional(),
});

// Mock in-memory storage for demonstration / fallback
let MOCK_LEAVE_REQUESTS = [
  {
    id: "leave-1",
    participantId: "part-1",
    childName: "Muhammad Umair",
    parkName: "Gulberg Park",
    groupName: "Group 1",
    startDate: "2026-08-12",
    endDate: "2026-08-14",
    reason: "out_of_town",
    reasonLabel: "Out of Town",
    notes: "Family visiting relatives in Islamabad.",
    status: "pending", // pending | approved | declined
    submittedAt: "2026-08-09T10:00:00Z",
  },
];

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth || auth instanceof NextResponse) return auth as NextResponse;

    return NextResponse.json({
      success: true,
      data: MOCK_LEAVE_REQUESTS,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch leave requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth || auth instanceof NextResponse) return auth as NextResponse;

    const body = await req.json();
    const parsed = leaveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const reasonLabels: Record<string, string> = {
      sick: "Sick / Medical",
      out_of_town: "Out of Town",
      academic_exam: "Academic Exam",
      family_event: "Family Function",
      other: "Other Reason",
    };

    const newRequest = {
      id: `leave-${Date.now()}`,
      participantId: parsed.data.participantId,
      childName: parsed.data.participantId === "part-2" ? "M Abdullah Qureshi" : "Muhammad Umair",
      parkName: "Gulberg Park",
      groupName: "Group 1",
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      reason: parsed.data.reason,
      reasonLabel: reasonLabels[parsed.data.reason] || "Other Reason",
      notes: parsed.data.notes || "",
      status: "pending",
      submittedAt: new Date().toISOString(),
    };

    MOCK_LEAVE_REQUESTS = [newRequest, ...MOCK_LEAVE_REQUESTS];

    return NextResponse.json({ success: true, data: newRequest }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to submit leave request" }, { status: 500 });
  }
}
