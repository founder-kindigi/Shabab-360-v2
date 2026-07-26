import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { PASSWORD_HASH_ROUNDS } from "@/lib/auth/password-policy";

const inviteSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().min(5, "Phone must be at least 5 characters"),
  cnic: z.string().optional(),
  address: z.string().optional(),
  relationship: z.enum(["Father", "Mother", "Guardian", "Other"]),
});

function generateEmailFromPhone(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  return `guardian_${cleaned}@shabab360.invite`;
}

export async function POST(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("guardians.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, phone, cnic, address, relationship } = parsed.data;
  const userEmail = email || generateEmailFromPhone(phone);
  const temporaryPassword = crypto.randomBytes(24).toString("base64url");
  const passwordHash = await bcrypt.hash(temporaryPassword, PASSWORD_HASH_ROUNDS);

  // Check for existing user with same email
  const existingUser = await db.user.findUnique({ where: { email: userEmail } });
  if (existingUser) {
    return NextResponse.json(
      { error: { email: ["A user account with this email already exists"] } },
      { status: 409 }
    );
  }

  // Check for existing user with same phone
  const existingPhoneUser = await db.user.findFirst({ where: { phone } });
  if (existingPhoneUser) {
    return NextResponse.json(
      { error: { phone: ["A user account with this phone number already exists"] } },
      { status: 409 }
    );
  }

  // Create User + Guardian in a transaction
  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: userEmail,
        passwordHash,
        name,
        phone,
        mustResetPwd: true,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        mustResetPwd: true,
        createdAt: true,
      },
    });

    const guardian = await tx.guardian.create({
      data: {
        userId: user.id,
        name,
        phone,
        cnic: cnic || null,
        address: address || null,
      },
    });

    return { user, guardian };
  });

  await logAudit({
    userId: auth.user.id,
    action: "invite_guardian",
    entityType: "guardian",
    entityId: result.guardian.id,
    newValues: { name, email: userEmail, phone, cnic, address, relationship },
  });

  return NextResponse.json(
    {
      guardian: result.guardian,
      user: result.user,
      temporaryPassword,
      relationship,
    },
    { status: 201 }
  );
}
