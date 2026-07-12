import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendPasswordReset } from "@/lib/email-service";

export async function POST(request: Request) {
  try {
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

    // Validate
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

    // If currentPassword is provided (authenticated change), verify it
    if (currentPassword) {
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
    }

    // Hash and update
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustResetPwd: false,
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