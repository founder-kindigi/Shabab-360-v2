import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET, POST } from "./route";
import { PATCH } from "./[activityId]/route";

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/teams/workspace-auth", () => ({
  requireTeamWorkspaceAccess: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    activityPlanItem: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    staffTeamMembership: { findFirst: vi.fn() },
    contentPlanBlock: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { requireAuth } from "@/lib/auth/authorize";
import { requireTeamWorkspaceAccess } from "@/lib/teams/workspace-auth";
import { db } from "@/lib/db";

const TEAM_ID = "team-lahore-media";
const ACTIVITY_ID = "activity-1";
const USER = { id: "user-1", role: "murabbi" } as any;
const VIEW_ACCESS = { ok: true, teamId: TEAM_ID, cityId: "city-lahore", staffMetaId: "staff-1" } as const;
const MANAGE_ACCESS = { ...VIEW_ACCESS, staffMetaId: "manager-1" } as const;
const ACTIVITY = {
  id: ACTIVITY_ID,
  teamId: TEAM_ID,
  title: "Prepare graphics",
  status: "planned",
  assignedStaffMetaId: "staff-1",
};

const listRequest = (query = "") =>
  new NextRequest(`http://localhost/api/admin/teams/${TEAM_ID}/activities${query}`);

const jsonRequest = (method: "POST" | "PATCH", body: unknown) =>
  new NextRequest(`http://localhost/api/admin/teams/${TEAM_ID}/activities`, {
    method,
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

const routeParams = () => ({ params: Promise.resolve({ id: TEAM_ID }) });
const activityParams = () => ({ params: Promise.resolve({ id: TEAM_ID, activityId: ACTIVITY_ID }) });

describe("TEAM-006: activity planner routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({ user: USER });
    vi.mocked(db.$transaction).mockImplementation(async (callback: any) =>
      callback({
        activityPlanItem: {
          create: vi.fn().mockResolvedValue({ ...ACTIVITY, status: "planned" }),
          update: vi.fn().mockResolvedValue({ ...ACTIVITY, status: "in_progress" }),
        },
        auditLog: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
      })
    );
  });

  it("returns 401 before reads when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

    const response = await GET(listRequest(), routeParams());

    expect(response.status).toBe(401);
    expect(db.activityPlanItem.findMany).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid bounded list query", async () => {
    vi.mocked(requireTeamWorkspaceAccess).mockResolvedValue(VIEW_ACCESS);

    const response = await GET(listRequest("?pageSize=101"), routeParams());

    expect(response.status).toBe(400);
    expect(db.activityPlanItem.findMany).not.toHaveBeenCalled();
  });

  it("returns 403 when a team member lacks workspace view access", async () => {
    vi.mocked(requireTeamWorkspaceAccess).mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });

    const response = await GET(listRequest(), routeParams());

    expect(response.status).toBe(403);
    expect(db.activityPlanItem.findMany).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed activity JSON before writes", async () => {
    vi.mocked(requireTeamWorkspaceAccess).mockResolvedValue(MANAGE_ACCESS);
    const request = new NextRequest(`http://localhost/api/admin/teams/${TEAM_ID}/activities`, {
      method: "POST",
      body: "{{malformed",
    });

    const response = await POST(request, routeParams());

    expect(response.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an inactive or non-member assignee without writing", async () => {
    vi.mocked(requireTeamWorkspaceAccess).mockResolvedValue(MANAGE_ACCESS);
    vi.mocked(db.staffTeamMembership.findFirst).mockResolvedValue(null);

    const response = await POST(
      jsonRequest("POST", { title: "Prepare graphics", assignedStaffMetaId: "inactive-staff" }),
      routeParams()
    );

    expect(response.status).toBe(400);
    expect(db.staffTeamMembership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true, endedAt: null }),
      })
    );
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("returns 404 when a content block is outside the team", async () => {
    vi.mocked(requireTeamWorkspaceAccess).mockResolvedValue(MANAGE_ACCESS);
    vi.mocked(db.contentPlanBlock.findFirst).mockResolvedValue(null);

    const response = await POST(
      jsonRequest("POST", { title: "Prepare graphics", contentBlockId: "foreign-block" }),
      routeParams()
    );

    expect(response.status).toBe(404);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("allows an assigned member to start only their planned activity and writes an audit in the transaction", async () => {
    vi.mocked(db.activityPlanItem.findFirst).mockResolvedValue(ACTIVITY as any);
    vi.mocked(requireTeamWorkspaceAccess)
      .mockResolvedValueOnce({ ok: false, status: 403, error: "Forbidden" })
      .mockResolvedValueOnce(VIEW_ACCESS);
    const update = vi.fn().mockResolvedValue({ ...ACTIVITY, status: "in_progress" });
    const auditCreate = vi.fn().mockResolvedValue({ id: "audit-1" });
    vi.mocked(db.$transaction).mockImplementation(async (callback: any) =>
      callback({ activityPlanItem: { update }, auditLog: { create: auditCreate } })
    );

    const response = await PATCH(jsonRequest("PATCH", { status: "in_progress" }), activityParams());

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "in_progress" } }));
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "update_activity_status" }) }));
  });

  it("denies a member from completing their own activity", async () => {
    vi.mocked(db.activityPlanItem.findFirst).mockResolvedValue({ ...ACTIVITY, status: "in_progress" } as any);
    vi.mocked(requireTeamWorkspaceAccess)
      .mockResolvedValueOnce({ ok: false, status: 403, error: "Forbidden" })
      .mockResolvedValueOnce(VIEW_ACCESS);

    const response = await PATCH(jsonRequest("PATCH", { status: "completed" }), activityParams());

    expect(response.status).toBe(403);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it.each(["completed", "cancelled"])("allows a manager to transition an in-progress activity to %s", async (status) => {
    vi.mocked(db.activityPlanItem.findFirst).mockResolvedValue({ ...ACTIVITY, status: "in_progress" } as any);
    vi.mocked(requireTeamWorkspaceAccess).mockResolvedValue(MANAGE_ACCESS);
    const update = vi.fn().mockResolvedValue({ ...ACTIVITY, status });
    const auditCreate = vi.fn().mockResolvedValue({ id: "audit-1" });
    vi.mocked(db.$transaction).mockImplementation(async (callback: any) =>
      callback({ activityPlanItem: { update }, auditLog: { create: auditCreate } })
    );

    const response = await PATCH(jsonRequest("PATCH", { status }), activityParams());

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { status } }));
    expect(auditCreate).toHaveBeenCalledTimes(1);
  });

  it("returns 409 for an invalid manager lifecycle jump", async () => {
    vi.mocked(db.activityPlanItem.findFirst).mockResolvedValue(ACTIVITY as any);
    vi.mocked(requireTeamWorkspaceAccess).mockResolvedValue(MANAGE_ACCESS);

    const response = await PATCH(jsonRequest("PATCH", { status: "completed" }), activityParams());

    expect(response.status).toBe(409);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("returns 404 when the requested activity is not in the team", async () => {
    vi.mocked(db.activityPlanItem.findFirst).mockResolvedValue(null);

    const response = await PATCH(jsonRequest("PATCH", { status: "in_progress" }), activityParams());

    expect(response.status).toBe(404);
    expect(requireTeamWorkspaceAccess).not.toHaveBeenCalled();
  });
});
