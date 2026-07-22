import { NextRequest, NextResponse } from "next/server";
import { requireCapability, requireRole, requireResourceScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import Papa from "papaparse";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { validateImportFile, sanitizeImportError } from "@/lib/import-utils";
import { participantProfileFieldsFromCsv, participantProfileFieldsSchema } from "@/lib/participants/profile-fields";

export async function POST(request: NextRequest) {
  const authError = await requireRole([
    "super_admin",
    "program_admin",
    "city_head",
    "park_admin",
    "park_lead",
    "murabbi",
  ]);
  if (authError) return authError;

  const auth = await requireCapability("students.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    const validatedFile = validateImportFile(file);
    if (validatedFile.response) return validatedFile.response;

    const text = await validatedFile.file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        { error: "Invalid CSV file" },
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

    // Pre-fetch groups, cities, parks for lookups
    const groups = await db.group.findMany({
      include: {
        batch: { include: { park: { include: { city: true } } } },
      },
    });

    const groupLookup = new Map<string, (typeof groups)[number]>();
    for (const g of groups) {
      groupLookup.set(g.id, g);
      // Also index by name for flexible matching
      groupLookup.set(g.name.toLowerCase(), g);
    }

    // City lookup by name
    const cities = await db.city.findMany();
    const cityLookup = new Map<string, (typeof cities)[number]>();
    for (const c of cities) {
      cityLookup.set(c.name.toLowerCase(), c);
    }

    // Park lookup by name
    const parks = await db.park.findMany();
    const parkLookup = new Map<string, (typeof parks)[number]>();
    for (const p of parks) {
      parkLookup.set(p.name.toLowerCase(), p);
    }

    // Lookup helpers
    function findGroup(name: string | undefined) {
      if (!name) return null;
      return groupLookup.get(name.toLowerCase()) ?? groupLookup.get(name) ?? null;
    }

    function findCity(name: string | undefined) {
      if (!name) return null;
      return cityLookup.get(name.toLowerCase()) ?? null;
    }

    function findPark(name: string | undefined) {
      if (!name) return null;
      return parkLookup.get(name.toLowerCase()) ?? null;
    }

    let success = 0;
    const errors: { row: number; message: string }[] = [];
    const generatedPasswords: { row: number; name: string; email: string; password: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // header is row 1

      try {
        const name = row["name"] || row["Name"] || "";
        if (!name) {
          errors.push({ row: rowNum, message: "Name is required" });
          continue;
        }

        const email = row["email"] || row["Email"] || "";
        const phone = row["phone"] || row["Phone"] || "";
        const gender = row["gender"] || row["Gender"] || "";
        const dateOfBirth = row["dateOfBirth"] || row["DateOfBirth"] || row["date_of_birth"] || "";
        const profileFields = participantProfileFieldsSchema.safeParse(participantProfileFieldsFromCsv(row));
        if (!profileFields.success) {
          errors.push({ row: rowNum, message: profileFields.error.issues[0]?.message ?? "Invalid age or grade/class" });
          continue;
        }
        const groupName = row["group"] || row["Group"] || row["groupName"] || "";
        const cityName = row["city"] || row["City"] || "";
        const parkName = row["park"] || row["Park"] || "";
        const batchName = row["batch"] || row["Batch"] || "";

        // Find or resolve group
        let group = findGroup(groupName);

        // If no group by name, try city > park > batch > group hierarchy
        if (!group && (cityName || parkName || batchName)) {
          let matchingGroups = groups;

          const city = findCity(cityName);
          if (city) {
            matchingGroups = matchingGroups.filter(
              (g) => g.batch.park.cityId === city.id
            );
          }

          const park = findPark(parkName);
          if (park) {
            matchingGroups = matchingGroups.filter(
              (g) => g.batch.parkId === park.id
            );
          }

          if (batchName) {
            matchingGroups = matchingGroups.filter(
              (g) => g.batch.name.toLowerCase() === batchName.toLowerCase()
            );
          }

          if (matchingGroups.length === 1) {
            group = matchingGroups[0];
          }
        }

        if (!group) {
          errors.push({
            row: rowNum,
            message: `Could not find matching group. Provide a valid "group" name, or city/park/batch combination.`,
          });
          continue;
        }

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push({ row: rowNum, message: `Invalid email format: "${email}"` });
          continue;
        }

        const scopeError = requireResourceScope(user, {
          cityId: group.batch.park.cityId,
          parkId: group.batch.parkId,
          groupId: group.id,
        });
        if (scopeError) return scopeError;

        // Hash before opening the transaction so bcrypt does not hold a SQLite write lock.
        const generatedTemporaryPassword = email
          ? crypto.randomBytes(24).toString("base64url")
          : undefined;
        const generatedPasswordHash = generatedTemporaryPassword
          ? await bcrypt.hash(generatedTemporaryPassword, 12)
          : undefined;

        // Handle guardian
        const guardianName = row["guardianName"] || row["Guardian Name"] || row["guardian_name"] || "";
        const guardianPhone = row["guardianPhone"] || row["Guardian Phone"] || row["guardian_phone"] || "";
        const guardianCNIC = row["guardianCNIC"] || row["Guardian CNIC"] || row["guardian_cnic"] || "";

        const createdPassword = await db.$transaction(async (tx) => {
          let userId: string | undefined;
          let temporaryPassword: string | undefined;

          if (email) {
            const existingUser = await tx.user.findUnique({ where: { email } });
            if (existingUser) {
              userId = existingUser.id;
            } else {
              temporaryPassword = generatedTemporaryPassword;
              const newUser = await tx.user.create({
                data: {
                  email,
                  passwordHash: generatedPasswordHash!,
                  name,
                  phone: phone || null,
                  mustResetPwd: true,
                },
              });
              userId = newUser.id;
            }
          }

          let guardianId: string | undefined;
          if (guardianName && guardianPhone) {
            const existingGuardian = await tx.guardian.findFirst({
              where: { phone: guardianPhone },
            });

            if (existingGuardian) {
              guardianId = existingGuardian.id;
            } else {
              const newGuardian = await tx.guardian.create({
                data: {
                  name: guardianName,
                  phone: guardianPhone,
                  cnic: guardianCNIC || null,
                },
              });
              guardianId = newGuardian.id;
            }
          }

          const participant = await tx.participant.create({
            data: {
              name,
              phone: phone || null,
              gender: gender || null,
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
              age: profileFields.data.age ?? null,
              gradeClass: profileFields.data.gradeClass ?? null,
              groupId: group.id,
              userId: userId || null,
              state: "active",
            },
          });

          if (guardianId) {
            await tx.guardianChild.create({
              data: {
                guardianId,
                participantId: participant.id,
              },
            });
          }

          return temporaryPassword;
        });

        if (createdPassword) {
          generatedPasswords.push({
            row: rowNum,
            name,
            email,
            password: createdPassword,
          });
        }

        success++;
      } catch (err: unknown) {
        errors.push({ row: rowNum, message: sanitizeImportError(err) });
      }
    }

    // Log audit
    await logAudit({
      userId: user.id,
      action: "IMPORT_PARTICIPANTS",
      entityType: "Participant",
      newValues: { success, errors: errors.length, total: rows.length },
    });

    return NextResponse.json({
      success,
      errors,
      total: rows.length,
      generatedPasswords,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: sanitizeImportError(err) }, { status: 500 });
  }
}
