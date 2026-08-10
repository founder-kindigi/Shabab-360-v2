import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { z } from "zod";

const createMurabbiSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional().or(z.literal("")),
  park: z.string(),
  city: z.string().default("Lahore"),
  primaryRole: z.string(),
  secondaryRole: z.string().optional(),
  assignedGroup: z.string().optional(),
  cnic: z.string().optional(),
  address: z.string().optional(),
});

const mockMurabbisList = [
  {
    id: "mrb-1",
    name: "Ikram Meer",
    phone: "+923364543324",
    whatsapp: "+923364543324",
    email: "ikram.meer@shabab360.org",
    park: "Gulberg Park",
    city: "Lahore",
    primaryRole: "Murabbi & Skills Lead",
    secondaryRole: "Group 1 Lead",
    assignedGroup: "Group 1 | Murabbi: Ikram",
    assignedStudentsCount: 65,
    callingAssignedCount: 150,
    callingContactedCount: 110,
    mashwaraAttendanceRate: 94,
    attendanceVerificationRate: 98,
    karguzariStatus: "Submitted (Up-to-date)",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "mrb-2",
    name: "Hanzala Tauseef",
    phone: "+923047178171",
    whatsapp: "+923047178171",
    email: "hanzala.tauseef@shabab360.org",
    park: "Gulberg Park",
    city: "Lahore",
    primaryRole: "Murabbi & Tadreeb Lead",
    secondaryRole: "Group 2 Lead",
    assignedGroup: "Group 2 | Murabbi: Hanzala Tauseef",
    assignedStudentsCount: 58,
    callingAssignedCount: 140,
    callingContactedCount: 105,
    mashwaraAttendanceRate: 92,
    attendanceVerificationRate: 96,
    karguzariStatus: "Submitted (Up-to-date)",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "mrb-3",
    name: "Hasnain Zafar",
    phone: "+923060221997",
    whatsapp: "+923060221997",
    email: "hasnain.zafar@shabab360.org",
    park: "Gulberg Park",
    city: "Lahore",
    primaryRole: "Murabbi & Tadreeb Muawin",
    secondaryRole: "Group 3 Lead",
    assignedGroup: "Group 3 | Murabbi: Hasnain bhai",
    assignedStudentsCount: 52,
    callingAssignedCount: 130,
    callingContactedCount: 105,
    mashwaraAttendanceRate: 90,
    attendanceVerificationRate: 95,
    karguzariStatus: "Submitted (Up-to-date)",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "mrb-4",
    name: "Imran Amin",
    phone: "+923294368993",
    whatsapp: "+923294368993",
    email: "imran.amin@shabab360.org",
    park: "Johar Town Park",
    city: "Lahore",
    primaryRole: "Sports Lead & Muawin G12",
    secondaryRole: "Johar Town Murabbi Lead",
    assignedGroup: "Group 12 | Murabbi: Imran Amin",
    assignedStudentsCount: 48,
    callingAssignedCount: 120,
    callingContactedCount: 90,
    mashwaraAttendanceRate: 88,
    attendanceVerificationRate: 92,
    karguzariStatus: "Submitted (Up-to-date)",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "mrb-5",
    name: "Basit Ahsan",
    phone: "+923226720331",
    whatsapp: "+923226720331",
    email: "basit.ahsan@shabab360.org",
    park: "Gulshan Ravi Park",
    city: "Lahore",
    primaryRole: "Park Admin & Muawin G13",
    secondaryRole: "Gulshan Ravi Murabbi",
    assignedGroup: "Group 13 | Murabbi: Basit Ahsan",
    assignedStudentsCount: 45,
    callingAssignedCount: 119,
    callingContactedCount: 95,
    mashwaraAttendanceRate: 91,
    attendanceVerificationRate: 94,
    karguzariStatus: "Submitted (Up-to-date)",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "mrb-6",
    name: "Abdul Kabeer",
    phone: "+923244190830",
    whatsapp: "+923244190830",
    email: "abdul.kabeer@shabab360.org",
    park: "State Life Park",
    city: "Lahore",
    primaryRole: "Media Lead & Muawin G11",
    secondaryRole: "State Life Murabbi",
    assignedGroup: "Group 11 | Murabbi: Abdul Kabeer",
    assignedStudentsCount: 40,
    callingAssignedCount: 100,
    callingContactedCount: 75,
    mashwaraAttendanceRate: 86,
    attendanceVerificationRate: 90,
    karguzariStatus: "Submitted (Up-to-date)",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "mrb-7",
    name: "Hammad Raza",
    phone: "+923220774124",
    whatsapp: "+923220774124",
    email: "hammad.raza@shabab360.org",
    park: "Gulshan Iqbal Park",
    city: "Lahore",
    primaryRole: "Sports Muawin & Muawin G13",
    secondaryRole: "Gulshan Iqbal Murabbi",
    assignedGroup: "Group 4 | Murabbi: Hammad Raza",
    assignedStudentsCount: 42,
    callingAssignedCount: 95,
    callingContactedCount: 70,
    mashwaraAttendanceRate: 89,
    attendanceVerificationRate: 91,
    karguzariStatus: "Submitted (Up-to-date)",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "mrb-8",
    name: "Haseeb Ahmad",
    phone: "+923114322095",
    whatsapp: "+923114322095",
    email: "haseeb.ahmad@shabab360.org",
    park: "Griffin Park",
    city: "Lahore",
    primaryRole: "Sports Officer & Griffin Lead",
    secondaryRole: "Griffin Murabbi",
    assignedGroup: "Group 5 | Murabbi: Haseeb Ahmad",
    assignedStudentsCount: 38,
    callingAssignedCount: 90,
    callingContactedCount: 65,
    mashwaraAttendanceRate: 87,
    attendanceVerificationRate: 89,
    karguzariStatus: "Submitted (Up-to-date)",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  },
];

export async function GET(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"]);
  if (authError) return authError;

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.toLowerCase();
  const park = url.searchParams.get("park");

  let result = mockMurabbisList;

  if (search) {
    result = result.filter(
      (m) =>
        m.name.toLowerCase().includes(search) ||
        m.primaryRole.toLowerCase().includes(search) ||
        m.phone.includes(search) ||
        m.assignedGroup.toLowerCase().includes(search)
    );
  }

  if (park && park !== "all") {
    result = result.filter((m) => m.park.toLowerCase().includes(park.toLowerCase()));
  }

  return NextResponse.json({
    success: true,
    total: result.length,
    murabbis: result,
    summary: {
      totalActiveMurabbis: result.length,
      parksCovered: 6,
      totalStudentsAssigned: result.reduce((acc, m) => acc + m.assignedStudentsCount, 0),
      averageMashwaraAttendance: Math.round(
        result.reduce((acc, m) => acc + m.mashwaraAttendanceRate, 0) / result.length
      ),
    },
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin", "city_head"]);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = createMurabbiSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const newMurabbi = {
      id: `mrb-${Date.now()}`,
      ...parsed.data,
      whatsapp: parsed.data.phone,
      assignedStudentsCount: 0,
      callingAssignedCount: 0,
      callingContactedCount: 0,
      mashwaraAttendanceRate: 100,
      attendanceVerificationRate: 100,
      karguzariStatus: "Active",
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, murabbi: newMurabbi }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
