import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { PATCH } from "./route";
import { requireAuth } from "@/lib/auth/authorize";
import { userHasCapability } from "@/lib/auth/capability-access";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";

vi.mock("@/lib/auth/authorize", () => ({ requireAuth: vi.fn(), requireCapability: vi.fn() }));
vi.mock("@/lib/auth/capability-access", () => ({ userHasCapability: vi.fn() }));
vi.mock("@/lib/auth/events-scope", () => ({ resolveActorCity: vi.fn() }));
vi.mock("@/lib/audit", () => ({ createAuditLogData: vi.fn((data) => data) }));
vi.mock("@/lib/db", () => ({
  db: {
    activityPlanItem: { findUnique: vi.fn() },
    staffTeamMembership: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const existingActivity = {
  id: "activity_1",
  teamId: "team_1",
  assignedStaffMetaId: "staff_member",
  status: "planned",
  team: { id: "team_1", cityId: "city_lahore" },
};

describe("PATCH /api/admin/teams/[id]/activities/[activityId]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "user_member" } } as any);
    vi.mocked(resolveActorCity).mockResolvedValue({ cityId: "city_lahore" } as any);
    vi.mocked(db.activityPlanItem.findUnique).mockResolvedValue(existingActivity as any);
  });

  it("allows an active assignee to start only their own planned activity", async () => {
    vi.mocked(userHasCapability).mockResolvedValue(false);
    vi.mocked(db.staffTeamMembership.findFirst).mockResolvedValue({ staffMetaId: "staff_member" } as any);
    const auditCreate = vi.fn();
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findUnique = vi.fn().mockResolvedValue({ ...existingActivity, status: "in_progress" });
    vi.mocked(db.$transaction).mockImplementation(async (callback: any) => callback({
      activityPlanItem: { updateMany, findUnique },
      auditLog: { create: auditCreate },
    }));

    const res = await PATCH(new NextRequest("http://localhost/api/admin/teams/team_1/activities/activity_1", {
      method: "PATCH",
      body: JSON.stringify({ status: "in_progress" }),
    }), { params: Promise.resolve({ id: "team_1", activityId: "activity_1" }) });

    expect(res.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "activity_1", status: "planned" } }));
    expect(auditCreate).toHaveBeenCalledTimes(1);
  });

  it("rejects a non-manager trying to complete their own activity", async () => {
    vi.mocked(userHasCapability).mockResolvedValue(false);
    vi.mocked(db.staffTeamMembership.findFirst).mockResolvedValue({ staffMetaId: "staff_member" } as any);

    const res = await PATCH(new NextRequest("http://localhost/api/admin/teams/team_1/activities/activity_1", {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" }),
    }), { params: Promise.resolve({ id: "team_1", activityId: "activity_1" }) });

    expect(res.status).toBe(403);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("returns 409 when a concurrent update changes the current lifecycle state", async () => {
    vi.mocked(userHasCapability).mockResolvedValue(true);
    vi.mocked(db.staffTeamMembership.findFirst).mockResolvedValue(null);
    vi.mocked(db.$transaction).mockImplementation(async (callback: any) => callback({
      activityPlanItem: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      auditLog: { create: vi.fn() },
    }));

    const res = await PATCH(new NextRequest("http://localhost/api/admin/teams/team_1/activities/activity_1", {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" }),
    }), { params: Promise.resolve({ id: "team_1", activityId: "activity_1" }) });

    expect(res.status).toBe(409);
  });

  it("returns 401 before looking up the activity", async () => {
    vi.mocked(requireAuth).mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as any);

    const res = await PATCH(new NextRequest("http://localhost/api/admin/teams/team_1/activities/activity_1", {
      method: "PATCH",
      body: JSON.stringify({ status: "in_progress" }),
    }), { params: Promise.resolve({ id: "team_1", activityId: "activity_1" }) });

    expect(res.status).toBe(401);
    expect(db.activityPlanItem.findUnique).not.toHaveBeenCalled();
  });
});
