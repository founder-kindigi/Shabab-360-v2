import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/authorize";

const emergencyInfoSchema = z.object({
  participantId: z.string().min(1),
  primaryEmergencyContactName: z.string().min(2),
  primaryEmergencyPhone: z.string().min(7),
  relationshipToChild: z.string().min(2),
  bloodGroup: z.string().optional().default("B+"),
  allergies: z.string().optional().default("None"),
  dietaryRestrictions: z.string().optional().default("Halal Standard"),
  medicalNotes: z.string().optional(),
});

let MOCK_EMERGENCY_PROFILES: Record<string, any> = {
  "part-1": {
    participantId: "part-1",
    childName: "Muhammad Umair",
    primaryEmergencyContactName: "Tariq Ahmed",
    primaryEmergencyPhone: "923001234567",
    relationshipToChild: "Father",
    bloodGroup: "B+",
    allergies: "No known food or medicine allergies",
    dietaryRestrictions: "Standard Healthy Diet",
    medicalNotes: "Wears prescription eyeglasses for reading.",
    lastUpdated: "2026-08-01",
  },
  "part-2": {
    participantId: "part-2",
    childName: "M Abdullah Qureshi",
    primaryEmergencyContactName: "Ayesha Qureshi",
    primaryEmergencyPhone: "923214567890",
    relationshipToChild: "Mother",
    bloodGroup: "O+",
    allergies: "Mild seasonal pollen allergy",
    dietaryRestrictions: "No peanuts or tree nuts",
    medicalNotes: "Inhaler available in personal bag.",
    lastUpdated: "2026-08-05",
  },
};

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth || auth instanceof NextResponse) return auth as NextResponse;

    return NextResponse.json({
      success: true,
      data: MOCK_EMERGENCY_PROFILES,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch emergency profile" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth || auth instanceof NextResponse) return auth as NextResponse;

    const body = await req.json();
    const parsed = emergencyInfoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updatedProfile = {
      ...parsed.data,
      childName: parsed.data.participantId === "part-2" ? "M Abdullah Qureshi" : "Muhammad Umair",
      lastUpdated: new Date().toISOString().slice(0, 10),
    };

    MOCK_EMERGENCY_PROFILES[parsed.data.participantId] = updatedProfile;

    return NextResponse.json({ success: true, data: updatedProfile });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to update emergency profile" }, { status: 500 });
  }
}
