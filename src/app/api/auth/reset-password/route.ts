import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendPasswordChangeConfirmation } from "@/lib/email-service";
import { isSameOriginRequest } from "@/lib/security/origin";
import { z } from "zod";
import { getPasswordValidationError } from "@/lib/auth/password-policy";

const resetPasswordSchema = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().superRefine((value, context) => {
    const error = getPasswordValidationError(value);
    if (error) context.addIssue({ code: "custom", message: error });
  }),
  confirmPassword: z.string(),
}).refine(({ newPassword, confirmPassword }) => newPassword === confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match",
});

export async function POST(request: Request) {
  try {
    // CSRF protection
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const session = await getServerSession(authOptions);
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = resetPasswordSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid password request" },
        { status: 400 }
      );
    }
    const { currentPassword, newPassword } = parsed.data;

    // Verify current password
    const existingUser = await db.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, passwordHash: true, mustResetPwd: true },
    });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!existingUser.mustResetPwd) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required" },
          { status: 400 }
        );
      }

      const valid = await bcrypt.compare(currentPassword, existingUser.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }
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

    // Confirmation emails never include a password or a reusable reset link.
    sendPasswordChangeConfirmation({
      id: existingUser.id,
      email: existingUser.email,
      name: existingUser.name,
    }).catch(() => {});

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
