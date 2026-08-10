import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { z } from "zod";

const createAlumniSchema = z.object({
  fullName: z.string().min(2),
  fatherName: z.string().optional(),
  mobile: z.string().min(10),
  email: z.string().email().optional().or(z.literal("")),
  graduationBatch: z.string(),
  graduationYear: z.number().default(2025),
  park: z.string(),
  city: z.string().default("Lahore"),
  shababRole: z.string().optional(),
  currentProfession: z.string(),
  organization: z.string().optional(),
  higherEducation: z.string().optional(),
  linkedinUrl: z.string().optional(),
  isMentorAvailable: z.boolean().default(true),
  mentorshipTopics: z.array(z.string()).optional(),
});

const mockAlumniList = [
  {
    id: "alm-1",
    fullName: "Usman Ghani",
    fatherName: "Ghani Ahmad",
    mobile: "+923001234567",
    email: "usman.ghani@example.com",
    graduationBatch: "Lahore Batch 1",
    graduationYear: 2023,
    park: "Gulberg Park",
    city: "Lahore",
    shababRole: "Former Sports Lead G12 & Muawin",
    currentProfession: "Software Engineer",
    organization: "Systems Limited",
    higherEducation: "BS Computer Science (FAST-NUCES)",
    linkedinUrl: "https://linkedin.com/in/usmanghani",
    isMentorAvailable: true,
    mentorshipTopics: ["Software Engineering & Coding", "Tarbiyah & Character", "Public Speaking"],
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "alm-2",
    fullName: "Ahmad Raza",
    fatherName: "Raza Muhammad",
    mobile: "+923214567890",
    email: "ahmad.raza@example.com",
    graduationBatch: "Lahore Batch 2",
    graduationYear: 2024,
    park: "Gulshan Iqbal Park",
    city: "Lahore",
    shababRole: "Former Tadreeb Lead & Murabbi Muawin",
    currentProfession: "Medical Officer",
    organization: "Services Hospital Lahore",
    higherEducation: "MBBS (King Edward Medical University)",
    linkedinUrl: "https://linkedin.com/in/ahmadraza",
    isMentorAvailable: true,
    mentorshipTopics: ["Medical Career Prep", "Seerah Study Circles", "First Aid Workshops"],
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "alm-3",
    fullName: "Bilal Hassan",
    fatherName: "Hassan Tariq",
    mobile: "+923339876543",
    email: "bilal.hassan@example.com",
    graduationBatch: "Lahore Batch 1",
    graduationYear: 2023,
    park: "Johar Town Park",
    city: "Lahore",
    shababRole: "Former Park Admin & Muawin G13",
    currentProfession: "Chartered Accountant",
    organization: "PwC Pakistan",
    higherEducation: "CA / ACCA (ICAP)",
    linkedinUrl: "https://linkedin.com/in/bilalhassan",
    isMentorAvailable: false,
    mentorshipTopics: ["Finance & Audit", "Time Management", "Park Operations Management"],
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "alm-4",
    fullName: "Hamza Sheikh",
    fatherName: "Sheikh Imran",
    mobile: "+923041122334",
    email: "hamza.sheikh@example.com",
    graduationBatch: "Lahore Batch 3",
    graduationYear: 2025,
    park: "Griffin Park",
    city: "Lahore",
    shababRole: "Former Sports Muawin & Media Lead",
    currentProfession: "Civil Engineer",
    organization: "NESPAK",
    higherEducation: "BS Civil Engineering (UET Lahore)",
    linkedinUrl: "https://linkedin.com/in/hamzasheikh",
    isMentorAvailable: true,
    mentorshipTopics: ["Engineering Admissions", "Sports Gala Organizing", "Fitness Drills"],
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "alm-5",
    fullName: "Muhammad Ali",
    fatherName: "Ali Nawaz",
    mobile: "+923125544332",
    email: "m.ali@example.com",
    graduationBatch: "Lahore Batch 2",
    graduationYear: 2024,
    park: "Gulshan Ravi Park",
    city: "Lahore",
    shababRole: "Former Tarbiyah Lead & Seerah Circle Muawin",
    currentProfession: "Islamic Studies Lecturer",
    organization: "Al-Burhan Institute",
    higherEducation: "M.Phil Islamic Studies (PU)",
    linkedinUrl: "https://linkedin.com/in/muhammadali",
    isMentorAvailable: true,
    mentorshipTopics: ["Seerah & Tarbiyah", "Ethical Leadership", "Khidmat & Community Service"],
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "alm-6",
    fullName: "Zaid Farooq",
    fatherName: "Farooq Ahmad",
    mobile: "+923226677889",
    email: "zaid.farooq@example.com",
    graduationBatch: "Lahore Batch 3",
    graduationYear: 2025,
    park: "State Life Park",
    city: "Lahore",
    shababRole: "Former Skills Lead & Workshop Trainer",
    currentProfession: "Entrepreneur & Tech Founder",
    organization: "TechVenture PK",
    higherEducation: "BS Business Analytics (LUMS)",
    linkedinUrl: "https://linkedin.com/in/zaidfarooq",
    isMentorAvailable: true,
    mentorshipTopics: ["Entrepreneurship", "Financial Literacy Workshops", "Public Speaking"],
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
  },
];

export async function GET(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"]);
  if (authError) return authError;

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.toLowerCase();
  const batch = url.searchParams.get("batch");
  const park = url.searchParams.get("park");

  let result = mockAlumniList;

  if (search) {
    result = result.filter(
      (a) =>
        a.fullName.toLowerCase().includes(search) ||
        a.currentProfession.toLowerCase().includes(search) ||
        a.organization.toLowerCase().includes(search) ||
        a.mobile.includes(search) ||
        (a.shababRole && a.shababRole.toLowerCase().includes(search))
    );
  }

  if (batch && batch !== "all") {
    result = result.filter((a) => a.graduationBatch.toLowerCase().includes(batch.toLowerCase()));
  }

  if (park && park !== "all") {
    result = result.filter((a) => a.park.toLowerCase().includes(park.toLowerCase()));
  }

  return NextResponse.json({
    success: true,
    total: result.length,
    alumni: result,
    stats: {
      totalGraduated: 1240,
      activeMentors: 340,
      universitiesRepresented: 28,
      reunionsOrganized: 12,
    },
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin", "city_head"]);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = createAlumniSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const newAlumni = {
      id: `alm-${Date.now()}`,
      ...parsed.data,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, alumni: newAlumni }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
