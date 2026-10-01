import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/authorize";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const authError = await requireRole(["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"]);
  if (authError) return authError;

  const { id } = await params;
  return NextResponse.json({ id, fullName: "Usman Ghani", mobile: "+923001234567" });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authError = await requireRole(["super_admin", "program_admin", "city_head"]);
  if (authError) return authError;

  const { id } = await params;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    alumni: { id, ...body, updatedAt: new Date().toISOString() },
  });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const authError = await requireRole(["super_admin", "program_admin", "city_head"]);
  if (authError) return authError;

  const { id } = await params;
  return NextResponse.json({
    success: true,
    message: `Alumnus record ${id} deleted successfully`,
  });
}
