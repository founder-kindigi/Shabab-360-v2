import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import {
  optionalQueryText,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { z } from "zod";

const searchQuerySchema = z.object({ phone: optionalQueryText(32) });

function phoneCandidates(value: string): string[] {
  const digits = value.replace(/\D/g, "");
  const candidates = new Set<string>([digits]);

  if (/^03\d{9}$/.test(digits)) {
    const international = `92${digits.slice(1)}`;
    candidates.add(international);
    candidates.add(`+${international}`);
  } else if (/^923\d{9}$/.test(digits)) {
    candidates.add(`0${digits.slice(2)}`);
    candidates.add(`+${digits}`);
  } else if (/^3\d{9}$/.test(digits)) {
    candidates.add(`0${digits}`);
    candidates.add(`92${digits}`);
    candidates.add(`+92${digits}`);
  }

  return [...candidates];
}

function maskPhone(phone: string): string {
  return phone.replace(/.(?=.{4})/g, "*");
}

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
  const capabilityAuth = await requireCapability("guardians.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  try {
    const query = searchQuerySchema.safeParse(queryParamsToObject(new URL(request.url).searchParams));
    if (!query.success) {
      return NextResponse.json(queryValidationError(query.error), { status: 400 });
    }
    const phone = query.data.phone || "";
    const digits = phone.replace(/\D/g, "");

    if (!phone) {
      return NextResponse.json({ results: [] });
    }
    if (digits.length < 10 || digits.length > 15) {
      return NextResponse.json(
        { error: { phone: ["Enter a complete phone number"] } },
        { status: 400 }
      );
    }

    const guardian = await db.guardian.findFirst({
      where: {
        isActive: true,
        OR: phoneCandidates(phone).map((candidate) => ({ phone: candidate })),
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });

    return NextResponse.json({
      results: guardian ? [{ ...guardian, phone: maskPhone(guardian.phone) }] : [],
    });
  } catch (error) {
    console.error("Guardian search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
