import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  optionalQueryText,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { z } from "zod";
import { subDays } from "date-fns";

const VALID_ROLES = [
  "super_admin",
  "program_admin",
  "city_head",
  "park_admin",
  "park_lead",
  "murabbi",
  "guardian",
  "student",
] as const;

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(1, "Content is required").max(5000),
  priority: z.enum(["urgent", "normal", "low"]).default("normal"),
  targetRoles: z
    .array(z.enum(VALID_ROLES))
    .min(1, "At least one target role is required"),
  expiresAt: z.string().datetime().optional().nullable(),
});

const listQuerySchema = z.object({
  role: z.enum(VALID_ROLES).optional(),
  search: optionalQueryText(),
  priority: z.enum(["urgent", "normal", "low"]).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { searchParams } = new URL(request.url);
  const parsedQuery = listQuerySchema.safeParse(queryParamsToObject(searchParams));
  if (!parsedQuery.success) {
    return NextResponse.json(queryValidationError(parsedQuery.error), { status: 400 });
  }
  const { role: roleFilter, search, priority } = parsedQuery.data;

  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);

  // Build where clause: non-expired or created in last 30 days
  const where: any = {
    createdAt: { gte: thirtyDaysAgo },
    AND: [
      {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      ...(roleFilter ? [{ targetRoles: { contains: roleFilter } }] : []),
      ...(priority ? [{ priority }] : []),
      ...(search
        ? [{ OR: [
          { title: { contains: search, mode: "insensitive" } },
          { content: { contains: search, mode: "insensitive" } },
        ] }]
        : []),
    ],
  };

  const announcements = await db.announcement.findMany({
    where,
    select: {
      id: true,
      title: true,
      content: true,
      priority: true,
      targetRoles: true,
      createdAt: true,
      expiresAt: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [
      // Urgent first
      { priority: "asc" },
      // Then by createdAt desc
      { createdAt: "desc" },
    ],
  });

  // Priority sort weight: urgent=0, normal=1, low=2
  const priorityWeight: Record<string, number> = { urgent: 0, normal: 1, low: 2 };
  const sorted = [...announcements].sort((a, b) => {
    const wA = priorityWeight[a.priority] ?? 1;
    const wB = priorityWeight[b.priority] ?? 1;
    if (wA !== wB) return wA - wB;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const result = sorted.map((a) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    priority: a.priority,
    targetRoles: a.targetRoles,
    authorName: a.author.name || a.author.email,
    authorId: a.author.id,
    createdAt: a.createdAt.toISOString(),
    expiresAt: a.expiresAt?.toISOString() || null,
    isExpired: a.expiresAt ? a.expiresAt < now : false,
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const authError = await requireRole([
    "super_admin",
    "program_admin",
    "city_head",
  ]);
  if (authError) return authError;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("announcements.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { title, content, priority, targetRoles, expiresAt } = parsed.data;

  const announcement = await db.announcement.create({
    data: {
      title,
      content,
      priority,
      targetRoles: JSON.stringify(targetRoles),
      authorId: user.id!,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    select: {
      id: true,
      title: true,
      content: true,
      priority: true,
      targetRoles: true,
      createdAt: true,
      expiresAt: true,
      author: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // Fire audit log
  await logAudit({
    userId: user.id,
    action: "create",
    entityType: "announcement",
    entityId: announcement.id,
    newValues: { title, priority, targetRoles, expiresAt },
  });

  return NextResponse.json(
    {
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      targetRoles: announcement.targetRoles,
      authorName: announcement.author.name || announcement.author.email,
      authorId: announcement.author.id,
      createdAt: announcement.createdAt.toISOString(),
      expiresAt: announcement.expiresAt?.toISOString() || null,
      isExpired: false,
    },
    { status: 201 }
  );
}
