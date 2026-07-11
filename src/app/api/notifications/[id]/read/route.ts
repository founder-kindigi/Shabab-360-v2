import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  // Read tracking is client-side via localStorage.
  // This API exists for future server-side read tracking.
  return NextResponse.json({ success: true, id });
}