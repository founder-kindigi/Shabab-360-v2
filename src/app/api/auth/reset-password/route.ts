import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendPasswordReset } from "@/lib/email-service";

// CSRF: validate Origin/Referer against configured NEXTAUTH_URL or localhost
function isAllowedOrigin(origin: string | null, referer: string | null): boolean {
  const allowed = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const url = origin || referer;
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const allowedParsed = new URL(allowed);
    return parsed.origin === allowedParsed.origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    // CSRF protection
    if (!isAllowedOrigin(request.headers.get("origin"), request.headers.get("referer"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const session = await getServerSession(authOptions);
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body as {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    // Validate required fields
    if (!currentPassword || typeof currentPassword !== "string") {
      return NextResponse.json(
        { error: "Current password is required" },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "New password is required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    // Verify current password
    const existingUser = await db.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const valid = await bcrypt.compare(currentPassword, existingUser.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Hash new password and increment tokenVersion to invalidate all existing sessions
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustResetPwd: false,
        tokenVersion: { increment: 1 },
      },
    });

    // Queue password reset confirmation email (fire-and-forget)
    sendPasswordReset(
      { id: user.id, email: user.email, name: user.name },
      "(password changed via authenticated session)"
    ).catch(() => {});

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
