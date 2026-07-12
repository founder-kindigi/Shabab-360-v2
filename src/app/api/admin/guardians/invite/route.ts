import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const inviteSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().min(5, "Phone must be at least 5 characters"),
  cnic: z.string().optional(),
  address: z.string().optional(),
  relationship: z.enum(["Father", "Mother", "Guardian", "Other"], {
    errorMap: () => ({ message: "Please select a valid relationship" }),
  }),
});

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

function generateRandomPassword(): string {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const special = "!@#$%&*";
  const all = lower + upper + digits + special;
  const bytes = crypto.randomBytes(12);
  let pwd = "";
  for (const b of bytes) {
    pwd += all[b % all.length];
  }
  // Ensure at least one of each type
  const arr = pwd.split("");
  arr[0] = upper[Math.floor(Math.random() * upper.length)];
  arr[1] = lower[Math.floor(Math.random() * lower.length)];
  arr[2] = digits[Math.floor(Math.random() * digits.length)];
  arr[3] = special[Math.floor(Math.random() * special.length)];
  return arr.join("");
}

function generateEmailFromPhone(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  return `guardian_${cleaned}@shabab360.invite`;
}

export async function POST(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, phone, cnic, address, relationship } = parsed.data;
  const invitationCode = generateInviteCode();
  const userEmail = email || generateEmailFromPhone(phone);
  const password = generateRandomPassword();
  const passwordHash = await bcrypt.hash(invitationCode, 12);

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
        occupation: relationship || null,
      },
    });

    return { user, guardian };
  });

  await logAudit({
    userId: auth.user.id,
    action: "invite_guardian",
    entityType: "guardian",
    entityId: result.guardian.id,
    newValues: { name, email: userEmail, phone, cnic, address, relationship, invitationCode },
  });

  return NextResponse.json(
    {
      guardian: result.guardian,
      user: result.user,
      invitationCode,
      relationship,
    },
    { status: 201 }
  );
}