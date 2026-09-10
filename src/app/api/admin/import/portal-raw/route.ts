import { NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";

async function unavailable() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capability = await requireCapability("organisation.manage");
  if (capability instanceof NextResponse) return capability;

  return NextResponse.json(
    { error: "Portal workbook import is unavailable until an approved, scoped import workflow is implemented." },
    { status: 503 }
  );
}

export async function GET() {
  return unavailable();
}

export async function POST() {
  return unavailable();
}
