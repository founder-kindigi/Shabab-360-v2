import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/authorize";

const consentSchema = z.object({
  consentId: z.string().min(1),
  status: z.enum(["approved", "declined"]),
  guardianSignature: z.string().min(2, "Digital signature / full name is required"),
  additionalNotes: z.string().optional(),
});

let MOCK_CONSENTS = [
  {
    id: "consent-101",
    eventTitle: "Annual Shabab Outdoor Survival Camp 2026",
    eventDate: "2026-08-25 to 2026-08-27",
    location: "Khanpur Dam Outdoor Center",
    childName: "Muhammad Umair",
    participantId: "part-1",
    status: "pending", // pending | approved | declined
    requiredBy: "2026-08-20",
    signedAt: null as string | null,
    signature: null as string | null,
    instructions: "Please ensure your child brings sports shoes, warm layers, and personal water bottle. Transportation will be provided from Gulberg Park.",
  },
  {
    id: "consent-102",
    eventTitle: "Inter-Park Football Championship Tournament",
    eventDate: "2026-08-18",
    location: "Punjab Stadium Lahore",
    childName: "M Abdullah Qureshi",
    participantId: "part-2",
    status: "approved",
    requiredBy: "2026-08-15",
    signedAt: "2026-08-08T14:30:00Z",
    signature: "Tariq Ahmed Qureshi",
    instructions: "Official team jersey will be distributed at park on session morning.",
  },
];

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth || auth instanceof NextResponse) return auth as NextResponse;

    return NextResponse.json({
      success: true,
      data: MOCK_CONSENTS,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch event consents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth || auth instanceof NextResponse) return auth as NextResponse;

    const body = await req.json();
    const parsed = consentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { consentId, status, guardianSignature } = parsed.data;

    MOCK_CONSENTS = MOCK_CONSENTS.map((c) => {
      if (c.id === consentId) {
        return {
          ...c,
          status,
          signedAt: new Date().toISOString(),
          signature: guardianSignature,
        };
      }
      return c;
    });

    const updated = MOCK_CONSENTS.find((c) => c.id === consentId);

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to update consent status" }, { status: 500 });
  }
}
