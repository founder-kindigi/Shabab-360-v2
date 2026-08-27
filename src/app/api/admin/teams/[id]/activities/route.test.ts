import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST } from "./route";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { userHasCapability } from "@/lib/auth/capability-access";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
}));

vi.mock("@/lib/auth/capability-access", () => ({ userHasCapability: vi.fn() }));

vi.mock("@/lib/auth/events-scope", () => ({
  resolveActorCity: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({ createAuditLogData: vi.fn((data) => data) }));

vi.mock("@/lib/db", () => ({
  db: {
    collaborationTeam: {
      findUnique: vi.fn(),
    },
    activityPlanItem: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    staffTeamMembership: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("Team Activity Planner API (GET & POST /api/admin/teams/[id]/activities)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(db.$transaction).mockImplementation(async (callback: any) => callback({
      activityPlanItem: { create: db.activityPlanItem.create },
      auditLog: { create: vi.fn() },
    }));
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as any
    );

    const req = new NextRequest("http://localhost:3000/api/admin/teams/team_1/activities");
    const res = await GET(req, { params: Promise.resolve({ id: "team_1" }) });

    expect(res.status).toBe(401);
  });

  it("returns 403 when team belongs to another city scope", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "usr_1" } } as any);
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue({
      id: "team_1",
      cityId: "city_lahore",
      name: "Sports Team",
    } as any);
    vi.mocked(resolveActorCity).mockResolvedValue({
      error: "City mismatch",
      status: 403,
      cityId: "city_karachi",
    } as any);

    const req = new NextRequest("http://localhost:3000/api/admin/teams/team_1/activities");
    const res = await GET(req, { params: Promise.resolve({ id: "team_1" }) });

    expect(res.status).toBe(403);
  });

  it("returns list of activities and preserves past contributions for inactive members", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "usr_1" } } as any);
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue({
      id: "team_1",
      cityId: "city_lahore",
      name: "Sports Team",
      isActive: true,
    } as any);
    vi.mocked(resolveActorCity).mockResolvedValue({ cityId: "city_lahore" } as any);
    vi.mocked(userHasCapability).mockResolvedValue(true);
    vi.mocked(db.staffTeamMembership.findFirst).mockResolvedValue(null);
    vi.mocked(db.staffTeamMembership.findMany).mockResolvedValue([] as any); // staff_1 is not active

    vi.mocked(db.activityPlanItem.findMany).mockResolvedValue([
      {
        id: "act_1",
        teamId: "team_1",
        title: "Annual Football Tournament",
        description: "Organize tournament",
        status: "planned",
        scheduledFor: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        contentBlock: null,
        assignedStaff: {
          id: "staff_1",
          user: { name: "Ali Khan", email: "ali@example.com" },
        },
      },
    ] as any);

    const req = new NextRequest("http://localhost:3000/api/admin/teams/team_1/activities");
    const res = await GET(req, { params: Promise.resolve({ id: "team_1" }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.data).toHaveLength(1);
    expect(data.data[0].isCurrentMember).toBe(false); // Past contribution preserved!
    expect(data.meta.canManage).toBe(true);
  });

  it("rejects assignment if target staff member is not an active team member", async () => {
    vi.mocked(requireCapability).mockResolvedValue({ user: { id: "usr_1" } } as any);
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue({
      id: "team_1",
      cityId: "city_lahore",
      name: "Sports Team",
      isActive: true,
    } as any);
    vi.mocked(resolveActorCity).mockResolvedValue({ cityId: "city_lahore" } as any);
    vi.mocked(db.staffTeamMembership.findFirst).mockResolvedValue(null); // Not active member

    const req = new NextRequest("http://localhost:3000/api/admin/teams/team_1/activities", {
      method: "POST",
      body: JSON.stringify({
        title: "Weekly Practice",
        assignedStaffMetaId: "staff_inactive_01",
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "team_1" }) });
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("is not an active member");
  });

  it("allows an active member to read their own team activities without organisation.view", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "usr_member" } } as any);
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue({ id: "team_1", cityId: "city_lahore" } as any);
    vi.mocked(resolveActorCity).mockResolvedValue({ cityId: "city_lahore" } as any);
    vi.mocked(userHasCapability)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);
    vi.mocked(db.staffTeamMembership.findFirst).mockResolvedValue({ staffMetaId: "staff_member" } as any);
    vi.mocked(db.staffTeamMembership.findMany).mockResolvedValue([{ staffMetaId: "staff_member" }] as any);
    vi.mocked(db.activityPlanItem.findMany).mockResolvedValue([] as any);

    const res = await GET(
      new NextRequest("http://localhost/api/admin/teams/team_1/activities"),
      { params: Promise.resolve({ id: "team_1" }) }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).meta.currentStaffMetaId).toBe("staff_member");
  });

  it("creates new team activity when assignment is valid and active", async () => {
    vi.mocked(requireCapability).mockResolvedValue({ user: { id: "usr_1" } } as any);
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue({
      id: "team_1",
      cityId: "city_lahore",
      name: "Sports Team",
      isActive: true,
    } as any);
    vi.mocked(resolveActorCity).mockResolvedValue({ cityId: "city_lahore" } as any);
    vi.mocked(db.staffTeamMembership.findFirst).mockResolvedValue({ id: "mem_1" } as any);

    vi.mocked(db.activityPlanItem.create).mockResolvedValue({
      id: "act_new",
      teamId: "team_1",
      title: "Weekly Practice",
      assignedStaffMetaId: "staff_active_01",
      status: "planned",
    } as any);
    const auditCreate = vi.fn();
    vi.mocked(db.$transaction).mockImplementation(async (callback: any) => callback({
      activityPlanItem: { create: db.activityPlanItem.create },
      auditLog: { create: auditCreate },
    }));

    const req = new NextRequest("http://localhost:3000/api/admin/teams/team_1/activities", {
      method: "POST",
      body: JSON.stringify({
        title: "Weekly Practice",
        assignedStaffMetaId: "staff_active_01",
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "team_1" }) });
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.id).toBe("act_new");
    expect(auditCreate).toHaveBeenCalledTimes(1);
  });
});
