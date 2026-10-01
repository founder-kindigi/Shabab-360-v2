import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { z } from "zod";

const createAlumniSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(7, "Phone is required"),
  batch: z.string().default("Lahore Batch 1 (2024)"),
  originalPark: z.string().default("Gulberg Park"),
  currentStatus: z.enum(["higher_ed", "employed", "freelance", "entrepreneur"]).default("higher_ed"),
  institutionOrCompany: z.string().optional(),
  fieldOfStudyOrRole: z.string().optional(),
  isMentor: z.boolean().default(true),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth || auth instanceof NextResponse) return auth as NextResponse;

  return NextResponse.json({
    success: true,
    data: [
      {
        id: "alm-1",
        name: "Muhammad Hamza Khan",
        phone: "923001234567",
        batch: "Lahore Batch 1 (2024)",
        originalPark: "Gulberg Park",
        currentStatus: "higher_ed",
        institutionOrCompany: "UET Lahore",
        fieldOfStudyOrRole: "B.Sc Electrical Engineering",
        isMentor: true,
        activeMenteesCount: 2,
        graduationYear: "2024",
      },
      {
        id: "alm-2",
        name: "Bilal Ahmad Qureshi",
        phone: "923214567890",
        batch: "Lahore Batch 2 (2025)",
        originalPark: "Gulshan Iqbal Park",
        currentStatus: "employed",
        institutionOrCompany: "Systems Limited",
        fieldOfStudyOrRole: "Junior Software Engineer",
        isMentor: true,
        activeMenteesCount: 3,
        graduationYear: "2025",
      },
    ],
  });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth || auth instanceof NextResponse) return auth as NextResponse;

  try {
    const body = await req.json();
    const parsed = createAlumniSchema.parse(body);

    const newAlumni = {
      id: `alm-${Date.now()}`,
      name: parsed.name,
      phone: parsed.phone,
      batch: parsed.batch,
      originalPark: parsed.originalPark,
      currentStatus: parsed.currentStatus,
      institutionOrCompany: parsed.institutionOrCompany || "University of Lahore",
      fieldOfStudyOrRole: parsed.fieldOfStudyOrRole || "Higher Education Student",
      isMentor: parsed.isMentor,
      activeMenteesCount: 0,
      graduationYear: "2025",
    };

    return NextResponse.json({ success: true, data: newAlumni }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
