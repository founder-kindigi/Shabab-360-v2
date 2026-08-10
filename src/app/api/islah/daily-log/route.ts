import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/authorize";

const dailyLogSchema = z.object({
  date: z.string().min(1, "Date is required"),
  fajrJamaat: z.boolean().default(true),
  dhuhrJamaat: z.boolean().default(true),
  asrJamaat: z.boolean().default(true),
  maghribJamaat: z.boolean().default(true),
  ishaJamaat: z.boolean().default(true),
  quranTilawatMinutes: z.number().min(0).default(20),
  quranJuzCount: z.string().optional().default("1 Ruku"),
  morningAdhkarDone: z.boolean().default(true),
  eveningAdhkarDone: z.boolean().default(true),
  tahajjudDone: z.boolean().default(false),
  mutalaahMinutes: z.number().min(0).default(15),
  hifzNazarRating: z.number().min(1).max(5).default(5),
  notes: z.string().optional(),
});

let MOCK_DAILY_LOGS: any[] = [
  {
    id: "log-1",
    date: "2026-08-10",
    userName: "Muhammad Umair",
    parkName: "Gulberg Park",
    fajrJamaat: true,
    dhuhrJamaat: true,
    asrJamaat: true,
    maghribJamaat: true,
    ishaJamaat: true,
    quranTilawatMinutes: 25,
    quranJuzCount: "1 Ruku",
    morningAdhkarDone: true,
    eveningAdhkarDone: true,
    tahajjudDone: true,
    mutalaahMinutes: 20,
    hifzNazarRating: 5,
    notes: "Completed morning azkar after Fajr and read Seerah book.",
    submittedAt: "2026-08-10T11:00:00Z",
  },
  {
    id: "log-2",
    date: "2026-08-09",
    userName: "M Abdullah Qureshi",
    parkName: "Gulberg Park",
    fajrJamaat: true,
    dhuhrJamaat: true,
    asrJamaat: false,
    maghribJamaat: true,
    ishaJamaat: true,
    quranTilawatMinutes: 15,
    quranJuzCount: "Half Ruku",
    morningAdhkarDone: true,
    eveningAdhkarDone: false,
    tahajjudDone: false,
    mutalaahMinutes: 10,
    hifzNazarRating: 4,
    notes: "Missed Asr Jamaat due to school exam commute.",
    submittedAt: "2026-08-09T18:30:00Z",
  },
];

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth || auth instanceof NextResponse) return auth as NextResponse;

    return NextResponse.json({
      success: true,
      data: MOCK_DAILY_LOGS,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch daily Mamulat logs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth || auth instanceof NextResponse) return auth as NextResponse;

    const body = await req.json();
    const parsed = dailyLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const newLog = {
      id: `log-${Date.now()}`,
      ...parsed.data,
      userName: "Active Participant",
      parkName: "Gulberg Park",
      submittedAt: new Date().toISOString(),
    };

    MOCK_DAILY_LOGS = [newLog, ...MOCK_DAILY_LOGS];

    return NextResponse.json({ success: true, data: newLog }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to submit daily log" }, { status: 500 });
  }
}
