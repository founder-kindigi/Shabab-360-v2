import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { formatPKT } from "@/lib/timezone";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if user has a participant record (student)
  const participant = await db.participant.findFirst({
    where: { userId: user.id },
    include: {
      group: {
        include: {
          batch: {
            include: {
              park: {
                include: { city: true },
              },
            },
          },
        },
      },
      attendanceRecords: {
        select: { status: true },
      },
    },
  });

  // Compute attendance summary
  let attendanceSummary = null;
  if (participant) {
    const records = participant.attendanceRecords;
    const total = records.length;
    const present = records.filter((r) => r.status === "present").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const late = records.filter((r) => r.status === "late").length;
    const excused = records.filter((r) => r.status === "excused").length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    attendanceSummary = { total, present, absent, late, excused, rate };
  }

  return NextResponse.json({
    ...profile,
    participant: participant
      ? {
          id: participant.id,
          name: participant.name,
          phone: participant.phone,
          dateOfBirth: participant.dateOfBirth
            ? formatPKT(new Date(participant.dateOfBirth))
            : null,
          gender: participant.gender,
          address: participant.address,
          state: participant.state,
          joinedAt: formatPKT(new Date(participant.joinedAt)),
          group: participant.group.name,
          batch: participant.group.batch.name,
          park: participant.group.batch.park.name,
          city: participant.group.batch.park.city?.name || null,
        }
      : null,
    attendanceSummary,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await request.json();
  const { name, phone, address } = body as {
    name?: string;
    phone?: string;
    address?: string;
  };

  const userData: Record<string, string> = {};
  if (name !== undefined) userData.name = name.trim();
  if (phone !== undefined) userData.phone = phone.trim() || null;

  if (Object.keys(userData).length === 0 && address === undefined) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // Update user record
  let updatedUser = null;
  if (Object.keys(userData).length > 0) {
    updatedUser = await db.user.update({
      where: { id: user.id },
      data: userData,
      select: { id: true, name: true, email: true, phone: true },
    });
  }

  // If address update and user is a student, update participant record too
  if (address !== undefined && user.role === "student") {
    const participant = await db.participant.findFirst({
      where: { userId: user.id },
    });
    if (participant) {
      await db.participant.update({
        where: { id: participant.id },
        data: { address: address.trim() || null },
      });
    }
  }

  // Also sync name/phone to participant if student
  if ((userData.name || userData.phone) && user.role === "student") {
    const participant = await db.participant.findFirst({
      where: { userId: user.id },
    });
    if (participant) {
      const pData: Record<string, string | null> = {};
      if (userData.name) pData.name = userData.name;
      if (userData.phone !== undefined) pData.phone = userData.phone;
      await db.participant.update({
        where: { id: participant.id },
        data: pData,
      });
    }
  }

  // Return fresh profile
  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, phone: true },
  });

  return NextResponse.json(updatedUser || profile);
}