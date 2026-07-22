import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";

const DISABLED_MESSAGE =
  "Document upload is temporarily disabled until private durable storage and entity authorization are implemented.";

async function disabledHandler(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  return NextResponse.json(
    { error: DISABLED_MESSAGE },
    { status: 503 }
  );
}

export const POST = disabledHandler;
export const GET = disabledHandler;
export const DELETE = disabledHandler;
