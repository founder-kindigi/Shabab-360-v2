import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

type SessionUser = {
  id?: string;
  role?: string;
  name?: string | null;
  assignedCityId?: string | null;
  assignedParkId?: string | null;
  assignedGroupId?: string | null;
};

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["park_admin", "park_lead", "murabbi"];
  if (!user.role || !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone")?.trim() || "";

    if (!phone || phone.length < 3) {
      return NextResponse.json({ results: [] });
    }

    const guardians = await db.guardian.findMany({
      where: {
        phone: { contains: phone },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        cnic: true,
        address: true,
      },
      take: 10,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ results: guardians });
  } catch (error) {
    console.error("Guardian search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}