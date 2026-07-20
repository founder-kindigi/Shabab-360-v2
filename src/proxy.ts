import { NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/security/origin";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApplicationApi = pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/");

  if (isApplicationApi && MUTATING_METHODS.has(request.method) && !isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
