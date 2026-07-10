import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(profile);
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await request.json();
  const { name, phone } = body as { name?: string; phone?: string };

  const data: Record<string, string> = {};
  if (name !== undefined) data.name = name.trim();
  if (phone !== undefined) data.phone = phone.trim() || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data,
    select: { id: true, name: true, email: true, phone: true },
  });

  return NextResponse.json(updated);
}