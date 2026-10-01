import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { userHasCapability } from "@/lib/auth/capability-access";
import { isHqRole } from "@/lib/auth/scope";

/**
 * Exposes only server-derived capability signals for the Teams workspace.
 * Individual resource routes remain authoritative for scope enforcement.
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const [canView, canManage] = await Promise.all([
    userHasCapability(auth.user, "organisation.view"),
    userHasCapability(auth.user, "organisation.manage"),
  ]);

  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    canView: true,
    canManage,
    isHq: isHqRole(auth.user.role),
  });
}
