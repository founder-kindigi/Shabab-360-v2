import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireCapability: vi.fn(),
  membershipFindFirst: vi.fn(),
  membershipUpdate: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({
  db: { staffTeamMembership: { findFirst: mocks.membershipFindFirst, update: mocks.membershipUpdate } },
}));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.logAudit }));

import { DELETE } from "./route";

describe("DELETE /api/admin/collaboration-teams/[teamId]/members/[membershipId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireCapability.mockResolvedValue({ user: { id: "super-admin", role: "super_admin" } });
  });

  it("does not end a membership belonging to another team", async () => {
    mocks.membershipFindFirst.mockResolvedValue(null);

    const response = await DELETE(new NextRequest("http://localhost/api/admin/collaboration-teams/team-lhr/members/membership-khi", {
      method: "DELETE",
    }), { params: Promise.resolve({ teamId: "team-lhr", membershipId: "membership-khi" }) });

    expect(response.status).toBe(404);
    expect(mocks.membershipFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "membership-khi", teamId: "team-lhr", isActive: true },
    }));
    expect(mocks.membershipUpdate).not.toHaveBeenCalled();
  });

  it("ends an active membership while preserving its historical record", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1", teamId: "team-lhr", staffMetaId: "staff-1", title: "Sports POC",
    });

    const response = await DELETE(new NextRequest("http://localhost/api/admin/collaboration-teams/team-lhr/members/membership-1", {
      method: "DELETE",
    }), { params: Promise.resolve({ teamId: "team-lhr", membershipId: "membership-1" }) });

    expect(response.status).toBe(200);
    expect(mocks.membershipUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "membership-1" },
      data: expect.objectContaining({ isActive: false, endedAt: expect.any(Date) }),
    }));
    expect(mocks.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: "delete",
      entityType: "staff_team_membership",
    }));
  });
});
