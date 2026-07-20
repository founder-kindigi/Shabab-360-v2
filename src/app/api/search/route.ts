import { NextRequest, NextResponse } from "next/server";
import { isHqRole, isStaffRole, requireCapability, type SessionUser } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import {
  optionalInteger,
  optionalQueryText,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

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

type SearchScope =
  | { kind: "hq" }
  | { kind: "city"; cityId: string }
  | { kind: "park"; parkId: string }
  | { kind: "group"; groupId: string };

const searchQuerySchema = z.object({
  q: optionalQueryText().default(""),
  limit: optionalInteger(1, 50).default(20),
});

function resolveSearchScope(user: SessionUser): SearchScope | null {
  if (!isStaffRole(user.role)) {
    return null;
  }
  if (isHqRole(user.role)) {
    return { kind: "hq" };
  }
  if (user.role === "city_head" && user.assignedCityId) {
    return { kind: "city", cityId: user.assignedCityId };
  }
  if ((user.role === "park_admin" || user.role === "park_lead") && user.assignedParkId) {
    return { kind: "park", parkId: user.assignedParkId };
  }
  if (user.role === "murabbi" && user.assignedGroupId) {
    return { kind: "group", groupId: user.assignedGroupId };
  }
  return null;
}

function participantScope(scope: SearchScope): Prisma.ParticipantWhereInput {
  if (scope.kind === "city") return { group: { batch: { park: { cityId: scope.cityId } } } };
  if (scope.kind === "park") return { group: { batch: { parkId: scope.parkId } } };
  if (scope.kind === "group") return { groupId: scope.groupId };
  return {};
}

function guardianScope(scope: SearchScope): Prisma.GuardianWhereInput {
  if (scope.kind === "hq") return {};
  return { children: { some: { participant: participantScope(scope) } } };
}

function batchScope(scope: SearchScope): Prisma.BatchWhereInput {
  if (scope.kind === "city") return { park: { cityId: scope.cityId } };
  if (scope.kind === "park") return { parkId: scope.parkId };
  if (scope.kind === "group") return { groups: { some: { id: scope.groupId } } };
  return {};
}

function groupScope(scope: SearchScope): Prisma.GroupWhereInput {
  if (scope.kind === "city") return { batch: { park: { cityId: scope.cityId } } };
  if (scope.kind === "park") return { batch: { parkId: scope.parkId } };
  if (scope.kind === "group") return { id: scope.groupId };
  return {};
}

function staffScope(scope: SearchScope): Prisma.UserWhereInput | null {
  if (scope.kind === "group") return null;
  if (scope.kind === "city") {
    return {
      staffMeta: {
        is: {
          OR: [
            { assignedCityId: scope.cityId },
            { assignedPark: { is: { cityId: scope.cityId } } },
          ],
        },
      },
    };
  }
  if (scope.kind === "park") {
    return { staffMeta: { is: { assignedParkId: scope.parkId } } };
  }
  return {};
}

// ---------------------------------------------------------------------------
// GET /api/search?q=...&limit=20
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const auth = await requireCapability("people.view");
  if (auth instanceof NextResponse) return auth;

  const scope = resolveSearchScope(auth.user);
  if (!scope) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = searchQuerySchema.safeParse(queryParamsToObject(searchParams));
  if (!parsedQuery.success) {
    return NextResponse.json(queryValidationError(parsedQuery.error), { status: 400 });
  }
  const q = parsedQuery.data.q.toLowerCase();
  const limit = parsedQuery.data.limit;

  if (q.length < 2) {
    return NextResponse.json({ results: [], total: 0 });
  }
  const perEntityLimit = Math.ceil(limit / 5);

  try {
    const [participants, guardians, staff, batches, groups] = await Promise.all([
      searchParticipants(q, perEntityLimit, scope),
      searchGuardians(q, perEntityLimit, scope),
      searchStaff(q, perEntityLimit, scope),
      searchBatches(q, perEntityLimit, scope),
      searchGroups(q, perEntityLimit, scope),
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
  limit: number,
  scope: SearchScope
): Promise<SearchResult[]> {
  const where: Prisma.ParticipantWhereInput = {
    state: "active",
    AND: [
      participantScope(scope),
      {
        OR: [
          { name: { contains: q } },
          { phone: { contains: q } },
        ],
      },
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
  limit: number,
  scope: SearchScope
): Promise<SearchResult[]> {
  const where: Prisma.GuardianWhereInput = {
    isActive: true,
    AND: [
      guardianScope(scope),
      {
        OR: [
          { name: { contains: q } },
          { phone: { contains: q } },
        ],
      },
    ],
  };

  const rows = await db.guardian.findMany({
    where,
    select: {
      id: true,
      name: true,
      phone: true,
    },
    take: limit,
  });

  return rows.map((r) => ({
    type: "guardian" as const,
    id: r.id,
    title: r.name,
    subtitle: r.phone || "",
    url: "admin-guardians",
  }));
}

async function searchStaff(
  q: string,
  limit: number,
  scope: SearchScope
): Promise<SearchResult[]> {
  const scopedStaff = staffScope(scope);
  if (!scopedStaff) return [];

  const where: Prisma.UserWhereInput = {
    isActive: true,
    AND: [
      { staffMeta: { is: { isActive: true } } },
      scopedStaff,
      {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
        ],
      },
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
  limit: number,
  scope: SearchScope
): Promise<SearchResult[]> {
  if (scope.kind === "group") return [];

  const where: Prisma.BatchWhereInput = {
    isActive: true,
    AND: [batchScope(scope), { name: { contains: q } }],
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
  limit: number,
  scope: SearchScope
): Promise<SearchResult[]> {
  const where: Prisma.GroupWhereInput = {
    isActive: true,
    AND: [groupScope(scope), { name: { contains: q } }],
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
