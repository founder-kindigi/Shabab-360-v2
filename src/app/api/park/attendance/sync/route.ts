import { NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { syncAttendanceRequestSchema } from "@/lib/attendance/schemas";
import { applyAttendanceMutation } from "@/lib/attendance/apply-mutation";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capability = await requireCapability("attendance.mark");
  if (capability instanceof NextResponse) return capability;
  const parsed = syncAttendanceRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  const results: Awaited<ReturnType<typeof applyAttendanceMutation>>[] = [];
  for (const mutation of parsed.data.mutations) results.push(await applyAttendanceMutation(auth.user, mutation));
  const processed = results.filter(r => r.status === "processed").length;
  return NextResponse.json({ results, summary: { total: results.length, processed, failed: results.length - processed } }, { headers: { "Cache-Control": "private, no-store" } });
}
