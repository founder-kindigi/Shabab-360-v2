import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import Papa from "papaparse";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const VALID_ROLES = [
  "super_admin",
  "program_admin",
  "city_head",
  "park_admin",
  "park_lead",
  "murabbi",
];

function generatePassword(): string {
  // Generate a secure 8-character password
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  let password = "";
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

export async function POST(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "Only CSV files are supported" },
        { status: 400 }
      );
    }

    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        { error: `CSV parse error: ${parsed.errors.map((e) => e.message).join(", ")}` },
        { status: 400 }
      );
    }

    const rows = parsed.data.map((row) => {
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        clean[k.trim()] = (v ?? "").trim();
      }
      return clean;
    });

    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV is empty" }, { status: 400 });
    }

    // Pre-fetch cities, parks, groups for name lookups
    const cities = await db.city.findMany();
    const cityLookup = new Map<string, string>();
    for (const c of cities) {
      cityLookup.set(c.name.toLowerCase(), c.id);
    }

    const parks = await db.park.findMany();
    const parkLookup = new Map<string, string>();
    for (const p of parks) {
      parkLookup.set(p.name.toLowerCase(), p.id);
    }

    const groups = await db.group.findMany();
    const groupLookup = new Map<string, string>();
    for (const g of groups) {
      groupLookup.set(g.name.toLowerCase(), g.id);
    }

    let success = 0;
    const errors: { row: number; message: string }[] = [];
    const generatedPasswords: { row: number; name: string; email: string; password: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const name = row["name"] || row["Name"] || "";
        const email = row["email"] || row["Email"] || "";
        const role = row["role"] || row["Role"] || "";

        if (!name) {
          errors.push({ row: rowNum, message: "Name is required" });
          continue;
        }

        if (!email) {
          errors.push({ row: rowNum, message: "Email is required" });
          continue;
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.push({ row: rowNum, message: `Invalid email format: "${email}"` });
          continue;
        }

        if (!role) {
          errors.push({ row: rowNum, message: "Role is required" });
          continue;
        }

        // Validate role
        const normalizedRole = role.toLowerCase().replace(/\s+/g, "_");
        if (!VALID_ROLES.includes(normalizedRole)) {
          errors.push({
            row: rowNum,
            message: `Invalid role "${role}". Must be one of: ${VALID_ROLES.join(", ")}`,
          });
          continue;
        }

        // Check for existing email
        const existingUser = await db.user.findUnique({ where: { email } });
        if (existingUser) {
          errors.push({
            row: rowNum,
            message: `User with email "${email}" already exists`,
          });
          continue;
        }

        // Resolve city, park, group by name
        const cityName = row["city"] || row["City"] || "";
        const parkName = row["park"] || row["Park"] || "";
        const groupName = row["group"] || row["Group"] || "";

        const assignedCityId = cityName ? cityLookup.get(cityName.toLowerCase()) ?? null : null;
        const assignedParkId = parkName ? parkLookup.get(parkName.toLowerCase()) ?? null : null;
        const assignedGroupId = groupName ? groupLookup.get(groupName.toLowerCase()) ?? null : null;

        if (cityName && !assignedCityId) {
          errors.push({
            row: rowNum,
            message: `City "${cityName}" not found`,
          });
          continue;
        }

        if (parkName && !assignedParkId) {
          errors.push({
            row: rowNum,
            message: `Park "${parkName}" not found`,
          });
          continue;
        }

        if (groupName && !assignedGroupId) {
          errors.push({
            row: rowNum,
            message: `Group "${groupName}" not found`,
          });
          continue;
        }

        // Generate password
        const password = generatePassword();
        const hash = await bcrypt.hash(password, 10);

        const phone = row["phone"] || row["Phone"] || "";

        // Create User + StaffMeta in transaction
        await db.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email,
              passwordHash: hash,
              name,
              phone: phone || null,
              mustResetPwd: true,
            },
          });

          await tx.staffMeta.create({
            data: {
              userId: user.id,
              role: normalizedRole,
              assignedCityId,
              assignedParkId,
              assignedGroupId,
            },
          });
        });

        generatedPasswords.push({
          row: rowNum,
          name,
          email,
          password,
        });

        success++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push({ row: rowNum, message: msg });
      }
    }

    // Log audit
    const auth = await requireAuth();
    if (!(auth instanceof NextResponse)) {
      logAudit({
        userId: auth.user.id,
        action: "IMPORT_USERS",
        entityType: "User",
        entityId: null,
        newValues: JSON.stringify({ success, errors: errors.length, total: rows.length }),
      });
    }

    return NextResponse.json({
      success,
      errors,
      total: rows.length,
      generatedPasswords,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}