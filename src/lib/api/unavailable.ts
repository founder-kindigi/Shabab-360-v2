import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
export async function unavailableWorkflow(feature: string) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ code: "WORKFLOW_UNAVAILABLE", error: `${feature} is unavailable until its privacy, ownership and persistence rules are approved.` }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
}
