import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchResult {
  type: "participant" | "guardian" | "staff" | "batch" | "group";
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

// ---------------------------------------------------------------------------
// GET /api/search?q=...&limit=20
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  if (q.length < 2) {
    return NextResponse.json({ results: [], total: 0 });
  }

  const perEntityLimit = Math.ceil(limit / 5);

  try {
    const [participants, guardians, staff, batches, groups] = await Promise.all([
      searchParticipants(q, perEntityLimit),
      searchGuardians(q, perEntityLimit),
      searchStaff(q, perEntityLimit),
      searchBatches(q, perEntityLimit),
      searchGroups(q, perEntityLimit),
    ]);

    const results: SearchResult[] = [
      ...participants,
      ...guardians,
      ...staff,
      ...batches,
      ...groups,
    ].slice(0, limit);

    return NextResponse.json({ results, total: results.length });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ results: [], total: 0 }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Entity search helpers
// ---------------------------------------------------------------------------

async function searchParticipants(
  q: string,
  limit: number
): Promise<SearchResult[]> {
  const where: Prisma.ParticipantWhereInput = {
    isActive: true,
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ],
  };

  const rows = await db.participant.findMany({
    where,
    select: {
      id: true,
      name: true,
      phone: true,
      group: { select: { name: true, batch: { select: { name: true, park: { select: { name: true } } } } } },
      state: true,
    },
    take: limit,
  });

  return rows.map((r) => ({
    type: "participant" as const,
    id: r.id,
    title: r.name,
    subtitle: [
      r.group?.batch?.park?.name,
      r.group?.batch?.name,
      r.group?.name,
    ]
      .filter(Boolean)
      .join(" → ") || r.phone || r.state,
    url: "admin-students",
  }));
}

async function searchGuardians(
  q: string,
  limit: number
): Promise<SearchResult[]> {
  const where: Prisma.GuardianWhereInput = {
    isActive: true,
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { cnic: { contains: q } },
    ],
  };

  const rows = await db.guardian.findMany({
    where,
    select: {
      id: true,
      name: true,
      phone: true,
      cnic: true,
      children: { take: 1, select: { participant: { select: { name: true } } } },
    },
    take: limit,
  });

  return rows.map((r) => ({
    type: "guardian" as const,
    id: r.id,
    title: r.name,
    subtitle:
      r.cnic || r.phone || (r.children[0]?.participant.name
        ? `Guardian of ${r.children[0].participant.name}`
        : ""),
    url: "admin-guardians",
  }));
}

async function searchStaff(
  q: string,
  limit: number
): Promise<SearchResult[]> {
  const where: Prisma.UserWhereInput = {
    isActive: true,
    staffMeta: { isNot: null },
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ],
  };

  const rows = await db.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      staffMeta: {
        select: {
          role: true,
          assignedCity: { select: { name: true } },
          assignedPark: { select: { name: true } },
        },
      },
    },
    take: limit,
  });

  return rows.map((r) => ({
    type: "staff" as const,
    id: r.id,
    title: r.name || r.email,
    subtitle: [
      r.staffMeta?.role?.replace(/_/g, " "),
      r.staffMeta?.assignedPark?.name || r.staffMeta?.assignedCity?.name,
    ]
      .filter(Boolean)
      .join(" · ") || r.email,
    url: "admin-users",
  }));
}

async function searchBatches(
  q: string,
  limit: number
): Promise<SearchResult[]> {
  const where: Prisma.BatchWhereInput = {
    isActive: true,
    name: { contains: q, mode: "insensitive" },
  };

  const rows = await db.batch.findMany({
    where,
    select: {
      id: true,
      name: true,
      startDate: true,
      park: { select: { name: true, city: { select: { name: true } } } },
      groups: { select: { id: true } },
    },
    take: limit,
  });

  return rows.map((r) => ({
    type: "batch" as const,
    id: r.id,
    title: r.name,
    subtitle:
      [
        r.park?.city?.name,
        r.park?.name,
        `${r.groups.length} groups`,
      ]
        .filter(Boolean)
        .join(" → ") || "",
    url: "admin-batches",
  }));
}

async function searchGroups(
  q: string,
  limit: number
): Promise<SearchResult[]> {
  const where: Prisma.GroupWhereInput = {
    isActive: true,
    name: { contains: q, mode: "insensitive" },
  };

  const rows = await db.group.findMany({
    where,
    select: {
      id: true,
      name: true,
      batch: { select: { name: true, park: { select: { name: true } } } },
      participants: { select: { id: true } },
    },
    take: limit,
  });

  return rows.map((r) => ({
    type: "group" as const,
    id: r.id,
    title: r.name,
    subtitle:
      [
        r.batch?.park?.name,
        r.batch?.name,
        `${r.participants.length} students`,
      ]
        .filter(Boolean)
        .join(" → ") || "",
    url: "admin-groups",
  }));
}